import { User, TestSession } from '@common/contracts/models';
export interface Credentials {
    token: string;
    adminToken: string;
}
export interface HttpPort {
    request<T>(path: string, method: string, body: unknown, credentials: Credentials): Promise<T>;
}
export interface StoragePort {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
export interface RealtimeConnection {
    readonly connected: boolean;
    on<T>(event: string, handler: (payload: T) => void): void;
    send(event: string): void;
    request<T>(event: string, body?: unknown): Promise<T>;
    disconnect(): void;
}
export interface RealtimePort {
    connect(token: string): RealtimeConnection;
}
export interface StateCell<T> {
    (): T;
    set(value: T): void;
    update(change: (value: T) => T): void;
}
export interface ConnectionState {
    user: StateCell<User | null>;
    identity: StateCell<User | null>;
    sessions: StateCell<TestSession[]>;
    session: StateCell<TestSession | null>;
    notice: StateCell<string>;
    connected: StateCell<boolean>;
    mapRevision: StateCell<number>;
}
export interface ClientDependencies {
    http: HttpPort;
    realtime: RealtimePort;
    storage: StoragePort;
    state: ConnectionState;
}
export interface SessionCreated {
    id: string;
}
