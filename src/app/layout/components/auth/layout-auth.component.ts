import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-layout-auth',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './layout-auth.component.html',
})
export class LayoutAuthComponent {
  @Input({ required: true }) t!: (key: string) => string;
  @Input() loginError: string | null = null;

  @Output() login = new EventEmitter<void>();
  @Output() bypassLogin = new EventEmitter<void>();
}
