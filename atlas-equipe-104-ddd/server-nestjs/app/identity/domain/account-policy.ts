import { DomainError } from '@common/domain/errors';
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from './identity.constants';
export function checkPassword(password: string): void {
    if (
        typeof password !== 'string' ||
        password.length < MIN_PASSWORD_LENGTH ||
        password.length > MAX_PASSWORD_LENGTH ||
        !/[a-z]/i.test(password) ||
        !/\d/.test(password)
    )
        throw new DomainError('invalid', 'Le mot de passe doit contenir 10 à 128 caractères, une lettre et un chiffre.');
}
export function checkName(name: string): string {
    if (typeof name !== 'string' || !/^[\p{L}\p{N}_ -]{3,24}$/u.test(name.trim()))
        throw new DomainError('invalid', 'Choisissez un nom de 3 à 24 lettres, chiffres, espaces, tirets ou traits de soulignement.');
    return name.trim();
}
