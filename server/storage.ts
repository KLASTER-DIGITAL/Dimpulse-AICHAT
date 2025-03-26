import { messages, chats, users, type User, type InsertUser, type Message, type InsertMessage, type Chat, type InsertChat, type Settings, type Stats, settingsSchema, statsSchema } from "@shared/schema";

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
  
  // Stats methods
  getStats(): Promise<Stats>;
  getDialogHistory(limit?: number, offset?: number): Promise<{chats: Chat[], totalCount: number}>;
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
      ui: {
        enabled: true,
        colors: {
          primary: "#19c37d",
          secondary: "#f9fafb",
          accent: "#6366f1",
        },
        elements: {
          roundedCorners: true,
          shadows: true,
          animations: true,
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
    const user: User = { 
      ...insertUser, 
      id,
      lastActive: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async createChat(chat: InsertChat): Promise<Chat> {
    const newChat: Chat = {
      id: chat.id,
      title: chat.title,
      userId: chat.userId || null,
      createdAt: new Date(),
      lastActive: new Date()
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
  
  // Методы для работы со статистикой
  async getStats(): Promise<Stats> {
    // Текущая дата для расчета активности за последние 24 часа
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Получаем все сообщения для подсчета статистики
    const allMessages: Message[] = [];
    this.messages.forEach(messages => {
      allMessages.push(...messages);
    });
    
    // Считаем количество сообщений по дням
    const messagesPerDayMap = new Map<string, number>();
    allMessages.forEach(message => {
      const date = message.createdAt.toISOString().split('T')[0];
      messagesPerDayMap.set(date, (messagesPerDayMap.get(date) || 0) + 1);
    });
    
    // Преобразуем в массив с сортировкой по дате
    const messagesPerDay = Array.from(messagesPerDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Считаем чаты с наибольшим количеством сообщений
    const chatMessageCount = new Map<string, number>();
    this.messages.forEach((messages, chatId) => {
      chatMessageCount.set(chatId, messages.length);
    });
    
    // Получаем топ-5 чатов по количеству сообщений
    const topChats = Array.from(chatMessageCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([chatId, messageCount]) => {
        const chat = this.chats.get(chatId);
        return {
          chatId,
          title: chat ? chat.title : "Неизвестный чат",
          messageCount
        };
      });
    
    // Количество активных чатов за последние 24 часа
    const activeChatsLast24h = Array.from(this.chats.values())
      .filter(chat => {
        // Проверяем, есть ли сообщения в чате за последние 24 часа
        const chatMessages = this.messages.get(chat.id) || [];
        return chatMessages.some(message => message.createdAt >= yesterday);
      }).length;
    
    // Количество активных пользователей за последние 24 часа
    // Для упрощения считаем всех пользователей активными, так как в данной реализации
    // у нас нет отслеживания последней активности пользователя
    const activeUsersLast24h = this.users.size;
    
    return {
      totalUsers: this.users.size,
      totalChats: this.chats.size,
      totalMessages: allMessages.length,
      activeUsersLast24h,
      activeChatsLast24h,
      messagesPerDay,
      topChats
    };
  }
  
  async getDialogHistory(limit: number = 10, offset: number = 0): Promise<{chats: Chat[], totalCount: number}> {
    // Получаем все чаты, сортируем по дате создания (сначала новые)
    const allChats = Array.from(this.chats.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Применяем пагинацию
    const paginatedChats = allChats.slice(offset, offset + limit);
    
    return {
      chats: paginatedChats,
      totalCount: allChats.length
    };
  }
}

export const storage = new MemStorage();
