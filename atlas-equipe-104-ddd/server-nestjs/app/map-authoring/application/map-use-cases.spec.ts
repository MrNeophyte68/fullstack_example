import { MapUseCases } from './map-use-cases';
import { MapRepository } from './ports';
import { MapRecord } from '@common/domain/models';
import { createMap } from '@common/domain/hex';
import { OWNER, OTHER } from '@app/testing/domain-fixtures.fixture';
import { EventBus } from '@app/shared/application/ports';
describe('Map use cases through repository and event ports', () => {
    let maps: MapUseCases;
    let records: Map<string, MapRecord>;
    let locks: Map<string, string>;
    let listeners: Map<string, (...args: string[]) => void>;
    beforeEach(() => {
        records = new Map();
        locks = new Map();
        listeners = new Map();
        const repository: MapRepository = {
            visibleTo: async (user) =>
                [...records.values()].filter((record) => record.ownerId === user.id || record.visibility === 'public'),
            find: async (id) => records.get(id),
            save: async (record) => {
                const saved = structuredClone({ ...record, id: record.id || `map-${records.size}`, updatedAt: 'now' });
                records.set(saved.id, saved);
                return saved;
            },
            remove: async (id) => {
                records.delete(id);
            },
            ownedBy: async (id) => [...records.values()].filter((record) => record.ownerId === id),
        };
        const events: EventBus = {
            on: (name, listener) => {
                listeners.set(name, listener);
            },
            emit: (name, ...args) => listeners.get(name)?.(...args),
        };
        maps = new MapUseCases({ repository, locks }, events);
    });
    it('requires an acquired lock for updates and releases it when the editor logs out', async () => {
        const map = await maps.save(OWNER, { ...createMap(), name: 'World', visibility: 'public' });
        await expect(maps.lock(map.id, OTHER)).rejects.toThrow('édition');
        await expect(maps.save(OTHER, map)).rejects.toThrow('éditeur');
        listeners.get('logout')?.(OWNER.id);
        expect(maps.lockedBy(map.id)).toBeUndefined();
        await maps.lock(map.id, OTHER);
        await maps.save(OTHER, { ...map, name: 'Renamed' });
        expect(records.get(map.id)?.name).toBe('Renamed');
    });
    it('duplicates a saved snapshot into independent ownership without leaving a lock', async () => {
        const map = await maps.save(OWNER, { ...createMap(), name: 'World', visibility: 'public' });
        const copy = await maps.duplicate(map.id, OTHER, 'Copy', 'private');
        expect(copy.ownerId).toBe(OTHER.id);
        expect(copy.id).not.toBe(map.id);
        expect(copy.lockedBy).toBeUndefined();
        await expect(maps.remove(map.id, OTHER)).rejects.toThrow('propriétaire');
    });
    it('revokes foreign editor access when the owner makes the map private', async () => {
        const map = await maps.save(OWNER, { ...createMap(), name: 'World', visibility: 'public' });
        maps.unlock(map.id, OWNER);
        await maps.lock(map.id, OTHER);
        await maps.visibility(map.id, OWNER, 'private');
        expect(maps.lockedBy(map.id)).toBeUndefined();
        expect(await maps.list(OTHER)).toEqual([]);
    });
});
