import { Controller, Get } from '@nestjs/common';
@Controller()
export class HealthController {
    @Get('health') health(): object {
        return { status: 'ok', database: 'mongodb' };
    }
}
