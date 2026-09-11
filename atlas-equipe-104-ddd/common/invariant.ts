export function requireValue<T>(value: T | null | undefined): T {
    if (value === undefined || value === null) throw new Error('Une donnée requise est absente. Rechargez la page.');
    return value;
}
