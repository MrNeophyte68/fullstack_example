import { User, TestSession } from '@common/contracts/models';
import { ClientDependencies, RealtimeConnection, SessionCreated } from './ports';
interface LoginResult {
    user: User;
    token: string;
}
export class AtlasClient {
    token: string;
    adminToken = '';
    private socket?: RealtimeConnection;
    private disposed = false;
    onRevoked?: () => void;
    onSessionClosed?: () => void;
    onMapRemoved?: (id: string) => void;
    constructor(private readonly dependencies: ClientDependencies) {
        this.token = dependencies.storage.getItem('hex-token') ?? '';
    }
    request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
        return this.dependencies.http.request<T>(path, method, body, { token: this.token, adminToken: this.adminToken });
    }
    emit<T = SessionCreated>(event: string, body?: unknown): Promise<T> {
        if (!this.socket?.connected) return Promise.reject(new Error('Connexion temps réel indisponible.'));
        return this.socket.request<T>(event, body);
    }
    async initialize(): Promise<void> {
        if (this.token) {
            try {
                this.dependencies.state.user.set(await this.request<User>('auth/me'));
            } catch {
                this.clear();
            }
        }
        this.connect();
    }
    async login(name: string, password: string, register: boolean): Promise<void> {
        const result = await this.request<LoginResult>(`auth/${register ? 'register' : 'login'}`, 'POST', { name, password });
        this.token = result.token;
        this.dependencies.storage.setItem('hex-token', this.token);
        this.dependencies.state.user.set(result.user);
        this.connect();
    }
    async logout(): Promise<void> {
        await this.request('auth/logout', 'POST');
        this.clear();
        this.connect();
        this.onRevoked?.();
    }
    dispose(): void {
        this.disposed = true;
        this.dependencies.state.connected.set(false);
        this.socket?.disconnect();
        this.socket = undefined;
    }
    private clear(): void {
        this.token = '';
        this.dependencies.storage.removeItem('hex-token');
        this.dependencies.storage.removeItem('hex-draft');
        this.dependencies.storage.removeItem('hex-hosted-session');
        this.dependencies.state.user.set(null);
        this.dependencies.state.session.set(null);
    }
    private connect(): void {
        if (this.disposed) return;
        this.dependencies.state.connected.set(false);
        this.socket?.disconnect();
        const socket = this.dependencies.realtime.connect(this.token);
        this.socket = socket;
        socket.on('connect', () => {
            this.dependencies.state.connected.set(true);
            socket.send('list');
        });
        socket.on('disconnect', () => this.dependencies.state.connected.set(false));
        socket.on('connect_error', () => this.dependencies.state.connected.set(false));
        socket.on('identity', (user: User) => this.dependencies.state.identity.set(user));
        socket.on('sessions', (sessions: TestSession[]) => this.dependencies.state.sessions.set(sessions));
        socket.on('session', (session: TestSession) => this.dependencies.state.session.set(session));
        socket.on('maps-changed', () => this.dependencies.state.mapRevision.update((value) => value + 1));
        socket.on('map-removed', (id: string) => this.onMapRemoved?.(id));
        socket.on('revoked', (reason: string) => {
            this.clear();
            this.dependencies.state.notice.set(reason);
            this.onRevoked?.();
            socket.disconnect();
            this.connect();
        });
        socket.on('session-closed', (reason: string) => {
            this.dependencies.state.session.set(null);
            this.dependencies.state.notice.set(reason);
            this.onSessionClosed?.();
        });
    }
}
