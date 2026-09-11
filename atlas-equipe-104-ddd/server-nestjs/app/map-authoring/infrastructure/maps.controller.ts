import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { IdentityUseCases } from '@app/identity/application/identity-use-cases';
import { MapUseCases } from '@app/map-authoring/application/map-use-cases';
import { SaveMapRequest, DuplicateMapRequest, VisibilityRequest } from './map.requests';
@Controller()
export class MapsController {
    constructor(
        private readonly auth: IdentityUseCases,
        private readonly maps: MapUseCases,
    ) {}
    private token(header: string): string {
        return header?.replace(/^Bearer /, '') ?? '';
    }
    @Get('maps') list(@Headers('authorization') header: string): unknown {
        return this.maps.list(this.auth.require(this.token(header)));
    }
    @Post('maps') save(@Headers('authorization') header: string, @Body() body: SaveMapRequest): unknown {
        return this.maps.save(this.auth.require(this.token(header)), body);
    }
    @Post('maps/:id/lock') lock(@Headers('authorization') header: string, @Param('id') id: string): unknown {
        return this.maps.lock(id, this.auth.require(this.token(header)));
    }
    @Delete('maps/:id/lock') unlock(@Headers('authorization') header: string, @Param('id') id: string): void {
        this.maps.unlock(id, this.auth.require(this.token(header)));
    }
    @Post('maps/:id/duplicate') duplicate(
        @Headers('authorization') header: string,
        @Param('id') id: string,
        @Body() body: DuplicateMapRequest,
    ): unknown {
        return this.maps.duplicate(id, this.auth.require(this.token(header)), body.name, body.visibility);
    }
    @Patch('maps/:id/visibility') visibility(
        @Headers('authorization') header: string,
        @Param('id') id: string,
        @Body() body: VisibilityRequest,
    ): unknown {
        return this.maps.visibility(id, this.auth.require(this.token(header)), body.visibility);
    }
    @Delete('maps/:id') remove(@Headers('authorization') header: string, @Param('id') id: string): unknown {
        return this.maps.remove(id, this.auth.require(this.token(header)));
    }
}
