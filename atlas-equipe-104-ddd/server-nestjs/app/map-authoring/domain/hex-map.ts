import { MapData, MapRecord, User } from '@common/domain/models';

import { checkMapData } from '@common/domain/map-validation';
import { MAX_MAP_NAME_LENGTH } from '@common/domain/map.constants';
import { DomainError } from '@common/domain/errors';
export interface SaveMap extends MapData {
    id?: string;
    name: string;
    visibility: string;
}
export class HexMap {
    private constructor(private record: MapRecord) {}
    static restore(record: MapRecord): HexMap {
        return new HexMap(structuredClone(record));
    }
    static create(owner: User, command: SaveMap): HexMap {
        const map = new HexMap({ ...command, id: '', ownerId: owner.id, ownerName: owner.name, visibility: 'private', updatedAt: '' });
        map.edit(owner, command);
        return map;
    }
    canRead(user: User): boolean {
        return this.record.visibility === 'public' || this.record.ownerId === user.id;
    }
    requireOwner(user: User): void {
        if (this.record.ownerId !== user.id) throw new DomainError('forbidden', 'Action réservée au propriétaire.');
    }
    edit(user: User, command: SaveMap): void {
        if (!this.canRead(user)) throw new DomainError('forbidden', 'Carte inaccessible.');
        checkMapData(command);
        if (typeof command.name !== 'string' || !command.name.trim() || command.name.trim().length > MAX_MAP_NAME_LENGTH)
            throw new DomainError('invalid', 'Nom (1 à 60 caractères) et visibilité requis.');
        this.validateVisibility(command.visibility);
        this.record.name = command.name.trim();
        this.record.rows = command.rows;
        this.record.tiles = structuredClone(command.tiles);
        if (this.record.ownerId === user.id) this.changeVisibility(user, command.visibility);
    }
    changeVisibility(user: User, visibility: string): void {
        this.requireOwner(user);
        this.validateVisibility(visibility);
        this.record.visibility = visibility as MapRecord['visibility'];
    }
    snapshot(): MapRecord {
        return structuredClone(this.record);
    }
    private validateVisibility(visibility: string): void {
        if (!['public', 'private'].includes(visibility)) throw new DomainError('invalid', 'Visibilité invalide.');
    }
}
