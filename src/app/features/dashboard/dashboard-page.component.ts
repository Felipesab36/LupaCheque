import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { App } from '../../app';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './dashboard-page.component.html',
})
export class DashboardPageComponent {
  private app = inject(App);

  t = (key: string): string => this.app.t(key);

  dashboardStartDate = this.app.dashboardStartDate;
  dashboardEndDate = this.app.dashboardEndDate;

  totalBancos = this.app.totalBancos;
  totalUsuarios = this.app.totalUsuarios;
  queriesHoy = this.app.queriesHoy;
  ingresosHoy = this.app.ingresosHoy;

  accountsTrendData = this.app.accountsTrendData;
  queriesTrendData = this.app.queriesTrendData;
  incomeTrendData = this.app.incomeTrendData;

  getPoints(data: { date: string; value: number }[], width: number, height: number) {
    return this.app.getPoints(data, width, height);
  }

  getYAxisTicks(data: { date: string; value: number }[], height: number) {
    return this.app.getYAxisTicks(data, height);
  }

  getLinePath(data: { date: string; value: number }[], width: number, height: number): string {
    return this.app.getLinePath(data, width, height);
  }

  getAreaPath(data: { date: string; value: number }[], width: number, height: number): string {
    return this.app.getAreaPath(data, width, height);
  }
}
