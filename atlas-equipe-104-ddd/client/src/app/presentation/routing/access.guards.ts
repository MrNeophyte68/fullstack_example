import { Injector, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { catchError, filter, map, of, take, timeout } from 'rxjs';
import { AccountPresenter } from '@app/presentation/account.presenter';
import { ConnectionStateService } from '@app/presentation/connection-state.service';
import { EditorService } from '@app/presentation/editor.service';
import { StartupService } from './startup.service';
import { SESSION_RESTORE_TIMEOUT_MS } from './routing.constants';
export const initializeGuard: CanActivateChildFn = async () => {
    await inject(StartupService).initialize();
    return true;
};
export const authenticatedGuard: CanActivateFn = () => {
    const account = inject(AccountPresenter);
    if (account.api.user()) return true;
    account.returnAfterAuth = 'maps';
    account.open('login', 'Se connecter');
    return inject(Router).createUrlTree(['/home']);
};
export const editorGuard: CanActivateFn = async () => {
    const startup = inject(StartupService);
    const editor = inject(EditorService);
    const api = inject(ConnectionStateService);
    const router = inject(Router);
    if (!api.user()) return true;
    try {
        await startup.restoreEditorLock();
        return true;
    } catch (error) {
        editor.load();
        api.notice.set((error as Error).message);
        return router.createUrlTree(['/maps']);
    }
};
export const administratorGuard: CanActivateFn = () => {
    const account = inject(AccountPresenter);
    if (account.api.adminToken) return true;
    account.open('admin-login', 'Administration');
    return inject(Router).createUrlTree(['/home']);
};
export const sessionGuard: CanActivateFn = () => {
    const api = inject(ConnectionStateService);
    const startup = inject(StartupService);
    const router = inject(Router);
    if (api.session()) {
        startup.sessionRestorePending = false;
        return true;
    }
    if (!startup.sessionRestorePending) return router.createUrlTree(['/sessions']);
    startup.sessionRestorePending = false;
    // A refresh restores authentication before the socket sends the room snapshot.
    return toObservable(api.session, { injector: inject(Injector) }).pipe(
        filter((session) => session !== null),
        take(1),
        timeout({ first: SESSION_RESTORE_TIMEOUT_MS }),
        map(() => true),
        catchError(() => of(router.createUrlTree(['/sessions']))),
    );
};
