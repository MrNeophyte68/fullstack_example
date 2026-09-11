import { User } from '@common/contracts/models';
import { IdentityAccess } from '@app/identity/application/ports';
import { MapAccess } from '@app/map-authoring/application/ports';
import { TestRoom } from '@app/test-sessions/domain/test-room';
import { Runtime, Store, PasswordHasher, EventBus } from '@app/shared/application/ports';
export interface SessionActor {
    connectionId: string;
    user: User;
    token?: string;
}
export interface Realtime {
    all(event: string, payload: unknown): void;
    room(id: string, event: string, payload: unknown): void;
    connection(id: string, event: string, payload: unknown): void;
    join(connectionId: string, roomId: string): void;
    leave(connectionId: string, roomId: string): void;
    evict(roomId: string): void;
}
export interface SessionDependencies {
    identity: IdentityAccess;
    maps: MapAccess;
    rooms: Store<TestRoom>;
    runtime: Runtime;
    passwords: PasswordHasher;
    events: EventBus;
    realtime: Realtime;
}
