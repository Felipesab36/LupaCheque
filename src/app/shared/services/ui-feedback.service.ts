import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'danger';

@Injectable({
  providedIn: 'root',
})
export class UiFeedbackService {
  toastMessage = signal<string | null>(null);
  toastType = signal<ToastType>('success');

  showToast(message: string, type: ToastType = 'success'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }

  closeToast(): void {
    this.toastMessage.set(null);
  }
}
