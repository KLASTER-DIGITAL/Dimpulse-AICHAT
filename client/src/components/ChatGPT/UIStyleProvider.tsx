import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings } from '@shared/schema';

// Определение интерфейса для настроек UI
interface UISettings {
  enabled: boolean;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  elements: {
    roundedCorners: boolean;
    shadows: boolean;
    animations: boolean;
  };
}

// Интерфейс для провайдера UI стилей
interface UIStyleProviderProps {
  children: React.ReactNode;
}

// Настройки по умолчанию
const defaultUISettings: UISettings = {
  enabled: false,
  colors: {
    primary: '#10a37f',
    secondary: '#343541',
    accent: '#202123'
  },
  elements: {
    roundedCorners: true,
    shadows: true,
    animations: true
  }
};

const UIStyleProvider: React.FC<UIStyleProviderProps> = ({ children }) => {
  const [cssVars, setCssVars] = useState<Record<string, string>>({});
  
  // Получаем настройки UI с сервера
  const { data: serverSettings } = useQuery<Settings>({
    queryKey: ['/api/settings']
  });
  
  // Извлекаем UI настройки из полученных данных или используем значения по умолчанию
  const settings = serverSettings?.ui || defaultUISettings;
  
  // Применяем настройки UI к корневому элементу
  useEffect(() => {
    if (!settings || !settings.enabled) {
      // Если настройки отключены, используем стандартные
      return;
    }
    
    // Создаем CSS переменные на основе настроек
    const vars: Record<string, string> = {
      '--primary-color': settings.colors.primary,
      '--secondary-color': settings.colors.secondary,
      '--accent-color': settings.colors.accent,
    };
    
    // Добавляем классы для условных стилей
    if (settings.elements.roundedCorners) {
      vars['--border-radius'] = '0.75rem';
    } else {
      vars['--border-radius'] = '0';
    }
    
    if (settings.elements.shadows) {
      vars['--box-shadow'] = '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)';
    } else {
      vars['--box-shadow'] = 'none';
    }
    
    if (settings.elements.animations) {
      vars['--transition-duration'] = '0.3s';
    } else {
      vars['--transition-duration'] = '0s';
    }
    
    // Применяем переменные к документу
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // Сохраняем переменные в состоянии
    setCssVars(vars);
    
    // Обновляем дополнительные стили на основе настроек UI
    const style = document.createElement('style');
    style.textContent = `
      /* Глобальные стили */
      body {
        --primary-color-transparent: ${settings.colors.primary}33;
      }
      
      /* Стили сообщений */
      .chat-message {
        border-radius: var(--border-radius);
        box-shadow: var(--box-shadow);
        transition: all var(--transition-duration) ease;
      }
      
      /* Стили ввода сообщений */
      .chat-input {
        border-radius: var(--border-radius);
        box-shadow: var(--box-shadow);
        transition: all var(--transition-duration) ease;
      }
      
      /* Стили для сообщений пользователя и ассистента */
      .user-message {
        background-color: var(--secondary-color);
        border-radius: var(--border-radius);
      }
      
      .assistant-message {
        background-color: var(--accent-color);
        border-radius: var(--border-radius);
      }
      
      /* Стили для кнопок */
      button.primary {
        background-color: var(--primary-color);
        border-radius: var(--border-radius);
        box-shadow: var(--box-shadow);
        transition: all var(--transition-duration) ease;
      }
      
      button.primary:hover {
        opacity: 0.9;
        transform: ${settings.elements.animations ? 'translateY(-2px)' : 'none'};
      }
      
      /* Стили для анимации набора текста */
      .typing-animation span {
        background-color: var(--primary-color);
      }
      
      /* Стили для боковой панели */
      .chat-sidebar {
        background-color: var(--accent-color);
        box-shadow: ${settings.elements.shadows ? '0 0 15px rgba(0, 0, 0, 0.1)' : 'none'};
      }
      
      /* Стили для элементов истории чата */
      .chat-history-item {
        border-radius: var(--border-radius);
        transition: all var(--transition-duration) ease;
      }
      
      .chat-history-item:hover {
        background-color: var(--primary-color-transparent);
      }
      
      /* Стили для контейнера ввода */
      .chat-input-container {
        border-radius: var(--border-radius) !important;
        transition: all var(--transition-duration) ease;
        border: 1px solid var(--accent-color);
      }
      
      .chat-input-container:focus-within {
        box-shadow: 0 0 0 2px var(--primary-color);
      }
      
      /* Стилизация иконок и кнопок в сайдбаре */
      #new-chat-button {
        border-radius: var(--border-radius);
        border-color: var(--primary-color);
      }
      
      #new-chat-button:hover {
        background-color: var(--primary-color-transparent);
      }
      
      /* Стилизация дополнительных элементов */
      .user-info {
        border-radius: var(--border-radius);
      }
      
      /* Анимации для интерфейса */
      ${settings.elements.animations ? `
      .chat-message, .chat-input, button.primary {
        transition: all 0.3s ease;
      }
      
      .chat-message:hover {
        transform: translateY(-2px);
      }
      ` : ''}
    `;
    
    // Добавляем стили в head документа
    document.head.appendChild(style);
    
    // Функция очистки при размонтировании
    return () => {
      document.head.removeChild(style);
      Object.keys(vars).forEach(key => {
        root.style.removeProperty(key);
      });
    };
  }, [settings]);
  
  // Провайдер просто рендерит дочерние элементы
  return <>{children}</>;
};

export default UIStyleProvider;