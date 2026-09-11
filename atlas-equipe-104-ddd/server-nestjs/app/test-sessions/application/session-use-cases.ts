import { MapData, Movement, TravelConfig } from '@common/domain/models';
import { User } from '@common/contracts/models';
import { DomainError } from '@common/domain/errors';
import { TestRoom, CreateSession } from '@app/test-sessions/domain/test-room';
import { GUEST_SUFFIX_MIN, GUEST_SUFFIX_MAX } from './session.constants';
import { SessionActor, SessionDependencies } from './ports';
export class SessionUseCases {
    constructor(private readonly dependencies: SessionDependencies) {
        const { events, realtime, rooms } = dependencies;
        events.on('maps-changed', () => realtime.all('maps-changed', undefined));
        events.on('logout', (id, reason) => {
            this.closeHosted(id, reason);
            this.leaveAll(id);
            realtime.room(`user:${id}`, 'revoked', reason);
        });
        events.on('editor-left', (id) => this.closeHosted(id, 'L’hôte a quitté l’éditeur.'));
        events.on('map-deleted', (id) => {
            for (const room of rooms.values()) if (room.mapId === id) this.close(room, 'La carte a été supprimée ou rendue privée.');
            realtime.all('map-removed', id);
        });
    }
    async connect(connectionId: string, token?: string): Promise<SessionActor> {
        const { identity, runtime, realtime, rooms } = this.dependencies;
        let user: User;
        if (token) {
            user = identity.bind(token, connectionId);
            realtime.join(connectionId, `user:${user.id}`);
        } else {
            let name: string;
            do {
                name = `Visiteur-${runtime.integer(GUEST_SUFFIX_MIN, GUEST_SUFFIX_MAX)}`;
            } while (await identity.nameExists(name));
            user = { id: runtime.id(), name, createdAt: new Date(runtime.now()).toISOString() };
        }
        realtime.connection(connectionId, 'identity', user);
        for (const room of rooms.values())
            if (room.contains(user.id)) {
                realtime.join(connectionId, room.id);
                realtime.connection(connectionId, 'session', room.snapshot());
            }
        this.list();
        return { connectionId, user, token };
    }
    disconnect(actor: SessionActor): void {
        if (!actor) return;
        if (actor.token) this.dependencies.identity.disconnect(actor.token, actor.connectionId);
        else this.leaveAll(actor.user.id);
    }
    private user(actor: SessionActor): User {
        if (!actor) throw new DomainError('unauthorized', 'Connexion en cours. Réessayez.');
        return actor.token ? this.dependencies.identity.require(actor.token) : actor.user;
    }
    list(): void {
        const rooms = [...this.dependencies.rooms.values()].map((room) => room.snapshot());
        this.dependencies.realtime.all(
            'sessions',
            rooms.filter((room) => room.type !== 'solo').map((room) => ({ ...room, messages: [] })),
        );
    }
    create(actor: SessionActor, command: CreateSession): string {
        const { identity, maps, runtime, passwords, rooms } = this.dependencies;
        const user = identity.require(actor?.token);
        TestRoom.validate(command);
        if (command.mapId && maps.lockedBy(command.mapId) !== user.id)
            throw new DomainError('conflict', 'La carte doit être ouverte dans votre éditeur.');
        this.closeHosted(user.id, 'L’hôte a ouvert une autre session.');
        const room = TestRoom.create(
            runtime.id(),
            user,
            command,
            command.type === 'protected' ? passwords.hash(command.pin) : undefined,
        );
        rooms.set(room.id, room);
        this.addPlayer(room, actor);
        return room.id;
    }
    join(actor: SessionActor, id: string, pin?: string): string {
        this.dependencies.identity.rateLimit(actor.connectionId);
        const user = this.user(actor);
        const room = this.dependencies.rooms.get(id);
        if (!room) throw new DomainError('not-found', 'Cette session est terminée.');
        if (
            room.pinHash &&
            user.id !== room.hostId &&
            (typeof pin !== 'string' || !/^\d{4}$/.test(pin) || !this.dependencies.passwords.matches(pin, room.pinHash))
        )
            throw new DomainError('forbidden', 'NIP incorrect.');
        this.addPlayer(room, actor);
        return room.id;
    }
    leave(actor: SessionActor, id: string): void {
        const room = this.roomFor(actor, id);
        room.leave(this.user(actor).id, this.dependencies.runtime.now());
        this.dependencies.realtime.leave(actor.connectionId, id);
        this.broadcast(room);
    }
    closeSession(actor: SessionActor, id: string): void {
        this.close(this.roomFor(actor, id, true), 'L’hôte a fermé la session.');
    }
    resume(actor: SessionActor, id: string, map: MapData): string {
        const room = this.roomFor(actor, id, true);
        room.resume(map, (count) => this.dependencies.runtime.integer(count));
        this.addPlayer(room, actor);
        return room.id;
    }
    configure(actor: SessionActor, id: string, config: TravelConfig): void {
        const room = this.roomFor(actor, id, true);
        room.configure(config);
        this.broadcast(room);
    }
    chat(actor: SessionActor, id: string, text: string): void {
        this.dependencies.identity.rateLimit(`chat:${actor.connectionId}`);
        const room = this.roomFor(actor, id);
        room.chat(this.user(actor), text, this.dependencies.runtime.now());
        this.broadcast(room);
    }
    move(actor: SessionActor, id: string, destination: string): void {
        const room = this.roomFor(actor, id);
        const user = this.user(actor);
        this.schedule(room, user.id, room.move(user.id, destination, this.dependencies.runtime.now()));
    }
    cancel(actor: SessionActor, id: string): void {
        const room = this.roomFor(actor, id);
        room.cancel(this.user(actor).id);
        this.broadcast(room);
    }
    private schedule(room: TestRoom, userId: string, movement?: Movement): void {
        this.broadcast(room);
        if (!movement) return;
        this.dependencies.runtime.later(() => {
            if (this.dependencies.rooms.get(room.id) !== room) return;
            this.schedule(room, userId, room.arrive(userId, movement, this.dependencies.runtime.now()));
        }, movement.duration);
    }
    private roomFor(actor: SessionActor, id: string, host = false): TestRoom {
        const user = this.user(actor);
        const room = this.dependencies.rooms.get(id);
        if (!room) throw new DomainError('not-found', 'Session inaccessible.');
        room.authorize(user.id, host);
        return room;
    }
    private addPlayer(room: TestRoom, actor: SessionActor): void {
        const user = this.user(actor);
        room.join(user, (count) => this.dependencies.runtime.integer(count), this.dependencies.runtime.now());
        for (const other of this.dependencies.rooms.values())
            if (other.id !== room.id && other.leave(user.id, this.dependencies.runtime.now())) {
                this.dependencies.realtime.leave(actor.connectionId, other.id);
                this.broadcast(other);
            }
        this.dependencies.realtime.join(actor.connectionId, room.id);
        this.broadcast(room);
    }
    private broadcast(room: TestRoom): void {
        this.dependencies.realtime.room(room.id, 'session', room.snapshot());
        this.list();
    }
    private close(room: TestRoom, reason: string): void {
        this.dependencies.realtime.room(room.id, 'session-closed', reason);
        this.dependencies.realtime.evict(room.id);
        this.dependencies.rooms.delete(room.id);
        this.list();
    }
    private closeHosted(id: string, reason: string): void {
        for (const room of this.dependencies.rooms.values()) if (room.hostId === id) this.close(room, reason);
    }
    private leaveAll(id: string): void {
        for (const room of this.dependencies.rooms.values()) if (room.leave(id, this.dependencies.runtime.now())) this.broadcast(room);
    }
}
