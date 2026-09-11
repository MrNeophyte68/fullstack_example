import { User } from '@common/domain/models';
import { CommandPort } from './command-port';
export interface AdminLogin {
    token: string;
}
export class AccountClient {
    constructor(private readonly remote: CommandPort) {}
    profile(): Promise<User> {
        return this.remote.request('auth/me');
    }
    users(): Promise<User[]> {
        return this.remote.request('admin/users');
    }
    adminLogin(password: string): Promise<AdminLogin> {
        return this.remote.request('admin/login', 'POST', { password });
    }
    changePassword(password: string, userId?: string): Promise<void> {
        return this.remote.request(userId ? `admin/users/${userId}/password` : 'auth/password', 'PATCH', { password });
    }
    remove(userId?: string): Promise<void> {
        return this.remote.request(userId ? `admin/users/${userId}` : 'auth/me', 'DELETE');
    }
    disconnect(userId: string): Promise<void> {
        return this.remote.request(`admin/users/${userId}/disconnect`, 'POST');
    }
    reset(): Promise<void> {
        return this.remote.request('admin/users', 'DELETE');
    }
}
