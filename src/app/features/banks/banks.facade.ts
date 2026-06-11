import { Injectable, computed, inject, signal } from '@angular/core';
import { BankAccount, BankAlert, BankQuery } from '../../firebase-data';
import { FirebaseData } from '../../firebase-data';
import { normalizeSearchText } from '../../shared/utils/string-normalize.util';
import { formatUtcDateToLocal, formatUtcDateTimeToLocal } from '../../shared/utils/date-format.util';
import { UiFeedbackService } from '../../shared/services/ui-feedback.service';

@Injectable({
  providedIn: 'root',
})
export class BanksFacade {
  private firebaseData = inject(FirebaseData);
  private uiFeedback = inject(UiFeedbackService);

  private allBankNames: string[] = [];
  bancosAccounts = signal<BankAccount[]>([]);
  bancosAlerts = signal<BankAlert[]>([]);

  isBancosAlertModalOpen = signal<boolean>(false);
  currentAlertIndex = signal<number>(0);
  alertCorrectionSearchQuery = signal<string>('');
  selectedCorrectionBank = signal<string>('');
  alertDecision = signal<'none' | 'new' | 'correct'>('none');

  bancosAlertsCount = computed(() => this.bancosAlerts().length);
  currentAlert = computed(() => {
    const list = this.bancosAlerts();
    const idx = this.currentAlertIndex();
    return list.length > idx && idx >= 0 ? list[idx] : null;
  });

  filteredCorrectionBanks = computed(() => {
    const query = this.cleanString(this.alertCorrectionSearchQuery().trim());
    const all = Array.from(new Set(this.allBankNames));
    if (!query) return all.slice(0, 10);
    return all.filter((name) => this.cleanString(name).includes(query)).slice(0, 10);
  });

  selectedBankForDetail = signal<string | null>(null);
  selectedAccountForDetail = signal<string | null>(null);

  bancosSearchQuery = signal<string>('');
  bancosAccountSearchQuery = signal<string>('');
  bancosQuerySearchQuery = signal<string>('');

  bancosSortField = signal<string>('name');
  bancosSortAsc = signal<boolean>(true);
  bancosPage = signal<number>(1);

  bancosAccountSortField = signal<string>('accountNumber');
  bancosAccountSortAsc = signal<boolean>(true);
  bancosAccountPage = signal<number>(1);

  bancosQuerySortField = signal<string>('queryDate');
  bancosQuerySortAsc = signal<boolean>(false);
  bancosQueryPage = signal<number>(1);

  setBankNames(names: string[]): void {
    this.allBankNames = names;
  }

  setBankAccounts(accounts: BankAccount[]): void {
    this.bancosAccounts.set(accounts || []);
  }

  setBankAlerts(alerts: BankAlert[]): void {
    this.bancosAlerts.set(alerts || []);
  }

  private cleanString(str: string): string {
    return normalizeSearchText(str);
  }

  openAlertModal(): void {
    this.isBancosAlertModalOpen.set(true);
    this.currentAlertIndex.set(0);
    this.resetAlertDecisionState();
  }

  closeAlertModal(): void {
    this.isBancosAlertModalOpen.set(false);
  }

  openAlertModalById(alertId?: string): void {
    this.openAlertModal();
    if (!alertId) return;

    const index = this.bancosAlerts().findIndex((a) => a.id === alertId);
    if (index >= 0) {
      this.currentAlertIndex.set(index);
    }
  }

  selectApproveNewBankWord(): void {
    this.alertDecision.set('new');
    this.selectedCorrectionBank.set('');
  }

  selectCorrectionDropdownBank(bankName: string): void {
    this.alertDecision.set('correct');
    this.selectedCorrectionBank.set(bankName);
    this.alertCorrectionSearchQuery.set(bankName);
  }

  async saveAndNextAlert(): Promise<void> {
    if (!(await this.processDecisionOnCurrentAlert())) return;

    if (this.bancosAlerts().length > 0) {
      this.currentAlertIndex.set(0);
      this.resetAlertDecisionState();
      return;
    }

    this.uiFeedback.showToast('¡Todas las alertas procesadas correctamente!', 'success');
    this.closeAlertModal();
  }

