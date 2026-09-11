import { Injectable } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { DatabaseService } from '@app/shared/infrastructure/database.service';
import { MapDocument } from '@app/shared/infrastructure/database.schemas';
import { MapRepository } from '@app/map-authoring/application/ports';
import { MapRecord, User } from '@common/contracts/models';
import { MapObject, Terrain } from '@common/domain/models';
import { DomainError } from '@common/domain/errors';
const DUPLICATE_KEY_CODE = 11000;
@Injectable()
export class MongoMapRepository implements MapRepository {
    constructor(private readonly database: DatabaseService) {}
    async visibleTo(user: User): Promise<MapRecord[]> {
        const records = await this.database.maps
            .find({ $or: [{ ownerId: user.id }, { visibility: 'public' }] })
            .sort({ updatedAt: -1 });
        return records.map((record) => this.serialize(record));
    }
    async find(id: string): Promise<MapRecord | undefined> {
        if (!isValidObjectId(id)) return undefined;
        const record = await this.database.maps.findById(id);
        return record ? this.serialize(record) : undefined;
    }
    async ownedBy(id: string): Promise<MapRecord[]> {
        return (await this.database.maps.find({ ownerId: id })).map((record) => this.serialize(record));
    }
    async save(snapshot: MapRecord): Promise<MapRecord> {
        const record = snapshot.id ? await this.database.maps.findById(snapshot.id) : new this.database.maps();
        if (!record) throw new DomainError('not-found', 'Carte introuvable.');
        const { id, updatedAt, lockedBy, ...data } = snapshot;
        void id;
        void updatedAt;
        void lockedBy;
        record.set({ ...data, normalizedName: snapshot.name.toLocaleLowerCase() });
        try {
            return this.serialize(await record.save());
        } catch (error) {
            if (error.code === DUPLICATE_KEY_CODE) throw new DomainError('conflict', 'Ce nom de carte est déjà utilisé.');
            throw error;
        }
    }
    async remove(id: string): Promise<void> {
        await this.database.maps.deleteOne({ _id: id });
    }
    private serialize(record: MapDocument): MapRecord {
        return {
            id: record.id,
            name: record.name,
            ownerId: record.ownerId,
            ownerName: record.ownerName,
            visibility: record.visibility as MapRecord['visibility'],
            rows: record.rows,
            tiles: record.tiles.map((tile) => ({
                x: tile.x,
                y: tile.y,
                terrain: tile.terrain as Terrain,
                object: tile.object as MapObject,
            })),
            updatedAt: record.updatedAt.toISOString(),
        };
    }
}
