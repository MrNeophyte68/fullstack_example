import { EventEmitter } from 'node:events';
import { EventBus } from '@app/shared/application/ports';
export class LocalEventBus implements EventBus {
    private readonly emitter = new EventEmitter();
    on(event: string, listener: (...args: string[]) => void): void {
        this.emitter.on(event, listener);
    }
    emit(event: string, ...args: string[]): void {
        this.emitter.emit(event, ...args);
    }
}
