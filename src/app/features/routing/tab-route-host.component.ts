import { CommonModule, NgComponentOutlet } from '@angular/common';
import { Component, computed, inject, Type } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { App } from '../../app';

@Component({
  selector: 'app-tab-route-host',
  standalone: true,
  imports: [CommonModule, NgComponentOutlet],
  template: `
    <ng-container *ngComponentOutlet="currentComponent(); inputs: currentInputs()"></ng-container>
  `,
})
export class TabRouteHostComponent {
  private route = inject(ActivatedRoute);
  private app = inject(App);

  private currentTab = computed<string>(() => this.route.snapshot.data['tab'] ?? 'Dashboard');

  currentComponent = computed<Type<unknown> | null>(() => {
    const tab = this.currentTab();
    if (tab === 'Dashboard') return this.app.dashboardPageComponent as Type<unknown>;
    if (tab === 'Facturación') return this.app.facturacionPageComponent as Type<unknown>;
    if (tab === 'Integraciones') return this.app.integrationsPageComponent as Type<unknown>;
    if (tab === 'Negocio') return this.app.negocioPageComponent as Type<unknown>;
    if (tab === 'IA') return this.app.iaPageComponent as Type<unknown>;
    if (tab === 'Bancos') return this.app.banksPageComponent as Type<unknown>;
    if (tab === 'Usuarios') return this.app.usersPageComponent as Type<unknown>;
    if (tab === 'Conversaciones') return this.app.conversationsPageComponent as Type<unknown>;
    if (tab === 'Sistema') return this.app.systemPageComponent as Type<unknown>;
    return null;
  });

  currentInputs = computed<Record<string, unknown>>(() => {
    const tab = this.currentTab();
    if (tab === 'Dashboard') return {};
    if (tab === 'Facturación') return this.app.facturacionPageInputs;
    if (tab === 'Integraciones') return this.app.integrationsPageInputs;
    if (tab === 'Negocio') return this.app.negocioPageInputs;
    if (tab === 'IA') return this.app.iaPageInputs;
    if (tab === 'Bancos') return this.app.banksPageInputs;
    if (tab === 'Usuarios') return this.app.usersPageInputs;
    if (tab === 'Conversaciones') return this.app.conversationsPageInputs;
    if (tab === 'Sistema') return this.app.systemPageInputs;
    return {};
  });
}