  async saveAndExitAlert(): Promise<void> {
    if (!(await this.processDecisionOnCurrentAlert())) return;
    this.closeAlertModal();
  }

  private resetAlertDecisionState(): void {
    this.alertDecision.set('none');
    this.selectedCorrectionBank.set('');
    this.alertCorrectionSearchQuery.set('');
  }

  private async processDecisionOnCurrentAlert(): Promise<boolean> {
    const alert = this.currentAlert();
    const decision = this.alertDecision();
    if (!alert) return false;

    if (decision === 'none') {
      this.uiFeedback.showToast('Por favor, seleccione una opción (Añadir nuevo o Corregir a) antes de continuar.', 'danger');
      return false;
    }

    if (decision === 'new') {
      const newBankName = alert.suggestedBankName;
      const formattedName = newBankName
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      if (!this.allBankNames.includes(formattedName)) {
        this.allBankNames.push(formattedName);
      }

      const newAcc: BankAccount = {
        id: `${formattedName.replace(/\s+/g, '_')}_${alert.accountNumber}`,
        accountNumber: alert.accountNumber,
        bankName: formattedName,
        createdAt: new Date().toISOString(),
        queries: [
          {
            id: `q-alert-${Date.now()}`,
            queryDate: new Date().toISOString(),
            userPhone: alert.userPhone,
            status: 'Pendiente de confirmación',
          },
        ],
      };

      this.bancosAccounts.set([...this.bancosAccounts(), newAcc]);
      await this.firebaseData.saveBank(newAcc);
      this.uiFeedback.showToast(`Se añadió "${formattedName}" como nuevo banco oficial.`, 'success');
    } else {
      const targetBank = this.selectedCorrectionBank();
      if (!targetBank) {
        this.uiFeedback.showToast('Por favor, elija un banco de la lista para corregir.', 'danger');
        return false;
      }

      const accounts = this.bancosAccounts();
      const existing = accounts.find((a) => a.accountNumber === alert.accountNumber && a.bankName === targetBank);
      if (existing) {
        existing.queries.push({
          id: `q-alert-${Date.now()}`,
          queryDate: new Date().toISOString(),
          userPhone: alert.userPhone,
          status: 'Pendiente de confirmación',
        });
        this.bancosAccounts.set([...accounts]);
        await this.firebaseData.saveBank(existing);
      } else {
        const newAcc: BankAccount = {
          id: `${targetBank.replace(/\s+/g, '_')}_${alert.accountNumber}`,
          accountNumber: alert.accountNumber,
          bankName: targetBank,
          createdAt: new Date().toISOString(),
          queries: [
            {
              id: `q-alert-${Date.now()}`,
              queryDate: new Date().toISOString(),
              userPhone: alert.userPhone,
              status: 'Pendiente de confirmación',
            },
          ],
        };
        this.bancosAccounts.set([...accounts, newAcc]);
        await this.firebaseData.saveBank(newAcc);
      }

      this.uiFeedback.showToast(`Cuenta corregida y asociada a "${targetBank}".`, 'success');
    }

    if (alert.id) {
      await this.firebaseData.deleteBankAlert(alert.id);
    }

    const remainingAlerts = this.bancosAlerts().filter((a) => a.id !== alert.id);
    this.bancosAlerts.set(remainingAlerts);
    return true;
  }

