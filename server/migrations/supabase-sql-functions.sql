-- Функция для выполнения произвольного SQL-запроса из API
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

-- Функция для получения статистики использования системы
CREATE OR REPLACE FUNCTION get_usage_stats()
RETURNS JSON AS $$
DECLARE
  total_users INTEGER;
  total_chats INTEGER;
  total_messages INTEGER;
  active_users_24h INTEGER;
  active_chats_24h INTEGER;
  messages_per_day JSON;
  top_chats JSON;
BEGIN
  -- Общее количество пользователей
  SELECT COUNT(*) INTO total_users FROM users;
  
  -- Общее количество чатов
  SELECT COUNT(*) INTO total_chats FROM chats;
  
  -- Общее количество сообщений
  SELECT COUNT(*) INTO total_messages FROM messages;
  
  -- Активные пользователи за последние 24 часа
  SELECT COUNT(*) INTO active_users_24h 
  FROM users 
  WHERE last_active > NOW() - INTERVAL '24 hours';
  
  -- Активные чаты за последние 24 часа
  SELECT COUNT(*) INTO active_chats_24h 
  FROM chats 
  WHERE last_active > NOW() - INTERVAL '24 hours';
  
  -- Количество сообщений по дням (за последнюю неделю)
  SELECT json_agg(msg_stats) INTO messages_per_day
  FROM (
    SELECT 
      TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date,
      COUNT(*) as count
    FROM messages
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY DATE_TRUNC('day', created_at)
  ) as msg_stats;
  
  -- Топ-5 чатов по количеству сообщений
  SELECT json_agg(chat_stats) INTO top_chats
  FROM (
    SELECT 
      c.id as "chatId",
      c.title,
      COUNT(m.id) as "messageCount"
    FROM chats c
    JOIN messages m ON c.id = m.chat_id
    GROUP BY c.id, c.title
    ORDER BY COUNT(m.id) DESC
    LIMIT 5
  ) as chat_stats;
  
  -- Возвращаем статистику в формате JSON
  RETURN json_build_object(
    'totalUsers', total_users,
    'totalChats', total_chats,
    'totalMessages', total_messages,
    'activeUsersLast24h', active_users_24h,
    'activeChatsLast24h', active_chats_24h,
    'messagesPerDay', COALESCE(messages_per_day, '[]'::json),
    'topChats', COALESCE(top_chats, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггерная функция для обновления last_active в чате при добавлении сообщения
CREATE OR REPLACE FUNCTION update_chat_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats
  SET last_active = CURRENT_TIMESTAMP
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления last_active в чате
DROP TRIGGER IF EXISTS trigger_update_chat_last_active ON messages;
CREATE TRIGGER trigger_update_chat_last_active
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_last_active();

-- Получение данных чата с учетом пагинации
CREATE OR REPLACE FUNCTION get_dialog_history(p_limit INTEGER DEFAULT 10, p_offset INTEGER DEFAULT 0)
RETURNS JSON AS $$
DECLARE
  chats_data JSON;
  total_count INTEGER;
BEGIN
  -- Получаем общее количество чатов
  SELECT COUNT(*) INTO total_count FROM chats;
  
  -- Получаем данные чатов с пагинацией
  SELECT json_agg(c) INTO chats_data
  FROM (
    SELECT 
      id,
      title,
      user_id as "userId",
      created_at as "createdAt",
      last_active as "lastActive"
    FROM chats
    ORDER BY last_active DESC
    LIMIT p_limit OFFSET p_offset
  ) c;
  
  -- Возвращаем результат
  RETURN json_build_object(
    'chats', COALESCE(chats_data, '[]'::json),
    'totalCount', total_count
  );
END;
$$ LANGUAGE plpgsql;