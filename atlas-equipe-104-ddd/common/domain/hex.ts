import { MapData, MapObject, Terrain, Tile, TravelConfig } from './models';

export const key = (tile: { x: number; y: number }): string => `${tile.x},${tile.y}`;
export const columns = (rows: number): number => Math.round(rows * 1.3);
export function createMap(rows = 15): MapData {
    return {
        rows,
        tiles: Array.from({ length: rows }, (_, y) =>
            Array.from({ length: columns(rows) + (y % 2 === 1 ? 1 : 0) }, (_, x) => ({ x, y, terrain: Terrain.Water })),
        ).flat(),
    };
}
export function resizeMap(map: MapData, rows: number): MapData {
    const old = new Map(map.tiles.map((tile) => [key(tile), tile]));
    return { rows, tiles: createMap(rows).tiles.map((tile) => ({ ...(old.get(key(tile)) ?? tile) })) };
}
export function neighbors(tile: Tile, tiles: Tile[]): Tile[] {
    const offset = tile.y % 2 === 0 ? 1 : -1;
    const positions = [
        [tile.x - 1, tile.y],
        [tile.x + 1, tile.y],
        [tile.x, tile.y - 1],
        [tile.x + offset, tile.y - 1],
        [tile.x, tile.y + 1],
        [tile.x + offset, tile.y + 1],
    ];
    const wanted = new Set(positions.map(([x, y]) => `${x},${y}`));
    return tiles.filter((item) => wanted.has(key(item)));
}
export const walkable = (tile: Tile): boolean =>
    tile.object === MapObject.Road || ![Terrain.Water, Terrain.Mountain].includes(tile.terrain);
export function region(start: Tile, tiles: Tile[], accept: (tile: Tile) => boolean): Tile[] {
    const visited = new Set<string>();
    const pending = [start];
    const result: Tile[] = [];
    while (pending.length) {
        const current = pending.pop()!;
        if (visited.has(key(current)) || !accept(current)) continue;
        visited.add(key(current));
        result.push(current);
        pending.push(...neighbors(current, tiles));
    }
    return result;
}
export function brush(start: Tile, tiles: Tile[], radius: number): Tile[] {
    let result = [start];
    for (let ring = 1; ring < radius; ring++)
        result = [
            ...new Map([...result, ...result.flatMap((tile) => neighbors(tile, tiles))].map((tile) => [key(tile), tile])).values(),
        ];
    return result;
}
export function validateMap(map: MapData): string[] {
    const errors: string[] = [];
    const spawns = map.tiles.filter((tile) => tile.object === MapObject.Spawn);
    const cities = map.tiles.filter((tile) => tile.object === MapObject.City);
    if (spawns.length !== 4) errors.push(`Il faut exactement 4 points de départ (${spawns.length}/4).`);
    if (!cities.length) errors.push('Ajoutez au moins une ville.');
    for (const city of cities) {
        if (neighbors(city, map.tiles).some((tile) => tile.object === MapObject.City))
            errors.push(`Villes adjacentes à (${key(city)}).`);
    }
    if (cities.length > 1) {
        const network = new Set(
            region(cities[0], map.tiles, (tile) => tile.object === MapObject.Road || tile.object === MapObject.City).map(key),
        );
        const disconnected = cities.filter((tile) => !network.has(key(tile)));
        if (disconnected.length) errors.push(`Villes sans connexion routière : ${disconnected.map(key).join(' ; ')}.`);
    }
    if (spawns.length) {
        const reached = new Set(region(spawns[0], map.tiles, walkable).map(key));
        const isolated = map.tiles.filter(
            (tile) => ![Terrain.Water, Terrain.Mountain].includes(tile.terrain) && !reached.has(key(tile)),
        );
        if (isolated.length) errors.push(`Tuiles inaccessibles depuis les départs : ${isolated.map(key).join(' ; ')}.`);
    }
    return errors;
}
export function travelTime(tile: Tile, config: TravelConfig): number {
    const multiplier = tile.object === MapObject.Road ? config.road : config[tile.terrain as 'grass' | 'forest' | 'desert'];
    return walkable(tile) ? config.base / multiplier : Infinity;
}
export function shortestPath(map: MapData, origin: string, destination: string, config: TravelConfig): string[] {
    const tiles = new Map(map.tiles.map((tile) => [key(tile), tile]));
    if (!tiles.has(origin) || !tiles.has(destination) || !walkable(tiles.get(destination)!)) return [];
    const distances = new Map<string, number>([[origin, 0]]);
    const previous = new Map<string, string>();
    const pending = new Set([origin]);
    while (pending.size) {
        const current = [...pending].reduce((a, b) => (distances.get(a)! < distances.get(b)! ? a : b));
        pending.delete(current);
        if (current === destination) break;
        for (const tile of neighbors(tiles.get(current)!, map.tiles)) {
            const next = key(tile);
            const candidate = distances.get(current)! + travelTime(tile, config);
            if (candidate < (distances.get(next) ?? Infinity)) {
                distances.set(next, candidate);
                previous.set(next, current);
                pending.add(next);
            }
        }
    }
    if (!previous.has(destination)) return [];
    const path = [destination];
    while (path[0] !== origin) path.unshift(previous.get(path[0])!);
    return path.slice(1);
}
export function hexLine(from: Tile, to: Tile, tiles: Tile[]): Tile[] {
    const cube = (tile: Tile): number[] => {
        const q = tile.x - (tile.y + (tile.y % 2)) / 2;
        return [q, -q - tile.y, tile.y];
    };
    const a = cube(from),
        b = cube(to);
    const length = Math.max(...a.map((value, index) => Math.abs(value - b[index])));
    const result: Tile[] = [];
    for (let step = 0; step <= length; step++) {
        const point = a.map((value, index) => value + ((b[index] - value) * step) / (length || 1));
        const rounded = point.map(Math.round);
        const difference = rounded.map((value, index) => Math.abs(value - point[index]));
        const largest = difference.indexOf(Math.max(...difference));
        rounded[largest] = -rounded[(largest + 1) % 3] - rounded[(largest + 2) % 3];
        const y = rounded[2],
            x = rounded[0] + (y + (y % 2)) / 2;
        const tile = tiles.find((item) => item.x === x && item.y === y);
        if (tile) result.push(tile);
    }
    return result;
}
