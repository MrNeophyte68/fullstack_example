import { CdkTrapFocus } from '@angular/cdk/a11y';
import { AccountDialogComponent } from '@app/pages/account-dialog/account-dialog.component';
import { MapDialogComponent } from '@app/pages/map-dialog/map-dialog.component';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspacePresenter } from '@app/presentation/workspace.presenter';
@Component({
    selector: 'app-dialog-host',
    standalone: true,
    imports: [CommonModule, FormsModule, CdkTrapFocus, AccountDialogComponent, MapDialogComponent],
    templateUrl: './dialog-host.component.html',
})
export class DialogHostComponent {
    readonly ui = inject(WorkspacePresenter);
}
