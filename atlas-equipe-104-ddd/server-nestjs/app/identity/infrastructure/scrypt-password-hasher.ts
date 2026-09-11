import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PasswordHasher } from '@app/shared/application/ports';
import { SALT_BYTES, KEY_BYTES } from './crypto.constants';
export class ScryptPasswordHasher implements PasswordHasher {
    hash(password: string): string {
        const salt = randomBytes(SALT_BYTES).toString('hex');
        return `${salt}:${scryptSync(password, salt, KEY_BYTES).toString('hex')}`;
    }
    matches(password: string, hash: string): boolean {
        const [salt, digest] = hash.split(':');
        return timingSafeEqual(scryptSync(password, salt, KEY_BYTES), Buffer.from(digest, 'hex'));
    }
    matchesAdmin(password: string): boolean {
        const expected = process.env.ADMIN_PASSWORD;
        return (
            Boolean(expected) && timingSafeEqual(scryptSync(password, 'admin', KEY_BYTES), scryptSync(expected, 'admin', KEY_BYTES))
        );
    }
}
