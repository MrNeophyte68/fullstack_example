import { MapData, MapRecord } from './models';
export type Tool = 'paint' | 'fill' | 'inspect' | 'road' | 'city' | 'spawn';
export interface EditorDraft {
    map: MapData;
    record?: MapRecord;
    name: string;
    visibility: 'public' | 'private';
    saved: string;
}
