import { supabase } from './supabase';
import { IStorage } from './storage';
import { 
  User, InsertUser, 
  Chat, InsertChat, 
  Message, InsertMessage, 
  Settings, Stats,
  settingsSchema
} from '@shared/schema';

/**
 * Реализация хранилища данных с использованием Supabase
 */
export class SupabaseStorage implements IStorage {
  private settings: Settings;
  private tableNames = {
    users: 'users',
    chats: 'chats',
    messages: 'messages',
    settings: 'settings',
    files: 'files'
  };

  constructor(settings?: Settings) {
    // Инициализация с настройками по умолчанию если не переданы
    this.settings = settings || {
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
          fontSize: 16,
          width: 400,
          height: 500,
          text: "Чем могу помочь?",
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
      database: {
        enabled: true,
        type: "supabase",
        supabase: {
          tables: {
            messages: "messages",
            chats: "chats",
            users: "users",
            files: "files",
          },
          schema: "public",
          autoMigrate: true,
        }
      }
    };

    // Если переданы пользовательские настройки, обновляем названия таблиц
    if (settings?.database?.supabase?.tables) {
      this.tableNames = {
        ...this.tableNames,
        ...settings.database.supabase.tables
      };
    }

    // Инициализируем таблицы если включена автомиграция
    if (settings?.database?.supabase?.autoMigrate) {
      this.initTables();
    }
  }

  /**
   * Инициализация таблиц в Supabase
   */
  private async initTables() {
    try {
      console.log('Initializing Supabase tables...');
      
      // Создаем таблицу users если не существует
      const { error: usersError } = await supabase.rpc('create_table_if_not_exists', {
        table_name: this.tableNames.users,
        columns: `
          id serial primary key,
          username text not null unique,
          password text not null,
          last_active timestamp with time zone default now() not null
        `
      });
      
      if (usersError) {
        console.error('Error creating users table:', usersError);
      }
      
      // Создаем таблицу chats если не существует
      const { error: chatsError } = await supabase.rpc('create_table_if_not_exists', {
        table_name: this.tableNames.chats,
        columns: `
          id text primary key,
          title text not null,
          user_id integer,
          created_at timestamp with time zone default now() not null,
          last_active timestamp with time zone default now() not null
        `
      });
      
      if (chatsError) {
        console.error('Error creating chats table:', chatsError);
      }
      
      // Создаем таблицу messages если не существует
      const { error: messagesError } = await supabase.rpc('create_table_if_not_exists', {
        table_name: this.tableNames.messages,
        columns: `
          id serial primary key,
          chat_id text not null references ${this.tableNames.chats}(id) on delete cascade,
          role text not null,
          content text not null,
          created_at timestamp with time zone default now() not null
        `
      });
      
      if (messagesError) {
        console.error('Error creating messages table:', messagesError);
      }
      
      // Создаем таблицу settings если не существует
      const { error: settingsError } = await supabase.rpc('create_table_if_not_exists', {
        table_name: this.tableNames.settings,
        columns: `
          id serial primary key,
          settings jsonb not null,
          last_updated timestamp with time zone default now() not null
        `
      });
      
      if (settingsError) {
        console.error('Error creating settings table:', settingsError);
      }

      // Создаем таблицу files если не существует
      const { error: filesError } = await supabase.rpc('create_table_if_not_exists', {
        table_name: this.tableNames.files,
        columns: `
          id serial primary key,
          name text not null,
          content_type text not null,
          size integer not null,
          chat_id text not null references ${this.tableNames.chats}(id) on delete cascade,
          message_id integer references ${this.tableNames.messages}(id) on delete cascade,
          file_path text not null,
          created_at timestamp with time zone default now() not null
        `
      });
      
      if (filesError) {
        console.error('Error creating files table:', filesError);
      }

      console.log('Supabase tables initialized');
    } catch (error) {
      console.error('Error initializing Supabase tables:', error);
    }
  }

  /**
   * Получение пользователя по ID
   */
  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from(this.tableNames.users)
      .select()
      .eq('id', id)
      .single();
    
    if (error || !data) {
      console.error('Error fetching user:', error);
      return undefined;
    }
    
