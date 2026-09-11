import { MapData, MapRecord } from '@common/domain/models';
import { CommandPort } from './command-port';
export interface SaveMapCommand extends MapData {
    id?: string;
    name: string;
    visibility: 'public' | 'private';
}
export class MapClient {
    constructor(private readonly remote: CommandPort) {}
    list(): Promise<MapRecord[]> {
        return this.remote.request('maps');
    }
    lock(id: string): Promise<MapRecord> {
        return this.remote.request(`maps/${id}/lock`, 'POST');
    }
    unlock(id: string): Promise<void> {
        return this.remote.request(`maps/${id}/lock`, 'DELETE');
    }
    save(command: SaveMapCommand): Promise<MapRecord> {
        return this.remote.request('maps', 'POST', command);
    }
    duplicate(id: string, name: string, visibility: 'public' | 'private'): Promise<MapRecord> {
        return this.remote.request(`maps/${id}/duplicate`, 'POST', { name, visibility });
    }
    changeVisibility(id: string, visibility: 'public' | 'private'): Promise<void> {
        return this.remote.request(`maps/${id}/visibility`, 'PATCH', { visibility });
    }
    remove(id: string): Promise<void> {
        return this.remote.request(`maps/${id}`, 'DELETE');
    }
}
