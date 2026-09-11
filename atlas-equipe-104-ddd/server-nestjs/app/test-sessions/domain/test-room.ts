import { MapData, MapObject, Movement, Player, TravelConfig, DEFAULT_CONFIG, TestSession, User } from '@common/domain/models';

import { key, shortestPath, travelTime, validateMap } from '@common/domain/hex';
import { checkMapData } from '@common/domain/map-validation';
import { DomainError } from '@common/domain/errors';
import {
    PLAYER_LIMIT,
    MAX_MAP_NAME_LENGTH,
    MIN_TRAVEL_MS,
    MAX_TRAVEL_MS,
    MIN_MULTIPLIER,
    MAX_MULTIPLIER,
    MAX_CHAT_LENGTH,
} from './session.constants';
export interface CreateSession {
    map: MapData;
    mapId?: string;
    mapName: string;
    type: TestSession['type'];
    pin?: string;
}
export class TestRoom {
    private constructor(
        private readonly data: TestSession,
        readonly pinHash?: string,
    ) {}
    static validate(command: CreateSession): void {
        TestRoom.validateMap(command.map);
        if (!['solo', 'public', 'protected'].includes(command.type)) throw new DomainError('invalid', 'Type de session invalide.');
        if (command.type === 'protected' && !/^\d{4}$/.test(command.pin ?? ''))
            throw new DomainError('invalid', 'Le NIP doit contenir quatre chiffres.');
    }
    static create(id: string, host: User, command: CreateSession, pinHash?: string): TestRoom {
        TestRoom.validate(command);
        return new TestRoom(
            {
                id,
                hostId: host.id,
                hostName: host.name,
                mapId: command.mapId,
                mapName: String(command.mapName).slice(0, MAX_MAP_NAME_LENGTH),
                type: command.type,
                map: structuredClone(command.map),
                config: { ...DEFAULT_CONFIG },
                players: [],
                messages: [],
            },
            pinHash,
        );
    }
    private static validateMap(map: MapData): void {
        checkMapData(map);
        const errors = validateMap(map);
        if (errors.length) throw new DomainError('invalid', errors.join('\n'));
    }
    get id(): string {
        return this.data.id;
    }
    get hostId(): string {
        return this.data.hostId;
    }
    get mapId(): string | undefined {
        return this.data.mapId;
    }
    snapshot(): TestSession {
        return structuredClone(this.data);
    }
    contains(id: string): boolean {
        return this.data.players.some((player) => player.id === id);
    }
    authorize(id: string, host = false): void {
        if (host ? this.hostId !== id : !this.contains(id)) throw new DomainError('forbidden', 'Session inaccessible.');
    }
    join(user: User, choice: (count: number) => number, now: number): void {
        if (this.contains(user.id)) return;
        // Keep one place available for the host while they edit the map.
        const limit = this.contains(this.hostId) || user.id === this.hostId ? PLAYER_LIMIT : PLAYER_LIMIT - 1;
        if (this.data.players.length >= limit || (this.data.type === 'solo' && user.id !== this.hostId))
            throw new DomainError('conflict', 'Cette session est complète.');
        const occupied = new Set(this.data.players.map((player) => player.tile));
        const starts = this.data.map.tiles.filter((tile) => tile.object === MapObject.Spawn && !occupied.has(key(tile)));
        if (!starts.length) throw new DomainError('conflict', 'Aucun point de départ libre. Réessayez après un déplacement.');
        const colors = ['#ffcf5c', '#6be1ed', '#f482bc', '#bca2ff'];
        this.data.players.push({
            id: user.id,
            name: user.name,
            color: colors.find((color) => !this.data.players.some((player) => player.color === color)),
            tile: key(starts[choice(starts.length)]),
        });
        this.system(`${user.name} a rejoint la session.`, now);
    }
    leave(id: string, now: number): boolean {
        const player = this.data.players.find((item) => item.id === id);
        if (!player) return false;
        this.data.players = this.data.players.filter((item) => item.id !== id);
        this.system(`${player.name} a quitté la session.`, now);
        return true;
    }
    resume(map: MapData, choice: (count: number) => number): void {
        TestRoom.validateMap(map);
        this.data.map = structuredClone(map);
        const starts = this.data.map.tiles.filter((tile) => tile.object === MapObject.Spawn);
        this.data.players.forEach((input) => {
            const player = input;
            player.tile = key(starts.splice(choice(starts.length), 1)[0]);
            player.movement = undefined;
        });
    }
    configure(config: TravelConfig): void {
        if (
            !config ||
            !Number.isFinite(config.base) ||
            config.base < MIN_TRAVEL_MS ||
            config.base > MAX_TRAVEL_MS ||
            ['grass', 'forest', 'desert', 'road'].some(
                (field) => !Number.isFinite(config[field]) || config[field] < MIN_MULTIPLIER || config[field] > MAX_MULTIPLIER,
            )
        )
            throw new DomainError('invalid', 'Valeurs de déplacement invalides.');
        this.data.config = { base: config.base, grass: config.grass, forest: config.forest, desert: config.desert, road: config.road };
    }
    chat(user: User, text: string, now: number): void {
        if (typeof text !== 'string' || !text.trim() || text.length > MAX_CHAT_LENGTH)
            throw new DomainError('invalid', 'Le message doit contenir de 1 à 200 caractères.');
        this.data.messages.push({ name: user.name, text: text.trim(), time: now });
    }
    move(id: string, destination: string, now: number): Movement {
        const player = this.player(id);
        if (player.movement) throw new DomainError('conflict', 'Déplacement déjà en cours.');
        const path = shortestPath(this.data.map, player.tile, destination, this.data.config);
        if (!path.length) throw new DomainError('invalid', 'Destination inaccessible.');
        return this.advance(player, path, now);
    }
    arrive(id: string, movement: Movement, now: number): Movement | undefined {
        const player = this.data.players.find((item) => item.id === id);
        if (player?.movement !== movement) return undefined;
        player.tile = movement.to;
        return this.advance(player, movement.remaining, now);
    }
    cancel(id: string): void {
        const player = this.player(id);
        if (player.movement) player.movement.remaining = [];
    }
    private advance(input: Player, path: string[], now: number): Movement | undefined {
        const player = input;
        const destination = path[0];
        player.movement = destination
            ? {
                  from: player.tile,
                  to: destination,
                  startedAt: now,
                  duration: travelTime(
                      this.data.map.tiles.find((tile) => key(tile) === destination),
                      this.data.config,
                  ),
                  remaining: path.slice(1),
              }
            : undefined;
        return player.movement;
    }
    private player(id: string): Player {
        this.authorize(id);
        return this.data.players.find((item) => item.id === id);
    }
    private system(text: string, now: number): void {
        this.data.messages.push({ name: 'Système', text, time: now, system: true });
    }
}
