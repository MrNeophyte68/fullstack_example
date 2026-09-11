import { DomainError } from './errors';
import { MapData, MapObject, Terrain, Tile } from './models';
import { createMap, key, neighbors } from './hex';
import { MIN_MAP_ROWS, MAX_MAP_ROWS, SPAWN_LIMIT } from './map.constants';
export function checkMapData(data: MapData): void {
    if (
        !data ||
        !Number.isInteger(data.rows) ||
        data.rows < MIN_MAP_ROWS ||
        data.rows > MAX_MAP_ROWS ||
        data.rows % 2 !== 1 ||
        !Array.isArray(data.tiles)
    )
        throw new DomainError('invalid', 'La carte doit avoir de 15 à 45 lignes, en nombre impair.');
    const expected = createMap(data.rows).tiles;
    if (expected.length !== data.tiles.length) throw new DomainError('invalid', 'Format de carte incorrect.');
    const coordinates = new Set(expected.map(key));
    const seen = new Set<string>();
    if (data.tiles.some((tile) => !tile)) throw new DomainError('invalid', 'Tuile invalide.');
    for (const tile of data.tiles) validateTile(tile, data.tiles, coordinates, seen);
    if (data.tiles.filter((tile) => tile.object === MapObject.Spawn).length > SPAWN_LIMIT)
        throw new DomainError('invalid', 'Quatre départs maximum.');
}

function validateTile(tile: Tile, tiles: Tile[], coordinates: Set<string>, seen: Set<string>): void {
    if (
        !tile ||
        !coordinates.has(key(tile)) ||
        seen.has(key(tile)) ||
        !Object.values(Terrain).includes(tile.terrain) ||
        (tile.object && !Object.values(MapObject).includes(tile.object))
    )
        throw new DomainError('invalid', 'Tuile invalide ou dupliquée.');
    seen.add(key(tile));
    if (
        tile.object &&
        [MapObject.City, MapObject.Spawn].includes(tile.object) &&
        [Terrain.Water, Terrain.Mountain].includes(tile.terrain)
    )
        throw new DomainError('invalid', `Objet interdit à (${key(tile)}).`);
    if (tile.object === MapObject.City && neighbors(tile, tiles).some((other) => other.object === MapObject.City))
        throw new DomainError('invalid', 'Deux villes ne peuvent pas être adjacentes.');
}
