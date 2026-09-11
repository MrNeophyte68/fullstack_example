import { User } from '@common/contracts/models';
import { Store, Runtime, PasswordHasher, EventBus } from '@app/shared/application/ports';
import { OwnedMaps } from '@app/map-authoring/application/ports';
export interface AccountRecord extends User {
    passwordHash: string;
}
export interface AccountRepository {
    create(name: string, passwordHash: string): Promise<void>;
    findByName(name: string): Promise<AccountRecord | undefined>;
    changePassword(id: string, hash: string): Promise<void>;
    remove(id: string): Promise<void>;
    list(): Promise<User[]>;
}
export interface Login {
    user: User;
    token: string;
    lastSeen: number;
    socketId?: string;
}
export interface Attempt {
    count: number;
    until: number;
}
export interface IdentityDependencies {
    accounts: AccountRepository;
    passwords: PasswordHasher;
    runtime: Runtime;
    events: EventBus;
    maps: OwnedMaps;
    logins: Store<Login>;
    admins: Store<number>;
    attempts: Store<Attempt>;
}
export interface IdentityAccess {
    require(token: string): User;
    bind(token: string, connectionId: string): User;
    disconnect(token: string, connectionId: string): void;
    rateLimit(address: string): void;
    nameExists(name: string): Promise<boolean>;
}
