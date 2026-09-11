import { Injectable, inject, signal } from '@angular/core';
import { MapEditor } from '@common/domain/map-editor';
import { EditorDraft, Tool } from '@common/domain/editor.types';
import { MapData, MapRecord, Terrain, Tile } from '@common/contracts/models';
import { STORAGE_PORT } from '@app/presentation/di.tokens';
@Injectable({ providedIn: 'root' })
export class EditorService {
    private readonly aggregate = new MapEditor();
    private readonly storage = inject(STORAGE_PORT);
    readonly revision = signal(0);
    readonly busy = signal(false);
    readonly map = signal<MapData>(this.aggregate.map());
    get dirty(): boolean {
        this.revision();
        return this.aggregate.dirty;
    }
    get terrain(): Terrain {
        return this.aggregate.terrain;
    }
    set terrain(value: Terrain) {
        this.aggregate.terrain = value;
    }
    get tool(): Tool {
        return this.aggregate.tool;
    }
    set tool(value: Tool) {
        this.aggregate.tool = value;
    }
    get radius(): number {
        return this.aggregate.radius;
    }
    set radius(value: number) {
        this.aggregate.radius = value;
    }
    get record(): MapRecord | undefined {
        return this.aggregate.record;
    }
    get name(): string {
        return this.aggregate.name;
    }
    set name(value: string) {
        this.aggregate.name = value;
    }
    get visibility(): 'public' | 'private' {
        return this.aggregate.visibility;
    }
    set visibility(value: 'public' | 'private') {
        this.aggregate.visibility = value;
    }
    get undoStack(): MapData[] {
        return this.aggregate.undoStack;
    }
    get redoStack(): MapData[] {
        return this.aggregate.redoStack;
    }
    load(record?: MapRecord): void {
        this.aggregate.load(record);
        this.changed();
    }
    markSaved(record: MapRecord): void {
        this.aggregate.markSaved(record);
        this.changed();
    }
    begin(): void {
        this.aggregate.begin();
        this.changed();
    }
    end(): void {
        this.aggregate.end();
        this.changed();
    }
    undo(): void {
        this.aggregate.undo();
        this.changed();
    }
    redo(): void {
        this.aggregate.redo();
        this.changed();
    }
    reset(): void {
        this.aggregate.reset();
        this.changed();
    }
    resize(rows: number): void {
        this.aggregate.resize(rows);
        this.changed();
    }
    apply(tile: Tile, shift: boolean, erase = false): string {
        const message = this.aggregate.apply(tile, shift, erase);
        this.changed();
        return message;
    }
    persistDraft(): void {
        try {
            this.storage.setItem('hex-draft', JSON.stringify(this.aggregate.draft()));
        } catch {
            this.storage.removeItem('hex-draft');
        }
    }
    restoreDraft(): void {
        const value = this.storage.getItem('hex-draft');
        if (!value) return;
        try {
            this.aggregate.restore(JSON.parse(value) as EditorDraft);
            this.changed();
        } catch {
            this.storage.removeItem('hex-draft');
        }
    }
    private changed(): void {
        this.map.set(this.aggregate.map());
        this.busy.set(this.aggregate.busy());
        this.revision.update((value) => value + 1);
    }
}
