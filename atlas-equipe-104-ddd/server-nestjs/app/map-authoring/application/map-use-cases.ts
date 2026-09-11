import { MapRecord, User } from '@common/contracts/models';
import { DomainError } from '@common/domain/errors';
import { HexMap, SaveMap } from '@app/map-authoring/domain/hex-map';
import { EventBus } from '@app/shared/application/ports';
import { MapAccess, MapDependencies, OwnedMaps } from './ports';
export class MapUseCases implements MapAccess, OwnedMaps {
    constructor(
        private readonly dependencies: MapDependencies,
        private readonly events: EventBus,
    ) {
        events.on('logout', (id) => {
            for (const [mapId, owner] of dependencies.locks.entries()) if (owner === id) dependencies.locks.delete(mapId);
            events.emit('maps-changed');
        });
        events.on('map-deleted', (id) => dependencies.locks.delete(id));
    }
    lockedBy(id: string): string | undefined {
        return this.dependencies.locks.get(id);
    }
    async list(user: User): Promise<MapRecord[]> {
        return (await this.dependencies.repository.visibleTo(user)).map((record) => this.serialize(record));
    }
    private serialize(record: MapRecord): MapRecord {
        return { ...record, lockedBy: this.lockedBy(record.id) };
    }
    private async get(id: string, user: User): Promise<HexMap> {
        const record = await this.dependencies.repository.find(id);
        const map = record && HexMap.restore(record);
        if (!map?.canRead(user)) throw new DomainError('not-found', 'Carte introuvable.');
        return map;
    }
    async lock(id: string, user: User): Promise<MapRecord> {
        const map = await this.get(id, user);
        if (this.lockedBy(id) && this.lockedBy(id) !== user.id)
            throw new DomainError('conflict', 'Cette carte est déjà en cours d’édition.');
        this.dependencies.locks.set(id, user.id);
        this.events.emit('maps-changed');
        return this.serialize(map.snapshot());
    }
    unlock(id: string, user: User): void {
        if (this.lockedBy(id) === user.id) {
            this.dependencies.locks.delete(id);
            this.events.emit('editor-left', user.id);
            this.events.emit('maps-changed');
        }
    }
    async save(user: User, command: SaveMap): Promise<MapRecord> {
        const map = command.id ? await this.get(command.id, user) : HexMap.create(user, command);
        if (command.id && this.lockedBy(command.id) !== user.id)
            throw new DomainError('conflict', 'Ouvrez la carte dans l’éditeur avant de la sauvegarder.');
        map.edit(user, command);
        const record = await this.dependencies.repository.save(map.snapshot());
        this.dependencies.locks.set(record.id, user.id);
        this.events.emit('maps-changed');
        return this.serialize(record);
    }
    async duplicate(id: string, user: User, name: string, visibility: string): Promise<MapRecord> {
        const source = (await this.get(id, user)).snapshot();
        const copy = await this.save(user, { rows: source.rows, tiles: source.tiles, name, visibility });
        this.dependencies.locks.delete(copy.id);
        this.events.emit('maps-changed');
        return this.serialize(copy);
    }
    async visibility(id: string, user: User, visibility: string): Promise<void> {
        const map = await this.get(id, user);
        map.changeVisibility(user, visibility);
        await this.dependencies.repository.save(map.snapshot());
        if (visibility === 'private' && this.lockedBy(id) && this.lockedBy(id) !== user.id) this.events.emit('map-deleted', id);
        this.events.emit('maps-changed');
    }
    async remove(id: string, user: User): Promise<void> {
        (await this.get(id, user)).requireOwner(user);
        await this.dependencies.repository.remove(id);
        this.events.emit('map-deleted', id);
        this.events.emit('maps-changed');
    }
    async removeOwnedBy(id: string): Promise<void> {
        for (const record of await this.dependencies.repository.ownedBy(id)) {
            await this.dependencies.repository.remove(record.id);
            this.events.emit('map-deleted', record.id);
        }
        this.events.emit('maps-changed');
    }
    async countOwnedBy(id: string): Promise<number> {
        return (await this.dependencies.repository.ownedBy(id)).length;
    }
}
