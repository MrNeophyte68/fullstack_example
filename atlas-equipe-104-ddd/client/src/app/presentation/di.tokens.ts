import { InjectionToken } from '@angular/core';
import { HttpPort, RealtimePort, StoragePort } from '@app/application/ports';
export const HTTP_PORT = new InjectionToken<HttpPort>('HTTP port');
export const REALTIME_PORT = new InjectionToken<RealtimePort>('Realtime port');
export const STORAGE_PORT = new InjectionToken<StoragePort>('Storage port');
