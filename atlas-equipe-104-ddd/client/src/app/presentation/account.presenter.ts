import { Observable } from 'rxjs';
import { NavigationStateService } from './navigation-state.service';
import { Injectable, inject, signal } from '@angular/core';
import { ConnectionStateService } from './connection-state.service';
import { User } from '@common/models';
import { View, Modal } from '@app/app.types';
@Injectable({ providedIn: 'root' })
export class AccountPresenter {
    private readonly navigation = inject(NavigationStateService);
    navigate(view: View): void {
        void this.navigation.navigate(view);
    }
    readonly api = inject(ConnectionStateService);
    modal = signal<Modal | null>(null);
    users = signal<User[]>([]);
    loading = signal(false);
    error = signal('');
    profileMenu = false;
    name = '';
    password = '';
    confirmPassword = '';
    adminPassword = '';
    returnAfterAuth: View = 'maps';
    open(type: string, title: string, text?: string, action?: () => Promise<void>): void {
        this.modal()?.onCancel?.();
        this.error.set('');
        this.password = '';
        this.confirmPassword = '';
        this.modal.set({ type, title, text, action });
        this.profileMenu = false;
    }
    closeModal(): void {
        this.modal()?.onCancel?.();
        if (this.modal()?.type === 'admin-login') this.navigate('home');
        this.modal.set(null);
        this.error.set('');
    }
    confirmNavigation(title: string, text: string): Observable<boolean> {
        return new Observable<boolean>((subscriber) => {
            this.open('confirm', title, text, async () => {
                subscriber.next(true);
                subscriber.complete();
            });
            const dialog: Modal = {
                ...(this.modal() as Modal),
                onCancel: () => {
                    subscriber.next(false);
                    subscriber.complete();
                },
            };
            this.modal.set(dialog);
            // Router cancellation unsubscribes too, so an abandoned navigation cannot leave a dialog behind.
            return () => {
                if (this.modal() === dialog) this.modal.set(null);
            };
        });
    }
    async run(action: () => Promise<void>, close = false): Promise<void> {
        this.loading.set(true);
        this.error.set('');
        try {
            await action();
            if (close) this.modal.set(null);
        } catch (error) {
            this.error.set((error as Error).message);
        } finally {
            this.loading.set(false);
        }
    }
    async authenticate(): Promise<void> {
        const register = this.modal()?.type === 'register';
        if (register && this.password !== this.confirmPassword) {
            this.error.set('Les mots de passe ne correspondent pas.');
            return;
        }
        await this.run(async () => {
            await this.api.login(this.name, this.password, register);
            await this.navigation.navigate(this.returnAfterAuth);
        }, true);
    }
    async profile(): Promise<void> {
        await this.run(async () => {
            this.api.user.set(await this.api.accounts.profile());
            this.open('profile', 'Votre profil');
        });
    }
    changePassword(user?: User): void {
        this.open('password', 'Changer le mot de passe', undefined, async () => {
            if (this.password !== this.confirmPassword) throw new Error('Les mots de passe ne correspondent pas.');
            await this.api.accounts.changePassword(this.password, user?.id);
            this.api.notice.set('Mot de passe modifié.');
        });
    }
    deleteAccount(user?: User): void {
        this.open('confirm', 'Supprimer le compte ?', 'Le compte et toutes ses cartes seront définitivement supprimés.', async () => {
            await this.api.accounts.remove(user?.id);
            if (user) await this.loadUsers();
        });
    }
    async adminLogin(): Promise<void> {
        await this.run(async () => {
            try {
                const result = await this.api.accounts.adminLogin(this.password);
                this.api.adminToken = result.token;
                await this.navigation.navigate('admin');
            } catch (error) {
                this.navigate('home');
                this.modal.set(null);
                throw error;
            }
        }, true);
    }
    async loadUsers(): Promise<void> {
        this.users.set(await this.api.accounts.users());
    }
    disconnectUser(user: User): void {
        this.open('confirm', 'Déconnecter cet utilisateur ?', `${user.name} sera immédiatement déconnecté.`, async () => {
            await this.api.accounts.disconnect(user.id);
        });
    }
    resetAll(): void {
        this.open(
            'confirm',
            'Réinitialiser la plateforme ?',
            'Tous les comptes et toutes les cartes seront supprimés définitivement.',
            async () => {
                await this.api.accounts.reset();
                await this.loadUsers();
            },
        );
    }
    submitModal(): void {
        const modal = this.modal();
        if (modal?.action) void this.run(modal.action, true);
    }
}
