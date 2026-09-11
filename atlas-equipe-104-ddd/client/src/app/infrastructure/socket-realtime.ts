import { io } from 'socket.io-client';
import { RealtimePort, RealtimeConnection } from '@app/application/ports';
import { SocketConnection } from './socket-connection';
export class SocketRealtime implements RealtimePort {
    connect(token: string): RealtimeConnection {
        return new SocketConnection(io({ auth: { token }, reconnection: true }));
    }
}
