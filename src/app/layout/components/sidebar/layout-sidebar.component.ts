import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

type LayoutTab = {
  name: string;
  icon: string;
  route: string;
};

@Component({
  selector: 'app-layout-sidebar',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule],
  templateUrl: './layout-sidebar.component.html',
})
export class LayoutSidebarComponent {
  @Input({ required: true }) tabs: LayoutTab[] = [];
  @Input({ required: true }) collapsed = false;
  @Input({ required: true }) userEmail = '';
  @Input({ required: true }) t!: (key: string) => string;

  @Output() toggleSidebar = new EventEmitter<void>();
}
