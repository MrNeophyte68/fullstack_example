import { RouterLink } from '@angular/router';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspacePresenter } from '@app/presentation/workspace.presenter';
import { HexCanvasComponent } from '@app/components/hex-canvas.component';
@Component({
    selector: 'app-sessions-page',
    standalone: true,
    imports: [RouterLink, CommonModule, FormsModule, HexCanvasComponent],
    templateUrl: './sessions-page.component.html',
})
export class SessionsPageComponent {
    readonly ui = inject(WorkspacePresenter);
}
