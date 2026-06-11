import { Injectable } from '@angular/core';

export interface ChatApiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface ChatApiRequest {
  apiKey?: string | null;
  model: string;
  systemInstruction: string;
  contents: ChatApiContent[];
}

interface ChatApiResponse {
  text?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatApiService {
  async generateChatText(payload: ChatApiRequest): Promise<string> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as ChatApiResponse;
    if (!response.ok || data.error) {
      throw new Error(data.error || 'Error en la respuesta del servidor de IA');
    }

    return data.text || '';
  }
}
