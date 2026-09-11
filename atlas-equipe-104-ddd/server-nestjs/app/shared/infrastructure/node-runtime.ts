import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { Runtime } from '@app/shared/application/ports';
const TOKEN_BYTES = 32;
export class NodeRuntime implements Runtime {
    now(): number {
        return Date.now();
    }
    token(): string {
        return randomBytes(TOKEN_BYTES).toString('hex');
    }
    id(): string {
        return randomUUID();
    }
    integer(min: number, max?: number): number {
        return max === undefined ? randomInt(min) : randomInt(min, max);
    }
    later(action: () => void, milliseconds: number): void {
        setTimeout(action, milliseconds).unref();
    }
}
