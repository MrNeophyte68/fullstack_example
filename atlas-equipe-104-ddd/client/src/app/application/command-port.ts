export interface CommandPort {
    request<T>(path: string, method?: string, body?: unknown): Promise<T>;
    emit<T>(event: string, body?: unknown): Promise<T>;
}
