import { CommonModule } from '@angular/common';
import { Component, input, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SystemUser } from '../../firebase-data';
import { ConversationsFacade } from './conversations.facade';

@Component({
  selector: 'app-conversations-page',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './conversations-page.component.html',
})
export class ConversationsPageComponent {
  private conversations = inject(ConversationsFacade);

  users = input<SystemUser[]>([]);
  geminiApiConfigured = input<boolean>(false);
  geminiApiKey = input<string | null | undefined>(undefined);
  geminiModel = input<string>('gemini-2.5-flash');
  iaUserInstructions = input<string>('');
  iaAnalysisInstructions = input<string>('');
  iaSalesInstructions = input<string>('');

  conversationsList = this.conversations.conversationsList;
  selectedChatUser = this.conversations.selectedChatUser;
  chatInputText = this.conversations.chatInputText;
  isChatLoading = this.conversations.isChatLoading;

  selectChatUser(phone: string): void {
    this.conversations.selectChatUser(phone);
  }

  async sendChatMessage(inputEl?: HTMLInputElement): Promise<void> {
    await this.conversations.sendChatMessage({
      iaUserInstructions: this.iaUserInstructions(),
      iaAnalysisInstructions: this.iaAnalysisInstructions(),
      iaSalesInstructions: this.iaSalesInstructions(),
      apiKey: this.geminiApiKey(),
      model: this.geminiModel() || 'gemini-2.5-flash',
    });

    if (inputEl) {
      inputEl.value = '';
    }
  }

  async clearChatHistory(): Promise<void> {
    await this.conversations.clearChatHistory((phone) =>
      confirm(`¿Está seguro de que desea reiniciar la conversación para ${phone}? Se borrarán todos los mensajes.`),
    );
  }
}
