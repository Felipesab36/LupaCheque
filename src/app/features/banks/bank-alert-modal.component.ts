import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, WritableSignal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BankAlert } from '../../firebase-data';

@Component({
  selector: 'app-bank-alert-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './bank-alert-modal.component.html',
})
export class BankAlertModalComponent {
  @Input({ required: true }) isOpen!: boolean;
  @Input({ required: true }) t!: (key: string) => string;
  @Input() currentAlert: BankAlert | null = null;
  @Input({ required: true }) alertDecision!: WritableSignal<'none' | 'new' | 'correct'>;
  @Input({ required: true }) alertCorrectionSearchQuery!: WritableSignal<string>;
  @Input() filteredCorrectionBanks: string[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() selectApproveNewBankWord = new EventEmitter<void>();
  @Output() selectCorrectionBank = new EventEmitter<string>();
  @Output() saveAndNext = new EventEmitter<void>();
  @Output() saveAndExit = new EventEmitter<void>();

  onSearchInput(value: string): void {
    this.alertCorrectionSearchQuery.set(value);
    this.alertDecision.set('correct');
  }

  onSearchFocus(): void {
    this.alertDecision.set('correct');
  }
}
