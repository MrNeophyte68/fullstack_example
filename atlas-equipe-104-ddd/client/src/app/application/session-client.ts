import { MapData, TestSession, TravelConfig } from '@common/domain/models';
import { CommandPort } from './command-port';
import { SessionCreated } from './ports';
export interface CreateSessionCommand {
    map: MapData;
    mapId?: string;
    mapName: string;
    type: TestSession['type'];
    pin?: string;
}
export class SessionClient {
    constructor(private readonly remote: CommandPort) {}
    create(command: CreateSessionCommand): Promise<SessionCreated> {
        return this.remote.emit('create-session', command);
    }
    join(id: string, pin?: string): Promise<SessionCreated> {
        return this.remote.emit('join-session', { id, pin });
    }
    leave(id: string): Promise<void> {
        return this.remote.emit('leave-session', id);
    }
    close(id: string): Promise<void> {
        return this.remote.emit('close-session', id);
    }
    resume(id: string, map: MapData): Promise<SessionCreated> {
        return this.remote.emit('resume-session', { id, map });
    }
    configure(id: string, config: TravelConfig): Promise<void> {
        return this.remote.emit('configure', { id, config });
    }
    chat(id: string, text: string): Promise<void> {
        return this.remote.emit('chat', { id, text });
    }
    move(id: string, destination: string): Promise<void> {
        return this.remote.emit('move', { id, destination });
    }
    cancel(id: string): Promise<void> {
        return this.remote.emit('cancel-move', id);
    }
}
