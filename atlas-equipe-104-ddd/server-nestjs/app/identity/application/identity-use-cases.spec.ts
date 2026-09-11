import { IdentityUseCases } from './identity-use-cases';
import { AccountRecord, IdentityDependencies } from './ports';
import { OWNER } from '@app/testing/domain-fixtures.fixture';
describe('Identity use cases with replaceable ports', () => {
    let identity: IdentityUseCases;
    let dependencies: IdentityDependencies;
    let now: number;
    let later: (() => void)[];
    let records: Map<string, AccountRecord>;
    let serial: number;
    beforeEach(() => {
        now = 1000;
        later = [];
        records = new Map();
        serial = 0;
        dependencies = {
            accounts: {
                create: async (name, passwordHash) => {
                    records.set(name.toLowerCase(), { ...OWNER, name, passwordHash });
                },
                findByName: async (name) => records.get(name.trim().toLowerCase()),
                changePassword: jest.fn(),
                remove: jest.fn(),
                list: async () => [...records.values()],
            },
            passwords: {
                hash: (value) => `test:${value}`,
                matches: (value, hash) => hash === `test:${value}`,
                matchesAdmin: (value) => value === 'admin',
            },
            runtime: {
                now: () => now,
                token: () => `token-${++serial}`,
                id: () => 'id',
                integer: () => 0,
                later: (action) => {
                    later.push(action);
                },
            },
            maps: { removeOwnedBy: jest.fn(), countOwnedBy: async () => 0 },
            events: { on: jest.fn(), emit: jest.fn() },
            logins: new Map(),
            admins: new Map(),
            attempts: new Map(),
        };
        identity = new IdentityUseCases(dependencies);
    });
    it('validates registration before persistence and enforces exclusive logins', async () => {
        await expect(identity.register('Owner', 'short')).rejects.toThrow('10 à 128');
        expect(records.size).toBe(0);
        const login = await identity.register('Owner', 'Password2026');
        expect(identity.require(login.token).name).toBe('Owner');
        await expect(identity.login('OWNER', 'Password2026')).rejects.toThrow('déjà connecté');
        await expect(identity.login('Owner', 'WrongPassword1')).rejects.toThrow('incorrect');
    });
    it('keeps a refreshed connection alive but revokes an abandoned one after its grace period', async () => {
        const login = await identity.register('Owner', 'Password2026');
        identity.bind(login.token, 'first');
        identity.disconnect(login.token, 'first');
        identity.bind(login.token, 'second');
        later.shift()();
        expect(identity.require(login.token).id).toBe(OWNER.id);
        identity.disconnect(login.token, 'second');
        later.shift()();
        expect(() => identity.require(login.token)).toThrow('connecter');
        expect(dependencies.events.emit).toHaveBeenCalledWith('logout', OWNER.id, 'Connexion terminée.');
    });
    it('expires administrator sessions against the injected clock', () => {
        expect(() => identity.requireAdmin('unknown')).toThrow('requis');
        const token = identity.adminLogin('admin');
        identity.requireAdmin(token);
        now += 3600000;
        expect(() => identity.requireAdmin(token)).toThrow('requis');
    });
    it('coordinates account removal through the owned-map port', async () => {
        const login = await identity.register('Owner', 'Password2026');
        await identity.deleteUser(OWNER.id);
        expect(dependencies.maps.removeOwnedBy).toHaveBeenCalledWith(OWNER.id);
        expect(dependencies.accounts.remove).toHaveBeenCalledWith(OWNER.id);
        expect(() => identity.require(login.token)).toThrow('connecter');
    });
});
