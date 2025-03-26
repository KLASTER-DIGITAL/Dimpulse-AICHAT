-- Функция для создания таблицы, если она не существует
CREATE OR REPLACE FUNCTION create_table_if_not_exists(table_name text, columns text)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1) THEN
    EXECUTE format('CREATE TABLE %I (%s)', table_name, columns);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения количества сообщений по дням
CREATE OR REPLACE FUNCTION get_messages_per_day(messages_table text)
RETURNS TABLE (date text, count bigint) AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT 
      TO_CHAR(created_at, ''YYYY-MM-DD'') as date,
      COUNT(*) as count
    FROM 
      %I
    GROUP BY 
      date
    ORDER BY 
      date ASC
  ', messages_table);
END;
$$ LANGUAGE plpgsql;

-- Функция для получения топ чатов по количеству сообщений
CREATE OR REPLACE FUNCTION get_top_chats(messages_table text, chats_table text, limit_count integer)
RETURNS TABLE (chat_id text, title text, message_count bigint) AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT 
      m.chat_id,
      c.title,
      COUNT(*) as message_count
    FROM 
      %I m
    JOIN 
      %I c ON m.chat_id = c.id
    GROUP BY 
      m.chat_id, c.title
    ORDER BY 
      message_count DESC
    LIMIT %s
  ', messages_table, chats_table, limit_count);
END;
$$ LANGUAGE plpgsql;

-- Функция для загрузки файла в хранилище Supabase
CREATE OR REPLACE FUNCTION upload_file_to_storage(bucket_name text, file_path text, file_content bytea, content_type text)
RETURNS text AS $$
DECLARE
  storage_path text;
BEGIN
  -- Проверяем существование бакета
  IF NOT EXISTS (
    SELECT FROM storage.buckets WHERE name = bucket_name
  ) THEN
    -- Создаем бакет если не существует
    INSERT INTO storage.buckets (id, name)
    VALUES (bucket_name, bucket_name);
  END IF;
  
  -- Генерируем уникальный путь для файла
  storage_path := file_path;
  
  -- Загружаем файл в хранилище
  INSERT INTO storage.objects (
    bucket_id, 
    name, 
    owner, 
    size, 
    mime_type,
    content
  )
  VALUES (
    bucket_name,
    storage_path,
    auth.uid(),
    octet_length(file_content),
    content_type,
    file_content
  );
  
  RETURN storage_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;