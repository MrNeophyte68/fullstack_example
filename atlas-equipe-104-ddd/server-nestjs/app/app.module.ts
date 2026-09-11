import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IdentityController } from './identity/infrastructure/identity.controller';
import { AdminController } from './identity/infrastructure/admin.controller';
import { MapsController } from './map-authoring/infrastructure/maps.controller';
import { HealthController } from './shared/infrastructure/health.controller';
import { APPLICATION_PROVIDERS } from './composition.providers';
@Module({
    imports: [ConfigModule.forRoot()],
    controllers: [IdentityController, AdminController, MapsController, HealthController],
    providers: APPLICATION_PROVIDERS,
})
export class AppModule {}
