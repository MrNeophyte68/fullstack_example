import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Response } from 'express';
import { DomainError, ErrorKind } from '@common/domain/errors';
const STATUS = new Map<ErrorKind, number>([
    ['invalid', HttpStatus.BAD_REQUEST],
    ['conflict', HttpStatus.CONFLICT],
    ['forbidden', HttpStatus.FORBIDDEN],
    ['not-found', HttpStatus.NOT_FOUND],
    ['unauthorized', HttpStatus.UNAUTHORIZED],
]);
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
    catch(error: DomainError, host: ArgumentsHost): void {
        const statusCode = STATUS.get(error.kind);
        host.switchToHttp().getResponse<Response>().status(statusCode).json({ statusCode, message: error.message });
    }
}
export const DOMAIN_ERROR_FILTER = { provide: APP_FILTER, useClass: DomainErrorFilter };
