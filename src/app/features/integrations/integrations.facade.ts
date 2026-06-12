import { Injectable, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseData } from '../../firebase-data';
import { UiFeedbackService } from '../../shared/services/ui-feedback.service';

export type IntegrationSubTab = 'meta' | 'gemini' | 'sri';

@Injectable({
  providedIn: 'root',
})
export class IntegrationsFacade {
  private firebaseData = inject(FirebaseData);
  private router = inject(Router);
  private uiFeedback = inject(UiFeedbackService);

  activeIntegrationSubTab = signal<IntegrationSubTab>('meta');

  countrySelectOptions = [
    { name: 'Ecuador', code: '+593', flag: '🇪🇨' },
    { name: 'Colombia', code: '+57', flag: '🇨🇴' },
    { name: 'España', code: '+34', flag: '🇪🇸' },
    { name: 'Estados Unidos', code: '+1', flag: '🇺🇸' },
    { name: 'México', code: '+52', flag: '🇲🇽' },
  ];

  integrationsForm = new FormGroup({
    metaPhoneCode: new FormControl('+593', [Validators.required]),
    metaPhoneNumber: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]+$/)]),
    metaToken: new FormControl('', [Validators.required]),
    metaApiKey: new FormControl('', [Validators.required]),
    metaPhoneId: new FormControl('', [Validators.required]),
    metaWabaId: new FormControl('', [Validators.required]),

    geminiToken: new FormControl(''),
    geminiApiKey: new FormControl('', [Validators.required]),
    geminiModel: new FormControl('gemini-2.5-flash', [Validators.required]),

    sriTestingMode: new FormControl({ value: false, disabled: true }),
    sriProductionMode: new FormControl({ value: false, disabled: true }),
    sriToken: new FormControl({ value: '', disabled: true }),
    sriApiKey: new FormControl({ value: '', disabled: true }),
    sriRuc: new FormControl({ value: '', disabled: true }),
    sriFirmaPassword: new FormControl({ value: '', disabled: true }),
  });

  setActiveSubTab(tab: IntegrationSubTab): void {
    this.activeIntegrationSubTab.set(tab);
  }

  hydrateFromSettings(integrations: Record<string, unknown> | null | undefined): void {
    if (!integrations) return;

    const normalized = this.normalizeLegacyGeminiModel(integrations);
    this.integrationsForm.patchValue(normalized);
  }

  buildIntegrationsPayload(): Record<string, unknown> {
    return this.integrationsForm.getRawValue();
  }

  async saveAndNext(): Promise<void> {
    await this.firebaseData.saveSettings('integrations', this.buildIntegrationsPayload());
    const currentSub = this.activeIntegrationSubTab();

    if (currentSub === 'meta') {
      this.setActiveSubTab('gemini');
      this.uiFeedback.showToast('Configuración del API de WhatsApp guardada. Siguiente paso: Gemini.', 'success');
      return;
    }

    if (currentSub === 'gemini') {
      this.setActiveSubTab('sri');
      this.uiFeedback.showToast('Credenciales de Gemini guardadas correctamente. Siguiente paso: Facturación SRI.', 'success');
      return;
    }

    this.router.navigateByUrl('/bancos');
    this.uiFeedback.showToast('Integraciones completadas con éxito. Redirigiendo a sección Bancos...', 'success');
  }

  async saveAndExit(): Promise<void> {
    await this.firebaseData.saveSettings('integrations', this.buildIntegrationsPayload());
    this.uiFeedback.showToast('Cambios persistidos correctamente. Redirigiendo al Dashboard...', 'success');
    setTimeout(() => {
      this.router.navigateByUrl('/dashboard');
    }, 1000);
  }

  private normalizeLegacyGeminiModel(input: Record<string, unknown>): Record<string, unknown> {
    const normalized = { ...input };

    if (
      normalized['geminiModel'] === 'gemini-2.1-flash' ||
      normalized['geminiModel'] === 'gemini-3.5-flash' ||
      normalized['geminiModel'] === 'gemini-1.5-flash'
    ) {
      normalized['geminiModel'] = 'gemini-2.5-flash';
    } else if (
      normalized['geminiModel'] === 'gemini-2.1-pro' ||
      normalized['geminiModel'] === 'gemini-3.1-pro-preview' ||
      normalized['geminiModel'] === 'gemini-1.5-pro'
    ) {
      normalized['geminiModel'] = 'gemini-2.5-pro';
    }

    return normalized;
  }
}
