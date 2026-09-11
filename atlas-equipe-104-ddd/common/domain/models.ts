export enum Terrain {
    Water = 'water',
    Grass = 'grass',
    Mountain = 'mountain',
    Forest = 'forest',
    Desert = 'desert',
}
export enum MapObject {
    Road = 'road',
    City = 'city',
    Spawn = 'spawn',
}
export interface Tile {
    x: number;
    y: number;
    terrain: Terrain;
    object?: MapObject;
}
export interface MapData {
    rows: number;
    tiles: Tile[];
}
export interface TravelConfig {
    base: number;
    grass: number;
    forest: number;
    desert: number;
    road: number;
}
export const DEFAULT_CONFIG: TravelConfig = { base: 600, grass: 1, forest: 0.5, desert: 0.75, road: 2 };
export interface Movement {
    from: string;
    to: string;
    startedAt: number;
    duration: number;
    remaining: string[];
}
export interface Player {
    id: string;
    name: string;
    color: string;
    tile: string;
    movement?: Movement;
}
export interface ChatMessage {
    name: string;
    text: string;
    time: number;
    system?: boolean;
}
export interface MapRecord extends MapData {
    id: string;
    name: string;
    ownerId: string;
    ownerName: string;
    visibility: 'public' | 'private';
    updatedAt: string;
    lockedBy?: string;
}
export interface User {
    id: string;
    name: string;
    createdAt: string;
    mapCount?: number;
}
export interface TestSession {
    id: string;
    mapId?: string;
    mapName: string;
    hostId: string;
    hostName: string;
    type: 'solo' | 'public' | 'protected';
    map: MapData;
    players: Player[];
    config: TravelConfig;
    messages: ChatMessage[];
}
