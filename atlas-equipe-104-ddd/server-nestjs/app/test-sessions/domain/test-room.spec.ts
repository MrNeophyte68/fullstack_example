import { TestRoom } from './test-room';
import { DEFAULT_CONFIG } from '@common/domain/models';
import { OWNER, OTHER, playableMap } from '@app/testing/domain-fixtures.fixture';
describe('TestRoom aggregate', () => {
    const create = () => TestRoom.create('session', OWNER, { map: playableMap(), mapName: 'World', type: 'public' });
    it('reserves the absent host’s place and assigns distinct starting points', () => {
        const room = create();
        for (const id of ['a', 'b', 'c']) room.join({ ...OTHER, id }, () => 0, 0);
        expect(() => room.join({ ...OTHER, id: 'd' }, () => 0, 0)).toThrow('complète');
        room.join(OWNER, () => 0, 0);
        expect(new Set(room.snapshot().players.map((player) => player.tile)).size).toBe(4);
    });
    it('cancels after the current segment reaches its center', () => {
        const room = create();
        room.join(OWNER, () => 0, 0);
        const movement = room.move(OWNER.id, '12,5', 0);
        const from = room.snapshot().players[0].tile;
        room.cancel(OWNER.id);
        expect(room.snapshot().players[0].tile).toBe(from);
        expect(room.arrive(OWNER.id, movement, movement.duration)).toBeUndefined();
        expect(room.snapshot().players[0].tile).toBe(movement.to);
        expect(room.snapshot().players[0].movement).toBeUndefined();
    });
    it('applies travel configuration changes only to subsequent segments', () => {
        const room = create();
        room.join(OWNER, () => 0, 0);
        const movement = room.move(OWNER.id, '12,5', 0);
        room.configure({ ...DEFAULT_CONFIG, base: 100 });
        expect(movement.duration).toBe(DEFAULT_CONFIG.base);
        const next = room.arrive(OWNER.id, movement, movement.duration);
        expect(next.duration).toBe(100);
    });
    it('ignores stale movement completions after the host replaces the snapshot', () => {
        const room = create();
        room.join(OWNER, () => 0, 0);
        const movement = room.move(OWNER.id, '12,5', 0);
        room.chat(OWNER, 'Keep this message', 0);
        room.resume(playableMap(), () => 0);
        const before = room.snapshot();
        expect(room.arrive(OWNER.id, movement, 1000)).toBeUndefined();
        expect(room.snapshot()).toEqual(before);
        expect(before.messages.at(-1)?.text).toBe('Keep this message');
    });
    it('protects host operations and validates configuration and chat', () => {
        const room = create();
        room.join(OWNER, () => 0, 0);
        room.join(OTHER, () => 0, 0);
        expect(() => room.authorize(OTHER.id, true)).toThrow('inaccessible');
        expect(() => room.configure({ ...DEFAULT_CONFIG, base: NaN })).toThrow('invalides');
        expect(() => room.chat(OWNER, 'x'.repeat(201), 0)).toThrow('200');
    });
    it('keeps PIN hashes and mutable state out of public snapshots', () => {
        const room = TestRoom.create(
            'session',
            OWNER,
            { map: playableMap(), mapName: 'World', type: 'protected', pin: '1234' },
            'secret',
        );
        const snapshot = room.snapshot();
        snapshot.map.tiles = [];
        expect(room.snapshot().map.tiles.length).toBeGreaterThan(0);
        expect(JSON.stringify(room.snapshot())).not.toContain('secret');
    });
});
