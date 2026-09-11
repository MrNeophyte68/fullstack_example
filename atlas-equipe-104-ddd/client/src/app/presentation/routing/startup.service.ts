import { Injectable, inject } from '@angular/core';
import { ConnectionStateService } from '@app/presentation/connection-state.service';
import { EditorService } from '@app/presentation/editor.service';
import { STORAGE_PORT } from '@app/presentation/di.tokens';
@Injectable({ providedIn: 'root' })
export class StartupService {
    private readonly api = inject(ConnectionStateService);
    private readonly editor = inject(EditorService);
    private readonly storage = inject(STORAGE_PORT);
    private initialization?: Promise<void>;
    private restoredMapId?: string;
    sessionRestorePending = Boolean(this.storage.getItem('hex-token'));
    initialize(): Promise<void> {
        this.initialization ??= this.restore();
        return this.initialization;
    }
    async restoreEditorLock(): Promise<void> {
        if (this.restoredMapId && this.restoredMapId === this.editor.record?.id) await this.api.maps.lock(this.restoredMapId);
        this.restoredMapId = undefined;
    }
    private async restore(): Promise<void> {
        this.editor.load();
        this.editor.restoreDraft();
        this.restoredMapId = this.editor.record?.id;
        await this.api.initialize();
        if (!this.api.user()) {
            this.editor.load();
            this.sessionRestorePending = false;
        }
    }
}
