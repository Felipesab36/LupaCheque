import { CommonModule } from '@angular/common';
import { Component, Input, WritableSignal, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { FacturacionFacade } from './facturacion.facade';

@Component({
  selector: 'app-facturacion-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './facturacion-page.component.html',
})
export class FacturacionPageComponent {
  private facturacionFacade = inject(FacturacionFacade);

  @Input({ required: true }) t!: (key: string) => string;
  @Input({ required: true }) facturacionForm!: FormGroup;

  @Input({ required: true }) p12FileName!: WritableSignal<string>;
  @Input({ required: true }) p12FileUploaded!: WritableSignal<boolean>;
  @Input({ required: true }) showPassword!: WritableSignal<boolean>;
  @Input({ required: true }) dragOver!: WritableSignal<boolean>;

  @Input() isFacturacionFieldInvalid: (controlName: string) => boolean = () => false;
  @Input() isP12Invalid: () => boolean = () => false;
  @Input() onTogglePasswordVisibility: () => void = () => {};
  @Input() onP12FileSelected: (event: Event) => void = () => {};
  @Input() onP12FileDropped: (event: DragEvent) => void = () => {};

  togglePasswordVisibility(): void {
    this.onTogglePasswordVisibility();
  }

  async saveAndNext(): Promise<void> {
    await this.facturacionFacade.saveAndNext();
  }

  async saveAndExit(): Promise<void> {
    await this.facturacionFacade.saveAndExit();
  }
}
