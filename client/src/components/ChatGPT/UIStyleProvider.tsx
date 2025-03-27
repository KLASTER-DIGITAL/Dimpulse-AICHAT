import React, { useEffect, useState } from 'react';
import { Settings } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Компонент UIStyleProvider применяет глобальные стили из настроек UI
 * Поддерживает разные настройки для мобильных и десктопных устройств
 */
const UIStyleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const result = await apiRequest('/api/settings');
      return result as Settings;
    },
  });
  
  const isMobile = useIsMobile();
  const [styleElement, setStyleElement] = useState<HTMLStyleElement | null>(null);
  
  useEffect(() => {
    // Создаем элемент стиля, если его еще нет
    if (!styleElement) {
      const element = document.createElement('style');
      element.setAttribute('id', 'ui-style-provider');
      document.head.appendChild(element);
      setStyleElement(element);
      return () => {
        document.head.removeChild(element);
      };
    }
  }, []);
  
  useEffect(() => {
    if (!settings?.ui.enabled || !styleElement) return;
    
    // Выбираем настройки типографики в зависимости от типа устройства
    const typography = isMobile 
      ? settings.ui.typography?.mobile 
      : settings.ui.typography?.desktop;
    
    // Создаем CSS правила
    const rules = [];
    
    // Применяем цвета
    if (settings.ui.colors) {
      rules.push(`
        :root {
          --primary-color: ${settings.ui.colors.primary};
          --secondary-color: ${settings.ui.colors.secondary};
          --accent-color: ${settings.ui.colors.accent};
        }
      `);
    }
    
    // Применяем глобальные стили типографики
    if (typography) {
      const selector = isMobile ? '.chat-container, .chat-message' : 'body, .chat-container, .chat-message';
      
      if (typography.fontSize) {
        rules.push(`
          ${selector} {
            font-size: ${typography.fontSize}px;
          }
        `);
      }
      
      if (typography.fontFamily) {
        rules.push(`
          ${selector} {
            font-family: ${typography.fontFamily};
          }
        `);
      }
      
      if (typography.spacing) {
        rules.push(`
          ${selector} {
            line-height: ${typography.spacing};
          }
        `);
      }
    }
    
    // Стили элементов
    if (settings.ui.elements) {
      if (settings.ui.elements.roundedCorners) {
        rules.push(`
          .chat-message, .chat-input, button {
            border-radius: 8px;
          }
        `);
      } else {
        rules.push(`
          .chat-message, .chat-input, button {
            border-radius: 0;
          }
        `);
      }
      
      if (settings.ui.elements.shadows) {
        rules.push(`
          .chat-message, .chat-input, button {
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
        `);
      } else {
        rules.push(`
          .chat-message, .chat-input, button {
            box-shadow: none;
          }
        `);
      }
      
      if (settings.ui.elements.animations) {
        rules.push(`
          button, .chat-input {
            transition: all 0.2s ease;
          }
          button:hover {
            transform: translateY(-2px);
          }
        `);
      } else {
        rules.push(`
          button, .chat-input {
            transition: none;
          }
          button:hover {
            transform: none;
          }
        `);
      }
    }
    
    // Устанавливаем все стили
    styleElement.textContent = rules.join('\n');
    
  }, [settings, isMobile, styleElement]);
  
  return <>{children}</>;
};

export default UIStyleProvider;