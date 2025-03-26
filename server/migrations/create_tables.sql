-- Создание таблиц для приложения ChatGPT-подобного приложения

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Таблица чатов
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  user_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Таблица сообщений
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' или 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

-- Таблица файлов (для хранения прикрепленных файлов)
CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  message_id INTEGER,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content TEXT NOT NULL, -- Base64-encoded content
  size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Функции для статистики использования

-- Функция для получения общего количества пользователей
CREATE OR REPLACE FUNCTION get_total_users() RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM users);
END;
$$ LANGUAGE plpgsql;

-- Функция для получения общего количества чатов
CREATE OR REPLACE FUNCTION get_total_chats() RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM chats);
END;
$$ LANGUAGE plpgsql;

-- Функция для получения общего количества сообщений
CREATE OR REPLACE FUNCTION get_total_messages() RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM messages);
END;
$$ LANGUAGE plpgsql;

-- Функция для получения количества активных пользователей за последние 24 часа
CREATE OR REPLACE FUNCTION get_active_users_last_24h() RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM users WHERE last_active > NOW() - INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql;

-- Функция для получения количества активных чатов за последние 24 часа
CREATE OR REPLACE FUNCTION get_active_chats_last_24h() RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM chats WHERE last_active > NOW() - INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql;

-- Функция для получения количества сообщений по дням
CREATE OR REPLACE FUNCTION get_messages_per_day(days INTEGER) RETURNS TABLE(date TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(created_at::date, 'YYYY-MM-DD') as date,
    COUNT(*) as count
  FROM messages
  WHERE created_at > NOW() - (days || ' days')::INTERVAL
  GROUP BY created_at::date
  ORDER BY created_at::date;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения топ чатов по количеству сообщений
CREATE OR REPLACE FUNCTION get_top_chats(limit_count INTEGER) RETURNS TABLE(chat_id TEXT, title TEXT, message_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.chat_id,
    c.title,
    COUNT(*) as message_count
  FROM messages m
  JOIN chats c ON m.chat_id = c.id
  GROUP BY m.chat_id, c.title
  ORDER BY message_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Создадим индексы для повышения производительности
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);
CREATE INDEX IF NOT EXISTS idx_chats_last_active ON chats(last_active);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);