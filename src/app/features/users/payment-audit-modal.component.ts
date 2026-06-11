import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, WritableSignal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { UserPayment } from '../../firebase-data';

@Component({
  selector: 'app-payment-audit-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './payment-audit-modal.component.html',
})
export class PaymentAuditModalComponent {
  @Input({ required: true }) isOpen!: boolean;
  @Input() selectedPayment: UserPayment | null = null;
  @Input({ required: true }) isReceiptZoomed!: WritableSignal<boolean>;
  @Input({ required: true }) rejectReasonText!: WritableSignal<string>;
  @Input({ required: true }) t!: (key: string) => string;

  @Output() close = new EventEmitter<void>();
  @Output() toggleReceiptZoom = new EventEmitter<void>();
  @Output() approvePayment = new EventEmitter<string | undefined>();
  @Output() rejectPayment = new EventEmitter<{ id?: string; reason: string }>();

  onReject(id?: string): void {
    this.rejectPayment.emit({ id, reason: this.rejectReasonText() });
  }
}
