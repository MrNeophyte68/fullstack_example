export interface EventBus {
    on(event: string, listener: (...args: string[]) => void): void;
    emit(event: string, ...args: string[]): void;
}
export interface Runtime {
    now(): number;
    token(): string;
    id(): string;
    integer(min: number, max?: number): number;
    later(action: () => void, milliseconds: number): void;
}
export interface PasswordHasher {
    hash(password: string): string;
    matches(password: string, hash: string): boolean;
    matchesAdmin(password: string): boolean;
}
export interface Store<T> {
    get(id: string): T | undefined;
    set(id: string, value: T): void;
    has(id: string): boolean;
    delete(id: string): void;
    values(): IterableIterator<T>;
    entries(): IterableIterator<[string, T]>;
}
