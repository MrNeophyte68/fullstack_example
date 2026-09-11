import { MapData } from '@common/domain/models';
export interface SaveMapRequest extends MapData { id?: string; name: string; visibility: string }
export interface DuplicateMapRequest { name: string; visibility: string }
export interface VisibilityRequest { visibility: string }
