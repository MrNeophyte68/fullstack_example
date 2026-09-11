import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { View } from '@app/app.types';
import { STORAGE_PORT } from './di.tokens';
@Injectable({ providedIn: 'root' })
export class NavigationStateService {
    private readonly storage = inject(STORAGE_PORT);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    readonly view = toSignal(
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            map(() => this.activeView()),
        ),
        { initialValue: this.activeView() },
    );
    private hostedSessionId = this.storage.getItem('hex-hosted-session') ?? '';
    leavingWorkspace = false;
    get hostedId(): string {
        return this.hostedSessionId;
    }
    set hostedId(value: string) {
        this.hostedSessionId = value;
        if (value) this.storage.setItem('hex-hosted-session', value);
        else this.storage.removeItem('hex-hosted-session');
    }
    navigate(view: View): Promise<boolean> {
        return this.router.navigate(['/', view]);
    }
    private activeView(): View {
        let route = this.route;
        while (route.firstChild) route = route.firstChild;
        return (route.snapshot.data.view as View | undefined) ?? 'home';
    }
}
