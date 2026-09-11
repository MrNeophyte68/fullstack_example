import { Store } from '@app/shared/application/ports';
export class MemoryStore<T> implements Store<T> {
    private readonly data = new Map<string, T>();
    get(id: string): T | undefined {
        return this.data.get(id);
    }
    set(id: string, value: T): void {
        this.data.set(id, value);
    }
    has(id: string): boolean {
        return this.data.has(id);
    }
    delete(id: string): void {
        this.data.delete(id);
    }
    values(): IterableIterator<T> {
        return this.data.values();
    }
    entries(): IterableIterator<[string, T]> {
        return this.data.entries();
    }
}