  allBanksStats = computed(() => {
    const accounts = this.bancosAccounts();
    const uniqueBanks = Array.from(new Set(this.allBankNames));

    return uniqueBanks.map((bankName) => {
      const bankAccs = accounts.filter((a) => a.bankName === bankName);

      let earliestDateStr = '-';
      let earliestTime = Infinity;
      let queriesCount = 0;
      let lastQueryTime = 0;
      let lastQueryStr = '-';
      let cobrados = 0;
      let rechazados = 0;

      bankAccs.forEach((acc) => {
        const accCreatedTime = new Date(acc.createdAt).getTime();
        if (accCreatedTime < earliestTime) {
          earliestTime = accCreatedTime;
          earliestDateStr = acc.createdAt;
        }

        queriesCount += acc.queries.length;
        acc.queries.forEach((q) => {
          const qTime = new Date(q.queryDate).getTime();
          if (qTime > lastQueryTime) {
            lastQueryTime = qTime;
            lastQueryStr = q.queryDate;
          }
          if (qTime < earliestTime) {
            earliestTime = qTime;
            earliestDateStr = q.queryDate;
          }

          if (q.status === 'Cobrado') cobrados++;
          else if (q.status === 'Rechazado') rechazados++;
        });
      });

      const rated = cobrados + rechazados;
      const acceptanceRateVal = rated > 0 ? (cobrados / rated) * 100 : null;

      return {
        name: bankName,
        activeSince: earliestDateStr === '-' ? '-' : formatUtcDateToLocal(earliestDateStr),
        activeSinceRaw: earliestTime === Infinity ? 0 : earliestTime,
        accountsCount: bankAccs.length,
        queriesCount,
        lastQuery: lastQueryStr === '-' ? '-' : formatUtcDateTimeToLocal(lastQueryStr),
        lastQueryRaw: lastQueryTime,
        acceptanceRate: acceptanceRateVal !== null ? `${Math.round(acceptanceRateVal)}%` : 'N/A',
        acceptanceRateRaw: acceptanceRateVal,
      };
    });
  });

