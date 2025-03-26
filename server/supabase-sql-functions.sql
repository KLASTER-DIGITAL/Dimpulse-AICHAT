-- SQL функции для работы с данными в Supabase

-- Получение статистики
CREATE OR REPLACE FUNCTION get_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalUsers', get_total_users(),
        'totalChats', get_total_chats(),
        'totalMessages', get_total_messages(),
        'activeUsersLast24h', get_active_users_last_24h(),
        'activeChatsLast24h', get_active_chats_last_24h(),
        'messagesPerDay', (SELECT json_agg(row_to_json(t)) FROM get_messages_per_day(7) t),
        'topChats', (SELECT json_agg(row_to_json(t)) FROM get_top_chats(5) t)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Получение чатов пользователя
CREATE OR REPLACE FUNCTION get_user_chats(user_id INTEGER)
RETURNS SETOF chats AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM chats 
    WHERE chats.user_id = user_id
    ORDER BY last_active DESC;
END;
$$ LANGUAGE plpgsql;

-- Получение всех чатов (для неавторизованных пользователей)
CREATE OR REPLACE FUNCTION get_anonymous_chats()
RETURNS SETOF chats AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM chats 
    WHERE chats.user_id IS NULL
    ORDER BY last_active DESC;
END;
$$ LANGUAGE plpgsql;

-- Получение сообщений чата
CREATE OR REPLACE FUNCTION get_chat_messages(chat_id_param TEXT)
RETURNS SETOF messages AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM messages 
    WHERE messages.chat_id = chat_id_param
    ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Обновление названия чата
CREATE OR REPLACE FUNCTION update_chat_title(chat_id_param TEXT, new_title TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE chats
    SET title = new_title, last_active = NOW()
    WHERE id = chat_id_param;
END;
$$ LANGUAGE plpgsql;

-- Получение диалогов с пагинацией
CREATE OR REPLACE FUNCTION get_dialog_history(limit_count INTEGER, offset_count INTEGER)
RETURNS TABLE(chats JSON, total_count BIGINT) AS $$
DECLARE
    total BIGINT;
BEGIN
    SELECT COUNT(*) INTO total FROM chats;
    
    RETURN QUERY
    SELECT 
        json_agg(row_to_json(c)) as chats,
        total as total_count
    FROM (
        SELECT * FROM chats 
        ORDER BY last_active DESC
        LIMIT limit_count OFFSET offset_count
    ) c;
END;
$$ LANGUAGE plpgsql;