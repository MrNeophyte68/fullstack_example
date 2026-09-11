import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspacePresenter } from '@app/presentation/workspace.presenter';
@Component({ selector: 'app-account-dialog', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './account-dialog.component.html' })
export class AccountDialogComponent {
    readonly ui = inject(WorkspacePresenter);
}
