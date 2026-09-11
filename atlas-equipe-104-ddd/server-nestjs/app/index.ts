import { DEFAULT_PORT } from './index.constants';
import 'reflect-metadata';
import { json } from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule, { bodyParser: false });
    app.use(json({ limit: '1mb' }));
    app.setGlobalPrefix('api');
    app.enableCors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:4200' });
    app.enableShutdownHooks();
    await app.listen(Number(process.env.PORT ?? DEFAULT_PORT), '0.0.0.0');
}
void bootstrap();
