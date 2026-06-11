import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NotificationItem } from '../../../core/services/notifications.facade';

@Component({
  selector: 'app-layout-header',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './layout-header.component.html',
})
export class LayoutHeaderComponent {
  @Input({ required: true }) t!: (key: string) => string;
  @Input({ required: true }) currentRouteTabLabel = 'Dashboard';
  @Input({ required: true }) selectedLanguage: 'es' | 'en' = 'es';
  @Input({ required: true }) userRole = 'Admin';
  @Input({ required: true }) userPhotoUrl = '';
  @Input({ required: true }) hasAlerts = false;
  @Input({ required: true }) notificationCount = 0;
  @Input({ required: true }) showAlertsDropdown = false;
  @Input({ required: true }) allNotifications: NotificationItem[] = [];

  @Output() setLanguage = new EventEmitter<'es' | 'en'>();
  @Output() toggleAlerts = new EventEmitter<void>();
  @Output() closeAlerts = new EventEmitter<void>();
  @Output() notificationClick = new EventEmitter<NotificationItem>();
  @Output() logout = new EventEmitter<void>();
}
