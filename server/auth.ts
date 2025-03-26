import { supabase } from './supabase';
import { Request, Response, NextFunction } from 'express';
import type { User } from '@shared/schema';
import { storage } from './storage';

/**
 * Аутентификация пользователя
 * @param username Имя пользователя
 * @param password Пароль
 * @returns Данные пользователя или null в случае ошибки
 */
export async function authenticateUser(username: string, password: string): Promise<{user: User, token: string} | null> {
  try {
    // Специальная обработка для пользователя admin
    if (username === 'admin') {
      // Проверяем пароль
      if (password !== 'admin123') {
        console.error('Неверный пароль для администратора');
        return null;
      }
      
      // Получаем пользователя из нашей таблицы
      const user = await storage.getUserByUsername('admin');
      
      if (!user) {
        console.error('Пользователь admin не найден в базе данных');
        return null;
      }
      
      // Генерируем простой токен
      const token = 'admin_token_' + Date.now();
      
      return {
        user,
        token
      };
    }
    
    // Для остальных пользователей используем Supabase Auth
    // Проверяем, что Supabase настроен
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    // Пытаемся авторизоваться с помощью Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${username}@example.com`, // Используем домен для email
      password: password
    });
    
    if (error || !data.user) {
      console.error('Authentication error:', error);
      return null;
    }
    
    // Получаем пользователя из нашей БД или создаем его
    const email = data.user.email || `${username}@example.com`;
    const userId = parseInt(data.user.id);
    
    let user = await storage.getUserByUsername(username);
    
    if (!user) {
      // Создаем нового пользователя
      user = await storage.createUser({
        username,
        password: '********' // Не храним реальный пароль, он хранится в Supabase Auth
      });
    }
    
    return {
      user,
      token: data.session?.access_token || ''
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Регистрация нового пользователя
 * @param username Имя пользователя
 * @param password Пароль
 * @returns Данные пользователя или null в случае ошибки
 */
export async function registerUser(username: string, password: string): Promise<User | null> {
  try {
    // Проверяем, не занято ли имя пользователя
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      console.error('Username already taken');
      return null;
    }
    
    // Для обычных пользователей используем Supabase Auth
    if (username !== 'admin') {
      // Проверяем, что Supabase настроен
      if (!supabase) {
        throw new Error('Supabase not configured');
      }
      
      // Регистрируем пользователя в Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: `${username}@example.com`, // Используем домен для email
        password: password
      });
      
      if (error || !data.user) {
        console.error('Registration error in Supabase Auth:', error);
        return null;
      }
    }
    
    // Создаем пользователя в нашей локальной системе хранения
    const user = await storage.createUser({
      username,
      password: username === 'admin' ? password : '********' // Храним пароль только для админа
    });
    
    return user;
  } catch (error) {
    console.error('Registration error:', error);
    return null;
  }
}

// Хранилище токенов администратора (в памяти)
const adminTokens = new Set<string>();

/**
 * Middleware для проверки аутентификации
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Если метод OPTIONS, пропускаем (для CORS)
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // Если путь начинается с /api/auth, пропускаем
  if (req.path.startsWith('/api/auth')) {
    return next();
  }
  
  // Получаем токен из заголовка Authorization
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }
  
  // Проверяем, является ли токен токеном администратора
  if (token.startsWith('admin_token_')) {
    // Добавляем фиктивный токен в кэш, чтобы не проверять каждый раз
    adminTokens.add(token);
    
    // Добавляем данные пользователя в запрос
    (req as any).user = {
      id: 1,
      username: 'admin'
    };
    
    return next();
  }
  
  // Проверяем токен через Supabase Auth
  supabase.auth.getUser(token)
    .then(({ data, error }) => {
      if (error || !data.user) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
      
      // Добавляем данные пользователя в запрос
      (req as any).user = {
        id: data.user.id,
        email: data.user.email
      };
      
      next();
    })
    .catch((error) => {
      console.error('Token verification error:', error);
      return res.status(500).json({ message: 'Authentication error' });
    });
}

/**
 * Выход пользователя из системы
 * @param token Токен авторизации
 */
export async function logoutUser(token: string): Promise<boolean> {
  try {
    // Если это токен админа, удаляем его из нашего хранилища
    if (token.startsWith('admin_token_')) {
      adminTokens.delete(token);
      return true;
    }
    
    // Для обычных пользователей используем Supabase Auth
    // Проверяем, что Supabase настроен
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    // Выходим из Supabase Auth
    const { error } = await supabase.auth.signOut({
      scope: 'local'
    });
    
    if (error) {
      console.error('Logout error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

/**
 * Получение информации о пользователе по токену
 * @param token Токен авторизации
 * @returns Данные пользователя или null в случае ошибки
 */
export async function getUserByToken(token: string): Promise<User | null> {
  try {
    // Если это токен админа, возвращаем данные админа
    if (token.startsWith('admin_token_') && adminTokens.has(token)) {
      const user = await storage.getUserByUsername('admin');
      return user || null;
    }
    
    // Для обычных пользователей используем Supabase Auth
    // Проверяем, что Supabase настроен
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    // Проверяем токен через Supabase Auth
    const { data: userData, error } = await supabase.auth.getUser(token);
    
    if (error || !userData.user) {
      console.error('Get user by token error:', error);
      return null;
    }
    
    // Извлекаем имя пользователя из email
    const email = userData.user.email;
    const username = email ? email.split('@')[0] : 'user_' + userData.user.id.substring(0, 8);
    
    // Получаем данные пользователя из нашего хранилища
    let user = await storage.getUserByUsername(username);
    
    if (!user) {
      // Если пользователя нет в нашем хранилище, создаем его
      user = await storage.createUser({
        username,
        password: '********' // Не храним реальный пароль
      });
      
      if (!user) {
        console.error('Failed to create user in storage');
        return null;
      }
    }
    
    return user;
  } catch (error) {
    console.error('Get user by token error:', error);
    return null;
  }
}