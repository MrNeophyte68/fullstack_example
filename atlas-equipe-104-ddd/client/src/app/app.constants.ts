import { Terrain } from '@common/models';
import { Tool } from './app.types';
interface ToolOption {
    value: Tool;
    label: string;
    key: string;
    symbol: string;
}
export const TERRAIN_OPTIONS = [
    { value: Terrain.Water, label: 'Eau', key: '1', symbol: '≈' },
    { value: Terrain.Grass, label: 'Prairie', key: '2', symbol: '⋰' },
    { value: Terrain.Mountain, label: 'Montagne', key: '3', symbol: '△' },
    { value: Terrain.Forest, label: 'Forêt', key: '4', symbol: '♧' },
    { value: Terrain.Desert, label: 'Désert', key: '5', symbol: '≋' },
];
export const TOOL_OPTIONS: ToolOption[] = [
    { value: 'paint', label: 'Pinceau', key: 'M', symbol: '↗' },
    { value: 'fill', label: 'Seau', key: 'S', symbol: '◒' },
    { value: 'inspect', label: 'Inspecteur', key: 'I', symbol: '⌕' },
    { value: 'road', label: 'Route', key: 'R', symbol: '⌁' },
    { value: 'city', label: 'Ville', key: 'V', symbol: '▣' },
    { value: 'spawn', label: 'Départ', key: 'P', symbol: '⚑' },
];
export const MULTIPLIERS = [
    { value: 'grass' as const, label: 'Prairie' },
    { value: 'forest' as const, label: 'Forêt' },
    { value: 'desert' as const, label: 'Désert' },
    { value: 'road' as const, label: 'Route' },
];

export const TERRAIN_COLORS: Record<Terrain, string> = {
    water: '#235571',
    grass: '#77a965',
    mountain: '#8b91a0',
    forest: '#346750',
    desert: '#d5b779',
};
