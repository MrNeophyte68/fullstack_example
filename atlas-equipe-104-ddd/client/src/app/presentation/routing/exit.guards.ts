import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { WorkspaceExitService } from './workspace-exit.service';
export const editorExitGuard: CanDeactivateFn<unknown> = (_component, _currentRoute, _currentState, nextState) =>
    inject(WorkspaceExitService).leaveEditor(nextState.url);
export const testExitGuard: CanDeactivateFn<unknown> = (_component, _currentRoute, _currentState, nextState) =>
    inject(WorkspaceExitService).leaveTest(nextState.url);
