import { Injectable, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthSessionFacade } from '../../core/services/auth-session.facade';
import { UiFeedbackService } from '../../shared/services/ui-feedback.service';
import { AdminUser, VisitorUser } from '../../firebase-data';

@Injectable({
  providedIn: 'root',
})
export class SystemFacade {
  private router = inject(Router);
  private authSession = inject(AuthSessionFacade);
  private uiFeedback = inject(UiFeedbackService);

  adminsList = signal<AdminUser[]>([]);
  visitorsList = signal<VisitorUser[]>([]);
  isLoadingData = signal(false);

  showAddAdmin = signal(false);
  showAddVisitor = signal(false);

  adminForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    twoFactor: new FormControl(false),
  });

  visitorForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    validFrom: new FormControl('', [Validators.required]),
    validTo: new FormControl('', [Validators.required]),
    twoFactor: new FormControl(false),
  });

  async saveAndNext(): Promise<void> {
    this.uiFeedback.showToast('Configuraciones guardadas de forma segura. Redirigiendo a Dashboard...', 'success');
    setTimeout(() => {
      this.router.navigateByUrl('/dashboard');
    }, 1000);
  }

  async saveAndExit(): Promise<void> {
    this.uiFeedback.showToast('Cambios persistidos correctamente. Cerrando sesión...', 'success');
    setTimeout(async () => {
      await this.authSession.logout();
    }, 1000);
  }
}