  filteredBanks = computed(() => {
    let stats = this.allBanksStats();
    const query = this.cleanString(this.bancosSearchQuery().trim());

    if (query) {
      stats = stats.filter((b) => this.cleanString(b.name).includes(query));
    }

    const field = this.bancosSortField();
    const asc = this.bancosSortAsc();

    stats.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (field === 'name') {
        valA = a.name;
        valB = b.name;
      } else if (field === 'activeSince') {
        valA = a.activeSinceRaw;
        valB = b.activeSinceRaw;
      } else if (field === 'accountsCount') {
        valA = a.accountsCount;
        valB = b.accountsCount;
      } else if (field === 'queriesCount') {
        valA = a.queriesCount;
        valB = b.queriesCount;
      } else if (field === 'lastQuery') {
        valA = a.lastQueryRaw;
        valB = b.lastQueryRaw;
      } else if (field === 'acceptanceRate') {
        valA = a.acceptanceRateRaw === null ? -1 : a.acceptanceRateRaw;
        valB = b.acceptanceRateRaw === null ? -1 : b.acceptanceRateRaw;
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

    return stats;
  });

  paginatedBanks = computed(() => {
    const list = this.filteredBanks();
    const itemsPerPage = 10;
    const page = this.bancosPage();
    const start = (page - 1) * itemsPerPage;
    return list.slice(start, start + itemsPerPage);
  });

  bancosTotalPages = computed(() => {
    const list = this.filteredBanks();
    return Math.ceil(list.length / 10) || 1;
  });

  selectedBankAccountsStats = computed(() => {
    const bankName = this.selectedBankForDetail();
    if (!bankName) return [];

    const accounts = this.bancosAccounts().filter((a) => a.bankName === bankName);

    return accounts.map((acc) => {
      let earliestTime = new Date(acc.createdAt).getTime();
      let earliestDateStr = acc.createdAt;
      let lastQueryTime = 0;
      let lastQueryStr = '-';
      let cobrados = 0;
      let rechazados = 0;

      acc.queries.forEach((q) => {
        const qTime = new Date(q.queryDate).getTime();
        if (qTime < earliestTime) {
          earliestTime = qTime;
          earliestDateStr = q.queryDate;
        }
        if (qTime > lastQueryTime) {
          lastQueryTime = qTime;
          lastQueryStr = q.queryDate;
        }

        if (q.status === 'Cobrado') cobrados++;
        else if (q.status === 'Rechazado') rechazados++;
      });

      const rated = cobrados + rechazados;
      const acceptanceRateVal = rated > 0 ? (cobrados / rated) * 100 : null;

      return {
        accountNumber: acc.accountNumber,
        activeSince: formatUtcDateToLocal(earliestDateStr),
        activeSinceRaw: earliestTime,
        queriesCount: acc.queries.length,
        lastQuery: lastQueryStr === '-' ? '-' : formatUtcDateTimeToLocal(lastQueryStr),
        lastQueryRaw: lastQueryTime,
        acceptanceRate: acceptanceRateVal !== null ? `${Math.round(acceptanceRateVal)}%` : 'N/A',
        acceptanceRateRaw: acceptanceRateVal,
      };
    });
  });

  filteredBankAccounts = computed(() => {
    let stats = this.selectedBankAccountsStats();
    const query = this.bancosAccountSearchQuery().trim();

    if (query) {
      stats = stats.filter((a) => a.accountNumber.includes(query));
    }

    const field = this.bancosAccountSortField();
    const asc = this.bancosAccountSortAsc();

    stats.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (field === 'accountNumber') {
        valA = a.accountNumber;
        valB = b.accountNumber;
      } else if (field === 'activeSince') {
        valA = a.activeSinceRaw;
        valB = b.activeSinceRaw;
      } else if (field === 'queriesCount') {
        valA = a.queriesCount;
        valB = b.queriesCount;
      } else if (field === 'lastQuery') {
        valA = a.lastQueryRaw;
        valB = b.lastQueryRaw;
      } else if (field === 'acceptanceRate') {
        valA = a.acceptanceRateRaw === null ? -1 : a.acceptanceRateRaw;
        valB = b.acceptanceRateRaw === null ? -1 : b.acceptanceRateRaw;
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

    return stats;
  });

  paginatedBankAccounts = computed(() => {
    const list = this.filteredBankAccounts();
    const itemsPerPage = 10;
    const page = this.bancosAccountPage();
    const start = (page - 1) * itemsPerPage;
    return list.slice(start, start + itemsPerPage);
  });

  bancosAccountTotalPages = computed(() => {
    const list = this.filteredBankAccounts();
    return Math.ceil(list.length / 10) || 1;
  });

  selectedAccountQueries = computed(() => {
    const bankName = this.selectedBankForDetail();
    const accNumber = this.selectedAccountForDetail();
    if (!bankName || !accNumber) return [];

    const account = this.bancosAccounts().find((a) => a.bankName === bankName && a.accountNumber === accNumber);
    if (!account) return [];

    return account.queries.map((q) => ({
      id: q.id,
      queryDate: q.queryDate,
      queryDateFormatted: formatUtcDateTimeToLocal(q.queryDate),
      fechaCobro: q.fechaCobro || 'N/A',
      fechaCobroFormatted: q.fechaCobro ? formatUtcDateTimeToLocal(q.fechaCobro) : 'N/A',
      status: q.status,
      userPhone: q.userPhone,
      chequeConsecutivo: q.chequeConsecutivo || '',
      chequeMonto: q.chequeMonto || 0,
      chequeFechaCobro: q.chequeFechaCobro || '',
      chequeFechaCobroFormatted: q.chequeFechaCobro ? formatUtcDateToLocal(q.chequeFechaCobro) : 'N/A',
      chequeIntentos: q.chequeIntentos || 0,
    }));
  });

  filteredAccountQueries = computed(() => {
    let list = this.selectedAccountQueries();
    const query = this.bancosQuerySearchQuery().trim();

    if (query) {
      list = list.filter((q) => q.userPhone.includes(query));
    }

    const field = this.bancosQuerySortField();
    const asc = this.bancosQuerySortAsc();

    list.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (field === 'queryDate') {
        valA = new Date(a.queryDate).getTime();
        valB = new Date(b.queryDate).getTime();
      } else if (field === 'fechaCobro') {
        valA = a.fechaCobro === 'N/A' ? 0 : new Date(a.fechaCobro).getTime();
        valB = b.fechaCobro === 'N/A' ? 0 : new Date(b.fechaCobro).getTime();
      } else if (field === 'status') {
        valA = a.status;
        valB = b.status;
      } else if (field === 'userPhone') {
        valA = a.userPhone;
        valB = b.userPhone;
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

  paginatedAccountQueries = computed(() => {
    const list = this.filteredAccountQueries();
    const itemsPerPage = 10;
    const page = this.bancosQueryPage();
    const start = (page - 1) * itemsPerPage;
    return list.slice(start, start + itemsPerPage);
  });

  bancosQueryTotalPages = computed(() => {
    const list = this.filteredAccountQueries();
    return Math.ceil(list.length / 10) || 1;
  });

  bancosQueryRangeStart = computed(() => {
    if (this.filteredAccountQueries().length === 0) return 0;
    return (this.bancosQueryPage() - 1) * 10 + 1;
  });

  bancosQueryRangeEnd = computed(() => {
    const end = this.bancosQueryPage() * 10;
    const total = this.filteredAccountQueries().length;
    return end > total ? total : end;
  });

  bancosRangeStart = computed(() => {
    if (this.filteredBanks().length === 0) return 0;
    return (this.bancosPage() - 1) * 10 + 1;
  });

  bancosRangeEnd = computed(() => {
    const end = this.bancosPage() * 10;
    const total = this.filteredBanks().length;
    return end > total ? total : end;
  });

  bancosAccountRangeStart = computed(() => {
    if (this.filteredBankAccounts().length === 0) return 0;
    return (this.bancosAccountPage() - 1) * 10 + 1;
  });

  bancosAccountRangeEnd = computed(() => {
    const end = this.bancosAccountPage() * 10;
    const total = this.filteredBankAccounts().length;
    return end > total ? total : end;
  });

  getBancosQueryPageNumbers(): number[] {
    const total = this.bancosQueryTotalPages();
    const arr = [];
    for (let i = 1; i <= total; i++) {
      arr.push(i);
    }
    return arr;
  }

  toggleBancosSort(field: string): void {
    if (this.bancosSortField() === field) {
      this.bancosSortAsc.update((a) => !a);
    } else {
      this.bancosSortField.set(field);
      this.bancosSortAsc.set(true);
    }
    this.bancosPage.set(1);
  }

  toggleBancosAccountSort(field: string): void {
    if (this.bancosAccountSortField() === field) {
      this.bancosAccountSortAsc.update((a) => !a);
    } else {
      this.bancosAccountSortField.set(field);
      this.bancosAccountSortAsc.set(true);
    }
    this.bancosAccountPage.set(1);
  }

  viewBankDetail(bankName: string): void {
    this.selectedBankForDetail.set(bankName);
    this.bancosAccountSearchQuery.set('');
    this.bancosAccountPage.set(1);
    this.bancosAccountSortField.set('accountNumber');
    this.bancosAccountSortAsc.set(true);
  }

  closeBankDetail(): void {
    this.selectedBankForDetail.set(null);
    this.selectedAccountForDetail.set(null);
  }

  viewAccountDetail(accountNumber: string): void {
    this.selectedAccountForDetail.set(accountNumber);
    this.bancosQuerySearchQuery.set('');
    this.bancosQueryPage.set(1);
    this.bancosQuerySortField.set('queryDate');
    this.bancosQuerySortAsc.set(false);
  }

  closeAccountDetail(): void {
    this.selectedAccountForDetail.set(null);
  }

  toggleBancosQuerySort(field: string): void {
    if (this.bancosQuerySortField() === field) {
      this.bancosQuerySortAsc.update((a) => !a);
    } else {
      this.bancosQuerySortField.set(field);
      this.bancosQuerySortAsc.set(true);
    }
    this.bancosQueryPage.set(1);
  }

  getBancosPageNumbers(): number[] {
    const total = this.bancosTotalPages();
    const arr = [];
    for (let i = 1; i <= total; i++) {
      arr.push(i);
    }
    return arr;
  }

  getBancosAccountPageNumbers(): number[] {
    const total = this.bancosAccountTotalPages();
    const arr = [];
    for (let i = 1; i <= total; i++) {
      arr.push(i);
    }
    return arr;
  }

  getSelectedBankName(): string | null {
    return this.selectedBankForDetail();
  }

  getSelectedAccountNumber(): string | null {
    return this.selectedAccountForDetail();
  }

  findQueryById(queryId: string): { query: BankQuery; account: BankAccount } | null {
    const bankName = this.selectedBankForDetail();
    const accNumber = this.selectedAccountForDetail();
    if (!bankName || !accNumber) return null;

    const account = this.bancosAccounts().find((a) => a.bankName === bankName && a.accountNumber === accNumber);
    if (!account) return null;

    const query = account.queries.find((q) => q.id === queryId);
    if (!query) return null;

    return { query, account };
  }
}
