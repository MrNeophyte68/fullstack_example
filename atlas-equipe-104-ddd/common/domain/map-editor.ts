import { checkMapData } from './map-validation';
import { EditorDraft, Tool } from './editor.types';
import { SPAWN_LIMIT } from './map.constants';
import { requireValue } from '../invariant';

import { MapData, MapObject, MapRecord, Terrain, Tile } from './models';
import { brush, createMap, hexLine, key, neighbors, region, resizeMap } from './hex';
export class MapEditor {
    private data: MapData = createMap();
    map(): MapData {
        return this.data;
    }

    private active = false;
    busy(): boolean {
        return this.active;
    }
    terrain = Terrain.Grass;
    tool: Tool = 'paint';
    radius = 1;
    record?: MapRecord;
    name = 'Sans titre';
    visibility: 'public' | 'private' = 'private';
    undoStack: MapData[] = [];
    redoStack: MapData[] = [];
    private before?: MapData;
    private saved = '';
    private lastRoad?: Tile;
    get dirty(): boolean {
        return JSON.stringify(this.map()) !== this.saved;
    }
    load(record?: MapRecord): void {
        this.record = record;
        this.name = record?.name ?? 'Sans titre';
        this.visibility = record?.visibility ?? 'private';
        this.data = record ? structuredClone({ rows: record.rows, tiles: record.tiles }) : createMap();
        this.saved = JSON.stringify(this.map());
        this.undoStack = [];
        this.redoStack = [];
        this.lastRoad = undefined;
        this.before = undefined;
        this.terrain = Terrain.Grass;
        this.tool = 'paint';
        this.radius = 1;
        this.active = false;
    }
    draft(): EditorDraft {
        return structuredClone({
            map: this.map(),
            record: this.record,
            name: this.name,
            visibility: this.visibility,
            saved: this.saved,
        });
    }
    restore(draft: EditorDraft): void {
        checkMapData(draft.map);
        this.load(draft.record);
        this.data = structuredClone(draft.map);
        this.name = draft.name;
        this.visibility = draft.visibility;
        this.saved = draft.saved;
    }
    markSaved(record: MapRecord): void {
        this.record = record;
        this.name = record.name;
        this.visibility = record.visibility;
        this.saved = JSON.stringify(this.map());
    }
    begin(): void {
        if (!this.before) this.before = structuredClone(this.map());
        this.active = true;
    }
    end(): void {
        if (this.before && JSON.stringify(this.before) !== JSON.stringify(this.map())) {
            this.undoStack.push(this.before);
            this.redoStack = [];
        }
        this.before = undefined;
        this.active = false;
    }
    undo(): void {
        if (this.busy() || !this.undoStack.length) return;
        this.redoStack.push(structuredClone(this.map()));
        this.data = requireValue(this.undoStack.pop());
    }
    redo(): void {
        if (this.busy() || !this.redoStack.length) return;
        this.undoStack.push(structuredClone(this.map()));
        this.data = requireValue(this.redoStack.pop());
    }
    reset(): void {
        this.begin();
        this.data = createMap(this.map().rows);
        this.end();
    }
    resize(rows: number): void {
        if (!this.before) this.begin();
        this.data = resizeMap(requireValue(this.before), rows);
    }
    apply(inputTile: Tile, shift: boolean, erase = false): string {
        const tile = inputTile;

        const tiles = this.map().tiles;
        if (erase) {
            delete tile.object;
            return '';
        }
        if (this.tool === 'inspect') return '';
        if (this.tool === 'paint') brush(tile, tiles, this.radius).forEach((item) => this.paint(item));
        else if (this.tool === 'fill') {
            const connected = region(tile, tiles, (item) => item.terrain === tile.terrain);
            const keys = new Set(connected.map(key));
            const selected = shift
                ? [
                      ...new Map(
                          connected
                              .flatMap((item) => neighbors(item, tiles))
                              .filter((item) => !keys.has(key(item)))
                              .map((item) => [key(item), item]),
                      ).values(),
                  ]
                : connected;
            selected.forEach((item) => this.paint(item));
        } else if (this.tool === 'road' && shift && this.lastRoad) {
            hexLine(this.lastRoad, tile, tiles).forEach((item) => Object.assign(item, { object: MapObject.Road }));
            this.lastRoad = tile;
        } else {
            const message = this.placeObject(tile);
            if (message) return message;
        }
        return '';
    }
    private placeObject(inputTile: Tile): string {
        const tile = inputTile;
        const tiles = this.map().tiles;
        const object = this.tool as MapObject;
        if (tile.object === object) {
            delete tile.object;
            return '';
        }
        if (object !== MapObject.Road && [Terrain.Water, Terrain.Mountain].includes(tile.terrain))
            return 'Les villes et départs nécessitent une prairie, une forêt ou un désert.';
        if (object === MapObject.City && neighbors(tile, tiles).some((item) => item.object === MapObject.City))
            return 'Deux villes ne peuvent pas être adjacentes.';
        if (object === MapObject.Spawn && tiles.filter((item) => item.object === MapObject.Spawn).length >= SPAWN_LIMIT)
            return 'Quatre points de départ maximum.';
        tile.object = object;
        this.lastRoad = object === MapObject.Road ? tile : undefined;

        return '';
    }
    private paint(inputTile: Tile): void {
        const tile = inputTile;

        tile.terrain = this.terrain;
        if ([Terrain.Water, Terrain.Mountain].includes(tile.terrain) && tile.object !== MapObject.Road) delete tile.object;
    }
}
