import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, map as rxMap } from 'rxjs';
import { SEARCH_DEBOUNCE_MS } from './map-search.constants';
import { StartupService } from './routing/startup.service';
import { TERRAIN_OPTIONS, TOOL_OPTIONS, MULTIPLIERS, TERRAIN_COLORS } from '@app/app.constants';
import { requireValue } from '@common/invariant';
import { SessionPresenter } from './session.presenter';
import { AccountPresenter } from './account.presenter';
import { NavigationStateService } from './navigation-state.service';
import { View } from '@app/app.types';
import { Injectable, effect, inject, signal } from '@angular/core';
import { EditorService } from './editor.service';
import { HexCanvasComponent } from '@app/components/hex-canvas.component';
import { MapRecord } from '@common/models';

@Injectable({ providedIn: 'root' })
export class WorkspacePresenter {
    private readonly startup = inject(StartupService);
    readonly account = inject(AccountPresenter);
    readonly sessions = inject(SessionPresenter);
    readonly navigation = inject(NavigationStateService);
    readonly editor = inject(EditorService);
    canvas?: HexCanvasComponent;
    readonly view = this.navigation.view;
    maps = signal<MapRecord[]>([]);
    mapName = '';
    visibility: 'private' | 'public' = 'private';
    private searchText = '';
    private readonly searchChanges$ = new Subject<string>();
    private readonly searchTerm = toSignal(
        this.searchChanges$.pipe(
            rxMap((text) => text.trim().toLowerCase()),
            debounceTime(SEARCH_DEBOUNCE_MS),
            distinctUntilChanged(),
        ),
        { initialValue: '' },
    );
    get search(): string {
        return this.searchText;
    }
    set search(value: string) {
        this.searchText = value;
        this.searchChanges$.next(value);
    }
    filter = 'all';
    readonly terrainOptions = TERRAIN_OPTIONS;
    readonly toolOptions = TOOL_OPTIONS;
    readonly colors = TERRAIN_COLORS;
    readonly multipliers = MULTIPLIERS;
    constructor() {
        effect(() => {
            this.editor.revision();
            if (['editor', 'test'].includes(this.view())) this.editor.persistDraft();
        });
        effect(() => {
            this.account.api.mapRevision();
            if (this.view() === 'maps' && this.account.api.user()) void this.loadMaps();
        });
        effect(() => {
            this.sessions.updatePath();
        });
        effect(() => {
            if (this.view() === 'admin' && this.account.api.adminToken) void this.account.run(() => this.account.loadUsers());
        });
        this.account.api.onRevoked = () => {
            this.navigation.hostedId = '';
            this.editor.load();
            this.navigate('home');
        };
        this.account.api.onSessionClosed = () => {
            this.navigation.hostedId = '';
            if (this.view() === 'test' && !this.navigation.leavingWorkspace)
                this.navigate(this.account.api.user() && this.editor.record ? 'editor' : 'sessions');
        };
        this.account.api.onMapRemoved = (id) => {
            if (this.editor.record?.id === id && ['editor', 'test'].includes(this.view())) {
                this.navigation.hostedId = '';
                this.editor.load();
                this.account.api.notice.set('Cette carte n’est plus accessible.');
                this.navigate('maps');
            }
        };
    }
    initializeView(): void {
        void this.startup.initialize();
    }
    navigate(view: View): void {
        void this.navigation.navigate(view);
    }
    async loadMaps(): Promise<void> {
        try {
            this.maps.set(await this.account.api.maps.list());
        } catch (error) {
            this.account.error.set((error as Error).message);
        }
    }
    get filteredMaps(): MapRecord[] {
        return this.maps().filter(
            (map) =>
                map.name.toLowerCase().includes(this.searchTerm()) &&
                (this.filter !== 'mine' || map.ownerId === this.account.api.user()?.id) &&
                (this.filter !== 'public' || map.visibility === 'public'),
        );
    }
    async edit(record?: MapRecord): Promise<void> {
        await this.account.run(async () => {
            const locked = record ? await this.account.api.maps.lock(record.id) : undefined;
            this.editor.load(locked);
            this.navigate('editor');
        });
    }
    duplicate(record: MapRecord): void {
        this.mapName = `${record.name} — copie`;
        this.visibility = 'private';
        this.account.open('duplicate', 'Dupliquer la carte', undefined, async () => {
            await this.account.api.maps.duplicate(record.id, this.mapName, this.visibility);
            await this.loadMaps();
        });
    }
    deleteMap(record: MapRecord): void {
        this.account.open(
            'confirm',
            'Supprimer la carte ?',
            `« ${record.name} » sera supprimée. Les éditions et sessions actives seront fermées.`,
            async () => {
                await this.account.api.maps.remove(record.id);
                await this.loadMaps();
            },
        );
    }
    async toggleVisibility(record: MapRecord): Promise<void> {
        await this.account.run(async () => {
            await this.account.api.maps.changeVisibility(record.id, record.visibility === 'public' ? 'private' : 'public');
            await this.loadMaps();
        });
    }
    save(): void {
        if (!this.editor.record) {
            this.mapName = '';
            this.visibility = 'private';
            this.account.open('save', 'Enregistrer la carte', undefined, () => this.persist());
        } else void this.account.run(() => this.persist());
    }
    private async persist(): Promise<void> {
        const record = await this.account.api.maps.save({
            ...this.editor.map(),
            id: this.editor.record?.id,
            name: this.editor.record ? this.editor.name : this.mapName,
            visibility: this.editor.record ? this.editor.visibility : this.visibility,
        });
        this.editor.markSaved(record);
        this.account.api.notice.set('Carte enregistrée.');
    }
    exitEditor(): void {
        this.navigate('maps');
    }
    reset(): void {
        this.account.open(
            'confirm',
            'Réinitialiser la carte ?',
            'Tous les terrains deviendront de l’eau et les objets seront retirés. Cette action peut être annulée.',
            async () => {
                this.editor.reset();
            },
        );
    }
    count(value: string): number {
        this.editor.revision();
        return this.editor.map().tiles.filter((tile) => tile.terrain === value || tile.object === value).length;
    }
    beforeUnload(event: BeforeUnloadEvent): void {
        if (this.editor.dirty && this.view() === 'editor') event.preventDefault();
    }
    keyboard(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            if (this.sessions.chatActive) {
                this.sessions.chat = '';
                this.sessions.chatActive = false;
            } else this.account.closeModal();
            return;
        }
        if ((event.target as HTMLElement).matches('input,textarea,select') || this.account.modal()) return;
        const letter = event.key.toLowerCase();
        if (this.view() === 'editor') this.editorKeyboard(event, letter);
        if (this.view() === 'test' && letter === 'q')
            void this.account.run(async () => {
                await this.account.api.tests.cancel(requireValue(this.account.api.session()).id);
            });
        if (this.view() === 'test' && letter === 't') {
            event.preventDefault();
            this.sessions.chatActive = true;
            setTimeout(() => document.getElementById('chat-input')?.focus());
        }
    }
    private editorKeyboard(event: KeyboardEvent, letter: string): void {
        const terrain = this.terrainOptions.find((option) => option.key === letter);
        if (terrain) this.editor.terrain = terrain.value;
        const tool = this.toolOptions.find((option) => option.key.toLowerCase() === letter);
        if (tool) this.editor.tool = tool.value;
        if ((event.ctrlKey || event.metaKey) && letter === 'z') {
            event.preventDefault();
            this.editor.undo();
        }
        if ((event.ctrlKey || event.metaKey) && letter === 'y') {
            event.preventDefault();
            this.editor.redo();
        }
    }
}
