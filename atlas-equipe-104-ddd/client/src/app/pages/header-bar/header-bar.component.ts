import { RouterLink, RouterLinkActive } from '@angular/router';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspacePresenter } from '@app/presentation/workspace.presenter';
@Component({
    selector: 'app-header-bar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule],
    templateUrl: './header-bar.component.html',
})
export class HeaderBarComponent {
    readonly ui = inject(WorkspacePresenter);
}
