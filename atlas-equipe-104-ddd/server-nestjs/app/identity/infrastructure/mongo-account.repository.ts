import { Injectable } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { DatabaseService } from '@app/shared/infrastructure/database.service';
import { AccountRecord, AccountRepository } from '@app/identity/application/ports';
import { DomainError } from '@common/domain/errors';
import { User } from '@common/contracts/models';
const DUPLICATE_KEY_CODE = 11000;
@Injectable()
export class MongoAccountRepository implements AccountRepository {
    constructor(private readonly database: DatabaseService) {}
    async create(name: string, passwordHash: string): Promise<void> {
        try {
            await this.database.users.create({ name, normalizedName: name.toLocaleLowerCase(), passwordHash });
        } catch (error) {
            if (error.code === DUPLICATE_KEY_CODE) throw new DomainError('conflict', 'Ce nom est déjà utilisé.');
            throw error;
        }
    }
    async findByName(name: string): Promise<AccountRecord | undefined> {
        const record = await this.database.users.findOne({ normalizedName: name.trim().toLocaleLowerCase() });
        return (
            record && {
                id: record.id,
                name: record.name,
                createdAt: record.createdAt.toISOString(),
                passwordHash: record.passwordHash,
            }
        );
    }
    async changePassword(id: string, hash: string): Promise<void> {
        if (!isValidObjectId(id)) throw new DomainError('not-found', 'Compte introuvable.');
        await this.database.users.updateOne({ _id: id }, { passwordHash: hash });
    }
    async remove(id: string): Promise<void> {
        if (!isValidObjectId(id)) throw new DomainError('not-found', 'Compte introuvable.');
        await this.database.users.deleteOne({ _id: id });
    }
    async list(): Promise<User[]> {
        return (await this.database.users.find().sort({ name: 1 })).map((user) => ({
            id: user.id,
            name: user.name,
            createdAt: user.createdAt.toISOString(),
        }));
    }
}
