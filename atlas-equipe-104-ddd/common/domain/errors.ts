export type ErrorKind = 'invalid' | 'conflict' | 'forbidden' | 'not-found' | 'unauthorized';
export class DomainError extends Error {
    constructor(
        readonly kind: ErrorKind,
        message: string,
    ) {
        super(message);
    }
}
