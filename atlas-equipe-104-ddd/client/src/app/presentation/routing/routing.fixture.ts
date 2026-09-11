import { signal } from '@angular/core';
import { vi } from 'vitest';
import { User, MapRecord, TestSession, DEFAULT_CONFIG } from '@common/models';
import { createMap } from '@common/hex';
export const OWNER: User = { id: 'owner', name: 'Owner', createdAt: '' };
export const SAVED_MAP: MapRecord = {
    ...createMap(),
    id: 'map',
    ownerId: OWNER.id,
    ownerName: OWNER.name,
    name: 'World',
    visibility: 'private',
    updatedAt: '',
};
export const ROOM: TestSession = {
    id: 'room',
    hostId: OWNER.id,
    hostName: OWNER.name,
    mapName: 'World',
    type: 'public',
    map: createMap(),
    config: DEFAULT_CONFIG,
    messages: [],
    players: [],
};
export class RoutingApi {
    readonly user = signal<User | null>(OWNER);
    readonly identity = signal<User | null>(OWNER);
    readonly sessions = signal<TestSession[]>([]);
    readonly session = signal<TestSession | null>(null);
    readonly notice = signal('');
    readonly connected = signal(true);
    readonly mapRevision = signal(0);
    adminToken = '';
    onRevoked?: () => void;
    onSessionClosed?: () => void;
    onMapRemoved?: (id: string) => void;
    readonly initialize = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    readonly login = vi.fn(async () => {
        this.user.set(OWNER);
        this.identity.set(OWNER);
    });
    readonly maps = {
        list: vi.fn().mockResolvedValue([]),
        lock: vi.fn().mockResolvedValue(SAVED_MAP),
        unlock: vi.fn().mockResolvedValue(undefined),
    };
    readonly accounts = { adminLogin: vi.fn().mockResolvedValue({ token: 'admin' }), users: vi.fn().mockResolvedValue([]) };
    readonly tests = { leave: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
}
