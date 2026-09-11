import { vi } from 'vitest';
import { Socket } from 'socket.io-client';
import { SocketConnection } from './socket-connection';
interface Reply {
    id: string;
}
type Ack = (error: Error | null, response?: Reply) => void;
describe('Socket.IO Observable bridge and subscription cleanup', () => {
    const setup = () => {
        const listeners = new Map<string, Set<(payload: unknown) => void>>();
        const socket = {
            connected: true,
            on: vi.fn((event: string, handler: (payload: unknown) => void) => {
                if (!listeners.has(event)) listeners.set(event, new Set());
                listeners.get(event)!.add(handler);
            }),
            off: vi.fn((event: string, handler: (payload: unknown) => void) => {
                listeners.get(event)?.delete(handler);
            }),
            emit: vi.fn(),
            timeout: vi.fn(),
            disconnect: vi.fn(),
        };
        socket.timeout.mockReturnValue(socket);
        return { socket, listeners, connection: new SocketConnection(socket as unknown as Socket) };
    };
    it('removes an event listener on unsubscribe', () => {
        const { connection, listeners, socket } = setup();
        const next = vi.fn();
        const subscription = connection.events$<string>('chat').subscribe(next);
        listeners.get('chat')?.forEach((listener) => listener('Bonjour'));
        expect(next).toHaveBeenCalledWith('Bonjour');
        subscription.unsubscribe();
        expect(listeners.get('chat')?.size).toBe(0);
        expect(socket.off).toHaveBeenCalledOnce();
    });
    it('cleans all callback-port subscriptions on disconnect and refuses late subscriptions', () => {
        const { connection, listeners, socket } = setup();
        connection.on('session', vi.fn());
        connection.on('identity', vi.fn());
        connection.disconnect();
        connection.disconnect();
        expect(listeners.get('session')?.size).toBe(0);
        expect(listeners.get('identity')?.size).toBe(0);
        expect(socket.disconnect).toHaveBeenCalledOnce();
        const next = vi.fn();
        const late = connection.events$('session').subscribe(next);
        expect(late.closed).toBe(true);
        expect(socket.on).toHaveBeenCalledTimes(2);
    });
    it('resolves a command acknowledgment once and ignores late acknowledgments', async () => {
        const { connection, socket } = setup();
        const result = connection.request<Reply>('create-session', {});
        const acknowledge = socket.emit.mock.calls[0][2] as Ack;
        acknowledge(null, { id: 'room' });
        acknowledge(null, { id: 'late' });
        await expect(result).resolves.toEqual({ id: 'room' });
    });
    it('rejects a pending command when its connection is replaced', async () => {
        const { connection } = setup();
        const result = connection.request('move', {});
        const assertion = expect(result).rejects.toThrow('interrompue');
        connection.disconnect();
        await assertion;
    });
    it('rejects commands while the transport is unavailable', async () => {
        const { connection, socket } = setup();
        socket.connected = false;
        await expect(connection.request('move')).rejects.toThrow('indisponible');
        expect(socket.emit).not.toHaveBeenCalled();
    });
});
