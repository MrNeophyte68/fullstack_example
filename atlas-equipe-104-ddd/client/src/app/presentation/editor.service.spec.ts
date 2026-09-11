import { APPLICATION_PROVIDERS } from '@app/composition.providers';
import { TestBed } from '@angular/core/testing';
import { EditorService } from './editor.service';
import { key } from '@common/hex';
import { MapObject, Terrain } from '@common/models';

describe('EditorService history and editing', () => {
    let editor: EditorService;
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: APPLICATION_PROVIDERS });
        editor = TestBed.runInInjectionContext(() => new EditorService());
        editor.load();
    });
    it('treats an entire brush drag as a single undoable action', () => {
        editor.begin();
        editor.apply(editor.map().tiles[0], false);
        editor.apply(editor.map().tiles[1], false);
        expect(editor.undoStack.length).toBe(0);
        editor.undo();
        expect(editor.map().tiles[0].terrain).toBe(Terrain.Grass);
        editor.end();
        expect(editor.undoStack.length).toBe(1);
        editor.undo();
        expect(
            editor
                .map()
                .tiles.slice(0, 2)
                .every((tile) => tile.terrain === Terrain.Water),
        ).toBe(true);
        editor.redo();
        expect(
            editor
                .map()
                .tiles.slice(0, 2)
                .every((tile) => tile.terrain === Terrain.Grass),
        ).toBe(true);
    });
    it('clears redo after a new edit and returns to the initial state', () => {
        editor.begin();
        editor.apply(editor.map().tiles[0], false);
        editor.end();
        editor.undo();
        expect(editor.dirty).toBe(false);
        editor.begin();
        editor.apply(editor.map().tiles[2], false);
        editor.end();
        expect(editor.redoStack.length).toBe(0);
    });
    it('groups resize previews into one action without losing cropped tiles while dragging', () => {
        editor.resize(25);
        editor.end();
        editor.begin();
        editor.apply(editor.map().tiles.at(-1)!, false);
        editor.end();
        const last = key(editor.map().tiles.at(-1)!);
        editor.begin();
        editor.resize(15);
        editor.resize(25);
        editor.end();
        expect(editor.map().tiles.find((tile) => key(tile) === last)?.terrain).toBe(Terrain.Grass);
        editor.begin();
        editor.resize(15);
        editor.end();
        editor.undo();
        expect(editor.map().rows).toBe(25);
    });
    it('supports reset/undo without resetting selected tools', () => {
        editor.tool = 'fill';
        editor.begin();
        editor.apply(editor.map().tiles[0], false);
        editor.end();
        editor.reset();
        expect(editor.map().tiles.every((tile) => tile.terrain === Terrain.Water)).toBe(true);
        editor.undo();
        expect(editor.map().tiles.every((tile) => tile.terrain === Terrain.Grass)).toBe(true);
        expect(editor.tool).toBe('fill');
    });
    it('enforces object restrictions and removes invalid objects when terrain changes', () => {
        const tile = editor.map().tiles[0];
        editor.tool = 'city';
        expect(editor.apply(tile, false)).toContain('nécessitent');
        editor.tool = 'paint';
        editor.apply(tile, false);
        editor.tool = 'city';
        editor.apply(tile, false);
        expect(tile.object).toBe(MapObject.City);
        editor.tool = 'paint';
        editor.terrain = Terrain.Water;
        editor.apply(tile, false);
        expect(tile.object).toBeUndefined();
    });
    it('paints only the exterior border when Shift+bucket is used', () => {
        const center = editor.map().tiles.find((tile) => key(tile) === '5,5')!;
        editor.apply(center, false);
        editor.terrain = Terrain.Forest;
        editor.tool = 'fill';
        editor.apply(center, true);
        expect(center.terrain).toBe(Terrain.Grass);
        expect(editor.map().tiles.filter((tile) => tile.terrain === Terrain.Forest).length).toBe(6);
    });
});
