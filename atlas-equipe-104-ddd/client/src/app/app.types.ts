export type View = 'home' | 'maps' | 'editor' | 'sessions' | 'test' | 'admin';
export interface Modal {
    type: string;
    title: string;
    text?: string;
    action?: () => Promise<void>;
    onCancel?: () => void;
}

export type { Tool } from '@common/domain/editor.types';
