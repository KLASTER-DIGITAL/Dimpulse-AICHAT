import { supabase } from './supabase';
import { Request, Response, NextFunction } from 'express';
import type { User } from '@shared/schema';
import crypto from 'crypto';

// Генерируем токены для пользователей
const userTokens = new Map<string, string>();

/**
 * Простая хеш-функция для паролей (не рекомендуется для продакшена)
 */
function simpleHash(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Аутентификация пользователя
 * @param username Имя пользователя
 * @param password Пароль
 * @returns Данные пользователя или null в случае ошибки
 */
export async function authenticateUser(username: string, password: string): Promise<{user: User, token: string} | null> {
  try {
    // Получаем данные пользователя из нашей таблицы пользователей
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (userError || !userData) {
      console.error('User data fetch error:', userError);
      return null;
    }
    
    // Проверяем пароль напрямую (в данном случае без хеширования)
    // В реальном приложении тут должна быть проверка хешированного пароля
    if (userData.password !== password) {
      console.error('Incorrect password');
      return null;
    }
    
    const user: User = {
      id: userData.id,
      username: userData.username,
      password: '********', // Скрываем пароль в возвращаемых данных
      lastActive: userData.last_active
    };
    
    // Генерируем простой токен и сохраняем его в памяти
    const token = crypto.randomBytes(32).toString('hex');
    userTokens.set(token, userData.id.toString());
    
    return {
      user,
      token: token
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
    // Проверяем, что Supabase настроен
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    // Создаем запись в нашей таблице пользователей
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        username: username,
        password: password, // Храним пароль в открытом виде ТОЛЬКО для демонстрационных целей
        last_active: new Date().toISOString()
      })
      .select()
      .single();
    
    if (userError || !userData) {
      console.error('User data creation error:', userError);
      return null;
    }
    
    const user: User = {
      id: userData.id,
      username: userData.username,
      password: '********', // Скрываем пароль в возвращаемых данных
      lastActive: userData.last_active
    };
    
    return user;
  } catch (error) {
    console.error('Registration error:', error);
    return null;
  }
}

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
  
  // Проверяем токен в нашей памяти
  const userId = userTokens.get(token);
  if (!userId) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
  
  // Добавляем данные пользователя в запрос
  (req as any).user = {
    id: userId
  };
  
  next();
}

/**
 * Выход пользователя из системы
 * @param token Токен авторизации
 */
export async function logoutUser(token: string): Promise<boolean> {
  try {
    // Удаляем токен из памяти
    userTokens.delete(token);
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
    // Проверяем токен в нашей памяти
    const userId = userTokens.get(token);
    if (!userId) {
      return null;
    }
    
    // Получаем данные пользователя из Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      console.error('User data fetch error:', userError);
      return null;
    }
    
    return {
      id: user.id,
      username: user.username,
      password: '********', // Скрываем пароль в возвращаемых данных
      lastActive: user.last_active
    };
  } catch (error) {
    console.error('Get user by token error:', error);
    return null;
  }
}