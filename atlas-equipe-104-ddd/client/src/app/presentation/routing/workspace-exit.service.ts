import { Injectable, inject } from '@angular/core';
import { PRIMARY_OUTLET, Router } from '@angular/router';
import { Observable, catchError, from, map, of, switchMap } from 'rxjs';
import { AccountPresenter } from '@app/presentation/account.presenter';
import { ConnectionStateService } from '@app/presentation/connection-state.service';
import { EditorService } from '@app/presentation/editor.service';
import { NavigationStateService } from '@app/presentation/navigation-state.service';
import { STORAGE_PORT } from '@app/presentation/di.tokens';
@Injectable({ providedIn: 'root' })
export class WorkspaceExitService {
    private readonly api = inject(ConnectionStateService);
    private readonly account = inject(AccountPresenter);
    private readonly editor = inject(EditorService);
    private readonly navigation = inject(NavigationStateService);
    private readonly storage = inject(STORAGE_PORT);
    private readonly router = inject(Router);
    leaveEditor(nextUrl: string): Observable<boolean> {
        if (!this.api.user()) return of(true);
        if (this.target(nextUrl) === 'test' && this.api.session()?.hostId === this.api.user()?.id) return of(true);
        return this.confirmAndRelease();
    }
    leaveTest(nextUrl: string): Observable<boolean> {
        const session = this.api.session();
        if (!session) return of(true);
        if (session.hostId === this.api.identity()?.id && this.target(nextUrl) !== 'editor') return this.confirmAndRelease();
        return this.perform(async () => {
            await this.api.tests.leave(session.id);
            this.api.session.set(null);
        });
    }
    private confirmAndRelease(): Observable<boolean> {
        const decision$ =
            this.editor.dirty || this.navigation.hostedId
                ? this.account.confirmNavigation(
                      'Quitter l’éditeur ?',
                      'Les modifications non enregistrées seront perdues et la session de test sera fermée.',
                  )
                : of(true);
        return decision$.pipe(switchMap((approved) => (approved ? this.perform(() => this.releaseEditor()) : of(false))));
    }
    private async releaseEditor(): Promise<void> {
        this.navigation.leavingWorkspace = true;
        try {
            if (this.navigation.hostedId) await this.api.tests.close(this.navigation.hostedId);
            this.navigation.hostedId = '';
            if (this.editor.record) await this.api.maps.unlock(this.editor.record.id);
            this.api.session.set(null);
            this.storage.removeItem('hex-draft');
            this.editor.load();
        } finally {
            this.navigation.leavingWorkspace = false;
        }
    }
    private perform(action: () => Promise<void>): Observable<boolean> {
        return from(action()).pipe(
            map(() => true),
            catchError((error: Error) => {
                this.api.notice.set(error.message);
                return of(false);
            }),
        );
    }
    private target(url: string): string {
        return this.router.parseUrl(url).root.children[PRIMARY_OUTLET]?.segments[0]?.path ?? 'home';
    }
}
