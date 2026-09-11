import { Router } from '@angular/router';
import { SEARCH_DEBOUNCE_MS } from './presentation/map-search.constants';
import { APPLICATION_PROVIDERS } from './composition.providers';
import { MapClient } from './application/map-client';
import { AccountClient } from './application/account-client';
import { vi, Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AppComponent } from './app.component';
import { ConnectionStateService } from './presentation/connection-state.service';
import { WorkspacePresenter } from './presentation/workspace.presenter';
import { User, MapRecord, TestSession, DEFAULT_CONFIG } from '@common/models';
import { createMap } from '@common/hex';

describe('Map library and administration', () => {
    const owner: User = { id: 'owner', name: 'Owner', createdAt: '2026-09-08' };
    let component: WorkspacePresenter;
    let request: Mock;
    beforeEach(() => {
        sessionStorage.clear();
        location.hash = '#/home';
        request = vi.fn().mockResolvedValue([]);
        TestBed.configureTestingModule({
            providers: [
                ...APPLICATION_PROVIDERS,
                {
                    provide: ConnectionStateService,
                    useValue: {
                        initialize: vi.fn().mockResolvedValue(undefined),
                        user: signal(owner),
                        identity: signal(owner),
                        sessions: signal<TestSession[]>([]),
                        session: signal<TestSession | null>(null),
                        notice: signal(''),
                        connected: signal(true),
                        mapRevision: signal(0),
                        request,
                        maps: new MapClient({ request, emit: vi.fn() }),
                        accounts: new AccountClient({ request, emit: vi.fn() }),
                        adminToken: '',
                    },
                },
            ],
        });
        component = TestBed.runInInjectionContext(() => new AppComponent().ui);
    });
    it('filters ownership immediately and debounces the latest search text', async () => {
        vi.useFakeTimers();
        try {
            const record: MapRecord = {
                ...createMap(),
                id: 'a',
                name: 'Archipel',
                ownerId: 'owner',
                ownerName: 'Owner',
                visibility: 'private',
                updatedAt: '',
            };
            component.maps.set([record, { ...record, id: 'b', name: 'Vallée', ownerId: 'other', visibility: 'public' }]);
            component.filter = 'mine';
            expect(component.filteredMaps.length).toBe(1);
            component.filter = 'all';
            component.search = 'ARCH';
            component.search = 'VALL';
            expect(component.filteredMaps).toHaveLength(2);
            await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
            expect(component.filteredMaps[0].id).toBe('b');
        } finally {
            vi.useRealTimers();
        }
    });
    it('requires confirmation before deleting an account', async () => {
        component.account.deleteAccount(owner);
        expect(request).not.toHaveBeenCalled();
        expect(component.account.modal()?.type).toBe('confirm');
        await component.account.modal()?.action?.();
        expect(request).toHaveBeenCalledWith('admin/users/owner', 'DELETE');
    });
    it('requires confirmation before disconnecting a user', async () => {
        component.account.disconnectUser(owner);
        expect(request).not.toHaveBeenCalled();
        await component.account.modal()?.action?.();
        expect(request).toHaveBeenCalledWith('admin/users/owner/disconnect', 'POST');
    });
    it('rejects mismatched passwords before contacting the server', async () => {
        component.account.changePassword(owner);
        component.account.password = 'Password2026';
        component.account.confirmPassword = 'Different2026';
        await expect(component.account.modal()!.action!()).rejects.toThrow('Les mots de passe ne correspondent pas.');
        expect(request).not.toHaveBeenCalled();
    });
    it('renders the home page with the supplied team and members', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        await TestBed.inject(Router).navigateByUrl('/home');
        await fixture.whenStable();
        fixture.detectChanges();
        const text = fixture.nativeElement.textContent as string;
        expect(text).toContain('Équipe 104');
        expect(text).toContain('Akhan Mehmet Sozen');
        expect(text).toContain('Jazia Benhadjeba');
        fixture.destroy();
    });
    it('opens the login dialog when a guest requests map management', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.componentInstance.ui.account.api.user.set(null);
        fixture.detectChanges();
        await TestBed.inject(Router).navigateByUrl('/home');
        await fixture.whenStable();
        fixture.detectChanges();
        const element: HTMLElement = fixture.nativeElement;
        const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('button'));
        const manage = buttons.find((button) => button.textContent?.includes('Gestion des cartes'));
        expect(manage).toBeDefined();
        manage?.click();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[role="dialog"]')?.textContent).toContain('Se connecter');
        fixture.destroy();
    });
    it('updates movement duration from a timer stream and stops when the session ends', async () => {
        vi.useFakeTimers();
        try {
            const startedAt = Date.now();
            component.account.api.session.set({
                id: 'room',
                hostId: owner.id,
                hostName: owner.name,
                mapName: 'World',
                type: 'solo',
                map: createMap(),
                config: DEFAULT_CONFIG,
                messages: [],
                players: [
                    {
                        ...owner,
                        tile: '0,0',
                        color: 'yellow',
                        movement: { from: '0,0', to: '1,0', startedAt, duration: 1000, remaining: [] },
                    },
                ],
            });
            TestBed.tick();
            await vi.advanceTimersByTimeAsync(0);
            expect(component.sessions.travelDuration).toBe(1);
            await vi.advanceTimersByTimeAsync(300);
            expect(component.sessions.travelDuration).toBeCloseTo(0.7);
            component.account.api.session.set(null);
            TestBed.tick();
            expect(component.sessions.travelDuration).toBe(0);
            await vi.advanceTimersByTimeAsync(2000);
            expect(component.sessions.travelDuration).toBe(0);
            expect(vi.getTimerCount()).toBe(0);
        } finally {
            vi.useRealTimers();
        }
    });
    it('automatically unsubscribes the active timer when Angular destroys its injector', async () => {
        vi.useFakeTimers();
        try {
            component.account.api.session.set({
                id: 'room',
                hostId: owner.id,
                hostName: owner.name,
                mapName: 'World',
                type: 'solo',
                map: createMap(),
                config: DEFAULT_CONFIG,
                messages: [],
                players: [
                    {
                        ...owner,
                        tile: '0,0',
                        color: 'yellow',
                        movement: { from: '0,0', to: '1,0', startedAt: Date.now(), duration: 1000, remaining: [] },
                    },
                ],
            });
            TestBed.tick();
            await vi.advanceTimersByTimeAsync(0);
            expect(vi.getTimerCount()).toBeGreaterThan(0);
            TestBed.resetTestingModule();
            expect(vi.getTimerCount()).toBe(0);
        } finally {
            vi.useRealTimers();
        }
    });
});
