import { CommonModule } from '@angular/common';
import { Component, Input, WritableSignal, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminUser, VisitorUser } from '../../firebase-data';
import { SystemFacade } from './system.facade';

@Component({
  selector: 'app-system-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './system-page.component.html',
})
export class SystemPageComponent {
  private systemFacade = inject(SystemFacade);

  @Input({ required: true }) t!: (key: string) => string;
  @Input({ required: true }) isLoadingData!: WritableSignal<boolean>;
  @Input({ required: true }) showAddAdmin!: WritableSignal<boolean>;
  @Input({ required: true }) showAddVisitor!: WritableSignal<boolean>;
  @Input({ required: true }) adminForm!: FormGroup;
  @Input({ required: true }) visitorForm!: FormGroup;
  @Input({ required: true }) adminsList!: WritableSignal<AdminUser[]>;
  @Input({ required: true }) visitorsList!: WritableSignal<VisitorUser[]>;

  @Input() onAddAdminSubmit: () => void = () => {};
  @Input() onAddVisitorSubmit: () => void = () => {};
  @Input() onToggleAdmin2FA: (admin: AdminUser) => void = () => {};
  @Input() onToggleVisitor2FA: (visitor: VisitorUser) => void = () => {};
  @Input() onDeleteAdmin: (adminId: string) => void = () => {};
  @Input() onDeleteVisitor: (visitorId: string) => void = () => {};

  submitAddAdmin(): void {
    this.onAddAdminSubmit();
  }

  submitAddVisitor(): void {
    this.onAddVisitorSubmit();
  }

  toggleAdmin2FA(admin: AdminUser): void {
    this.onToggleAdmin2FA(admin);
  }

  toggleVisitor2FA(visitor: VisitorUser): void {
    this.onToggleVisitor2FA(visitor);
  }

  deleteAdmin(adminId: string): void {
    this.onDeleteAdmin(adminId);
  }

  deleteVisitor(visitorId: string): void {
    this.onDeleteVisitor(visitorId);
  }

  async saveAndNext(): Promise<void> {
    await this.systemFacade.saveAndNext();
  }

  async saveAndExit(): Promise<void> {
    await this.systemFacade.saveAndExit();
  }
}
