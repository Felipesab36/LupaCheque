import { CommonModule } from '@angular/common';
import { Component, Input, WritableSignal, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IaFacade, IaSubTab } from './ia.facade';

@Component({
  selector: 'app-ia-page',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './ia-page.component.html',
})
export class IaPageComponent {
  private iaFacade = inject(IaFacade);

  @Input({ required: true }) t!: (key: string) => string;
  @Input({ required: true }) activeIaSubTab!: WritableSignal<IaSubTab>;
  @Input({ required: true }) iaUserInstructions!: WritableSignal<string>;
  @Input({ required: true }) iaAnalysisInstructions!: WritableSignal<string>;
  @Input({ required: true }) iaSalesInstructions!: WritableSignal<string>;

  async saveAndNext(): Promise<void> {
    await this.iaFacade.saveAndNext();
  }

  async saveAndExit(): Promise<void> {
    await this.iaFacade.saveAndExit();
  }
}
