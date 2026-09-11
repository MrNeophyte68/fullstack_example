import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspacePresenter } from '@app/presentation/workspace.presenter';
@Component({ selector: 'app-admin-page', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './admin-page.component.html' })
export class AdminPageComponent {
    readonly ui = inject(WorkspacePresenter);
}
