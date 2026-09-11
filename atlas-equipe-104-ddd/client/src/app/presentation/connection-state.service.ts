import { MapClient } from '@app/application/map-client';
import { AccountClient } from '@app/application/account-client';
import { SessionClient } from '@app/application/session-client';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { User, TestSession } from '@common/contracts/models';
import { AtlasClient } from '@app/application/atlas-client';
import { SessionCreated } from '@app/application/ports';
import { HTTP_PORT, REALTIME_PORT, STORAGE_PORT } from '@app/presentation/di.tokens';
@Injectable({ providedIn: 'root' })
export class ConnectionStateService implements OnDestroy {
    readonly maps = new MapClient(this);
    readonly accounts = new AccountClient(this);
    readonly tests = new SessionClient(this);
    readonly user = signal<User | null>(null);
    readonly identity = signal<User | null>(null);
    readonly sessions = signal<TestSession[]>([]);
    readonly session = signal<TestSession | null>(null);
    readonly notice = signal('');
    readonly connected = signal(false);
    readonly mapRevision = signal(0);
    private readonly client = new AtlasClient({
        http: inject(HTTP_PORT),
        realtime: inject(REALTIME_PORT),
        storage: inject(STORAGE_PORT),
        state: this,
    });
    get adminToken(): string {
        return this.client.adminToken;
    }
    set adminToken(value: string) {
        this.client.adminToken = value;
    }
    set onRevoked(value: () => void) {
        this.client.onRevoked = value;
    }
    set onSessionClosed(value: () => void) {
        this.client.onSessionClosed = value;
    }
    set onMapRemoved(value: (id: string) => void) {
        this.client.onMapRemoved = value;
    }
    ngOnDestroy(): void {
        this.client.dispose();
    }
    initialize(): Promise<void> {
        return this.client.initialize();
    }
    login(name: string, password: string, register: boolean): Promise<void> {
        return this.client.login(name, password, register);
    }
    logout(): Promise<void> {
        return this.client.logout();
    }
    request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
        return this.client.request(path, method, body);
    }
    emit<T = SessionCreated>(event: string, body?: unknown): Promise<T> {
        return this.client.emit(event, body);
    }
}
