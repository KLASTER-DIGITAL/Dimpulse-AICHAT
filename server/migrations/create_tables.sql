-- Проверяем, существует ли таблица users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255), -- Добавляем поле email для поддержки Supabase Auth
  password VARCHAR(255) NOT NULL, -- Используется только для совместимости, не хранит реальные пароли
  last_active TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Проверяем, существует ли таблица chats
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Проверяем, существует ли таблица messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Проверяем, существует ли таблица files
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Проверяем, существует ли таблица settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  webhook_url TEXT,
  webhook_enabled BOOLEAN DEFAULT TRUE,
  iframe_enabled BOOLEAN DEFAULT FALSE,
  iframe_theme VARCHAR(20) DEFAULT 'dark',
  widget_enabled BOOLEAN DEFAULT TRUE,
  widget_position VARCHAR(10) DEFAULT 'left',
  widget_theme VARCHAR(20) DEFAULT 'dark',
  widget_font_size INTEGER DEFAULT 12,
  widget_width INTEGER DEFAULT 400,
  widget_height INTEGER DEFAULT 500,
  widget_text TEXT DEFAULT 'Чем еще могу помочь?',
  ui_enabled BOOLEAN DEFAULT FALSE,
  ui_color_primary VARCHAR(20) DEFAULT '#19c37d',
  ui_color_secondary VARCHAR(20) DEFAULT '#f9fafb',
  ui_color_accent VARCHAR(20) DEFAULT '#6366f1',
  ui_rounded_corners BOOLEAN DEFAULT TRUE,
  ui_shadows BOOLEAN DEFAULT TRUE,
  ui_animations BOOLEAN DEFAULT TRUE,
  db_enabled BOOLEAN DEFAULT TRUE,
  db_type VARCHAR(20) DEFAULT 'supabase',
  supabase_tables_messages VARCHAR(50) DEFAULT 'messages',
  supabase_tables_chats VARCHAR(50) DEFAULT 'chats',
  supabase_tables_users VARCHAR(50) DEFAULT 'users',
  supabase_tables_files VARCHAR(50) DEFAULT 'files',
  supabase_schema VARCHAR(50) DEFAULT 'public',
  supabase_auto_migrate BOOLEAN DEFAULT TRUE
);

-- Добавляем демо-данные, если таблица settings пуста
INSERT INTO settings (
  webhook_url,
  webhook_enabled,
  iframe_enabled,
  iframe_theme,
  widget_enabled,
  widget_position,
  widget_theme,
  widget_font_size,
  widget_width,
  widget_height,
  widget_text,
  ui_enabled,
  ui_color_primary,
  ui_color_secondary,
  ui_color_accent,
  ui_rounded_corners,
  ui_shadows,
  ui_animations,
  db_enabled,
  db_type
)
SELECT
  'https://n8n.klaster.digital/webhook-test/4a1fed67-dcfb-4eb8-a71b-d47b1d651509',
  TRUE,
  FALSE,
  'dark',
  TRUE,
  'left',
  'dark',
  12,
  400,
  500,
  'Чем еще могу помочь?',
  FALSE,
  '#19c37d',
  '#f9fafb',
  '#6366f1',
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  'supabase'
WHERE NOT EXISTS (SELECT 1 FROM settings);

-- Добавляем админского пользователя, если таблица users пуста
INSERT INTO users (username, email, password)
SELECT 'admin', 'admin@example.com', 'admin123'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- Создаем индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_files_message_id ON files(message_id);