import { messages, chats, users, type User, type InsertUser, type Message, type InsertMessage, type Chat, type InsertChat, type Settings, settingsSchema } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Chat methods
  createChat(chat: InsertChat): Promise<Chat>;
  getChatById(id: string): Promise<Chat | undefined>;
  getChatsByUserId(userId: number | null): Promise<Chat[]>;
  updateChatTitle(id: string, title: string): Promise<void>;
  
  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByChatId(chatId: string): Promise<Message[]>;
  
  // Settings methods
  getSettings(): Promise<Settings>;
  updateSettings(settings: Settings): Promise<Settings>;
  updateWebhookUrl(url: string, enabled: boolean): Promise<Settings>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chats: Map<string, Chat>;
  private messages: Map<string, Message[]>;
  private currentUserId: number;
  private currentMessageId: number;
  private settings: Settings;

  constructor() {
    this.users = new Map();
    this.chats = new Map();
    this.messages = new Map();
    this.currentUserId = 1;
    this.currentMessageId = 1;
    
    // Инициализация настроек по умолчанию
    this.settings = {
      webhook: {
        url: "https://n8n.klaster.digital/webhook-test/4a1fed67-dcfb-4eb8-a71b-d47b1d651509",
        enabled: true,
      },
      integration: {
        iframe: {
          enabled: false,
          theme: "dark",
        },
        widget: {
          enabled: false,
          position: "left",
          theme: "dark",
        },
      },
    };
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createChat(chat: InsertChat): Promise<Chat> {
    const newChat: Chat = {
      id: chat.id,
      title: chat.title,
      userId: chat.userId || null,
      createdAt: new Date()
    };
    this.chats.set(chat.id, newChat);
    this.messages.set(chat.id, []);
    return newChat;
  }

  async getChatById(id: string): Promise<Chat | undefined> {
    return this.chats.get(id);
  }

  async getChatsByUserId(userId: number | null): Promise<Chat[]> {
    if (userId === null) {
      return Array.from(this.chats.values()).sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
    }
    
    return Array.from(this.chats.values())
      .filter(chat => chat.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateChatTitle(id: string, title: string): Promise<void> {
    const chat = this.chats.get(id);
    if (chat) {
      chat.title = title;
      this.chats.set(id, chat);
    }
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const newMessage: Message = { 
      ...message, 
      id, 
      createdAt: new Date() 
    };
    
    const chatMessages = this.messages.get(message.chatId) || [];
    chatMessages.push(newMessage);
    this.messages.set(message.chatId, chatMessages);
    
    // Update chat title if it's the first user message
    if (message.role === 'user' && chatMessages.length <= 2) {
      const title = message.content.length > 30 
        ? message.content.substring(0, 30) + '...' 
        : message.content;
      this.updateChatTitle(message.chatId, title);
    }
    
    return newMessage;
  }

  async getMessagesByChatId(chatId: string): Promise<Message[]> {
    return this.messages.get(chatId) || [];
  }
  
  // Settings methods
  async getSettings(): Promise<Settings> {
    return this.settings;
  }
  
  async updateSettings(settings: Settings): Promise<Settings> {
    this.settings = settings;
    return this.settings;
  }
  
  async updateWebhookUrl(url: string, enabled: boolean): Promise<Settings> {
    this.settings.webhook.url = url;
    this.settings.webhook.enabled = enabled;
    return this.settings;
  }
}

export const storage = new MemStorage();
