import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspacePresenter } from '@app/presentation/workspace.presenter';
import { HexCanvasComponent } from '@app/components/hex-canvas.component';
@Component({
    selector: 'app-editor-page',
    standalone: true,
    imports: [CommonModule, FormsModule, HexCanvasComponent],
    templateUrl: './editor-page.component.html',
})
export class EditorPageComponent {
    readonly ui = inject(WorkspacePresenter);
    @ViewChild(HexCanvasComponent) set surface(canvas: HexCanvasComponent) {
        this.ui.canvas = canvas;
    }
}
