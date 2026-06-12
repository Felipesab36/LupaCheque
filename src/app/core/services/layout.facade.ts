import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AppStateFacade } from './app-state.facade';

const TAB_TO_ROUTE: Record<string, string> = {
  Dashboard: 'dashboard',
  'Facturación': 'facturacion',
  Facturacion: 'facturacion',
  Integraciones: 'integraciones',
  Bancos: 'bancos',
  Usuarios: 'usuarios',
  Negocio: 'negocio',
  IA: 'ia',
  Conversaciones: 'conversaciones',
  Sistema: 'sistema',
};

const ROUTE_TO_TAB: Record<string, string> = {
  dashboard: 'Dashboard',
  facturacion: 'Facturación',
  integraciones: 'Integraciones',
  bancos: 'Bancos',
  usuarios: 'Usuarios',
  negocio: 'Negocio',
  ia: 'IA',
  conversaciones: 'Conversaciones',
  sistema: 'Sistema',
};

@Injectable({
  providedIn: 'root',
})
export class LayoutFacade {
  private appState = inject(AppStateFacade);
  private router = inject(Router);
  private routeSyncInitialized = false;

  selectedTab = this.appState.selectedTab;
  selectedLanguage = this.appState.selectedLanguage;
  sidebarCollapsed = this.appState.sidebarCollapsed;

  currentRouteSegment = signal<string>('dashboard');
  currentRouteTabLabel = computed(() => ROUTE_TO_TAB[this.currentRouteSegment()] || 'Dashboard');

  userName = signal('Administrador');
  userEmail = signal('emprende@biia-dots.com');
  userRole = 'Admin';
  userPhotoUrl = signal('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80');

  tabs = [
    { name: 'Dashboard', icon: 'dashboard', route: 'dashboard' },
    { name: 'Facturación', icon: 'receipt_long', route: 'facturacion' },
    { name: 'Integraciones', icon: 'extension', route: 'integraciones' },
    { name: 'Bancos', icon: 'account_balance', route: 'bancos' },
    { name: 'Usuarios', icon: 'people', route: 'usuarios' },
    { name: 'Negocio', icon: 'business', route: 'negocio' },
    { name: 'IA', icon: 'psychology', route: 'ia' },
    { name: 'Conversaciones', icon: 'chat', route: 'conversaciones' },
    { name: 'Sistema', icon: 'settings', route: 'sistema' },
  ];

  initializeRouteSync(): void {
    if (this.routeSyncInitialized) {
      return;
    }

    this.routeSyncInitialized = true;
    this.syncTabWithRoute(this.router.url);
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.syncTabWithRoute(event.urlAfterRedirects);
      }
    });
  }

  setLanguage(lang: 'es' | 'en'): void {
    this.appState.setSelectedLanguage(lang);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  selectTab(tabName: string): void {
    this.appState.setSelectedTab(tabName);
    const route = TAB_TO_ROUTE[tabName] || 'dashboard';
    void this.router.navigateByUrl(`/${route}`);
  }

  setUserProfile(profile: { email: string; displayName?: string | null; photoURL?: string | null }): void {
    this.userEmail.set(profile.email);
    this.userName.set(profile.displayName || 'Administrador Principal');
    if (profile.photoURL) {
      this.userPhotoUrl.set(profile.photoURL);
    }
  }

  setDemoProfile(): void {
    this.userEmail.set('emprende@biia-dots.com');
    this.userName.set('SuperAdmin Demo');
  }

  private syncTabWithRoute(url: string): void {
    const segment = url.split('?')[0].split('#')[0].replace(/^\//, '').split('/')[0] || 'dashboard';
    this.currentRouteSegment.set(segment);
    const tab = ROUTE_TO_TAB[segment];
    if (tab && this.selectedTab() !== tab) {
      this.appState.setSelectedTab(tab);
    }
  }
}
