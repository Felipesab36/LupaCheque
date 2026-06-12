import { CommonModule } from '@angular/common';
import { Component, Input, WritableSignal, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NegocioFacade } from './negocio.facade';

@Component({
  selector: 'app-negocio-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './negocio-page.component.html',
})
export class NegocioPageComponent {
  private negocioFacade = inject(NegocioFacade);

  @Input({ required: true }) t!: (key: string) => string;
  @Input({ required: true }) negocioForm!: FormGroup;
  @Input({ required: true }) saldoPlanes!: WritableSignal<string[]>;
  @Input({ required: true }) paymentLinks!: WritableSignal<Array<{ name: string; url: string }>>;

  @Input() onUpdatePaymentLinkName: (index: number, value: string) => void = () => {};
  @Input() onUpdatePaymentLinkUrl: (index: number, value: string) => void = () => {};
  @Input() onAddPaymentLink: () => void = () => {};
  @Input() onRemovePaymentLink: (index: number) => void = () => {};
  @Input() onAddSaldoPlan: () => void = () => {};
  @Input() onRemoveSaldoPlan: (index: number) => void = () => {};

  updatePaymentLinkName(index: number, value: string): void {
    this.onUpdatePaymentLinkName(index, value);
  }

  updatePaymentLinkUrl(index: number, value: string): void {
    this.onUpdatePaymentLinkUrl(index, value);
  }

  addPaymentLink(): void {
    this.onAddPaymentLink();
  }

  removePaymentLink(index: number): void {
    this.onRemovePaymentLink(index);
  }

  addSaldoPlan(): void {
    this.onAddSaldoPlan();
  }

  removeSaldoPlan(index: number): void {
    this.onRemoveSaldoPlan(index);
  }

  async saveAndNext(): Promise<void> {
    await this.negocioFacade.saveAndNext();
  }

  async saveAndExit(): Promise<void> {
    await this.negocioFacade.saveAndExit();
  }
}
