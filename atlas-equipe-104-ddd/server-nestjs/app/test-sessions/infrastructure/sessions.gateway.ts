import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionUseCases } from '@app/test-sessions/application/session-use-cases';
import { SessionActor } from '@app/test-sessions/application/ports';
import { SocketRealtime } from './socket-realtime';
import {
    CreateSessionRequest,
    JoinSessionRequest,
    ResumeSessionRequest,
    ConfigureSessionRequest,
    ChatRequest,
    MoveRequest,
} from './session-commands';
@WebSocketGateway({ cors: { origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:4200' }, maxHttpBufferSize: 1000000 })
export class SessionsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    constructor(
        private readonly sessions: SessionUseCases,
        private readonly realtime: SocketRealtime,
    ) {}
    afterInit(server: Server): void {
        this.realtime.attach(server);
    }
    async handleConnection(input: Socket): Promise<void> {
        const socket = input;
        try {
            const actor = await this.sessions.connect(socket.id, socket.handshake.auth.token);
            // A client may leave while its guest identity is being resolved.
            if (!socket.connected) this.sessions.disconnect(actor);
            else socket.data.actor = actor;
        } catch {
            socket.emit('revoked', 'Cette connexion n’est plus valide ou est déjà utilisée.');
            socket.disconnect();
        }
    }
    handleDisconnect(socket: Socket): void {
        this.sessions.disconnect(socket.data.actor);
    }
    private actor(socket: Socket): SessionActor {
        if (!socket.data.actor) throw new Error('Connexion en cours. Réessayez.');
        return socket.data.actor;
    }
    private result(action: () => unknown): unknown {
        try {
            return action();
        } catch (error) {
            return { error: error.message };
        }
    }
    @SubscribeMessage('list') list(): void {
        this.sessions.list();
    }
    @SubscribeMessage('create-session') create(@ConnectedSocket() socket: Socket, @MessageBody() body: CreateSessionRequest): unknown {
        return this.result(() => {
            return { id: this.sessions.create(this.actor(socket), body) };
        });
    }
    @SubscribeMessage('join-session') join(@ConnectedSocket() socket: Socket, @MessageBody() body: JoinSessionRequest): unknown {
        return this.result(() => {
            return { id: this.sessions.join(this.actor(socket), body.id, body.pin) };
        });
    }
    @SubscribeMessage('leave-session') leave(@ConnectedSocket() socket: Socket, @MessageBody() body: string): unknown {
        return this.result(() => {
            this.sessions.leave(this.actor(socket), body);
            return { ok: true };
        });
    }
    @SubscribeMessage('close-session') closeSession(@ConnectedSocket() socket: Socket, @MessageBody() body: string): unknown {
        return this.result(() => {
            this.sessions.closeSession(this.actor(socket), body);
            return { ok: true };
        });
    }
    @SubscribeMessage('resume-session') resume(@ConnectedSocket() socket: Socket, @MessageBody() body: ResumeSessionRequest): unknown {
        return this.result(() => {
            return { id: this.sessions.resume(this.actor(socket), body.id, body.map) };
        });
    }
    @SubscribeMessage('configure') configure(
        @ConnectedSocket() socket: Socket,
        @MessageBody() body: ConfigureSessionRequest,
    ): unknown {
        return this.result(() => {
            this.sessions.configure(this.actor(socket), body.id, body.config);
            return { ok: true };
        });
    }
    @SubscribeMessage('chat') chat(@ConnectedSocket() socket: Socket, @MessageBody() body: ChatRequest): unknown {
        return this.result(() => {
            this.sessions.chat(this.actor(socket), body.id, body.text);
            return { ok: true };
        });
    }
    @SubscribeMessage('move') move(@ConnectedSocket() socket: Socket, @MessageBody() body: MoveRequest): unknown {
        return this.result(() => {
            this.sessions.move(this.actor(socket), body.id, body.destination);
            return { ok: true };
        });
    }
    @SubscribeMessage('cancel-move') cancel(@ConnectedSocket() socket: Socket, @MessageBody() body: string): unknown {
        return this.result(() => {
            this.sessions.cancel(this.actor(socket), body);
            return { ok: true };
        });
    }
}
