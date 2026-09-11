import { vi } from 'vitest';
import { AtlasClient } from './atlas-client';
import { ClientDependencies, StateCell, RealtimeConnection } from './ports';
import { User } from '@common/domain/models';
function cell<T>(initial: T): StateCell<T> {
    let value = initial;
    return Object.assign(() => value, {
        set: (next: T) => {
            value = next;
        },
        update: (change: (item: T) => T) => {
            value = change(value);
        },
    });
}
describe('Atlas client application with fake transport and storage', () => {
    let dependencies: ClientDependencies;
    let client: AtlasClient;
    let storage: Map<string, string>;
    let handlers: Map<string, (value: unknown) => void>;
    let connection: RealtimeConnection;
    const owner: User = { id: 'owner', name: 'Owner', createdAt: '' };
    beforeEach(() => {
        storage = new Map();
        handlers = new Map();
        connection = {
            connected: true,
            on: <T>(event: string, handler: (payload: T) => void): void => {
                handlers.set(event, (payload) => handler(payload as T));
            },
            send: vi.fn(),
            request: vi.fn(),
            disconnect: vi.fn(),
        };
        dependencies = {
            http: { request: vi.fn() },
            realtime: { connect: vi.fn().mockReturnValue(connection) },
            storage: {
                getItem: (name) => storage.get(name) ?? null,
                setItem: (name, value) => {
                    storage.set(name, value);
                },
                removeItem: (name) => {
                    storage.delete(name);
                },
            },
            state: {
                user: cell(null),
                identity: cell(null),
                sessions: cell([]),
                session: cell(null),
                notice: cell(''),
                connected: cell(false),
                mapRevision: cell(0),
            },
        };
        client = new AtlasClient(dependencies);
    });
    it('clears stale credentials and drafts before connecting as a guest', async () => {
        client.token = 'expired';
        storage.set('hex-draft', 'draft');
        vi.mocked(dependencies.http.request).mockRejectedValue(new Error('expired'));
        await client.initialize();
        expect(client.token).toBe('');
        expect(storage.has('hex-draft')).toBe(false);
        expect(dependencies.realtime.connect).toHaveBeenCalledWith('');
    });
    it('persists a successful login and passes its token through the HTTP port', async () => {
        vi.mocked(dependencies.http.request).mockResolvedValue({ user: owner, token: 'valid' });
        await client.login('Owner', 'Password2026', false);
        expect(storage.get('hex-token')).toBe('valid');
        expect(dependencies.state.user()).toEqual(owner);
        await client.request('maps');
        expect(dependencies.http.request).toHaveBeenLastCalledWith('maps', 'GET', undefined, { token: 'valid', adminToken: '' });
    });
    it('clears user/session state and reconnects when the server revokes access', async () => {
        vi.mocked(dependencies.http.request).mockResolvedValue({ user: owner, token: 'valid' });
        await client.login('Owner', 'Password2026', false);
        client.onRevoked = vi.fn();
        handlers.get('revoked')?.('Removed');
        expect(dependencies.state.user()).toBeNull();
        expect(dependencies.state.notice()).toBe('Removed');
        expect(client.onRevoked).toHaveBeenCalledOnce();
        expect(connection.disconnect).toHaveBeenCalled();
        expect(dependencies.realtime.connect).toHaveBeenLastCalledWith('');
    });
    it('rejects realtime commands before a connection exists', async () => {
        await expect(client.emit('move', {})).rejects.toThrow('indisponible');
        expect(connection.request).not.toHaveBeenCalled();
    });
    it('does not reconnect after disposal while authentication restoration is pending', async () => {
        let resolveProfile: (user: User) => void;
        vi.mocked(dependencies.http.request).mockReturnValue(
            new Promise((resolve) => {
                resolveProfile = resolve;
            }),
        );
        client.token = 'valid';
        const initializing = client.initialize();
        client.dispose();
        resolveProfile!(owner);
        await initializing;
        expect(dependencies.realtime.connect).not.toHaveBeenCalled();
    });
});
