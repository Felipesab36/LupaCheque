import { CommonModule } from '@angular/common';
import { Component, Input, WritableSignal, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { IntegrationSubTab, IntegrationsFacade } from './integrations.facade';

@Component({
  selector: 'app-integrations-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './integrations-page.component.html',
})
export class IntegrationsPageComponent {
  private integrationsFacade = inject(IntegrationsFacade);

  @Input({ required: true }) t!: (key: string) => string;
  @Input({ required: true }) integrationsForm!: FormGroup;
  @Input({ required: true }) activeIntegrationSubTab!: WritableSignal<IntegrationSubTab>;
  @Input({ required: true }) countrySelectOptions!: Array<{ name: string; code: string; flag: string }>;

  async saveAndNext(): Promise<void> {
    await this.integrationsFacade.saveAndNext();
  }

  async saveAndExit(): Promise<void> {
    await this.integrationsFacade.saveAndExit();
  }
}
