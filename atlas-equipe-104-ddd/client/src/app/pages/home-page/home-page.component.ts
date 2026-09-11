import { RouterLink } from '@angular/router';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspacePresenter } from '@app/presentation/workspace.presenter';
@Component({
    selector: 'app-home-page',
    standalone: true,
    imports: [RouterLink, CommonModule, FormsModule],
    templateUrl: './home-page.component.html',
})
export class HomePageComponent {
    readonly ui = inject(WorkspacePresenter);
}
