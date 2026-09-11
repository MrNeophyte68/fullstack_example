import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { io, Socket } from 'socket.io-client';
import { AppModule } from './app.module';
import { createMap, key } from '@common/hex';
import { MapObject, MapRecord, Terrain, TestSession, User } from '@common/models';

interface ApiTestData extends Partial<Login>, Partial<MapRecord> {}
interface ApiResult<T> {
    status: number;
    data: T;
}
interface SocketReply {
    id?: string;
    error?: string;
}
interface Login {
    token: string;
    user: User;
}
describe('Full-stack API and real-time integration', () => {
    let app: INestApplication;
    let mongo: MongoMemoryServer;
    let url: string;
    let owner: Login;
    let other: Login;
    let map: MapRecord;
    const sockets: Socket[] = [];
    let hostSocket: Socket;
    let guestSocket: Socket;
    const request = async <T = ApiTestData>(
        path: string,
        method = 'GET',
        body?: unknown,
        token = '',
        admin = '',
    ): Promise<ApiResult<T>> => {
        const response = await fetch(`${url}/api/${path}`, {
            method,
            headers: new Headers([
                ['Content-Type', 'application/json'],
                ['Authorization', `Bearer ${token}`],
                ['x-admin-token', admin],
            ]),
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const text = await response.text();
        return { status: response.status, data: text ? JSON.parse(text) : undefined };
    };
    const connect = (token = ''): Promise<Socket> =>
        new Promise((resolve, reject) => {
            const socket = io(url, { auth: { token }, transports: ['websocket'], forceNew: true });
            sockets.push(socket);
            socket.once('identity', () => resolve(socket));
            socket.once('connect_error', reject);
        });
    const emit = (socket: Socket, event: string, body?: unknown): Promise<SocketReply> =>
        new Promise((resolve, reject) =>
            socket.timeout(5000).emit(event, body, (error: Error, data: SocketReply) => (error ? reject(error) : resolve(data))),
        );
    const state = (socket: Socket, accept: (room: TestSession) => boolean = () => true): Promise<TestSession> =>
        new Promise((resolve) => {
            const listener = (room: TestSession): void => {
                if (accept(room)) {
                    socket.off('session', listener);
                    resolve(room);
                }
            };
            socket.on('session', listener);
        });
    beforeAll(async () => {
        mongo = await MongoMemoryServer.create({ binary: { downloadDir: join(tmpdir(), 'hex-atlas-mongodb') } });
        process.env.MONGODB_URI = mongo.getUri();
        process.env.ADMIN_PASSWORD = 'TestingAdmin2026';
        app = await NestFactory.create(AppModule, { logger: false });
        app.setGlobalPrefix('api');
        await app.listen(0, '127.0.0.1');
        url = await app.getUrl();
        owner = (await request<Login>('auth/register', 'POST', { name: 'Owner', password: 'Password2026' })).data;
        other = (await request<Login>('auth/register', 'POST', { name: 'Other', password: 'Password2026' })).data;
        hostSocket = await connect(owner.token);
        guestSocket = await connect();
    }, 60000);
    afterAll(async () => {
        sockets.forEach((socket) => socket.disconnect());
        await app?.close();
        await mongo?.stop();
    });
    it('rejects weak passwords, case-insensitive duplicate accounts and double logins', async () => {
        expect((await request<Login>('auth/register', 'POST', { name: 'Third', password: 'short' })).status).toBe(400);
        expect((await request<Login>('auth/register', 'POST', { name: 'OWNER', password: 'Password2026' })).status).toBe(409);
        expect((await request('auth/login', 'POST', { name: 'Owner', password: 'wrong' })).status).toBe(401);
        expect((await request('auth/login', 'POST', { name: 'Owner', password: 'Password2026' })).status).toBe(409);
        expect((await request('maps')).status).toBe(401);
    });
    it('persists maps, conceals private maps and enforces global name uniqueness', async () => {
        const data = createMap();
        data.tiles.forEach((tile) => (tile.terrain = Terrain.Grass));
        for (const x of [1, 3, 5, 7]) data.tiles.find((tile) => key(tile) === `${x},0`).object = MapObject.Spawn;
        data.tiles.find((tile) => key(tile) === '10,10').object = MapObject.City;
        map = (await request<MapRecord>('maps', 'POST', { ...data, name: 'Test world', visibility: 'private' }, owner.token)).data;
        expect(map.id).toBeTruthy();
        expect((await request('maps', 'GET', undefined, other.token)).data).toEqual([]);
        expect((await request(`maps/${map.id}/lock`, 'POST', {}, other.token)).status).toBe(404);
        expect((await request('maps', 'POST', { ...data, name: 'TEST WORLD', visibility: 'public' }, other.token)).status).toBe(409);
    });
    it('allows public editing but reserves visibility and deletion for the owner', async () => {
        await request(`maps/${map.id}/visibility`, 'PATCH', { visibility: 'public' }, owner.token);
        expect((await request(`maps/${map.id}/lock`, 'POST', {}, other.token)).status).toBe(409);
        await request(`maps/${map.id}/lock`, 'DELETE', undefined, owner.token);
        expect((await request(`maps/${map.id}/lock`, 'POST', {}, other.token)).status).toBe(201);
        expect((await request(`maps/${map.id}`, 'DELETE', undefined, other.token)).status).toBe(403);
        expect((await request(`maps/${map.id}/visibility`, 'PATCH', { visibility: 'private' }, other.token)).status).toBe(403);
        await request(`maps/${map.id}/lock`, 'DELETE', undefined, other.token);
        await request(`maps/${map.id}/lock`, 'POST', {}, owner.token);
    });
    it('duplicates the saved version and gives ownership to the duplicator', async () => {
        const result = await request(`maps/${map.id}/duplicate`, 'POST', { name: 'Copied map', visibility: 'private' }, other.token);
        expect(result.status).toBe(201);
        expect(result.data.ownerId).toBe(other.user.id);
        expect(result.data.tiles).toEqual(map.tiles);
    });
    it('validates maps before creating a session', async () => {
        const result = await emit(hostSocket, 'create-session', { map: createMap(), mapName: 'Invalid', type: 'public' });
        expect(result.error).toContain('4 points de départ');
    });
    it('protects sessions, synchronizes chat/configuration/movement and preserves the room when the host leaves', async () => {
        const initial = state(hostSocket);
        const created = await emit(hostSocket, 'create-session', {
            map,
            mapId: map.id,
            mapName: map.name,
            type: 'protected',
            pin: '1234',
        });
        const room = await initial;
        expect(room.players).toHaveLength(1);
        expect(JSON.stringify(room)).not.toContain('pinHash');
        expect((await emit(guestSocket, 'join-session', { id: created.id, pin: '0000' })).error).toContain('NIP');
        const joined = state(guestSocket);
        await emit(guestSocket, 'join-session', { id: created.id, pin: '1234' });
        expect((await joined).players).toHaveLength(2);
        expect((await emit(guestSocket, 'configure', { id: created.id, config: room.config })).error).toBeTruthy();
        const chatState = state(hostSocket);
        await emit(guestSocket, 'chat', { id: created.id, text: 'Bonjour !' });
        expect((await chatState).messages.at(-1)?.text).toBe('Bonjour !');
        expect((await emit(guestSocket, 'chat', { id: created.id, text: 'x'.repeat(201) })).error).toBeTruthy();
        await emit(hostSocket, 'configure', { id: created.id, config: { ...room.config, base: 100 } });
        const moving = state(hostSocket);
        await emit(hostSocket, 'move', { id: created.id, destination: '12,5' });
        expect((await moving).players.find((player) => player.id === owner.user.id)?.movement).toBeDefined();
        const cancel = state(hostSocket);
        await emit(hostSocket, 'cancel-move', created.id);
        expect((await cancel).players.find((player) => player.id === owner.user.id)?.movement?.remaining).toEqual([]);
        const left = state(guestSocket, (remainingRoom) => remainingRoom.players.length === 1);
        await emit(hostSocket, 'leave-session', created.id);
        expect((await left).players).toHaveLength(1);
        const resumed = state(hostSocket);
        await emit(hostSocket, 'resume-session', { id: created.id, map });
        const resumedRoom = await resumed;
        expect(resumedRoom.players).toHaveLength(2);
        expect(resumedRoom.config.base).toBe(100);
        expect(resumedRoom.messages.some((message) => message.text === 'Bonjour !')).toBe(true);
        const closed = new Promise((resolve) => guestSocket.once('session-closed', resolve));
        await emit(hostSocket, 'close-session', created.id);
        expect(await closed).toBeTruthy();
    });
    it('gates administration and cascades account deletion to owned maps', async () => {
        expect((await request('admin/users')).status).toBe(401);
        const admin = (await request('admin/login', 'POST', { password: 'TestingAdmin2026' })).data.token;
        expect((await request('admin/users', 'GET', undefined, '', admin)).data).toHaveLength(2);
        await request(`admin/users/${other.user.id}`, 'DELETE', undefined, '', admin);
        expect((await request('auth/me', 'GET', undefined, other.token)).status).toBe(401);
        expect((await request('admin/users', 'GET', undefined, '', admin)).data).toHaveLength(1);
    });
});
