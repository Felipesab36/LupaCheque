import { Injectable, computed, inject, signal } from '@angular/core';
import { BankAccount, SystemUser, UserPayment } from '../../firebase-data';
import { normalizeSearchText } from '../../shared/utils/string-normalize.util';
import { formatUtcDateTimeToLocal, formatUtcDateToLocal } from '../../shared/utils/date-format.util';
import { FirebaseData } from '../../firebase-data';
import { UiFeedbackService } from '../../shared/services/ui-feedback.service';

@Injectable({
  providedIn: 'root',
})
export class UsersFacade {
  private firebaseData = inject(FirebaseData);
  private uiFeedback = inject(UiFeedbackService);

  usersList = signal<SystemUser[]>([]);
  bancosAccounts = signal<BankAccount[]>([]);
  userPaymentsList = signal<UserPayment[]>([]);

  isPaymentModalOpen = signal<boolean>(false);
  selectedPaymentForAudit = signal<UserPayment | null>(null);
  rejectReasonText = signal<string>('');
  isReceiptZoomed = signal<boolean>(false);

  selectedUserForDetail = signal<string | null>(null);
  usersSearchQuery = signal<string>('');
  usersStatusFilter = signal<'Todos' | 'Pagado' | 'Gratis' | 'Bloqueado'>('Todos');
  usersSortField = signal<string>('lastQuery');
  usersSortAsc = signal<boolean>(false);
  usersPage = signal<number>(1);

  userQueriesSearchQuery = signal<string>('');
  userQueriesSortField = signal<string>('queryDate');
  userQueriesSortAsc = signal<boolean>(false);
  userQueriesPage = signal<number>(1);

  selectedUserForPayments = signal<string | null>(null);
  paymentsSearchQuery = signal<string>('');
  paymentsStatusFilter = signal<'Todos' | 'Correcto' | 'Pendiente' | 'Rechazado (Sin fondos)'>('Todos');
  paymentsSortField = signal<string>('paymentDate');
  paymentsSortAsc = signal<boolean>(false);
  paymentsPage = signal<number>(1);

  setUsers(users: SystemUser[]): void {
    this.usersList.set(users);
  }

  setBankAccounts(accounts: BankAccount[]): void {
    this.bancosAccounts.set(accounts);
  }

  setUserPayments(payments: UserPayment[]): void {
    this.userPaymentsList.set(payments);
  }

  openPaymentAuditModal(payment: UserPayment): void {
    this.selectedPaymentForAudit.set(payment);
    this.rejectReasonText.set('');
    this.isReceiptZoomed.set(false);
    this.isPaymentModalOpen.set(true);
  }

  closePaymentAuditModal(): void {
    this.isPaymentModalOpen.set(false);
    this.selectedPaymentForAudit.set(null);
  }

  toggleReceiptZoom(): void {
    this.isReceiptZoomed.update((z) => !z);
  }

  async approvePayment(paymentId?: string): Promise<void> {
    if (!paymentId) return;
    const list = this.userPaymentsList();
    const targetPayment = list.find((p) => p.id === paymentId);
    if (!targetPayment) return;

    targetPayment.status = 'Correcto';
    this.userPaymentsList.set([...list]);
    await this.firebaseData.savePayment(targetPayment);

    const users = this.usersList();
    const targetUser = users.find((u) => u.phone === targetPayment.userPhone);
    if (targetUser) {
      targetUser.status = 'Pagado';
      this.usersList.set([...users]);
      await this.firebaseData.saveUser(targetUser);
    }

    this.uiFeedback.showToast('Pago aprobado exitosamente.', 'success');
    this.closePaymentAuditModal();
  }

