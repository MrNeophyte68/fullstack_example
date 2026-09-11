import { brush, createMap, hexLine, key, neighbors, region, shortestPath, travelTime, validateMap } from '@common/hex';
import { DEFAULT_CONFIG, MapObject, Terrain } from '@common/models';
import { checkMapData } from '@common/domain/map-validation';

describe('Hexagonal map rules', () => {
    it('creates odd-row maps with one extra tile on alternating rows', () => {
        const map = createMap(15);
        expect(map.tiles.filter((tile) => tile.y === 1)).toHaveLength(map.tiles.filter((tile) => tile.y === 0).length + 1);
        expect(() => checkMapData(map)).not.toThrow();
        expect(map.tiles.every((tile) => tile.terrain === Terrain.Water)).toBe(true);
    });
    it('has symmetric neighbors and brush rings of 1, 7, 19, 37 tiles', () => {
        const map = createMap(25);
        const center = map.tiles.find((tile) => key(tile) === '10,10');
        expect([1, 2, 3, 4].map((radius) => brush(center, map.tiles, radius).length)).toEqual([1, 7, 19, 37]);
        for (const adjacent of neighbors(center, map.tiles)) expect(neighbors(adjacent, map.tiles).map(key)).toContain(key(center));
    });
    it('rejects malformed, duplicate-coordinate and illegal-object maps', () => {
        const map = createMap();
        expect(() => checkMapData({ ...map, rows: 16 })).toThrow();
        map.tiles[1] = { ...map.tiles[0] };
        expect(() => checkMapData(map)).toThrow();
        const invalid = createMap();
        invalid.tiles[0].object = MapObject.City;
        expect(() => checkMapData(invalid)).toThrow();
    });
    it('validates spawn count, city network and disconnected traversable terrain', () => {
        const map = createMap();
        expect(validateMap(map)).toHaveLength(2);
        map.tiles.forEach((tile) => (tile.terrain = Terrain.Grass));
        for (const x of [1, 3, 5, 7]) map.tiles.find((tile) => tile.x === x && tile.y === 0).object = MapObject.Spawn;
        map.tiles.find((tile) => key(tile) === '10,10').object = MapObject.City;
        expect(validateMap(map)).toEqual([]);
        map.tiles.find((tile) => key(tile) === '15,10').object = MapObject.City;
        expect(validateMap(map).some((error) => error.includes('connexion routière'))).toBe(true);
        for (const x of [11, 12, 13, 14]) map.tiles.find((tile) => key(tile) === `${x},10`).object = MapObject.Road;
        expect(validateMap(map)).toEqual([]);
    });
    it('uses destination costs and routes across impassable terrain', () => {
        const map = createMap();
        const row = map.tiles.filter((tile) => tile.y === 0 && tile.x < 5);
        row.forEach((tile) => (tile.object = MapObject.Road));
        expect(shortestPath(map, '0,0', '4,0', DEFAULT_CONFIG)).toEqual(['1,0', '2,0', '3,0', '4,0']);
        expect(travelTime(row[1], DEFAULT_CONFIG)).toBe(300);
        expect(shortestPath(map, '0,0', '4,2', DEFAULT_CONFIG)).toEqual([]);
    });
    it('chooses a longer, faster road path instead of the shortest tile count', () => {
        const map = createMap();
        map.tiles.forEach((tile) => (tile.terrain = Terrain.Grass));
        map.tiles.filter((tile) => tile.y === 1 && tile.x <= 5).forEach((tile) => (tile.object = MapObject.Road));
        const path = shortestPath(map, '0,0', '4,0', { ...DEFAULT_CONFIG, road: 5, grass: 0.1 });
        expect(path.some((id) => id.endsWith(',1'))).toBe(true);
    });
    it('fills only connected terrain and generates an adjacent straight road', () => {
        const map = createMap();
        const from = map.tiles.find((tile) => key(tile) === '2,2');
        const to = map.tiles.find((tile) => key(tile) === '10,8');
        const line = hexLine(from, to, map.tiles);
        expect(key(line[0])).toBe('2,2');
        expect(key(line.at(-1))).toBe('10,8');
        for (let index = 1; index < line.length; index++)
            expect(neighbors(line[index - 1], map.tiles).map(key)).toContain(key(line[index]));
        from.terrain = Terrain.Grass;
        expect(region(from, map.tiles, (tile) => tile.terrain === Terrain.Grass)).toEqual([from]);
    });
});
