import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { IdentityUseCases } from '@app/identity/application/identity-use-cases';
import { PasswordRequest } from './account.requests';
@Controller()
export class AdminController {
    constructor(private readonly auth: IdentityUseCases) {}
    @Post('admin/login') adminLogin(@Body() body: PasswordRequest, @Req() request: Request): object {
        this.auth.rateLimit(request.ip ?? 'unknown');
        return { token: this.auth.adminLogin(body.password) };
    }
    @Get('admin/users') adminUsers(@Headers('x-admin-token') token: string): unknown {
        this.auth.requireAdmin(token);
        return this.auth.users();
    }
    @Patch('admin/users/:id/password') adminPassword(
        @Headers('x-admin-token') token: string,
        @Param('id') id: string,
        @Body() body: PasswordRequest,
    ): unknown {
        this.auth.requireAdmin(token);
        return this.auth.changePassword(id, body.password);
    }
    @Post('admin/users/:id/disconnect') adminDisconnect(@Headers('x-admin-token') token: string, @Param('id') id: string): void {
        this.auth.requireAdmin(token);
        this.auth.revoke(id, 'L’administrateur vous a déconnecté.');
    }
    @Delete('admin/users/:id') adminDelete(@Headers('x-admin-token') token: string, @Param('id') id: string): unknown {
        this.auth.requireAdmin(token);
        return this.auth.deleteUser(id);
    }
    @Delete('admin/users') async reset(@Headers('x-admin-token') token: string): Promise<void> {
        this.auth.requireAdmin(token);
        for (const user of await this.auth.users()) await this.auth.deleteUser(user.id);
    }
}
