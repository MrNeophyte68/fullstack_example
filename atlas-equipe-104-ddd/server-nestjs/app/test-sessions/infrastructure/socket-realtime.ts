import { Server } from 'socket.io';
import { Realtime } from '@app/test-sessions/application/ports';
export class SocketRealtime implements Realtime {
    private server?: Server;
    attach(server: Server): void {
        this.server = server;
    }
    all(event: string, payload: unknown): void {
        this.server?.emit(event, payload);
    }
    room(id: string, event: string, payload: unknown): void {
        this.server?.to(id).emit(event, payload);
    }
    connection(id: string, event: string, payload: unknown): void {
        this.server?.to(id).emit(event, payload);
    }
    join(connectionId: string, roomId: string): void {
        void this.server?.sockets.sockets.get(connectionId)?.join(roomId);
    }
    leave(connectionId: string, roomId: string): void {
        void this.server?.sockets.sockets.get(connectionId)?.leave(roomId);
    }
    evict(roomId: string): void {
        this.server?.in(roomId).socketsLeave(roomId);
    }
}
