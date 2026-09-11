import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspacePresenter } from '@app/presentation/workspace.presenter';
import { HexCanvasComponent } from '@app/components/hex-canvas.component';
@Component({
    selector: 'app-maps-page',
    standalone: true,
    imports: [CommonModule, FormsModule, HexCanvasComponent],
    templateUrl: './maps-page.component.html',
})
export class MapsPageComponent {
    readonly ui = inject(WorkspacePresenter);
}
