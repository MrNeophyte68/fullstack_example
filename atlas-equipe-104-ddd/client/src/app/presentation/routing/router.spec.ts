import { MapEditor } from '@common/domain/map-editor';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { vi } from 'vitest';
import { APPLICATION_PROVIDERS } from '@app/composition.providers';
import { ConnectionStateService } from '@app/presentation/connection-state.service';
import { AccountPresenter } from '@app/presentation/account.presenter';
import { EditorService } from '@app/presentation/editor.service';
import { NavigationStateService } from '@app/presentation/navigation-state.service';
import { HexCanvasComponent } from '@app/components/hex-canvas.component';
import { StartupService } from './startup.service';
import { OWNER, ROOM, SAVED_MAP, RoutingApi } from './routing.fixture';
describe('Angular Router, access guards and workspace navigation', () => {
    let api: RoutingApi;
    let router: Router;
    beforeEach(() => {
        sessionStorage.clear();
        api = new RoutingApi();
        TestBed.configureTestingModule({
            providers: [...APPLICATION_PROVIDERS, provideLocationMocks(), { provide: ConnectionStateService, useValue: api }],
        });
        // These tests exercise routing, not drawing or browser canvas support.
        vi.spyOn(HexCanvasComponent.prototype, 'ngAfterViewInit').mockImplementation(() => undefined);
        vi.spyOn(HexCanvasComponent.prototype, 'ngOnDestroy').mockImplementation(() => undefined);
        router = TestBed.inject(Router);
        // Harness navigation does not bootstrap the browser-location listener itself.
        router.setUpLocationChangeListener();
    });
    afterEach(() => vi.restoreAllMocks());
    it('redirects direct guest access to home and resumes map management after login', async () => {
        api.user.set(null);
        const harness = await RouterTestingHarness.create('/maps');
        const account = TestBed.inject(AccountPresenter);
        expect(router.url).toBe('/home');
        expect(account.modal()?.type).toBe('login');
        expect(account.returnAfterAuth).toBe('maps');
        account.name = 'Owner';
        account.password = 'Password2026';
        await account.authenticate();
        harness.detectChanges();
        expect(router.url).toBe('/maps');
        expect(account.modal()).toBeNull();
        expect(TestBed.inject(NavigationStateService).view()).toBe('maps');
    });
    it('waits for authentication restoration before deciding whether a route is protected', async () => {
        api.user.set(null);
        let finish!: () => void;
        api.initialize.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    finish = () => {
                        api.user.set(OWNER);
                        resolve();
                    };
                }),
        );
        const harness = await RouterTestingHarness.create();
        const navigating = harness.navigateByUrl('/maps');
        await vi.waitFor(() => expect(api.initialize).toHaveBeenCalledOnce());
        expect(TestBed.inject(AccountPresenter).modal()).toBeNull();
        finish();
        await navigating;
        expect(router.url).toBe('/maps');
        expect(TestBed.inject(AccountPresenter).modal()).toBeNull();
    });
    it('uses one initialization across navigation and redirects unknown URLs', async () => {
        const harness = await RouterTestingHarness.create('/home');
        await harness.navigateByUrl('/sessions');
        await harness.navigateByUrl('/not-a-page');
        expect(router.url).toBe('/home');
        expect(api.initialize).toHaveBeenCalledOnce();
    });
    it('protects administration and navigates there after the admin modal succeeds', async () => {
        const harness = await RouterTestingHarness.create('/admin');
        const account = TestBed.inject(AccountPresenter);
        expect(router.url).toBe('/home');
        expect(account.modal()?.type).toBe('admin-login');
        account.password = 'AdminPassword';
        await account.adminLogin();
        harness.detectChanges();
        expect(router.url).toBe('/admin');
        expect(account.modal()).toBeNull();
        await vi.waitFor(() => expect(api.accounts.users).toHaveBeenCalled());
    });
    it('redirects an inaccessible test URL to the session list', async () => {
        await RouterTestingHarness.create('/test');
        expect(router.url).toBe('/sessions');
    });
    it('waits for the socket snapshot when restoring a test page after refresh', async () => {
        sessionStorage.setItem('hex-token', 'valid');
        const harness = await RouterTestingHarness.create();
        const navigating = harness.navigateByUrl('/test');
        await vi.waitFor(() => expect(TestBed.inject(StartupService).sessionRestorePending).toBe(false));
        api.session.set(ROOM);
        TestBed.tick();
        await navigating;
        expect(router.url).toBe('/test');
    });
    it('cancels an unsaved-editor exit without unlocking, then honors the confirmed destination', async () => {
        const harness = await RouterTestingHarness.create('/editor');
        const editor = TestBed.inject(EditorService);
        const account = TestBed.inject(AccountPresenter);
        editor.load(SAVED_MAP);
        editor.apply(editor.map().tiles[0], false);
        let navigating = router.navigateByUrl('/sessions');
        await vi.waitFor(() => expect(account.modal()?.type).toBe('confirm'));
        account.closeModal();
        expect(await navigating).toBe(false);
        expect(router.url).toBe('/editor');
        expect(editor.dirty).toBe(true);
        expect(api.maps.unlock).not.toHaveBeenCalled();
        navigating = router.navigateByUrl('/sessions');
        await vi.waitFor(() => expect(account.modal()?.type).toBe('confirm'));
        await account.modal()?.action?.();
        expect(await navigating).toBe(true);
        harness.detectChanges();
        expect(router.url).toBe('/sessions');
        expect(api.maps.unlock).toHaveBeenCalledWith(SAVED_MAP.id);
        expect(editor.dirty).toBe(false);
    });
    it('keeps the editor and lock if cleanup fails', async () => {
        await RouterTestingHarness.create('/editor');
        const editor = TestBed.inject(EditorService);
        editor.load(SAVED_MAP);
        api.maps.unlock.mockRejectedValue(new Error('Server unavailable'));
        expect(await router.navigateByUrl('/maps')).toBe(false);
        expect(router.url).toBe('/editor');
        expect(editor.record?.id).toBe(SAVED_MAP.id);
        expect(api.notice()).toBe('Server unavailable');
    });
    it('preserves the draft during testing and leaves the room open when the host returns', async () => {
        const harness = await RouterTestingHarness.create('/editor');
        const editor = TestBed.inject(EditorService);
        const navigation = TestBed.inject(NavigationStateService);
        editor.load(SAVED_MAP);
        editor.apply(editor.map().tiles[0], false);
        api.session.set(ROOM);
        navigation.hostedId = ROOM.id;
        await harness.navigateByUrl('/test');
        expect(router.url).toBe('/test');
        expect(TestBed.inject(AccountPresenter).modal()).toBeNull();
        expect(api.maps.unlock).not.toHaveBeenCalled();
        await harness.navigateByUrl('/editor');
        expect(api.tests.leave).toHaveBeenCalledWith(ROOM.id);
        expect(api.tests.close).not.toHaveBeenCalled();
        expect(navigation.hostedId).toBe(ROOM.id);
        expect(editor.dirty).toBe(true);
    });
    it('closes the hosted room when navigating away from the workspace after confirmation', async () => {
        const harness = await RouterTestingHarness.create('/editor');
        TestBed.inject(EditorService).load(SAVED_MAP);
        TestBed.inject(NavigationStateService).hostedId = ROOM.id;
        api.session.set(ROOM);
        await harness.navigateByUrl('/test');
        api.tests.close.mockImplementation(async () => {
            api.session.set(null);
            api.onSessionClosed?.();
        });
        const navigating = router.navigateByUrl('/home');
        const account = TestBed.inject(AccountPresenter);
        await vi.waitFor(() => expect(account.modal()?.type).toBe('confirm'));
        await account.modal()?.action?.();
        expect(await navigating).toBe(true);
        expect(router.url).toBe('/home');
        expect(api.tests.close).toHaveBeenCalledWith(ROOM.id);
        expect(api.maps.unlock).toHaveBeenCalledWith(SAVED_MAP.id);
    });
    it('handles browser back and forward through the router', async () => {
        const harness = await RouterTestingHarness.create('/home');
        await harness.navigateByUrl('/sessions');
        await harness.navigateByUrl('/maps');
        const location = TestBed.inject(Location);
        location.back();
        await vi.waitFor(() => expect(router.url).toBe('/sessions'));
        expect(TestBed.inject(NavigationStateService).view()).toBe('sessions');
        location.forward();
        await vi.waitFor(() => expect(router.url).toBe('/maps'));
    });
    it('cancels browser Back from the dirty editor and restores its URL', async () => {
        const harness = await RouterTestingHarness.create('/home');
        await harness.navigateByUrl('/editor');
        const editor = TestBed.inject(EditorService);
        editor.apply(editor.map().tiles[0], false);
        const location = TestBed.inject(Location);
        location.back();
        const account = TestBed.inject(AccountPresenter);
        await vi.waitFor(() => expect(account.modal()?.type).toBe('confirm'));
        account.closeModal();
        await vi.waitFor(() => expect(location.path()).toBe('/editor'));
        expect(router.url).toBe('/editor');
        expect(editor.dirty).toBe(true);
    });
    it('reacquires the saved editor lock on refresh without overwriting unsaved tiles', async () => {
        const draft = new MapEditor();
        draft.load(SAVED_MAP);
        draft.apply(draft.map().tiles[0], false);
        sessionStorage.setItem('hex-draft', JSON.stringify(draft.draft()));
        await RouterTestingHarness.create('/editor');
        expect(api.maps.lock).toHaveBeenCalledWith(SAVED_MAP.id);
        expect(TestBed.inject(EditorService).dirty).toBe(true);
        expect(TestBed.inject(EditorService).map().tiles).toEqual(draft.map().tiles);
    });
    it('redirects to maps if a restored editor lock is no longer available', async () => {
        const draft = new MapEditor();
        draft.load(SAVED_MAP);
        sessionStorage.setItem('hex-draft', JSON.stringify(draft.draft()));
        api.maps.lock.mockRejectedValue(new Error('Map unavailable'));
        await RouterTestingHarness.create('/editor');
        expect(router.url).toBe('/maps');
        expect(TestBed.inject(EditorService).record).toBeUndefined();
        expect(api.notice()).toBe('Map unavailable');
    });
    it('leaves a guest session without closing the host’s room', async () => {
        const harness = await RouterTestingHarness.create('/home');
        api.user.set(null);
        api.identity.set({ ...OWNER, id: 'guest' });
        api.session.set(ROOM);
        await harness.navigateByUrl('/test');
        await harness.navigateByUrl('/sessions');
        expect(api.tests.leave).toHaveBeenCalledWith(ROOM.id);
        expect(api.tests.close).not.toHaveBeenCalled();
        expect(api.session()).toBeNull();
    });
    it('disposes a superseded navigation confirmation without releasing the editor', async () => {
        await RouterTestingHarness.create('/editor');
        const editor = TestBed.inject(EditorService);
        editor.load(SAVED_MAP);
        editor.apply(editor.map().tiles[0], false);
        const account = TestBed.inject(AccountPresenter);
        const first = router.navigateByUrl('/sessions');
        await vi.waitFor(() => expect(account.modal()?.type).toBe('confirm'));
        const firstDialog = account.modal();
        const second = router.navigateByUrl('/home');
        expect(await first).toBe(false);
        await vi.waitFor(() => {
            expect(account.modal()?.type).toBe('confirm');
            expect(account.modal()).not.toBe(firstDialog);
        });
        account.closeModal();
        expect(await second).toBe(false);
        expect(api.maps.unlock).not.toHaveBeenCalled();
        expect(editor.dirty).toBe(true);
    });
});
