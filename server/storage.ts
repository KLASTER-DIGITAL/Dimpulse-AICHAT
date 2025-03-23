import { messages, chats, users, type User, type InsertUser, type Message, type InsertMessage, type Chat, type InsertChat } from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chats: Map<string, Chat>;
  private messages: Map<string, Message[]>;
  private currentUserId: number;
  private currentMessageId: number;

  constructor() {
    this.users = new Map();
    this.chats = new Map();
    this.messages = new Map();
    this.currentUserId = 1;
    this.currentMessageId = 1;
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
    this.chats.set(chat.id, { 
      ...chat, 
      createdAt: new Date() 
    });
    this.messages.set(chat.id, []);
    return this.chats.get(chat.id)!;
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
}

export const storage = new MemStorage();
