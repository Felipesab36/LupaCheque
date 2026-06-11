import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup, signOut } from '../../firebase';

export interface AuthorizedProfile {
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthSessionFacade {
  private platformId = inject(PLATFORM_ID);

  isLoggedIn = signal(false);
  loginError = signal<string | null>(null);
  authLoading = signal(false);

  async initializeAuthSession(onAuthorized: (profile: AuthorizedProfile) => Promise<void> | void): Promise<void> {
    this.authLoading.set(true);

    if (!isPlatformBrowser(this.platformId)) {
      this.authLoading.set(false);
      return;
    }

    const demoLogin = localStorage.getItem('lupacheque_logged_in');
    if (demoLogin === 'true') {
      this.isLoggedIn.set(true);
      this.loginError.set(null);
      await onAuthorized({ email: 'emprende@biia-dots.com', displayName: 'SuperAdmin Demo' });
    }

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email === 'emprende@biia-dots.com') {
          this.isLoggedIn.set(true);
          this.loginError.set(null);
          await onAuthorized({
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          });
        } else {
          this.loginError.set('Acceso denegado: No tienes permisos para entrar a este panel.');
          this.isLoggedIn.set(false);
          await signOut(auth);
        }
      } else if (demoLogin !== 'true') {
        this.isLoggedIn.set(false);
      }

      this.authLoading.set(false);
    });
  }

  async login(): Promise<void> {
    this.authLoading.set(true);
    this.loginError.set(null);

    try {
      if (!isPlatformBrowser(this.platformId)) return;

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (user && user.email !== 'emprende@biia-dots.com') {
        this.loginError.set('Acceso denegado: No tienes permisos para entrar a este panel.');
        this.isLoggedIn.set(false);
        await signOut(auth);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.loginError.set(`No se pudo iniciar sesión real con Google. Detalle del error: ${errMsg}.`);
    } finally {
      this.authLoading.set(false);
    }
  }

  async bypassLoginForDemo(onAuthorized: () => Promise<void> | void): Promise<void> {
    this.isLoggedIn.set(true);
    this.loginError.set(null);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('lupacheque_logged_in', 'true');
    }

    await onAuthorized();
  }

  async logout(): Promise<void> {
    this.isLoggedIn.set(false);
    this.loginError.set(null);

    if (!isPlatformBrowser(this.platformId)) return;

    localStorage.removeItem('lupacheque_logged_in');
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error', err);
    }
  }
}
