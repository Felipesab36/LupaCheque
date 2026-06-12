import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BankAccount, BankQuery } from '../../firebase-data';
import { BanksFacade } from './banks.facade';

@Component({
  selector: 'app-banks-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule],
  templateUrl: './banks-page.component.html',
})
export class BanksPageComponent implements OnChanges {
  private readonly banksFacade = inject(BanksFacade);

  @Input({ required: true }) t!: (key: string) => string;
  @Input() bankAccounts: BankAccount[] = [];
  @Input() allBankNames: string[] = [];
  @Input() bancosAlertsCount = 0;
  @Input() onOpenAlertModal: () => void = () => {};
  @Input() onSelectUser: (phone: string) => void = () => {};
  @Input() onSaveEditedQuery: (payload: { account: BankAccount; query: BankQuery }) => void = () => {};

  isBankQueryModalOpen = false;
  currentEditingQueryId: string | null = null;

  bankQueryEditForm = new FormGroup({
    status: new FormControl<BankQuery['status']>('Pendiente de confirmación', [Validators.required]),
    fechaCobro: new FormControl(''),
    chequeConsecutivo: new FormControl(''),
    chequeMonto: new FormControl<number | null>(null),
    chequeFechaCobro: new FormControl(''),
    chequeIntentos: new FormControl<number | null>(0),
  });

  selectedBankForDetail = this.banksFacade.selectedBankForDetail;
  selectedAccountForDetail = this.banksFacade.selectedAccountForDetail;

  bancosSearchQuery = this.banksFacade.bancosSearchQuery;
  bancosAccountSearchQuery = this.banksFacade.bancosAccountSearchQuery;
  bancosQuerySearchQuery = this.banksFacade.bancosQuerySearchQuery;

  bancosSortField = this.banksFacade.bancosSortField;
  bancosSortAsc = this.banksFacade.bancosSortAsc;
  bancosPage = this.banksFacade.bancosPage;

  bancosAccountSortField = this.banksFacade.bancosAccountSortField;
  bancosAccountSortAsc = this.banksFacade.bancosAccountSortAsc;
  bancosAccountPage = this.banksFacade.bancosAccountPage;

  bancosQuerySortField = this.banksFacade.bancosQuerySortField;
  bancosQuerySortAsc = this.banksFacade.bancosQuerySortAsc;
  bancosQueryPage = this.banksFacade.bancosQueryPage;

  filteredBanks = this.banksFacade.filteredBanks;
  paginatedBanks = this.banksFacade.paginatedBanks;
  bancosTotalPages = this.banksFacade.bancosTotalPages;
  bancosRangeStart = this.banksFacade.bancosRangeStart;
  bancosRangeEnd = this.banksFacade.bancosRangeEnd;

  filteredBankAccounts = this.banksFacade.filteredBankAccounts;
  paginatedBankAccounts = this.banksFacade.paginatedBankAccounts;
  bancosAccountTotalPages = this.banksFacade.bancosAccountTotalPages;
  bancosAccountRangeStart = this.banksFacade.bancosAccountRangeStart;
  bancosAccountRangeEnd = this.banksFacade.bancosAccountRangeEnd;

  filteredAccountQueries = this.banksFacade.filteredAccountQueries;
  paginatedAccountQueries = this.banksFacade.paginatedAccountQueries;
  bancosQueryTotalPages = this.banksFacade.bancosQueryTotalPages;
  bancosQueryRangeStart = this.banksFacade.bancosQueryRangeStart;
  bancosQueryRangeEnd = this.banksFacade.bancosQueryRangeEnd;

  ngOnChanges(_changes: SimpleChanges): void {
    this.banksFacade.setBankAccounts(this.bankAccounts || []);
    this.banksFacade.setBankNames(this.allBankNames || []);
  }

  openAlertModal(): void {
    this.onOpenAlertModal();
  }

  toggleBancosSort(field: string): void {
    this.banksFacade.toggleBancosSort(field);
  }

  toggleBancosAccountSort(field: string): void {
    this.banksFacade.toggleBancosAccountSort(field);
  }

  toggleBancosQuerySort(field: string): void {
    this.banksFacade.toggleBancosQuerySort(field);
  }

  viewBankDetail(bankName: string): void {
    this.banksFacade.viewBankDetail(bankName);
  }

  closeBankDetail(): void {
    this.banksFacade.closeBankDetail();
  }

  viewAccountDetail(accountNumber: string): void {
    this.banksFacade.viewAccountDetail(accountNumber);
  }

  closeAccountDetail(): void {
    this.banksFacade.closeAccountDetail();
  }

  getBancosPageNumbers(): number[] {
    return this.banksFacade.getBancosPageNumbers();
  }

  getBancosAccountPageNumbers(): number[] {
    return this.banksFacade.getBancosAccountPageNumbers();
  }

  getBancosQueryPageNumbers(): number[] {
    return this.banksFacade.getBancosQueryPageNumbers();
  }

  openEditQueryModal(queryId: string): void {
    const found = this.banksFacade.findQueryById(queryId);
    if (!found) return;

    this.currentEditingQueryId = queryId;
    this.bankQueryEditForm.patchValue({
      status: found.query.status,
      fechaCobro: found.query.fechaCobro || '',
      chequeConsecutivo: found.query.chequeConsecutivo || '',
      chequeMonto: found.query.chequeMonto || null,
      chequeFechaCobro: found.query.chequeFechaCobro || '',
      chequeIntentos: found.query.chequeIntentos || 0,
    });

    this.isBankQueryModalOpen = true;
  }

  saveEditedQuery(): void {
    if (!this.currentEditingQueryId) return;

    const found = this.banksFacade.findQueryById(this.currentEditingQueryId);
    if (!found) return;

    const formVal = this.bankQueryEditForm.value;
    const updatedQuery: BankQuery = {
      ...found.query,
      status: formVal.status || found.query.status,
      fechaCobro: formVal.fechaCobro || undefined,
      chequeConsecutivo: formVal.chequeConsecutivo || undefined,
      chequeMonto: formVal.chequeMonto === null ? undefined : formVal.chequeMonto,
      chequeFechaCobro: formVal.chequeFechaCobro || undefined,
      chequeIntentos: formVal.chequeIntentos === null ? undefined : formVal.chequeIntentos,
    };

    this.onSaveEditedQuery({ account: found.account, query: updatedQuery });
    this.isBankQueryModalOpen = false;
    this.currentEditingQueryId = null;
  }

  selectUser(phone: string): void {
    this.onSelectUser(phone);
  }
}
