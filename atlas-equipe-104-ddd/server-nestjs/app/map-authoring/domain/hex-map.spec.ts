import { HexMap } from './hex-map';
import { createMap, validateMap } from '@common/domain/hex';
import { Terrain } from '@common/domain/models';
import { OWNER, OTHER } from '@app/testing/domain-fixtures.fixture';
describe('HexMap aggregate', () => {
    it('allows saving incomplete maps while keeping test-readiness validation separate', () => {
        const map = HexMap.create(OWNER, { ...createMap(), name: ' Draft ', visibility: 'private' });
        expect(map.snapshot().name).toBe('Draft');
        expect(validateMap(map.snapshot()).length).toBeGreaterThan(0);
    });
    it('enforces privacy and owner-only visibility changes independently of HTTP', () => {
        const map = HexMap.create(OWNER, { ...createMap(), name: 'Draft', visibility: 'private' });
        expect(map.canRead(OTHER)).toBe(false);
        expect(() => map.edit(OTHER, { ...createMap(), name: 'Stolen', visibility: 'public' })).toThrow('inaccessible');
        map.changeVisibility(OWNER, 'public');
        map.edit(OTHER, { ...createMap(), name: 'Collaborative', visibility: 'private' });
        expect(map.snapshot().visibility).toBe('public');
        expect(map.snapshot().ownerId).toBe(OWNER.id);
        expect(() => map.changeVisibility(OTHER, 'private')).toThrow('propriétaire');
    });
    it('does not expose mutable snapshots or retain command tile references', () => {
        const command = { ...createMap(), name: 'Draft', visibility: 'public' };
        const map = HexMap.create(OWNER, command);
        command.tiles[0].terrain = Terrain.Grass;
        const snapshot = map.snapshot();
        snapshot.tiles[0].terrain = Terrain.Forest;
        expect(map.snapshot().tiles[0].terrain).toBe(Terrain.Water);
    });
    it('rejects malformed tiles with a domain error instead of dereferencing null', () => {
        const data = createMap();
        data.tiles[0] = null;
        expect(() => HexMap.create(OWNER, { ...data, name: 'Bad', visibility: 'private' })).toThrow('Tuile invalide');
    });
});
