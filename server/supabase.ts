import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Получаем URL и ключ Supabase из переменных окружения
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

// Создаем клиент Supabase
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Проверяем, настроен ли Supabase
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseKey);
};

// Проверка подключения к Supabase
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    // Запрос к системной таблице, чтобы проверить соединение
    const { error } = await supabase.from('_metadata').select('version').limit(1);
    
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