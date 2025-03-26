import { supabase } from './supabase';
import { Request, Response, NextFunction } from 'express';
import type { User } from '@shared/schema';

/**
 * Аутентификация пользователя в Supabase
 * @param username Имя пользователя
 * @param password Пароль
 * @returns Данные пользователя или null в случае ошибки
 */
export async function authenticateUser(username: string, password: string): Promise<{user: User, token: string} | null> {
  try {
    // Проверяем, что Supabase настроен
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    // Пытаемся авторизоваться с помощью Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${username}@chatgpt-clone.com`, // Используем фиктивный домен для email
      password: password
    });
    
    if (error || !data.user) {
      console.error('Authentication error:', error);
      return null;
    }
    
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
    
    const user: User = {
      id: userData.id,
      username: userData.username,
      password: '********', // Скрываем пароль в возвращаемых данных
      lastActive: userData.last_active
    };
    
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
 * Регистрация нового пользователя в Supabase
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
    
    // Регистрируем пользователя в Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: `${username}@chatgpt-clone.com`, // Используем фиктивный домен для email
      password: password
    });
    
    if (error || !data.user) {
      console.error('Registration error:', error);
      return null;
    }
    
    // Создаем запись в нашей таблице пользователей
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        username: username,
        password: '********', // Никогда не храним пароли в открытом виде, используется только для совместимости
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
    
    // Получаем данные пользователя из нашей таблицы пользователей
    const email = userData.user.email;
    const username = email ? email.split('@')[0] : ''; // Извлекаем username из email
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
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