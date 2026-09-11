import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, firstValueFrom, throwError } from 'rxjs';
import { Credentials, HttpPort } from '@app/application/ports';
interface ApiErrorBody {
    message?: string | string[];
}
export class AngularHttpAdapter implements HttpPort {
    constructor(private readonly http: HttpClient) {}
    // The adapter keeps Angular/RxJS outside the framework-independent application port.
    request<T>(path: string, method: string, body: unknown, credentials: Credentials): Promise<T> {
        return firstValueFrom(this.request$<T>(path, method, body, credentials));
    }
    // HttpClient streams are cold: a request starts only when subscribed to.
    request$<T>(path: string, method: string, body: unknown, credentials: Credentials): Observable<T> {
        const headers = new HttpHeaders()
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${credentials.token}`)
            .set('x-admin-token', credentials.adminToken);
        return this.http
            .request<T>(method, `/api/${path}`, { body, headers })
            .pipe(catchError((error: HttpErrorResponse) => throwError(() => new Error(this.message(error)))));
    }
    private message(error: HttpErrorResponse): string {
        if (error.status === 0) return 'Le serveur est inaccessible. Vérifiez votre connexion.';
        const body: unknown = error.error;
        if (typeof body === 'object' && body !== null && 'message' in body) {
            const message = (body as ApiErrorBody).message;
            if (Array.isArray(message)) return message.join('\n');
            if (typeof message === 'string') return message;
        }
        return 'Le serveur est indisponible. Réessayez.';
    }
}
