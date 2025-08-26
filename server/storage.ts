import { type Conversation, type InsertConversation, type Message, type InsertMessage, type OllamaModel, type InsertOllamaModel, type Settings, type InsertSettings } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Conversations
  getConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;

  // Messages
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessages(conversationId: string): Promise<boolean>;

  // Models
  getModels(): Promise<OllamaModel[]>;
  createOrUpdateModel(model: InsertOllamaModel): Promise<OllamaModel>;
  deleteModel(name: string): Promise<boolean>;

  // Settings
  getSetting(key: string): Promise<Settings | undefined>;
  setSetting(settings: InsertSettings): Promise<Settings>;
  getSettings(): Promise<Settings[]>;
}

export class MemStorage implements IStorage {
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private models: Map<string, OllamaModel>;
  private settings: Map<string, Settings>;

  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
    this.models = new Map();
    this.settings = new Map();
    
    // Initialize default settings
    this.initializeDefaultSettings();
  }

  private async initializeDefaultSettings() {
    const defaultSettings = [
      { key: 'ollama_url', value: { url: 'http://localhost:11434' } },
      { key: 'temperature', value: { temperature: 0.7 } },
      { key: 'max_tokens', value: { max_tokens: 1024 } },
      { key: 'system_prompt', value: { prompt: 'You are a helpful AI assistant.' } },
      { key: 'auto_save', value: { enabled: true } },
    ];

    for (const setting of defaultSettings) {
      const id = randomUUID();
      const settingsObj: Settings = {
        id,
        key: setting.key,
        value: setting.value,
        updatedAt: new Date(),
      };
      this.settings.set(setting.key, settingsObj);
    }
  }

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;

    const updated: Conversation = {
      ...conversation,
      ...updates,
      updatedAt: new Date(),
    };
    this.conversations.set(id, updated);
    return updated;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const deleted = this.conversations.delete(id);
    if (deleted) {
      // Also delete all messages for this conversation
      const messagesToDelete = Array.from(this.messages.values())
        .filter(msg => msg.conversationId === id);
      for (const msg of messagesToDelete) {
        this.messages.delete(msg.id);
      }
    }
    return deleted;
  }

  // Messages
  async getMessages(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async deleteMessages(conversationId: string): Promise<boolean> {
    const messagesToDelete = Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId);
    
    for (const msg of messagesToDelete) {
      this.messages.delete(msg.id);
    }
    
    return messagesToDelete.length > 0;
  }

  // Models
  async getModels(): Promise<OllamaModel[]> {
    return Array.from(this.models.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createOrUpdateModel(insertModel: InsertOllamaModel): Promise<OllamaModel> {
    const existing = Array.from(this.models.values()).find(m => m.name === insertModel.name);
    
    if (existing) {
      const updated: OllamaModel = {
        ...existing,
        ...insertModel,
        lastUpdated: new Date(),
      };
      this.models.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const model: OllamaModel = {
        ...insertModel,
        id,
        size: insertModel.size || null,
        isAvailable: insertModel.isAvailable ?? true,
        lastUpdated: new Date(),
      };
      this.models.set(id, model);
      return model;
    }
  }

  async deleteModel(name: string): Promise<boolean> {
    const model = Array.from(this.models.values()).find(m => m.name === name);
    if (model) {
      return this.models.delete(model.id);
    }
    return false;
  }

  // Settings
  async getSetting(key: string): Promise<Settings | undefined> {
    return this.settings.get(key);
  }

  async setSetting(insertSettings: InsertSettings): Promise<Settings> {
    const existing = this.settings.get(insertSettings.key);
    
    if (existing) {
      const updated: Settings = {
        ...existing,
        value: insertSettings.value,
        updatedAt: new Date(),
      };
      this.settings.set(insertSettings.key, updated);
      return updated;
    } else {
      const id = randomUUID();
      const settings: Settings = {
        ...insertSettings,
        id,
        updatedAt: new Date(),
      };
      this.settings.set(insertSettings.key, settings);
      return settings;
    }
  }

  async getSettings(): Promise<Settings[]> {
    return Array.from(this.settings.values());
  }
}

export const storage = new MemStorage();
