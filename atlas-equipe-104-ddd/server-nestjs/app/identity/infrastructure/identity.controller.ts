import { Body, Controller, Delete, Get, Headers, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { IdentityUseCases } from '@app/identity/application/identity-use-cases';
import { LoginRequest, PasswordRequest } from './account.requests';
@Controller()
export class IdentityController {
    constructor(private readonly auth: IdentityUseCases) {}
    private token(header: string): string {
        return header?.replace(/^Bearer /, '') ?? '';
    }
    @Post('auth/register') register(@Body() body: LoginRequest, @Req() request: Request): unknown {
        this.auth.rateLimit(request.ip ?? 'unknown');
        return this.auth.register(body.name, body.password);
    }
    @Post('auth/login') login(@Body() body: LoginRequest, @Req() request: Request): unknown {
        this.auth.rateLimit(request.ip ?? 'unknown');
        return this.auth.login(body.name, body.password);
    }
    @Post('auth/logout') logout(@Headers('authorization') header: string): void {
        this.auth.logout(this.token(header));
    }
    @Get('auth/me') async me(@Headers('authorization') header: string): Promise<unknown> {
        const user = this.auth.require(this.token(header));
        return (await this.auth.users()).find((item) => item.id === user.id);
    }
    @Patch('auth/password') password(@Headers('authorization') header: string, @Body() body: PasswordRequest): unknown {
        return this.auth.changePassword(this.auth.require(this.token(header)).id, body.password);
    }
    @Delete('auth/me') deleteMe(@Headers('authorization') header: string): unknown {
        return this.auth.deleteUser(this.auth.require(this.token(header)).id);
    }
}
