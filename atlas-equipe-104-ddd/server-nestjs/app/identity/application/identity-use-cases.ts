import { User } from '@common/contracts/models';
import { DomainError } from '@common/domain/errors';
import { checkPassword, checkName } from '@app/identity/domain/account-policy';
import { MAX_PASSWORD_LENGTH } from '@app/identity/domain/identity.constants';
import { RATE_WINDOW_MS, RATE_LIMIT, RECONNECT_GRACE_MS, ADMIN_SESSION_MS } from './identity.constants';
import { IdentityAccess, IdentityDependencies } from './ports';
interface AuthenticationResult {
    user: User;
    token: string;
}
export class IdentityUseCases implements IdentityAccess {
    constructor(private readonly dependencies: IdentityDependencies) {}
    rateLimit(address: string): void {
        const attempt = this.dependencies.attempts.get(address);
        if (!attempt || attempt.until < this.dependencies.runtime.now()) {
            this.dependencies.attempts.set(address, { count: 1, until: this.dependencies.runtime.now() + RATE_WINDOW_MS });
            return;
        }
        if (++attempt.count > RATE_LIMIT) throw new DomainError('invalid', 'Trop de tentatives. Réessayez dans une minute.');
    }
    async register(name: string, password: string): Promise<AuthenticationResult> {
        const normalized = checkName(name);
        checkPassword(password);
        await this.dependencies.accounts.create(normalized, this.dependencies.passwords.hash(password));
        return this.login(normalized, password);
    }
    async login(name: string, password: string): Promise<AuthenticationResult> {
        if (typeof name !== 'string' || typeof password !== 'string' || password.length > MAX_PASSWORD_LENGTH)
            throw new DomainError('unauthorized', 'Nom ou mot de passe incorrect.');
        const record = await this.dependencies.accounts.findByName(name);
        if (!record || !this.dependencies.passwords.matches(password, record.passwordHash))
            throw new DomainError('unauthorized', 'Nom ou mot de passe incorrect.');
        for (const login of this.dependencies.logins.values())
            if (login.user.id === record.id) throw new DomainError('conflict', 'Ce compte est déjà connecté dans un autre onglet.');
        const user: User = { id: record.id, name: record.name, createdAt: record.createdAt };
        const token = this.dependencies.runtime.token();
        this.dependencies.logins.set(token, { user, token, lastSeen: this.dependencies.runtime.now() });
        return { user, token };
    }
    require(token: string): User {
        const login = this.dependencies.logins.get(token);
        if (!login) throw new DomainError('unauthorized', 'Veuillez vous connecter.');
        login.lastSeen = this.dependencies.runtime.now();
        return login.user;
    }
    bind(token: string, socketId: string): User {
        const user = this.require(token);
        const login = this.dependencies.logins.get(token);
        if (login.socketId && login.socketId !== socketId) throw new DomainError('conflict', 'Connexion déjà active.');
        login.socketId = socketId;
        return user;
    }
    disconnect(token: string, socketId: string): void {
        const login = this.dependencies.logins.get(token);
        if (login?.socketId !== socketId) return;
        login.socketId = undefined;
        this.dependencies.runtime.later(() => {
            if (this.dependencies.logins.get(token) === login && !login.socketId) this.logout(token, 'Connexion terminée.');
        }, RECONNECT_GRACE_MS);
    }
    logout(token: string, reason = 'Vous avez été déconnecté.'): void {
        const login = this.dependencies.logins.get(token);
        if (login) {
            this.dependencies.logins.delete(token);
            this.dependencies.events.emit('logout', login.user.id, reason);
        }
    }
    revoke(userId: string, reason: string): void {
        for (const [token, login] of this.dependencies.logins.entries()) if (login.user.id === userId) this.logout(token, reason);
    }
    adminLogin(password: string): string {
        if (
            typeof password !== 'string' ||
            password.length > MAX_PASSWORD_LENGTH ||
            !this.dependencies.passwords.matchesAdmin(password)
        )
            throw new DomainError('unauthorized', 'Mot de passe administrateur incorrect.');
        const token = this.dependencies.runtime.token();
        this.dependencies.admins.set(token, this.dependencies.runtime.now() + ADMIN_SESSION_MS);
        return token;
    }
    requireAdmin(token: string): void {
        if (!this.dependencies.admins.has(token) || (this.dependencies.admins.get(token) ?? 0) <= this.dependencies.runtime.now())
            throw new DomainError('unauthorized', 'Accès administrateur requis.');
    }
    async changePassword(id: string, password: string): Promise<void> {
        checkPassword(password);
        await this.dependencies.accounts.changePassword(id, this.dependencies.passwords.hash(password));
    }
    async deleteUser(id: string): Promise<void> {
        this.revoke(id, 'Votre compte a été supprimé.');
        await this.dependencies.maps.removeOwnedBy(id);
        await this.dependencies.accounts.remove(id);
    }
    async users(): Promise<User[]> {
        return Promise.all(
            (await this.dependencies.accounts.list()).map(async (user) => ({
                ...user,
                mapCount: await this.dependencies.maps.countOwnedBy(user.id),
            })),
        );
    }
    async nameExists(name: string): Promise<boolean> {
        return Boolean(await this.dependencies.accounts.findByName(name));
    }
}