    return this.mapUserFromSupabase(data);
  }

  /**
   * Получение пользователя по имени пользователя
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from(this.tableNames.users)
      .select()
      .eq('username', username)
      .single();
    
    if (error || !data) {
      if (error && error.code !== 'PGRST116') { // Игнорируем ошибку "не найдено"
        console.error('Error fetching user by username:', error);
      }
      return undefined;
    }
    
    return this.mapUserFromSupabase(data);
  }

  /**
   * Создание нового пользователя
   */
  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await supabase
      .from(this.tableNames.users)
      .insert({ 
        username: user.username, 
        password: user.password,
        last_active: new Date()
      })
      .select()
      .single();
    
    if (error || !data) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error?.message || 'Unknown error'}`);
    }
    
    return this.mapUserFromSupabase(data);
  }

  /**
   * Создание нового чата
   */
  async createChat(chat: InsertChat): Promise<Chat> {
    const now = new Date();
    
    const { data, error } = await supabase
      .from(this.tableNames.chats)
      .insert({
        id: chat.id,
        title: chat.title,
        user_id: chat.userId || null,
        created_at: now.toISOString(),
        last_active: now.toISOString()
      })
      .select()
      .single();
    
    if (error || !data) {
      console.error('Error creating chat:', error);
      throw new Error(`Failed to create chat: ${error?.message || 'Unknown error'}`);
    }
    
    return this.mapChatFromSupabase(data);
  }

  /**
   * Получение чата по ID
   */
  async getChatById(id: string): Promise<Chat | undefined> {
    const { data, error } = await supabase
      .from(this.tableNames.chats)
      .select()
      .eq('id', id)
      .single();
    
    if (error || !data) {
      if (error && error.code !== 'PGRST116') { // Игнорируем ошибку "не найдено"
        console.error('Error fetching chat by id:', error);
      }
      return undefined;
    }
    
    return this.mapChatFromSupabase(data);
  }

  /**
   * Получение списка чатов пользователя
   */
  async getChatsByUserId(userId: number | null): Promise<Chat[]> {
    let query = supabase
      .from(this.tableNames.chats)
      .select()
      .order('created_at', { ascending: false });
    
    // Если указан userId, фильтруем по нему
    if (userId !== null) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching chats by user id:', error);
      return [];
    }
    
    return (data || []).map(this.mapChatFromSupabase);
  }

  /**
   * Обновление заголовка чата
   */
  async updateChatTitle(id: string, title: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableNames.chats)
      .update({ title, last_active: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating chat title:', error);
      throw new Error(`Failed to update chat title: ${error.message}`);
    }
  }

  /**
   * Создание нового сообщения
   */
  async createMessage(message: InsertMessage): Promise<Message> {
    const { data, error } = await supabase
      .from(this.tableNames.messages)
      .insert({
        chat_id: message.chatId,
        role: message.role,
        content: message.content,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error || !data) {
      console.error('Error creating message:', error);
      throw new Error(`Failed to create message: ${error?.message || 'Unknown error'}`);
    }
    
    // Обновляем lastActive для чата
    await supabase
      .from(this.tableNames.chats)
      .update({ last_active: new Date().toISOString() })
      .eq('id', message.chatId);
    
    // Если это первое сообщение пользователя, обновляем заголовок чата
    const { data: chatMessages } = await supabase
      .from(this.tableNames.messages)
      .select('id')
      .eq('chat_id', message.chatId);
    
    if (message.role === 'user' && chatMessages && chatMessages.length <= 2) {
      const title = message.content.length > 30 
        ? message.content.substring(0, 30) + '...' 
        : message.content;
      await this.updateChatTitle(message.chatId, title);
    }
    
    return this.mapMessageFromSupabase(data);
  }

  /**
   * Получение сообщений чата
   */
  async getMessagesByChatId(chatId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from(this.tableNames.messages)
      .select()
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching messages by chat id:', error);
      return [];
    }
    
    return (data || []).map(this.mapMessageFromSupabase);
  }

  /**
   * Получение настроек
   */
  async getSettings(): Promise<Settings> {
    // Проверяем наличие записи в таблице настроек
    const { data, error } = await supabase
      .from(this.tableNames.settings)
      .select('settings')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') { // Игнорируем ошибку "не найдено"
        console.error('Error fetching settings:', error);
      }
      return this.settings;
    }
    
    if (data && data.settings) {
      try {
        // Парсим и проверяем настройки по схеме
        const parsedSettings = settingsSchema.parse(data.settings);
        // Обновляем текущие настройки
        this.settings = parsedSettings;
        return parsedSettings;
      } catch (e) {
        console.error('Error parsing settings from database:', e);
      }
    }
    
    return this.settings;
  }

  /**
   * Обновление настроек
   */
  async updateSettings(settings: Settings): Promise<Settings> {
    try {
      // Проверяем настройки по схеме
      const validatedSettings = settingsSchema.parse(settings);
      
      // Обновляем или создаем запись в таблице настроек
      const { error } = await supabase
        .from(this.tableNames.settings)
        .upsert({
          id: 1, // Всегда используем ID=1 для настроек
          settings: validatedSettings,
          last_updated: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error updating settings:', error);
        throw new Error(`Failed to update settings: ${error.message}`);
      }
      
      // Обновляем текущие настройки
      this.settings = validatedSettings;
      
      return validatedSettings;
    } catch (e) {
      console.error('Error updating settings:', e);
      throw new Error(`Failed to update settings: ${e}`);
    }
  }

  /**
   * Обновление URL вебхука
   */
  async updateWebhookUrl(url: string, enabled: boolean): Promise<Settings> {
    // Получаем текущие настройки
    const currentSettings = await this.getSettings();
    
    // Обновляем URL и статус вебхука
    const updatedSettings = {
      ...currentSettings,
      webhook: {
        ...currentSettings.webhook,
        url,
        enabled
      }
    };
    
    // Сохраняем обновленные настройки
    return this.updateSettings(updatedSettings);
  }

  /**
   * Получение статистики
   */
  async getStats(): Promise<Stats> {
    try {
      // Получаем общее количество пользователей
      const { count: totalUsers, error: usersError } = await supabase
        .from(this.tableNames.users)
        .select('*', { count: 'exact', head: true });
      
      if (usersError) {
        console.error('Error fetching users count:', usersError);
        throw usersError;
      }
      
      // Получаем общее количество чатов
      const { count: totalChats, error: chatsError } = await supabase
        .from(this.tableNames.chats)
        .select('*', { count: 'exact', head: true });
      
      if (chatsError) {
        console.error('Error fetching chats count:', chatsError);
        throw chatsError;
      }
      
      // Получаем общее количество сообщений
      const { count: totalMessages, error: messagesError } = await supabase
        .from(this.tableNames.messages)
        .select('*', { count: 'exact', head: true });
      
      if (messagesError) {
        console.error('Error fetching messages count:', messagesError);
        throw messagesError;
      }
      
      // Получаем дату 24 часа назад
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString();
      
      // Получаем количество активных пользователей за последние 24 часа
      const { count: activeUsersLast24h, error: activeUsersError } = await supabase
        .from(this.tableNames.users)
        .select('*', { count: 'exact', head: true })
        .gte('last_active', yesterdayStr);
      
      if (activeUsersError) {
        console.error('Error fetching active users count:', activeUsersError);
        throw activeUsersError;
      }
      
      // Получаем количество активных чатов за последние 24 часа
      const { count: activeChatsLast24h, error: activeChatsError } = await supabase
        .from(this.tableNames.chats)
        .select('*', { count: 'exact', head: true })
        .gte('last_active', yesterdayStr);
      
      if (activeChatsError) {
        console.error('Error fetching active chats count:', activeChatsError);
        throw activeChatsError;
      }
      
      // Получаем количество сообщений по дням
      const { data: messagesPerDayData, error: messagesPerDayError } = await supabase.rpc(
        'get_messages_per_day',
        { messages_table: this.tableNames.messages }
      );
      
      if (messagesPerDayError) {
        console.error('Error fetching messages per day:', messagesPerDayError);
        throw messagesPerDayError;
      }
      
      const messagesPerDay = messagesPerDayData || [];
      
      // Получаем топ-5 чатов по количеству сообщений
      const { data: topChatsData, error: topChatsError } = await supabase.rpc(
        'get_top_chats',
        { 
          messages_table: this.tableNames.messages,
          chats_table: this.tableNames.chats,
          limit_count: 5
        }
      );
      
      if (topChatsError) {
        console.error('Error fetching top chats:', topChatsError);
        throw topChatsError;
      }
      
      const topChats = topChatsData || [];
      
      return {
        totalUsers: totalUsers || 0,
        totalChats: totalChats || 0,
        totalMessages: totalMessages || 0,
        activeUsersLast24h: activeUsersLast24h || 0,
        activeChatsLast24h: activeChatsLast24h || 0,
        messagesPerDay,
        topChats
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      
      // Возвращаем пустую статистику в случае ошибки
      return {
        totalUsers: 0,
        totalChats: 0,
        totalMessages: 0,
        activeUsersLast24h: 0,
        activeChatsLast24h: 0,
        messagesPerDay: [],
        topChats: []
      };
    }
  }

  /**
   * Получение истории диалогов с пагинацией
   */
  async getDialogHistory(limit: number = 10, offset: number = 0): Promise<{chats: Chat[], totalCount: number}> {
    // Получаем общее количество чатов
    const { count, error: countError } = await supabase
      .from(this.tableNames.chats)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error fetching chats count:', countError);
      return { chats: [], totalCount: 0 };
    }
    
    // Получаем страницу чатов
    const { data, error } = await supabase
      .from(this.tableNames.chats)
      .select()
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching dialog history:', error);
      return { chats: [], totalCount: count || 0 };
    }
    
    return {
      chats: (data || []).map(this.mapChatFromSupabase),
      totalCount: count || 0
    };
  }

  /**
   * Маппинг пользователя из Supabase формата
   */
  private mapUserFromSupabase(data: any): User {
    return {
      id: data.id,
      username: data.username,
      password: data.password,
      lastActive: new Date(data.last_active)
    };
  }

  /**
   * Маппинг чата из Supabase формата
   */
  private mapChatFromSupabase(data: any): Chat {
    return {
      id: data.id,
      title: data.title,
      userId: data.user_id,
      createdAt: new Date(data.created_at),
      lastActive: new Date(data.last_active)
    };
  }

  /**
   * Маппинг сообщения из Supabase формата
   */
  private mapMessageFromSupabase(data: any): Message {
    return {
      id: data.id,
      chatId: data.chat_id,
      role: data.role,
      content: data.content,
      createdAt: new Date(data.created_at)
    };
  }
}