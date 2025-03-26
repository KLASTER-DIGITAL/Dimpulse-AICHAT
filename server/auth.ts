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
      email: `${username}@example.com`, // Используем домен для email
      password: password
    });
    
    if (error || !data.user) {
      console.error('Authentication error:', error);
      return null;
    }
    
    // Находим или создаем пользователя в нашей таблице
    const userId = data.user.id;
    let userData;
    
    // Сначала проверяем, есть ли пользователь в нашей таблице
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (fetchError) {
      console.error('User data fetch error:', fetchError);
      return null;
    }
    
    if (existingUser) {
      // Пользователь существует, обновляем last_active
      userData = existingUser;
      await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', userId);
    } else {
      // Пользователь не существует, создаем запись
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          last_active: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError || !newUser) {
        console.error('User data creation error:', insertError);
        return null;
      }
      
      userData = newUser;
    }
    
    const user: User = {
      id: userData.id,
      username: username,
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
      email: `${username}@example.com`, // Используем домен для email
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
        id: data.user.id,
        last_active: new Date().toISOString()
      })
      .select()
      .single();
    
    if (userError) {
      console.error('User data creation error:', userError);
      
      // Если произошла ошибка при создании записи в таблице, но пользователь в Auth создан,
      // мы всё равно возвращаем данные пользователя
      const user: User = {
        id: data.user.id,
        username: username,
        password: '********',
        lastActive: new Date().toISOString()
      };
      
      return user;
    }
    
    const user: User = {
      id: userData.id,
      username: username,
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
    const userId = userData.user.id;
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('User data fetch error:', userError);
      
      // Если пользователя нет в нашей таблице, но есть в Auth, создаем его
      if (userError.code === 'PGRST404') {
        const email = userData.user.email;
        const username = email ? email.split('@')[0] : 'user_' + userId.substring(0, 8);
        
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            last_active: new Date().toISOString()
          })
          .select()
          .single();
        
        if (insertError || !newUser) {
          console.error('User data creation error:', insertError);
          return null;
        }
        
        return {
          id: newUser.id,
          username: username,
          password: '********',
          lastActive: newUser.last_active
        };
      }
      
      return null;
    }
    
    // Определяем имя пользователя из email
    const email = userData.user.email;
    const username = email ? email.split('@')[0] : 'user_' + user.id.substring(0, 8);
    
    return {
      id: user.id,
      username: username,
      password: '********', // Скрываем пароль в возвращаемых данных
      lastActive: user.last_active
    };
  } catch (error) {
    console.error('Get user by token error:', error);
    return null;
  }
}