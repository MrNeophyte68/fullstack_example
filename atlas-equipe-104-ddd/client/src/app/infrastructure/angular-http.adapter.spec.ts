import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { AngularHttpAdapter } from './angular-http.adapter';
describe('Angular HTTP Observable adapter', () => {
    let adapter: AngularHttpAdapter;
    let http: HttpTestingController;
    const credentials = { token: 'account-token', adminToken: 'admin-token' };
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        adapter = new AngularHttpAdapter(TestBed.inject(HttpClient));
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => http.verify());
    it('starts its cold HTTP stream only on subscribe and completes after the response', () => {
        const next = vi.fn();
        const response$ = adapter.request$<string[]>('maps', 'GET', undefined, credentials);
        http.expectNone('/api/maps');
        const subscription = response$.subscribe(next);
        const request = http.expectOne('/api/maps');
        expect(request.request.headers.get('Authorization')).toBe('Bearer account-token');
        expect(request.request.headers.get('x-admin-token')).toBe('admin-token');
        request.flush(['map']);
        expect(next).toHaveBeenCalledWith(['map']);
        expect(subscription.closed).toBe(true);
    });
    it('bridges the application Promise port without changing the command body', async () => {
        const body = { name: 'Owner', password: 'Password2026' };
        const result = adapter.request('auth/login', 'POST', body, credentials);
        const request = http.expectOne('/api/auth/login');
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual(body);
        request.flush({ token: 'new-token' });
        await expect(result).resolves.toEqual({ token: 'new-token' });
    });
    it('cancels the underlying HTTP request when an Observable consumer unsubscribes', () => {
        const next = vi.fn();
        const subscription = adapter.request$('maps', 'GET', undefined, credentials).subscribe(next);
        const request = http.expectOne('/api/maps');
        subscription.unsubscribe();
        expect(request.cancelled).toBe(true);
        expect(next).not.toHaveBeenCalled();
    });
    it('maps server validation errors into the existing application error message', async () => {
        const result = adapter.request('maps', 'POST', {}, credentials);
        const assertion = expect(result).rejects.toThrow('Nom requis\nCarte invalide');
        http.expectOne('/api/maps').flush({ message: ['Nom requis', 'Carte invalide'] }, { status: 400, statusText: 'Bad Request' });
        await assertion;
    });
    it('reports network errors through the Observable error channel', () => {
        const error = vi.fn();
        adapter.request$('maps', 'GET', undefined, credentials).subscribe({ error });
        http.expectOne('/api/maps').error(new ProgressEvent('error'));
        expect(error.mock.calls[0][0].message).toContain('inaccessible');
    });
});
