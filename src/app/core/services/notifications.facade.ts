import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BankAlert, UserPayment } from '../../firebase-data';
import { AppStateFacade } from './app-state.facade';
import { BanksFacade } from '../../features/banks/banks.facade';
import { UsersFacade } from '../../features/users/users.facade';

export type NotificationItem = {
  id?: string;
  type: 'bank' | 'payment';
  title: string;
  description: string;
  date: string;
  data: BankAlert | UserPayment;
};

@Injectable({
  providedIn: 'root',
})
export class NotificationsFacade {
  private appState = inject(AppStateFacade);
  private banksFacade = inject(BanksFacade);
  private usersFacade = inject(UsersFacade);
  private router = inject(Router);

  showAlertsDropdown = this.appState.showAlertsDropdown;

  allNotifications = computed<NotificationItem[]>(() => {
    const bankAlerts = this.banksFacade.bancosAlerts().map((a) => ({
      id: a.id,
      type: 'bank' as const,
      title: 'Nuevo Banco a Estandarizar',
      description: `${a.suggestedBankName} - ${a.accountNumber}`,
      date: a.createdAt,
      data: a,
    }));

    const paymentAlerts = this.usersFacade
      .userPaymentsList()
      .filter((p) => p.status === 'Pendiente')
      .map((p) => ({
        id: p.id || `p-temp-${p.paymentDate}`,
        type: 'payment' as const,
        title: 'Pago por Auditar',
        description: `Usuario: ${p.userPhone} - ${p.amount}$`,
        date: p.paymentDate,
        data: p,
      }));

    return [...bankAlerts, ...paymentAlerts].sort((a, b) => b.date.localeCompare(a.date));
  });

  notificationCount = computed(() => this.allNotifications().length);
  hasAlerts = computed(() => this.notificationCount() > 0);

  toggleAlerts(): void {
    this.showAlertsDropdown.update((v) => !v);
  }

  closeAlerts(): void {
    this.showAlertsDropdown.set(false);
  }

  handleNotificationClick(notif: NotificationItem): void {
    this.showAlertsDropdown.set(false);

    if (notif.type === 'bank') {
      this.router.navigateByUrl('/bancos');
      this.banksFacade.openAlertModalById(notif.id);
      return;
    }

    this.router.navigateByUrl('/usuarios');
    this.usersFacade.openPaymentAuditModal(notif.data as UserPayment);
  }
}
