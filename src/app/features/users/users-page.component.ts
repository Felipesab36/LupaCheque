import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BankAccount, SystemUser, UserPayment } from '../../firebase-data';
import { UsersFacade } from './users.facade';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './users-page.component.html',
})
export class UsersPageComponent implements OnChanges {
  private readonly usersFacade = inject(UsersFacade);

  @Input({ required: true }) t!: (key: string) => string;
  @Input() onPaymentAudit: (payment: UserPayment) => void = () => {};

  @Input()
  set users(value: SystemUser[]) {
    this._users = value || [];
  }

  @Input()
  set bankAccounts(value: BankAccount[]) {
    this._bankAccounts = value || [];
  }

  @Input()
  set userPayments(value: UserPayment[]) {
    this._userPayments = value || [];
  }

  private _users: SystemUser[] = [];
  private _bankAccounts: BankAccount[] = [];
  private _userPayments: UserPayment[] = [];

  selectedUserForDetail = this.usersFacade.selectedUserForDetail;
  usersSearchQuery = this.usersFacade.usersSearchQuery;
  usersStatusFilter = this.usersFacade.usersStatusFilter;
  usersSortField = this.usersFacade.usersSortField;
  usersSortAsc = this.usersFacade.usersSortAsc;
  usersPage = this.usersFacade.usersPage;

  userQueriesSearchQuery = this.usersFacade.userQueriesSearchQuery;
  userQueriesSortField = this.usersFacade.userQueriesSortField;
  userQueriesSortAsc = this.usersFacade.userQueriesSortAsc;
  userQueriesPage = this.usersFacade.userQueriesPage;

  selectedUserForPayments = this.usersFacade.selectedUserForPayments;
  paymentsSearchQuery = this.usersFacade.paymentsSearchQuery;
  paymentsStatusFilter = this.usersFacade.paymentsStatusFilter;
  paymentsSortField = this.usersFacade.paymentsSortField;
  paymentsSortAsc = this.usersFacade.paymentsSortAsc;
  paymentsPage = this.usersFacade.paymentsPage;

  filteredUsers = this.usersFacade.filteredUsers;
  paginatedUsers = this.usersFacade.paginatedUsers;
  usersTotalPages = this.usersFacade.usersTotalPages;
  usersRangeStart = this.usersFacade.usersRangeStart;
  usersRangeEnd = this.usersFacade.usersRangeEnd;

  filteredUserQueries = this.usersFacade.filteredUserQueries;
  paginatedUserQueries = this.usersFacade.paginatedUserQueries;
  userQueriesTotalPages = this.usersFacade.userQueriesTotalPages;
  userQueriesRangeStart = this.usersFacade.userQueriesRangeStart;
  userQueriesRangeEnd = this.usersFacade.userQueriesRangeEnd;

  filteredUserPayments = this.usersFacade.filteredUserPayments;
  paginatedUserPayments = this.usersFacade.paginatedUserPayments;
  paymentsTotalPages = this.usersFacade.paymentsTotalPages;
  paymentsRangeStart = this.usersFacade.paymentsRangeStart;
  paymentsRangeEnd = this.usersFacade.paymentsRangeEnd;

  ngOnChanges(_changes: SimpleChanges): void {
    this.usersFacade.setUsers(this._users);
    this.usersFacade.setBankAccounts(this._bankAccounts);
    this.usersFacade.setUserPayments(this._userPayments);
  }

  getUsersPageNumbers(): number[] {
    return this.usersFacade.getUsersPageNumbers();
  }

  getUserQueriesPageNumbers(): number[] {
    return this.usersFacade.getUserQueriesPageNumbers();
  }

  getPaymentsPageNumbers(): number[] {
    return this.usersFacade.getPaymentsPageNumbers();
  }

  toggleUsersSort(field: string): void {
    this.usersFacade.toggleUsersSort(field);
  }

  viewUserDetail(phone: string): void {
    this.usersFacade.viewUserDetail(phone);
  }

  closeUserDetail(): void {
    this.usersFacade.closeUserDetail();
  }

  toggleUserQueriesSort(field: string): void {
    this.usersFacade.toggleUserQueriesSort(field);
  }

  viewUserPayments(phone: string): void {
    this.usersFacade.viewUserPayments(phone);
  }

  closeUserPayments(): void {
    this.usersFacade.closeUserPayments();
  }

  togglePaymentsSort(field: string): void {
    this.usersFacade.togglePaymentsSort(field);
  }

  openPaymentAuditModal(payment: UserPayment): void {
    this.onPaymentAudit(payment);
  }
}
