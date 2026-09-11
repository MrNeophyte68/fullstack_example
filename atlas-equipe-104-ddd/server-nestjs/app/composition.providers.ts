import { Provider } from '@nestjs/common';
import { DatabaseService } from './shared/infrastructure/database.service';
import { NodeRuntime } from './shared/infrastructure/node-runtime';
import { LocalEventBus } from './shared/infrastructure/local-event-bus';
import { MemoryStore } from './shared/infrastructure/memory-store';
import { DOMAIN_ERROR_FILTER } from './shared/infrastructure/domain-error.filter';
import { ScryptPasswordHasher } from './identity/infrastructure/scrypt-password-hasher';
import { MongoAccountRepository } from './identity/infrastructure/mongo-account.repository';
import { IdentityUseCases } from './identity/application/identity-use-cases';
import { MapUseCases } from './map-authoring/application/map-use-cases';
import { MongoMapRepository } from './map-authoring/infrastructure/mongo-map.repository';
import { SessionUseCases } from './test-sessions/application/session-use-cases';
import { SocketRealtime } from './test-sessions/infrastructure/socket-realtime';
import { SessionsGateway } from './test-sessions/infrastructure/sessions.gateway';
export const APPLICATION_PROVIDERS: Provider[] = [
    DatabaseService,
    NodeRuntime,
    LocalEventBus,
    ScryptPasswordHasher,
    MongoAccountRepository,
    MongoMapRepository,
    SocketRealtime,
    SessionsGateway,
    DOMAIN_ERROR_FILTER,
    {
        provide: MapUseCases,
        inject: [MongoMapRepository, LocalEventBus],
        useFactory: (repository: MongoMapRepository, events: LocalEventBus) =>
            new MapUseCases({ repository, locks: new MemoryStore() }, events),
    },
    {
        provide: IdentityUseCases,
        inject: [MongoAccountRepository, ScryptPasswordHasher, NodeRuntime, LocalEventBus, MapUseCases],
        useFactory: (
            accounts: MongoAccountRepository,
            passwords: ScryptPasswordHasher,
            runtime: NodeRuntime,
            events: LocalEventBus,
            maps: MapUseCases,
        ) =>
            new IdentityUseCases({
                accounts,
                passwords,
                runtime,
                events,
                maps,
                logins: new MemoryStore(),
                admins: new MemoryStore(),
                attempts: new MemoryStore(),
            }),
    },
    {
        provide: SessionUseCases,
        inject: [IdentityUseCases, MapUseCases, NodeRuntime, LocalEventBus, SocketRealtime, ScryptPasswordHasher],
        useFactory: (
            ...dependencies: [IdentityUseCases, MapUseCases, NodeRuntime, LocalEventBus, SocketRealtime, ScryptPasswordHasher]
        ) => {
            const [identity, maps, runtime, events, realtime, passwords] = dependencies;
            return new SessionUseCases({ identity, maps, runtime, events, realtime, passwords, rooms: new MemoryStore() });
        },
    },
];
