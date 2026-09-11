import { Socket } from 'socket.io-client';
import { Observable, ReplaySubject, firstValueFrom, fromEventPattern, takeUntil, throwIfEmpty } from 'rxjs';
import { RealtimeConnection } from '@app/application/ports';
import { SOCKET_TIMEOUT_MS } from './socket.constants';
interface AckResponse {
    error?: string;
}
export class SocketConnection implements RealtimeConnection {
    private readonly closed$ = new ReplaySubject<void>(1);
    private closed = false;
    constructor(private readonly socket: Socket) {}
    get connected(): boolean {
        return !this.closed && this.socket.connected;
    }
    events$<T>(event: string): Observable<T> {
        return fromEventPattern<T>(
            (handler) => this.socket.on(event, handler),
            (handler) => this.socket.off(event, handler),
        ).pipe(takeUntil(this.closed$));
    }
    on<T>(event: string, handler: (payload: T) => void): void {
        // This callback bridge implements the application port. takeUntil owns its lifetime.
        this.events$<T>(event).subscribe(handler);
    }
    send(event: string): void {
        if (!this.closed) this.socket.emit(event);
    }
    disconnect(): void {
        if (this.closed) return;
        this.closed = true;
        this.closed$.next();
        this.closed$.complete();
        this.socket.disconnect();
    }
    request<T>(event: string, body?: unknown): Promise<T> {
        return firstValueFrom(this.request$<T>(event, body));
    }
    request$<T>(event: string, body?: unknown): Observable<T> {
        return new Observable<T>((subscriber) => {
            if (!this.connected) {
                subscriber.error(new Error('Connexion temps réel indisponible.'));
                return;
            }
            this.socket.timeout(SOCKET_TIMEOUT_MS).emit(event, body, (error: Error | null, response: T & AckResponse) => {
                if (subscriber.closed) return;
                if (error || response?.error) subscriber.error(new Error(response?.error ?? 'Le serveur ne répond pas.'));
                else {
                    subscriber.next(response);
                    subscriber.complete();
                }
            });
        }).pipe(
            takeUntil(this.closed$),
            throwIfEmpty(() => new Error('Connexion temps réel interrompue.')),
        );
    }
}
