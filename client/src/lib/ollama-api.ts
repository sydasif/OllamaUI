import { apiRequest } from './queryClient';

export interface OllamaModel {
  id: string;
  name: string;
  displayName: string;
  size?: string;
  isAvailable: boolean;
  lastUpdated: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Settings {
  id: string;
  key: string;
  value: any;
  updatedAt: string;
}

export const ollamaApi = {
  // Health check
  async checkHealth(): Promise<{ ollama: boolean }> {
    const res = await apiRequest('GET', '/api/health');
    return res.json();
  },

  // Models
  async getModels(): Promise<OllamaModel[]> {
    const res = await apiRequest('GET', '/api/models');
    return res.json();
  },

  async pullModel(name: string): Promise<{ success: boolean }> {
    const res = await apiRequest('POST', '/api/models/pull', { name });
    return res.json();
  },

  async deleteModel(name: string): Promise<void> {
    await apiRequest('DELETE', `/api/models/${name}`);
  },

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    const res = await apiRequest('GET', '/api/conversations');
    return res.json();
  },

  async createConversation(data: { title: string; model: string }): Promise<Conversation> {
    const res = await apiRequest('POST', '/api/conversations', data);
    return res.json();
  },

  async deleteConversation(id: string): Promise<void> {
    await apiRequest('DELETE', `/api/conversations/${id}`);
  },

  // Messages
  async getMessages(conversationId: string): Promise<Message[]> {
    const res = await apiRequest('GET', `/api/conversations/${conversationId}/messages`);
    return res.json();
  },

  async createMessage(conversationId: string, data: { role: 'user' | 'assistant'; content: string }): Promise<Message> {
    const res = await apiRequest('POST', `/api/conversations/${conversationId}/messages`, data);
    return res.json();
  },

  // Chat streaming
  async streamChat(conversationId: string, options: { model: string; temperature?: number; max_tokens?: number }): Promise<EventSource> {
    const params = new URLSearchParams({
      model: options.model,
      temperature: (options.temperature || 0.7).toString(),
      max_tokens: (options.max_tokens || 1024).toString(),
    });

    const eventSource = new EventSource(`/api/conversations/${conversationId}/chat?${params}`, {
      withCredentials: true,
    });

    return eventSource;
  },

  // Settings
  async getSettings(): Promise<Settings[]> {
    const res = await apiRequest('GET', '/api/settings');
    return res.json();
  },

  async updateSetting(key: string, value: any): Promise<Settings> {
    const res = await apiRequest('PUT', `/api/settings/${key}`, { value });
    return res.json();
  },
};
