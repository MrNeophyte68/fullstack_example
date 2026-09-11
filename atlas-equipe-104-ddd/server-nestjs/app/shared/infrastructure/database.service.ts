import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import mongoose from 'mongoose';
import { userSchema, mapSchema } from './database.schemas';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    readonly users = mongoose.model('User', userSchema);
    readonly maps = mongoose.model('HexMap', mapSchema);
    async onModuleInit(): Promise<void> {
        await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/hex-atlas', { serverSelectionTimeoutMS: 10000 });
        await Promise.all([this.users.init(), this.maps.init()]);
    }
    async onModuleDestroy(): Promise<void> {
        await mongoose.disconnect();
    }
}
