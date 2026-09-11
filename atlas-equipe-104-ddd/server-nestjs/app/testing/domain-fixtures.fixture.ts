import { MapObject, Terrain, User, MapData } from '@common/domain/models';
import { createMap, key } from '@common/domain/hex';
export const OWNER: User = { id: 'owner', name: 'Owner', createdAt: '' };
export const OTHER: User = { id: 'other', name: 'Other', createdAt: '' };
export function playableMap(): MapData {
    const map = createMap();
    map.tiles.forEach((tile) => Object.assign(tile, { terrain: Terrain.Grass }));
    for (const x of [1, 3, 5, 7]) map.tiles.find((tile) => key(tile) === `${x},0`).object = MapObject.Spawn;
    map.tiles.find((tile) => key(tile) === '10,10').object = MapObject.City;
    return map;
}
