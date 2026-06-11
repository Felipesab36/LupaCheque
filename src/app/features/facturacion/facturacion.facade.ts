import { Injectable, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseData } from '../../firebase-data';
import { UiFeedbackService } from '../../shared/services/ui-feedback.service';

type FacturacionFeedback = {
  message: string;
  type: 'success' | 'danger';
};

@Injectable({
  providedIn: 'root',
})
export class FacturacionFacade {
  private firebaseData = inject(FirebaseData);
  private router = inject(Router);
  private uiFeedback = inject(UiFeedbackService);

  facturacionForm = new FormGroup({
    nombre: new FormControl(''),
    ruc: new FormControl(''),
    direccion: new FormControl(''),
    telefono: new FormControl(''),
    correo: new FormControl(''),
    contrasena: new FormControl(''),
  });

  p12FileName = signal<string>('');
  p12FileUploaded = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  submittedFacturacion = signal<boolean>(false);
  dragOver = signal<boolean>(false);

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  handleP12FileSelected(event: Event): FacturacionFeedback | null {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return null;
    }

    const file = input.files[0];
    this.p12FileName.set(file.name);
    this.p12FileUploaded.set(true);
    return {
      message: `Archivo de firma "${file.name}" cargado correctamente.`,
      type: 'success',
    };
  }

  handleP12FileDropped(event: DragEvent): FacturacionFeedback | null {
    event.preventDefault();
    this.dragOver.set(false);

    if (!event.dataTransfer?.files || event.dataTransfer.files.length === 0) {
      return null;
    }

    const file = event.dataTransfer.files[0];
    if (!file.name.endsWith('.p12')) {
      return {
        message: 'Tipo de archivo no valido. Por favor suba un archivo de firma con extension .p12',
        type: 'danger',
      };
    }

    this.p12FileName.set(file.name);
    this.p12FileUploaded.set(true);
    return {
      message: `Archivo de firma "${file.name}" cargado correctamente por arrastre.`,
      type: 'success',
    };
  }

  hydrateFromFiscalSettings(fiscal: Record<string, unknown> | null | undefined): void {
    if (!fiscal) return;

    this.facturacionForm.patchValue({
      nombre: typeof fiscal['nombre'] === 'string' ? fiscal['nombre'] : '',
      ruc: typeof fiscal['ruc'] === 'string' ? fiscal['ruc'] : '',
      direccion: typeof fiscal['direccion'] === 'string' ? fiscal['direccion'] : '',
      telefono: typeof fiscal['telefono'] === 'string' ? fiscal['telefono'] : '',
      correo: typeof fiscal['correo'] === 'string' ? fiscal['correo'] : '',
      contrasena: typeof fiscal['contrasena'] === 'string' ? fiscal['contrasena'] : '',
    });

    const p12Val = fiscal['p12FileName'];
    if (typeof p12Val === 'string' && p12Val.trim()) {
      this.p12FileName.set(p12Val);
      this.p12FileUploaded.set(true);
    }
  }

  markSubmitted(): void {
    this.submittedFacturacion.set(true);
  }

  isFacturacionFieldInvalid(controlName: string): boolean {
    if (!this.submittedFacturacion()) return false;

    const isAnyFilled = this.isAnyFacturacionFieldFilled();
    const rawValue = this.facturacionForm.get(controlName)?.value || '';
    const val = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue).trim();

    if (isAnyFilled) {
      if (!val) {
        return true;
      }
      if (controlName === 'correo') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          return true;
        }
      }
    } else if (val && controlName === 'correo') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        return true;
      }
    }

    return false;
  }

  isP12Invalid(): boolean {
    if (!this.submittedFacturacion()) return false;
    const isAnyFilled = this.isAnyFacturacionFieldFilled();
    return isAnyFilled && !this.p12FileUploaded();
  }

  isFacturacionFormValid(): boolean {
    const isAnyFilled = this.isAnyFacturacionFieldFilled();
    if (!isAnyFilled) {
      return true;
    }

    const rawVal = this.facturacionForm.getRawValue();
    const isNombreOk = !!rawVal.nombre?.trim();
    const isRucOk = !!rawVal.ruc?.trim();
    const isDireccionOk = !!rawVal.direccion?.trim();
    const isTelefonoOk = !!rawVal.telefono?.trim();

    const emailVal = (rawVal.correo || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isCorreoOk = !!emailVal && emailRegex.test(emailVal);

    const isContrasenaOk = !!rawVal.contrasena?.trim();
    const isP12Ok = this.p12FileUploaded();

    return !!(isNombreOk && isRucOk && isDireccionOk && isTelefonoOk && isCorreoOk && isContrasenaOk && isP12Ok);
  }

  buildFiscalPayload(): Record<string, unknown> {
    const formVal = this.facturacionForm.getRawValue();
    return {
      ...formVal,
      p12FileName: this.p12FileName(),
      p12FileUploaded: this.p12FileUploaded(),
    };
  }

  async saveAndNext(): Promise<void> {
    this.markSubmitted();
    if (this.isFacturacionFormValid()) {
      await this.firebaseData.saveSettings('fiscal', this.buildFiscalPayload());
      this.router.navigateByUrl('/integraciones');
      this.uiFeedback.showToast('Datos fiscales de Facturación guardados de forma segura. Siguiente pestaña: Integraciones.', 'success');
      return;
    }

    this.uiFeedback.showToast('Por favor, completa todos los campos fiscales obligatorios del formulario o verifica el correo.', 'danger');
  }

  async saveAndExit(): Promise<void> {
    this.markSubmitted();
    if (this.isFacturacionFormValid()) {
      await this.firebaseData.saveSettings('fiscal', this.buildFiscalPayload());
      this.uiFeedback.showToast('Configuraciones fiscales de Facturación guardadas. Redirigiendo al Dashboard...', 'success');
      setTimeout(() => {
        this.router.navigateByUrl('/dashboard');
      }, 1000);
      return;
    }

    this.uiFeedback.showToast('Por favor, completa todos los campos fiscales obligatorios o verifica el correo antes de salir.', 'danger');
  }

  private isAnyFacturacionFieldFilled(): boolean {
    const rawVal = this.facturacionForm.value;
    const hasNombre = !!rawVal.nombre?.trim();
    const hasRuc = !!rawVal.ruc?.trim();
    const hasDireccion = !!rawVal.direccion?.trim();
    const hasTelefono = !!rawVal.telefono?.trim();
    const hasCorreo = !!rawVal.correo?.trim();
    const hasContrasena = !!rawVal.contrasena?.trim();
    const hasP12 = this.p12FileUploaded();

    return hasNombre || hasRuc || hasDireccion || hasTelefono || hasCorreo || hasContrasena || hasP12;
  }
}
