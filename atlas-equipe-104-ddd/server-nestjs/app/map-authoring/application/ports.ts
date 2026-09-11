import { MapRecord, User } from '@common/contracts/models';
import { Store } from '@app/shared/application/ports';
export interface MapRepository {
    visibleTo(user: User): Promise<MapRecord[]>;
    find(id: string): Promise<MapRecord | undefined>;
    save(record: MapRecord): Promise<MapRecord>;
    remove(id: string): Promise<void>;
    ownedBy(id: string): Promise<MapRecord[]>;
}
export interface MapAccess {
    lockedBy(id: string): string | undefined;
}
export interface MapDependencies {
    repository: MapRepository;
    locks: Store<string>;
}
export interface OwnedMaps {
    removeOwnedBy(id: string): Promise<void>;
    countOwnedBy(id: string): Promise<number>;
}