  async rejectPayment(paymentId?: string, reason = ''): Promise<void> {
    if (!paymentId) return;
    const list = this.userPaymentsList();
    const targetPayment = list.find((p) => p.id === paymentId);
    if (!targetPayment) return;

    targetPayment.status = 'Rechazado (Sin fondos)';
    targetPayment.amount = 0.0;
    targetPayment.currentBalance = 0.0;
    targetPayment.rejectReason = reason;

    this.userPaymentsList.set([...list]);
    await this.firebaseData.savePayment(targetPayment);

    const users = this.usersList();
    const targetUser = users.find((u) => u.phone === targetPayment.userPhone);
    if (targetUser) {
      targetUser.hasFraudAlert = true;
      this.usersList.set([...users]);
      await this.firebaseData.saveUser(targetUser);
    }

    this.uiFeedback.showToast('Pago rechazado. Alerta de fraude activa en el perfil de usuario.', 'danger');
    this.closePaymentAuditModal();
  }

  private cleanString(str: string): string {
    return normalizeSearchText(str);
  }

  allUsersWithStats = computed(() => {
    const users = this.usersList();
    const accounts = this.bancosAccounts();

    const userMap: Record<string, { queriesCount: number; lastQueryRaw: number; lastQueryStr: string; confirmationsCount: number }> = {};

    accounts.forEach((acc) => {
      acc.queries.forEach((q) => {
        const phone = q.userPhone;
        if (!userMap[phone]) {
          userMap[phone] = {
            queriesCount: 0,
            lastQueryRaw: 0,
            lastQueryStr: '-',
            confirmationsCount: 0,
          };
        }

        const stats = userMap[phone];
        stats.queriesCount++;

        const qTime = new Date(q.queryDate).getTime();
        if (qTime > stats.lastQueryRaw) {
          stats.lastQueryRaw = qTime;
          stats.lastQueryStr = q.queryDate;
        }

        if (q.status === 'Cobrado' || q.status === 'Rechazado') {
          stats.confirmationsCount++;
        }
      });
    });

    return users.map((user) => {
      const stats = userMap[user.phone] || {
        queriesCount: 0,
        lastQueryRaw: 0,
        lastQueryStr: '-',
        confirmationsCount: 0,
      };

      const pct = stats.queriesCount > 0 ? Math.round((stats.confirmationsCount / stats.queriesCount) * 100) : 0;

      return {
        phone: user.phone,
        activeSince: formatUtcDateToLocal(user.activeSince),
        activeSinceRaw: new Date(user.activeSince).getTime(),
        status: user.status,
        hasFraudAlert: user.hasFraudAlert,
        queriesCount: stats.queriesCount,
        lastQuery: stats.lastQueryStr === '-' ? '-' : formatUtcDateTimeToLocal(stats.lastQueryStr),
        lastQueryRaw: stats.lastQueryRaw,
        confirmationsPercentage: `${pct}%`,
        confirmationsPercentageRaw: pct,
      };
    });
  });

