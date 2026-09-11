import { MapData, TravelConfig } from '@common/domain/models';
import { TestSession } from '@common/contracts/models';
export interface CreateSessionRequest {
    map: MapData;
    mapId?: string;
    mapName: string;
    type: TestSession['type'];
    pin?: string;
}
export interface JoinSessionRequest {
    id: string;
    pin?: string;
}
export interface ResumeSessionRequest {
    id: string;
    map: MapData;
}
export interface ConfigureSessionRequest {
    id: string;
    config: TravelConfig;
}
export interface ChatRequest {
    id: string;
    text: string;
}
export interface MoveRequest {
    id: string;
    destination: string;
}
