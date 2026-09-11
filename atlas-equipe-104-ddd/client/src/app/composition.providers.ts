import { provideRouter, withHashLocation, withRouterConfig } from '@angular/router';
import { APP_ROUTES } from './app.routes';
import { EnvironmentProviders, Provider } from '@angular/core';
import { HTTP_PORT, REALTIME_PORT, STORAGE_PORT } from './presentation/di.tokens';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { AngularHttpAdapter } from './infrastructure/angular-http.adapter';
import { SocketRealtime } from './infrastructure/socket-realtime';
import { BrowserStorage } from './infrastructure/browser-storage';
export const APPLICATION_PROVIDERS: (Provider | EnvironmentProviders)[] = [
    provideHttpClient(),
    provideRouter(APP_ROUTES, withHashLocation(), withRouterConfig({ canceledNavigationResolution: 'computed' })),
    { provide: HTTP_PORT, useFactory: (http: HttpClient) => new AngularHttpAdapter(http), deps: [HttpClient] },
    { provide: REALTIME_PORT, useFactory: () => new SocketRealtime() },
    { provide: STORAGE_PORT, useFactory: () => new BrowserStorage() },
];
