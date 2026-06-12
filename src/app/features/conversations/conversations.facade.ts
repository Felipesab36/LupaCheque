import { Injectable, signal } from '@angular/core';
import { FirebaseData, ChatMessage } from '../../firebase-data';
import { ChatApiService } from '../../core/services/chat-api.service';
import { UiFeedbackService } from '../../shared/services/ui-feedback.service';

export interface SendConversationMessageOptions {
  iaUserInstructions: string;
  iaAnalysisInstructions: string;
  iaSalesInstructions: string;
  apiKey?: string | null;
  model: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConversationsFacade {
  conversationsList = signal<ChatMessage[]>([]);
  selectedChatUser = signal<string>('+593999999999');
  chatInputText = signal<string>('');
  isChatLoading = signal<boolean>(false);

  constructor(
    private readonly firebaseData: FirebaseData,
    private readonly chatApi: ChatApiService,
    private readonly uiFeedback: UiFeedbackService,
  ) {}

  setConversations(conversations: ChatMessage[]): void {
    this.conversationsList.set(conversations);
  }

  selectChatUser(phone: string): void {
    this.selectedChatUser.set(phone);
  }

  async sendChatMessage(options: SendConversationMessageOptions): Promise<void> {
    const text = this.chatInputText().trim();
    if (!text) return;

    this.isChatLoading.set(true);
    try {
      const userPhone = this.selectedChatUser();
      const userMsg: ChatMessage = {
        userPhone,
        sender: 'user',
        text,
        timestamp: new Date().toISOString(),
      };

      await this.firebaseData.saveChatMessage(userMsg);
      this.chatInputText.set('');

      let chats = await this.firebaseData.getConversations();
      this.conversationsList.set(chats);

      const userChats = chats.filter((m) => m.userPhone === userPhone);
      const contents = userChats.map((c) => ({
        role: (c.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: c.text }],
      }));

      const combinedInstructions = `
# INSTRUCCIONES DE COMPORTAMIENTO GENERAL SOBRE CÓMO COMPORTARSE:
${options.iaUserInstructions}

# INSTRUCCIONES DE ANÁLISIS DE CONSULTAS O DATOS:
${options.iaAnalysisInstructions}

# INSTRUCCIONES DE MONETIZACIÓN Y VENTAS (CÓMO INTENTAR MONETIZAR):
${options.iaSalesInstructions}
      `;

      const aiText = await this.chatApi.generateChatText({
        apiKey: options.apiKey,
        model: options.model,
        systemInstruction: combinedInstructions,
        contents,
      });

      if (aiText) {
        const botMsg: ChatMessage = {
          userPhone,
          sender: 'bot',
          text: aiText,
          timestamp: new Date().toISOString(),
        };
        await this.firebaseData.saveChatMessage(botMsg);

        chats = await this.firebaseData.getConversations();
        this.conversationsList.set(chats);
      }
    } catch (err: unknown) {
      console.error('Chat error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      this.uiFeedback.showToast(`Error de IA: ${errMsg}`, 'danger');
    } finally {
      this.isChatLoading.set(false);
    }
  }

  async clearChatHistory(confirmReset: (phone: string) => boolean): Promise<void> {
    const phone = this.selectedChatUser();
    if (!phone) return;

    if (!confirmReset(phone)) return;

    this.isChatLoading.set(true);
    try {
      await this.firebaseData.deleteConversations(phone);
      const conversations = await this.firebaseData.getConversations();
      this.conversationsList.set(conversations);
      this.uiFeedback.showToast(`Historial reiniciado para ${phone}.`, 'success');
    } catch (err: unknown) {
      console.error('Failed to clear chats:', err);
      this.uiFeedback.showToast('No se pudo borrar el historial.', 'danger');
    } finally {
      this.isChatLoading.set(false);
    }
  }
}
