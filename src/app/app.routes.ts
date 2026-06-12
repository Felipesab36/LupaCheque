import { Routes } from '@angular/router';
import { TabRouteHostComponent } from './features/routing/tab-route-host.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
	{ path: 'dashboard', component: TabRouteHostComponent, data: { tab: 'Dashboard' } },
	{ path: 'facturacion', component: TabRouteHostComponent, data: { tab: 'Facturación' } },
	{ path: 'integraciones', component: TabRouteHostComponent, data: { tab: 'Integraciones' } },
	{ path: 'bancos', component: TabRouteHostComponent, data: { tab: 'Bancos' } },
	{ path: 'usuarios', component: TabRouteHostComponent, data: { tab: 'Usuarios' } },
	{ path: 'negocio', component: TabRouteHostComponent, data: { tab: 'Negocio' } },
	{ path: 'ia', component: TabRouteHostComponent, data: { tab: 'IA' } },
	{ path: 'conversaciones', component: TabRouteHostComponent, data: { tab: 'Conversaciones' } },
	{ path: 'sistema', component: TabRouteHostComponent, data: { tab: 'Sistema' } },
	{ path: '**', redirectTo: 'dashboard' },
];
