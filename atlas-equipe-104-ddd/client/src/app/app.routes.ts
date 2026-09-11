import { Routes } from '@angular/router';
import {
    initializeGuard,
    authenticatedGuard,
    administratorGuard,
    editorGuard,
    sessionGuard,
} from './presentation/routing/access.guards';
import { editorExitGuard, testExitGuard } from './presentation/routing/exit.guards';
export const APP_ROUTES: Routes = [
    {
        path: '',
        canActivateChild: [initializeGuard],
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'home' },
            {
                path: 'home',
                data: { view: 'home' },
                loadComponent: () => import('./pages/home-page/home-page.component').then((module) => module.HomePageComponent),
            },
            {
                path: 'maps',
                data: { view: 'maps' },
                canActivate: [authenticatedGuard],
                loadComponent: () => import('./pages/maps-page/maps-page.component').then((module) => module.MapsPageComponent),
            },
            {
                path: 'editor',
                data: { view: 'editor' },
                canActivate: [authenticatedGuard, editorGuard],
                canDeactivate: [editorExitGuard],
                loadComponent: () => import('./pages/editor-page/editor-page.component').then((module) => module.EditorPageComponent),
            },
            {
                path: 'sessions',
                data: { view: 'sessions' },
                loadComponent: () =>
                    import('./pages/sessions-page/sessions-page.component').then((module) => module.SessionsPageComponent),
            },
            {
                path: 'test',
                data: { view: 'test' },
                canActivate: [sessionGuard],
                canDeactivate: [testExitGuard],
                loadComponent: () => import('./pages/test-page/test-page.component').then((module) => module.TestPageComponent),
            },
            {
                path: 'admin',
                data: { view: 'admin' },
                canActivate: [administratorGuard],
                loadComponent: () => import('./pages/admin-page/admin-page.component').then((module) => module.AdminPageComponent),
            },
            { path: '**', redirectTo: 'home' },
        ],
    },
];
