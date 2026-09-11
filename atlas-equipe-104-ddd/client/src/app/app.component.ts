import { RouterOutlet } from '@angular/router';
import { HeaderBarComponent } from './pages/header-bar/header-bar.component';
import { DialogHostComponent } from './pages/dialog-host/dialog-host.component';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { WorkspacePresenter } from './presentation/workspace.presenter';
@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, HeaderBarComponent, DialogHostComponent],
    templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
    readonly ui = inject(WorkspacePresenter);
    ngOnInit(): void {
        this.ui.initializeView();
    }
    @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent): void {
        this.ui.beforeUnload(event);
    }
    @HostListener('window:keydown', ['$event']) keyboard(event: KeyboardEvent): void {
        this.ui.keyboard(event);
    }
}
