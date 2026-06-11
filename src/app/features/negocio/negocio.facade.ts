import { Injectable, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseData } from '../../firebase-data';
import { UiFeedbackService } from '../../shared/services/ui-feedback.service';

type NegocioFeedback = {
  message: string;
  type: 'success' | 'danger';
};

@Injectable({
  providedIn: 'root',
})
export class NegocioFacade {
  private firebaseData = inject(FirebaseData);
  private router = inject(Router);
  private uiFeedback = inject(UiFeedbackService);

  saldoPlanes = signal<string[]>(['$5.00', '$10.00', '$20.00', '$50.00']);
  paymentLinks = signal<{ name: string; url: string }[]>([{ name: '', url: '' }]);

  negocioForm = new FormGroup({
    freeConsultations: new FormControl(5, [Validators.required, Validators.min(0)]),
    paidConsultationValue: new FormControl(0.5, [Validators.required, Validators.min(0)]),
    rewardFreeConsultations: new FormControl(2, [Validators.required, Validators.min(0)]),
    rewardPercentage: new FormControl(80, [Validators.required, Validators.min(0), Validators.max(100)]),
    newPlanInput: new FormControl(''),
  });

  updatePaymentLinkName(index: number, value: string): void {
    this.paymentLinks.update((links) => {
      const updated = [...links];
      updated[index] = { ...updated[index], name: value };
      return updated;
    });
  }

  updatePaymentLinkUrl(index: number, value: string): void {
    this.paymentLinks.update((links) => {
      const updated = [...links];
      updated[index] = { ...updated[index], url: value };
      return updated;
    });
  }

  addPaymentLink(): void {
    this.paymentLinks.update((links) => [...links, { name: '', url: '' }]);
  }

  removePaymentLink(index: number): void {
    if (this.paymentLinks().length <= 1) {
      this.paymentLinks.set([{ name: '', url: '' }]);
      return;
    }

    this.paymentLinks.update((links) => links.filter((_, i) => i !== index));
  }

  addSaldoPlan(): NegocioFeedback {
    const val = this.negocioForm.get('newPlanInput')?.value?.trim();
    if (!val) {
      return {
        message: 'Por favor, ingrese un monto valido para el plan',
        type: 'danger',
      };
    }

    let formatted = val;
    if (!val.startsWith('$')) {
      formatted = '$' + val;
    }

    this.saldoPlanes.update((planes) => [...planes, formatted]);
    this.negocioForm.patchValue({ newPlanInput: '' });

    return {
      message: `Plan de saldo ${formatted} anadido correctamente.`,
      type: 'success',
    };
  }

  removeSaldoPlan(index: number): NegocioFeedback {
    this.saldoPlanes.update((planes) => planes.filter((_, i) => i !== index));
    return {
      message: 'Plan de saldo removido.',
      type: 'success',
    };
  }

  hydrateFromSettings(negocio: Record<string, unknown> | null | undefined): void {
    if (!negocio) return;

    this.negocioForm.patchValue({
      freeConsultations: typeof negocio['freeConsultations'] === 'number' ? negocio['freeConsultations'] : 5,
      paidConsultationValue: typeof negocio['paidConsultationValue'] === 'number' ? negocio['paidConsultationValue'] : 0.5,
      rewardFreeConsultations: typeof negocio['rewardFreeConsultations'] === 'number' ? negocio['rewardFreeConsultations'] : 2,
      rewardPercentage: typeof negocio['rewardPercentage'] === 'number' ? negocio['rewardPercentage'] : 80,
    });

    const saldoPlanes = negocio['saldoPlanes'];
    if (Array.isArray(saldoPlanes) && saldoPlanes.length > 0) {
      this.saldoPlanes.set(saldoPlanes.filter((x): x is string => typeof x === 'string'));
    }

    const paymentLinks = negocio['paymentLinks'];
    if (Array.isArray(paymentLinks) && paymentLinks.length > 0) {
      const normalized = paymentLinks
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((x) => ({
          name: typeof x['name'] === 'string' ? x['name'] : '',
          url: typeof x['url'] === 'string' ? x['url'] : '',
        }));
      if (normalized.length > 0) {
        this.paymentLinks.set(normalized);
      }
    }
  }

  buildNegocioPayload(): Record<string, unknown> {
    const formVal = this.negocioForm.getRawValue();
    return {
      freeConsultations: formVal.freeConsultations,
      paidConsultationValue: formVal.paidConsultationValue,
      rewardFreeConsultations: formVal.rewardFreeConsultations,
      rewardPercentage: formVal.rewardPercentage,
      saldoPlanes: this.saldoPlanes(),
      paymentLinks: this.paymentLinks(),
    };
  }

  async saveAndNext(): Promise<void> {
    await this.firebaseData.saveSettings('negocio', this.buildNegocioPayload());
    this.router.navigateByUrl('/ia');
    this.uiFeedback.showToast('Configuraciones comerciales de Negocio guardadas con éxito. Siguiente pestaña: IA.', 'success');
  }

  async saveAndExit(): Promise<void> {
    await this.firebaseData.saveSettings('negocio', this.buildNegocioPayload());
    this.uiFeedback.showToast('Configuraciones de Negocio persistidas con éxito. Redirigiendo al Dashboard...', 'success');
    setTimeout(() => {
      this.router.navigateByUrl('/dashboard');
    }, 1000);
  }
}
