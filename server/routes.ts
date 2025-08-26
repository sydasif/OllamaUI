import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema, insertModelSchema, insertSettingsSchema } from "@shared/schema";
import { z } from "zod";

// Ollama API client
class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:11434") {
    this.baseUrl = baseUrl;
  }

  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }

  async pullModel(modelName: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error pulling model:', error);
      return false;
    }
  }

  async deleteModel(modelName: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting model:', error);
      return false;
    }
  }

  async *streamChat(model: string, messages: Array<{role: string, content: string}>, options: any = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          options: {
            temperature: options.temperature || 0.7,
            num_predict: options.max_tokens || 1024,
          }
        }),
      });

      if (!response.ok) throw new Error('Failed to start chat');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              yield data.message.content;
            }
            if (data.done) return;
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    } catch (error) {
      console.error('Error in stream chat:', error);
      throw error;
    }
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const ollama = new OllamaClient();

  // Health check
  app.get("/api/health", async (req, res) => {
    const ollamaHealth = await ollama.checkHealth();
    res.json({ ollama: ollamaHealth });
  });

  // Conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const data = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(data);
      res.status(201).json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create conversation" });
      }
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteConversation(req.params.id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Conversation not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Messages
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId: req.params.id,
      });
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create message" });
      }
    }
  });

  // Chat streaming
  app.post("/api/conversations/:id/chat", async (req, res) => {
    try {
      const { model, temperature, max_tokens } = req.body;
      const conversationId = req.params.id;

      // Get conversation messages for context
      const messages = await storage.getMessages(conversationId);
      const chatMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Set up SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      let assistantMessage = "";

      try {
        for await (const chunk of ollama.streamChat(model, chatMessages, { temperature, max_tokens })) {
          assistantMessage += chunk;
          res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
        }

        // Save assistant message
        await storage.createMessage({
          conversationId,
          role: "assistant",
          content: assistantMessage,
        });

        res.write(`data: ${JSON.stringify({ content: "", done: true })}\n\n`);
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
      }

      res.end();
    } catch (error) {
      res.status(500).json({ error: "Failed to start chat" });
    }
  });

  // Models
  app.get("/api/models", async (req, res) => {
    try {
      const ollamaModels = await ollama.listModels();
      const storedModels = await storage.getModels();

      // Sync with Ollama
      for (const model of ollamaModels) {
        await storage.createOrUpdateModel({
          name: model.name,
          displayName: model.name,
          size: model.size ? `${Math.round(model.size / 1024 / 1024 / 1024 * 10) / 10}GB` : undefined,
          isAvailable: true,
        });
      }

      const updatedModels = await storage.getModels();
      res.json(updatedModels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  app.post("/api/models/pull", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Model name is required" });
      }

      const success = await ollama.pullModel(name);
      if (success) {
        await storage.createOrUpdateModel({
          name,
          displayName: name,
          isAvailable: true,
        });
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to pull model" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to pull model" });
    }
  });

  app.delete("/api/models/:name", async (req, res) => {
    try {
      const success = await ollama.deleteModel(req.params.name);
      if (success) {
        await storage.deleteModel(req.params.name);
        res.status(204).send();
      } else {
        res.status(500).json({ error: "Failed to delete model" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete model" });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings/:key", async (req, res) => {
    try {
      const settingsData = insertSettingsSchema.parse({
        key: req.params.key,
        value: req.body.value,
      });
      const settings = await storage.setSetting(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update settings" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
