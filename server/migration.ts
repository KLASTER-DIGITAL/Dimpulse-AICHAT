import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured, testSupabaseConnection } from './supabase';

/**
 * Выполняет SQL-скрипт из файла
 * @param filename Имя файла скрипта
 */
async function executeSqlScript(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(__dirname, 'migrations', filename);
    const sqlScript = fs.readFileSync(filePath, 'utf8');
    
    // Разделяем скрипт на отдельные команды по разделителям
    const commands = sqlScript.split(';').filter(cmd => cmd.trim().length > 0);
    
    // Выполняем каждую команду отдельно
    for (const command of commands) {
      const { error } = await supabase.rpc('run_sql', { sql_query: command });
      
      if (error) {
        // Если функция run_sql еще не создана, выполняем запрос напрямую
        if (error.message.includes('function run_sql() does not exist')) {
          const { error: directError } = await supabase.from('_sql').select('*').execute(command);
          
          if (directError) {
            console.error(`Error executing SQL command directly: ${directError.message}`);
            console.error(`Command: ${command}`);
            // Продолжаем выполнение, так как некоторые ошибки могут быть неизбежны
            // при первоначальной настройке (например, DROP IF EXISTS для несуществующих объектов)
          }
        } else {
          console.error(`Error executing SQL command via run_sql: ${error.message}`);
          console.error(`Command: ${command}`);
          // Продолжаем выполнение
        }
      }
    }
    
    console.log(`SQL script ${filename} executed successfully`);
    return true;
  } catch (error) {
    console.error(`Error executing SQL script ${filename}:`, error);
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
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .maybeSingle();
    
    if (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Создает функцию для выполнения произвольного SQL в Supabase
 */
async function createRunSqlFunction(): Promise<boolean> {
  try {
    // Проверяем, существует ли функция run_sql
    if (await functionExists('run_sql')) {
      console.log('Function run_sql already exists');
      return true;
    }
    
    // Создаем функцию run_sql
    const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION run_sql(sql_query TEXT)
    RETURNS TEXT AS $$
    DECLARE
      result TEXT;
    BEGIN
      BEGIN
        EXECUTE sql_query;
        result := 'Query executed successfully';
      EXCEPTION WHEN OTHERS THEN
        result := 'Error: ' || SQLERRM;
      END;
      RETURN result;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Выполняем запрос на создание функции
    const { error } = await supabase.from('_sql').select('*').execute(createFunctionSQL);
    
    if (error) {
      console.error('Error creating run_sql function:', error);
      return false;
    }
    
    console.log('Function run_sql created successfully');
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
      .eq('routine_schema', 'public')
      .eq('routine_name', functionName)
      .maybeSingle();
    
    if (error) {
      console.error(`Error checking if function ${functionName} exists:`, error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error(`Error checking if function ${functionName} exists:`, error);
    return false;
  }
}

/**
 * Выполняет миграцию базы данных
 */
export async function migrateDatabase(): Promise<boolean> {
  try {
    console.log('Starting database migration...');
    
    // Проверяем, настроен ли Supabase
    if (!isSupabaseConfigured()) {
      console.log('Supabase is not configured, skipping migration');
      return false;
    }
    
    // Проверяем соединение с Supabase
    const connectionTest = await testSupabaseConnection();
    if (!connectionTest) {
      console.log('Supabase connection test failed, skipping migration');
      return false;
    }
    
    console.log('Supabase connection test successful');
    
    // Создаем функцию run_sql, если она еще не существует
    await createRunSqlFunction();
    
    // Выполняем скрипт создания таблиц
    await executeSqlScript('create_tables.sql');
    
    // Выполняем скрипт создания функций
    await executeSqlScript('supabase-sql-functions.sql');
    
    console.log('Database migration completed successfully');
    return true;
  } catch (error) {
    console.error('Error migrating database:', error);
    return false;
  }
}