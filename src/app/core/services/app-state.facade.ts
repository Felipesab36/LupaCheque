import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AppStateFacade {
  private platformId = inject(PLATFORM_ID);

  selectedTab = signal('Dashboard');
  selectedLanguage = signal<'es' | 'en'>('es');
  sidebarCollapsed = signal(false);
  showAlertsDropdown = signal(false);

  hydrateFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const savedTab = localStorage.getItem('lupacheque_selected_tab');
    if (savedTab) {
      this.selectedTab.set(savedTab);
    }

    const savedLang = localStorage.getItem('lupacheque_selected_lang');
    if (savedLang === 'es' || savedLang === 'en') {
      this.selectedLanguage.set(savedLang);
    }
  }

  setSelectedTab(tabName: string): void {
    this.selectedTab.set(tabName);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('lupacheque_selected_tab', tabName);
    }
  }

  setSelectedLanguage(lang: 'es' | 'en'): void {
    this.selectedLanguage.set(lang);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('lupacheque_selected_lang', lang);
    }
  }
}
