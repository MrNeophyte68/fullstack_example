import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, of, switchMap, timer } from 'rxjs';
import { Injectable, computed, inject, signal } from '@angular/core';
import { requireValue } from '@common/invariant';
import { AccountPresenter } from './account.presenter';
import { NavigationStateService } from './navigation-state.service';
import { EditorService } from './editor.service';
import { TestSession, Tile, Player } from '@common/models';
import { key, shortestPath, travelTime, validateMap } from '@common/hex';
import { MILLISECONDS_PER_SECOND, COUNTDOWN_INTERVAL_MS } from '@app/app.component.constants';
@Injectable({ providedIn: 'root' })
export class SessionPresenter {
    readonly editor = inject(EditorService);
    readonly account = inject(AccountPresenter);
    readonly navigation = inject(NavigationStateService);
    pin = '';
    sessionType: TestSession['type'] = 'public';
    chat = '';
    chatActive = false;

    hover?: Tile;
    private readonly previewState = signal<string[]>([]);
    private readonly now = toSignal(
        toObservable(this.account.api.session).pipe(
            switchMap((session) =>
                session?.players.some((player) => player.movement)
                    ? timer(0, COUNTDOWN_INTERVAL_MS).pipe(map(() => Date.now()))
                    : of(Date.now()),
            ),
        ),
        { initialValue: Date.now() },
    );
    private readonly duration = computed(() => this.calculateDuration());
    get preview(): string[] {
        return this.previewState();
    }
    set preview(value: string[]) {
        this.previewState.set(value);
    }
    get travelDuration(): number {
        return this.duration();
    }
    startTest(): void {
        const errors = validateMap(this.editor.map());
        if (errors.length) {
            this.account.open('validation', 'La carte doit être corrigée', errors.join('\n'));
            return;
        }
        this.pin = '';
        this.account.open('test', 'Démarrer une session', undefined, async () => {
            const result = await this.account.api.tests.create({
                map: this.editor.map(),
                mapId: this.editor.record?.id,
                mapName: this.editor.name,
                type: this.sessionType,
                pin: this.pin,
            });
            this.navigation.hostedId = result.id;
            await this.navigation.navigate('test');
        });
    }
    join(session: TestSession): void {
        const action = async (): Promise<void> => {
            await this.account.api.tests.join(session.id, this.pin);
            await this.navigation.navigate('test');
        };
        this.pin = '';
        if (session.type === 'protected') this.account.open('pin', 'Session protégée', 'Saisissez le NIP à quatre chiffres.', action);
        else void this.account.run(action);
    }
    async leaveTest(): Promise<void> {
        await this.navigation.navigate(this.isHost ? 'editor' : 'sessions');
    }
    async resume(): Promise<void> {
        await this.account.run(async () => {
            await this.account.api.tests.resume(this.navigation.hostedId, this.editor.map());
            await this.navigation.navigate('test');
        });
    }
    async closeTest(): Promise<void> {
        await this.account.run(async () => {
            await this.account.api.tests.close(this.navigation.hostedId);
            this.navigation.hostedId = '';
        });
    }
    get player(): Player | undefined {
        return this.account.api.session()?.players.find((player) => player.id === this.account.api.identity()?.id);
    }
    get isHost(): boolean {
        return this.account.api.session()?.hostId === this.account.api.identity()?.id;
    }
    onHover(tile?: Tile): void {
        this.hover = tile;
        this.updatePath();
    }
    updatePath(): void {
        const session = this.account.api.session();
        const player = this.player;
        if (!session || !player) {
            this.preview = [];
            return;
        }
        if (player.movement) this.preview = [player.movement.to, ...player.movement.remaining];
        else this.preview = this.hover ? shortestPath(session.map, player.tile, key(this.hover), session.config) : [];
    }
    private calculateDuration(): number {
        const session = this.account.api.session();
        const player = this.player;
        if (!session || !player) return 0;
        const path = player.movement?.remaining ?? this.preview;
        const remaining = path.reduce(
            (sum, id) => sum + travelTime(requireValue(session.map.tiles.find((tile) => key(tile) === id)), session.config),
            0,
        );
        const current = player.movement ? Math.max(0, player.movement.startedAt + player.movement.duration - this.now()) : 0;
        return (remaining + current) / MILLISECONDS_PER_SECOND;
    }
    async move(tile: Tile): Promise<void> {
        if (this.player?.movement || !this.preview.length) return;
        await this.account.run(async () => {
            await this.account.api.tests.move(requireValue(this.account.api.session()).id, key(tile));
        });
    }
    async configure(): Promise<void> {
        await this.account.run(async () => {
            await this.account.api.tests.configure(
                requireValue(this.account.api.session()).id,
                requireValue(this.account.api.session()).config,
            );
        });
    }
    async sendChat(): Promise<void> {
        if (!this.chat.trim()) return;
        await this.account.run(async () => {
            await this.account.api.tests.chat(requireValue(this.account.api.session()).id, this.chat);
            this.chat = '';
            this.chatActive = false;
        });
    }
}
