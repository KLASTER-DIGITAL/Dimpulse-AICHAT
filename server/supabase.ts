import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Получаем URL и ключ Supabase из переменных окружения
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Переменная для хранения ссылки на Supabase клиент
let supabaseInstance: SupabaseClient | null = null;

// Создаем клиент Supabase только если настроены переменные окружения
try {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing Supabase credentials (SUPABASE_URL, SUPABASE_KEY). Using fallback storage.');
  } else {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}

// Экспортируем клиент Supabase или dummy объект, если клиент не инициализирован
export const supabase: SupabaseClient = supabaseInstance || {
  from: () => ({ 
    select: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
  }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    signIn: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    signOut: () => Promise.resolve({ error: null }),
  },
} as unknown as SupabaseClient;

// Проверяем, настроен ли Supabase
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseKey && supabaseInstance);
};

// Проверка подключения к Supabase
export const testSupabaseConnection = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase is not configured, skipping connection test');
    return false;
  }

  try {
    // Получаем информацию о пользователе для проверки соединения
    const { error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error connecting to Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    return false;
  }
};