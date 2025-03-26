import { supabase } from './supabase';
import { readFileSync } from 'fs';
import { join } from 'path';
import { isSupabaseConfigured } from './supabase';

/**
 * Выполняет SQL-скрипт из файла
 * @param filename Имя файла скрипта
 */
async function executeSqlScript(filename: string): Promise<boolean> {
  try {
    const filePath = join(__dirname, 'migrations', filename);
    const sql = readFileSync(filePath, 'utf8');
    
    console.log(`Executing SQL script: ${filename}`);
    
    // Разделяем SQL-скрипт на отдельные операторы
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Выполняем каждый оператор по отдельности
    for (const statement of statements) {
      const { error } = await supabase.rpc('run_sql', { sql: statement });
      
      if (error) {
        console.error(`Error executing SQL statement: ${error.message}`);
        console.error(statement);
        throw error;
      }
    }
    
    console.log(`SQL script ${filename} executed successfully`);
    return true;
  } catch (error) {
    console.error(`Failed to execute SQL script ${filename}:`, error);
    return false;
  }
}

/**
 * Проверяет существование таблицы в базе данных
 * @param tableName Имя таблицы
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', tableName)
      .eq('table_schema', 'public');
    
    if (error) {
      console.error('Error checking table existence:', error);
      return false;
    }
    
    return Boolean(data && data.length > 0);
  } catch (error) {
    console.error('Error checking table existence:', error);
    return false;
  }
}

/**
 * Создает функцию для выполнения произвольного SQL в Supabase
 */
async function createRunSqlFunction(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('create_run_sql_function');
    
    if (error) {
      // Возможно функция уже существует, проверяем это
      if (error.message && error.message.includes('already exists')) {
        console.log('run_sql function already exists');
        return true;
      }
      
      console.error('Error creating run_sql function:', error);
      
      // Создаем функцию напрямую, если RPC вызов не работает
      const { error: directError } = await supabase.rpc('run_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION run_sql(sql text)
          RETURNS void
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            EXECUTE sql;
          END;
          $$;
        `
      });
      
      if (directError) {
        console.error('Error creating run_sql function directly:', directError);
        return false;
      }
      
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Error creating run_sql function:', error);
    return false;
  }
}

/**
 * Проверяет наличие функции в базе данных
 * @param functionName Имя функции
 */
async function functionExists(functionName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', functionName)
      .eq('routine_schema', 'public');
    
    if (error) {
      console.error(`Error checking function existence (${functionName}):`, error);
      return false;
    }
    
    return Boolean(data && data.length > 0);
  } catch (error) {
    console.error(`Error checking function existence (${functionName}):`, error);
    return false;
  }
}

/**
 * Выполняет миграцию базы данных
 */
export async function migrateDatabase(): Promise<boolean> {
  try {
    // Проверяем, настроен ли Supabase
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured, skipping migration');
      return false;
    }
    
    console.log('Starting database migration...');
    
    // Проверяем соединение с Supabase
    const { data: testData, error: testError } = await supabase
      .from('_metadata')
      .select('version')
      .limit(1);
    
    if (testError) {
      console.error('Supabase connection test failed:', testError);
      return false;
    }
    
    console.log('Supabase connection successful');
    
    // Создаем функцию run_sql если не существует
    const runSqlExists = await functionExists('run_sql');
    if (!runSqlExists) {
      const created = await createRunSqlFunction();
      if (!created) {
        console.error('Failed to create run_sql function, aborting migration');
        return false;
      }
    }
    
    // Проверяем, существуют ли уже таблицы
    const usersTableExists = await tableExists('users');
    
    if (usersTableExists) {
      console.log('Tables already exist, skipping structure creation');
    } else {
      // Создаем таблицы и функции
      const success = await executeSqlScript('create_tables.sql');
      if (!success) {
        console.error('Failed to create tables, aborting migration');
        return false;
      }
    }
    
    // Создаем SQL-функции для статистики и операций с данными
    const funcSuccess = await executeSqlScript('supabase-sql-functions.sql');
    if (!funcSuccess) {
      console.error('Failed to create SQL functions, but tables might have been created');
      return false;
    }
    
    console.log('Database migration completed successfully');
    return true;
  } catch (error) {
    console.error('Database migration failed:', error);
    return false;
  }
}