  filteredUsers = computed(() => {
    let list = this.allUsersWithStats();

    const query = this.usersSearchQuery().trim();
    if (query) {
      list = list.filter((u) => u.phone.includes(query));
    }

    const statusFilter = this.usersStatusFilter();
    if (statusFilter !== 'Todos') {
      list = list.filter((u) => u.status === statusFilter);
    }

    const field = this.usersSortField();
    const asc = this.usersSortAsc();

    list.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (field === 'phone') {
        valA = a.phone;
        valB = b.phone;
      } else if (field === 'activeSince') {
        valA = a.activeSinceRaw;
        valB = b.activeSinceRaw;
      } else if (field === 'status') {
        valA = a.status;
        valB = b.status;
      } else if (field === 'queriesCount') {
        valA = a.queriesCount;
        valB = b.queriesCount;
      } else if (field === 'lastQuery') {
        valA = a.lastQueryRaw;
        valB = b.lastQueryRaw;
      } else if (field === 'confirmationsPercentage') {
        valA = a.confirmationsPercentageRaw;
        valB = b.confirmationsPercentageRaw;
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      const numA = typeof valA === 'number' ? valA : 0;
      const numB = typeof valB === 'number' ? valB : 0;
      return asc ? numA - numB : numB - numA;
    });

    return list;
  });

  paginatedUsers = computed(() => {
    const list = this.filteredUsers();
    const itemsPerPage = 10;
    const page = this.usersPage();
    const start = (page - 1) * itemsPerPage;
    return list.slice(start, start + itemsPerPage);
  });

  usersTotalPages = computed(() => Math.ceil(this.filteredUsers().length / 10) || 1);

  usersRangeStart = computed(() => {
    if (this.filteredUsers().length === 0) return 0;
    return (this.usersPage() - 1) * 10 + 1;
  });

  usersRangeEnd = computed(() => {
    const end = this.usersPage() * 10;
    const total = this.filteredUsers().length;
    return end > total ? total : end;
  });

  getUsersPageNumbers(): number[] {
    const total = this.usersTotalPages();
    const arr = [];
    for (let i = 1; i <= total; i++) {
      arr.push(i);
    }
    return arr;
  }

  toggleUsersSort(field: string): void {
    if (this.usersSortField() === field) {
      this.usersSortAsc.update((a) => !a);
    } else {
      this.usersSortField.set(field);
      this.usersSortAsc.set(true);
    }
    this.usersPage.set(1);
  }

  viewUserDetail(phone: string): void {
    this.selectedUserForDetail.set(phone);
    this.selectedUserForPayments.set(null);
    this.userQueriesSearchQuery.set('');
    this.userQueriesPage.set(1);
    this.userQueriesSortField.set('queryDate');
    this.userQueriesSortAsc.set(false);
  }

  closeUserDetail(): void {
    this.selectedUserForDetail.set(null);
  }

  selectedUserQueriesStats = computed(() => {
    const phone = this.selectedUserForDetail();
    if (!phone) return [];

    const accounts = this.bancosAccounts();
    const list: {
      id: string;
      queryDate: string;
      queryDateFormatted: string;
      queryDateRaw: number;
      fechaCobro: string;
      fechaCobroFormatted: string;
      fechaCobroRaw: number;
      status: string;
      bankName: string;
      accountNumber: string;
    }[] = [];

    accounts.forEach((acc) => {
      acc.queries.forEach((q) => {
        if (q.userPhone === phone) {
          list.push({
            id: q.id,
            queryDate: q.queryDate,
            queryDateFormatted: formatUtcDateTimeToLocal(q.queryDate),
            queryDateRaw: new Date(q.queryDate).getTime(),
            fechaCobro: q.fechaCobro || 'N/A',
            fechaCobroFormatted: q.fechaCobro ? formatUtcDateTimeToLocal(q.fechaCobro) : 'N/A',
            fechaCobroRaw: q.fechaCobro ? new Date(q.fechaCobro).getTime() : 0,
            status: q.status,
            bankName: acc.bankName,
            accountNumber: acc.accountNumber,
          });
        }
      });
    });

    return list;
  });

  filteredUserQueries = computed(() => {
    let list = this.selectedUserQueriesStats();

    const query = this.cleanString(this.userQueriesSearchQuery().trim());
    if (query) {
      list = list.filter((q) => this.cleanString(q.bankName).includes(query) || q.accountNumber.includes(query));
    }

    const field = this.userQueriesSortField();
    const asc = this.userQueriesSortAsc();

    list.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (field === 'queryDate') {
        valA = a.queryDateRaw;
        valB = b.queryDateRaw;
      } else if (field === 'fechaCobro') {
        valA = a.fechaCobroRaw;
        valB = b.fechaCobroRaw;
      } else if (field === 'status') {
        valA = a.status;
        valB = b.status;
      } else if (field === 'bankName') {
        valA = a.bankName;
        valB = b.bankName;
      } else if (field === 'accountNumber') {
        valA = a.accountNumber;
        valB = b.accountNumber;
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      const numA = typeof valA === 'number' ? valA : 0;
      const numB = typeof valB === 'number' ? valB : 0;
      return asc ? numA - numB : numB - numA;
    });

    return list;
  });

  paginatedUserQueries = computed(() => {
    const list = this.filteredUserQueries();
    const itemsPerPage = 10;
    const page = this.userQueriesPage();
    const start = (page - 1) * itemsPerPage;
    return list.slice(start, start + itemsPerPage);
  });

  userQueriesTotalPages = computed(() => Math.ceil(this.filteredUserQueries().length / 10) || 1);

  userQueriesRangeStart = computed(() => {
    if (this.filteredUserQueries().length === 0) return 0;
    return (this.userQueriesPage() - 1) * 10 + 1;
  });

  userQueriesRangeEnd = computed(() => {
    const end = this.userQueriesPage() * 10;
    const total = this.filteredUserQueries().length;
    return end > total ? total : end;
  });

  getUserQueriesPageNumbers(): number[] {
    const total = this.userQueriesTotalPages();
    const arr = [];
    for (let i = 1; i <= total; i++) {
      arr.push(i);
    }
    return arr;
  }

  toggleUserQueriesSort(field: string): void {
    if (this.userQueriesSortField() === field) {
      this.userQueriesSortAsc.update((a) => !a);
    } else {
      this.userQueriesSortField.set(field);
      this.userQueriesSortAsc.set(true);
    }
    this.userQueriesPage.set(1);
  }

  selectedUserPaymentsStats = computed(() => {
    const phone = this.selectedUserForPayments();
    if (!phone) return [];

    return this.userPaymentsList()
      .filter((p) => p.userPhone === phone)
      .map((p) => ({
        ...p,
        paymentDateFormatted: formatUtcDateTimeToLocal(p.paymentDate),
        paymentDateRaw: new Date(p.paymentDate).getTime(),
      }));
  });

  filteredUserPayments = computed(() => {
    let list = this.selectedUserPaymentsStats();

    const query = this.paymentsSearchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter((p) => p.paymentDateFormatted?.toLowerCase().includes(query) || p.paymentDate.toLowerCase().includes(query));
    }

    const statusFilter = this.paymentsStatusFilter();
    if (statusFilter !== 'Todos') {
      list = list.filter((p) => p.status === statusFilter);
    }

    const field = this.paymentsSortField();
    const asc = this.paymentsSortAsc();

    list.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (field === 'paymentDate') {
        valA = a.paymentDateRaw || 0;
        valB = b.paymentDateRaw || 0;
      } else if (field === 'amount') {
        valA = a.amount;
        valB = b.amount;
      } else if (field === 'currentBalance') {
        valA = a.currentBalance;
        valB = b.currentBalance;
      } else if (field === 'status') {
        valA = a.status;
        valB = b.status;
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      const numA = typeof valA === 'number' ? valA : 0;
      const numB = typeof valB === 'number' ? valB : 0;
      return asc ? numA - numB : numB - numA;
    });

    return list;
  });

  paginatedUserPayments = computed(() => {
    const list = this.filteredUserPayments();
    const itemsPerPage = 10;
    const page = this.paymentsPage();
    const start = (page - 1) * itemsPerPage;
    return list.slice(start, start + itemsPerPage);
  });

  paymentsTotalPages = computed(() => Math.ceil(this.filteredUserPayments().length / 10) || 1);

  paymentsRangeStart = computed(() => {
    if (this.filteredUserPayments().length === 0) return 0;
    return (this.paymentsPage() - 1) * 10 + 1;
  });

  paymentsRangeEnd = computed(() => {
    const end = this.paymentsPage() * 10;
    const total = this.filteredUserPayments().length;
    return end > total ? total : end;
  });

  getPaymentsPageNumbers(): number[] {
    const total = this.paymentsTotalPages();
    const arr = [];
    for (let i = 1; i <= total; i++) {
      arr.push(i);
    }
    return arr;
  }

  togglePaymentsSort(field: string): void {
    if (this.paymentsSortField() === field) {
      this.paymentsSortAsc.update((a) => !a);
    } else {
      this.paymentsSortField.set(field);
      this.paymentsSortAsc.set(true);
    }
    this.paymentsPage.set(1);
  }

  viewUserPayments(phone: string): void {
    this.selectedUserForPayments.set(phone);
    this.selectedUserForDetail.set(null);
    this.paymentsSearchQuery.set('');
    this.paymentsStatusFilter.set('Todos');
    this.paymentsPage.set(1);
    this.paymentsSortField.set('paymentDate');
    this.paymentsSortAsc.set(false);
  }

  closeUserPayments(): void {
    this.selectedUserForPayments.set(null);
  }
}
