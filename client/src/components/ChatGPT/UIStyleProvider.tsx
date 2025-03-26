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
      .chat-message {
        border-radius: var(--border-radius);
        box-shadow: var(--box-shadow);
        transition: all var(--transition-duration) ease;
      }
      
      .chat-input {
        border-radius: var(--border-radius);
        box-shadow: var(--box-shadow);
        transition: all var(--transition-duration) ease;
      }
      
      .user-message {
        background-color: var(--secondary-color);
      }
      
      .assistant-message {
        background-color: var(--accent-color);
      }
      
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
      
      .typing-animation span {
        background-color: var(--primary-color);
      }
      
      .chat-sidebar {
        background-color: var(--accent-color);
      }
      
      .chat-input-container {
        border-radius: var(--border-radius);
        transition: all var(--transition-duration) ease;
      }
      
      .chat-input-container:focus-within {
        box-shadow: 0 0 0 2px var(--primary-color);
      }
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