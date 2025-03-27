import { useState, useEffect, useRef, useCallback } from 'react';
import { Settings } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface LiveStyleEditorProps {
  initialSettings: Settings;
  isActive: boolean;
  onClose: () => void;
}

interface ElementStyle {
  fontSize: number;
  color: string;
  alignment: 'left' | 'center' | 'right';
  spacing: number;
  opacity: number;
  rotate: number;
  fit: 'small' | 'medium' | 'large';
  effectType: 'none' | 'shadow' | 'glow' | 'outline';
}

interface EditableElement {
  element: HTMLElement;
  type: string;
  style: ElementStyle;
  originalStyles: {
    fontSize: string;
    color: string;
    textAlign: string;
    lineHeight: string;
    opacity: string;
    transform: string;
    width: string;
    boxShadow: string;
    textShadow: string;
    outline: string;
  };
}

const LiveStyleEditor = ({ initialSettings, isActive, onClose }: LiveStyleEditorProps) => {
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [activeElement, setActiveElement] = useState<EditableElement | null>(null);
  const [currentSettings, setCurrentSettings] = useState<Settings>(initialSettings);
  const [editorPosition, setEditorPosition] = useState({ top: 0, left: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const editorRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Функция для загрузки и применения настроек из хранилища (localStorage, sessionStorage, backend)
  const loadAndApplyStoredSettings = useCallback(async () => {
    let settings = initialSettings;
    let settingsUpdated = false;
    
    console.log('Загрузка сохраненных настроек стилей...');
    
    try {
      // Приоритет 1: localStorage (локальное хранилище браузера)
      const localSettings = localStorage.getItem('liveStyleEditorSettings');
      if (localSettings) {
        try {
          const parsedLocalSettings = JSON.parse(localSettings) as Settings;
          if (parsedLocalSettings.ui) {
            settings = parsedLocalSettings;
            settingsUpdated = true;
            console.log('✅ Настройки успешно загружены из localStorage');
          }
        } catch (e) {
          console.warn('⚠️ Ошибка при парсинге настроек из localStorage:', e);
        }
      }
      
      // Приоритет 2: Если не удалось из localStorage, пробуем из sessionStorage
      if (!settingsUpdated) {
        const backupSettings = sessionStorage.getItem('liveStyleEditorSettings_backup');
        if (backupSettings) {
          try {
            const parsedBackupSettings = JSON.parse(backupSettings) as Settings;
            if (parsedBackupSettings.ui) {
              settings = parsedBackupSettings;
              settingsUpdated = true;
              console.log('✅ Настройки успешно загружены из резервной копии в sessionStorage');
            }
          } catch (e) {
            console.warn('⚠️ Ошибка при парсинге настроек из sessionStorage:', e);
          }
        }
      }
      
      // Приоритет 3: Если все еще нет настроек, пробуем загрузить с сервера 
      if (!settingsUpdated) {
        try {
          const response = await fetch('/api/settings', {
            method: 'GET',
            headers: {
              ...(localStorage.getItem('authToken') ? { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } : {})
            },
            credentials: 'include'
          });
          
          if (response.ok) {
            const serverSettings = await response.json();
            if (serverSettings && serverSettings.ui) {
              settings = serverSettings;
              settingsUpdated = true;
              
              // Сохраняем в localStorage для быстрого доступа в будущем
              localStorage.setItem('liveStyleEditorSettings', JSON.stringify(serverSettings));
              console.log('✅ Настройки успешно загружены с сервера и сохранены в localStorage');
            }
          } else {
            console.warn(`⚠️ Не удалось загрузить настройки с сервера: ${response.status} ${response.statusText}`);
          }
        } catch (e) {
          console.warn('⚠️ Ошибка при загрузке настроек с сервера:', e);
        }
      }
      
      // Если удалось загрузить настройки из любого источника, применяем их
      if (settingsUpdated) {
        setCurrentSettings(settings);
        
        // Применяем настройки к DOM
        applySettingsToDOM(settings);
        console.log('✅ Настройки успешно применены к DOM');
      } else {
        console.log('ℹ️ Не найдено сохраненных настроек, используются настройки по умолчанию');
      }
    } catch (e) {
      console.error('❌ Критическая ошибка при загрузке настроек:', e);
    }
    
    return { settingsUpdated, settings };
  }, [initialSettings]);
  
  // При инициализации загружаем и применяем сохраненные настройки
  useEffect(() => {
    // Загружаем настройки при монтировании компонента
    loadAndApplyStoredSettings();
    
    // Также применяем настройки при каждом обновлении страницы
    const handlePageRefresh = () => {
      loadAndApplyStoredSettings();
    };
    
    // Слушаем события загрузки страницы
    window.addEventListener('load', handlePageRefresh);
    
    return () => {
      window.removeEventListener('load', handlePageRefresh);
    };
  }, [loadAndApplyStoredSettings]);

  // Поддержка разных размеров для десктопа и мобильных устройств
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Убедимся, что есть виджет в настройках
  useEffect(() => {
    if (!currentSettings.ui.widget) {
      const updatedSettings = { ...currentSettings };
      if (!updatedSettings.ui) {
        updatedSettings.ui = {
          enabled: true,
          colors: { primary: '#19c37d', secondary: '#6b7280', accent: '#3b82f6' },
          elements: { roundedCorners: true, shadows: true, animations: true }
        };
      }
      
      updatedSettings.ui.widget = {
        title: 'AI Ассистент',
        backgroundColor: '#1e1e1e',
        headerColor: '#272727',
        textColor: '#ffffff',
        buttonColor: '#19c37d',
        pulsation: false
      };
      
      setCurrentSettings(updatedSettings);
    }
  }, [currentSettings]);

  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

  // Создаем объект с информацией о редактируемом элементе
  const createEditableElement = (element: HTMLElement): EditableElement => {
    const computedStyle = window.getComputedStyle(element);
    const fontSize = parseInt(computedStyle.fontSize);
    const color = computedStyle.color;
    const textAlign = computedStyle.textAlign as 'left' | 'center' | 'right';
    const lineHeight = parseFloat(computedStyle.lineHeight) / fontSize;
    const opacity = parseFloat(computedStyle.opacity) * 100;
    const transform = computedStyle.transform;
    const rotate = transform.includes('rotate') ? 
      parseInt(transform.split('rotate(')[1]) : 0;
    
    // Определяем тип элемента
    let type = 'text';
    if (element.tagName.toLowerCase() === 'button') type = 'button';
    else if (element.classList.contains('chat-message')) type = 'message';
    else if (element.classList.contains('user-message')) type = 'user-message';
    else if (element.classList.contains('assistant-message')) type = 'assistant-message';
    else if (element.classList.contains('typing-animation')) type = 'typing';
    
    // Хранение оригинальных стилей
    const originalStyles = {
      fontSize: computedStyle.fontSize,
      color: computedStyle.color,
      textAlign: computedStyle.textAlign,
      lineHeight: computedStyle.lineHeight,
      opacity: computedStyle.opacity,
      transform: computedStyle.transform,
      width: computedStyle.width,
      boxShadow: computedStyle.boxShadow,
      textShadow: computedStyle.textShadow,
      outline: computedStyle.outline
    };
    
    // Определяем текущие установленные значения
    let fit: 'small' | 'medium' | 'large' = 'medium';
    if (element.classList.contains('fit-small')) fit = 'small';
    else if (element.classList.contains('fit-large')) fit = 'large';
    
    // Определяем текущий эффект
    let effectType: 'none' | 'shadow' | 'glow' | 'outline' = 'none';
    if (computedStyle.boxShadow !== 'none') effectType = 'shadow';
    else if (computedStyle.textShadow !== 'none') effectType = 'glow';
    else if (computedStyle.outline !== 'none') effectType = 'outline';
    
    return {
      element,
      type,
      style: {
        fontSize,
        color,
        alignment: textAlign,
        spacing: Math.round(lineHeight * 100) / 100,
        opacity,
        rotate,
        fit,
        effectType
      },
      originalStyles
    };
  };
  
  // Позиционируем панель редактирования рядом с элементом
  const positionEditor = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Базовое позиционирование
    let top = rect.bottom + 10;
    let left = rect.left;
    
    // Проверяем, поместится ли редактор снизу
    if (top + 400 > viewportHeight) {
      top = Math.max(10, rect.top - 410); // Размещаем сверху с отступом 400px
    }
    
    // Проверяем, не выйдет ли редактор за правый край
    if (left + 300 > viewportWidth) {
      left = Math.max(10, viewportWidth - 310);
    }
    
    setEditorPosition({ top, left });
  };

  useEffect(() => {
    if (!isActive) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Проверяем, не находится ли элемент внутри редактора
      if (editorRef.current && (editorRef.current === target || editorRef.current.contains(target))) {
        return; // Не выделяем элементы внутри редактора
      }
      
      // Проверяем, не является ли элемент частью виджета для сайта
      const isWidgetElement = target.closest('.website-widget-preview') !== null;
      
      const editableSelectors = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'button', 'input', 'textarea',
        '.chat-message', '.user-message', '.assistant-message', '.typing-animation', '.primary',
        '.widget-preview-container', '.widget-button', '.widget-header', '.widget-body'
      ];
      
      // Проверяем, что элемент подходит под один из селекторов и содержит текст
      // или это виджет для сайта, который тоже можно стилизовать
      const isTextElement = editableSelectors.some(selector => {
        if (selector.startsWith('.')) {
          return target.classList.contains(selector.substring(1));
        } else {
          return target.tagName.toLowerCase() === selector;
        }
      }) && (target.innerText.trim().length > 0 || target.tagName.toLowerCase() === 'button');
      
      // Элемент редактируемый если это текстовый элемент или виджет
      const isEditable = isTextElement || isWidgetElement;
      
      if (isEditable) {
        setHoveredElement(target);
        
        // Добавляем подсветку элемента
        target.style.outline = '2px dashed #19c37d';
        target.style.outlineOffset = '2px';
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (hoveredElement === target) {
        setHoveredElement(null);
        
        // Убираем подсветку, если элемент не активный
        if (!activeElement || activeElement.element !== target) {
          target.style.outline = '';
          target.style.outlineOffset = '';
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!hoveredElement) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      // Убираем выделение с предыдущего активного элемента
      if (activeElement && activeElement.element !== hoveredElement) {
        activeElement.element.style.outline = '';
        activeElement.element.style.outlineOffset = '';
      }
      
      // Если элемент уже активен, снимаем выделение
      if (activeElement && activeElement.element === hoveredElement) {
        setActiveElement(null);
        hoveredElement.style.outline = '';
        hoveredElement.style.outlineOffset = '';
        return;
      }
      
      // Создаем объект редактируемого элемента
      const newActiveElement = createEditableElement(hoveredElement);
      setActiveElement(newActiveElement);
      
      // Добавляем постоянную подсветку для активного элемента
      hoveredElement.style.outline = '2px solid #19c37d';
      hoveredElement.style.outlineOffset = '2px';
      
      // Позиционируем панель редактирования рядом с элементом
      positionEditor(hoveredElement);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick);

    // Обработчик для закрытия редактора при клике вне редактора и активного элемента
    const handleClickOutside = (e: MouseEvent) => {
      if (activeElement && 
          e.target !== activeElement.element && 
          !activeElement.element.contains(e.target as Node) &&
          editorRef.current && 
          !editorRef.current.contains(e.target as Node)) {
        // Убираем выделение с активного элемента
        activeElement.element.style.outline = '';
        activeElement.element.style.outlineOffset = '';
        setActiveElement(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('click', handleClickOutside);
      
      // Убираем все выделения при деактивации
      document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, button, input, textarea').forEach((el) => {
        (el as HTMLElement).style.outline = '';
        (el as HTMLElement).style.outlineOffset = '';
      });
    };
  }, [isActive, hoveredElement, activeElement]);

  // Применяем стиль к элементу
  const applyStyle = (element: HTMLElement, style: Partial<ElementStyle>) => {
    if (style.fontSize !== undefined) {
      element.style.fontSize = `${style.fontSize}px`;
    }
    
    if (style.color !== undefined) {
      element.style.color = style.color;
    }
    
    if (style.alignment !== undefined) {
      element.style.textAlign = style.alignment;
    }
    
    if (style.spacing !== undefined) {
      element.style.lineHeight = style.spacing.toString();
    }
    
    if (style.opacity !== undefined) {
      element.style.opacity = (style.opacity / 100).toString();
    }
    
    if (style.rotate !== undefined) {
      element.style.transform = `rotate(${style.rotate}deg)`;
    }
    
    if (style.fit !== undefined) {
      // Удаляем предыдущие классы размеров
      element.classList.remove('fit-small', 'fit-medium', 'fit-large');
      element.classList.add(`fit-${style.fit}`);
      
      // Применяем размеры в зависимости от fit
      switch (style.fit) {
        case 'small':
          element.style.width = '70%';
          break;
        case 'medium':
          element.style.width = '85%';
          break;
        case 'large':
          element.style.width = '100%';
          break;
      }
    }
    
    if (style.effectType !== undefined) {
      // Сбросить все эффекты
      element.style.boxShadow = 'none';
      element.style.textShadow = 'none';
      
      // Применить выбранный эффект
      switch (style.effectType) {
        case 'shadow':
          element.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
          break;
        case 'glow':
          element.style.textShadow = '0 0 8px rgba(25, 195, 125, 0.8)';
          break;
        case 'outline':
          element.style.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
          break;
      }
    }
  };

  // Обновить стиль активного элемента
  const updateElementStyle = (property: keyof ElementStyle, value: any) => {
    if (!activeElement) return;
    
    const newStyle = { ...activeElement.style, [property]: value };
    const newActiveElement = { ...activeElement, style: newStyle };
    
    // Применяем стиль
    applyStyle(activeElement.element, { [property]: value });
    
    // Обновляем состояние
    setActiveElement(newActiveElement);
    
    // Обновляем изменения в глобальных настройках UI, но НЕ сохраняем автоматически
    if (property === 'fontSize' && activeElement.type === 'text') {
      // Обновить размер шрифта в настройках для разных устройств
      const updatedSettings = { ...currentSettings };
      
      // Убедимся, что объект typography существует
      if (!updatedSettings.ui.typography) {
        updatedSettings.ui = {
          ...updatedSettings.ui,
          typography: {
            desktop: { fontSize: undefined, fontFamily: undefined, spacing: undefined },
            mobile: { fontSize: undefined, fontFamily: undefined, spacing: undefined }
          }
        };
      }
      
      if (isMobileView) {
        // Обновляем размер для мобильных устройств
        updatedSettings.ui.typography = {
          ...updatedSettings.ui.typography,
          mobile: {
            ...(updatedSettings.ui.typography?.mobile || {}),
            fontSize: value
          }
        };
      } else {
        // Обновляем размер для десктопа
        updatedSettings.ui.typography = {
          ...updatedSettings.ui.typography,
          desktop: {
            ...(updatedSettings.ui.typography?.desktop || {}),
            fontSize: value
          }
        };
      }
      
      // Только обновляем состояние, НЕ сохраняем в localStorage или на сервер
      setCurrentSettings(updatedSettings);
      // Удалено автоматическое сохранение: saveSettings(updatedSettings);
    }
  };

  // Обновить глобальные настройки UI
  const updateSettingsProperty = (property: string, value: any) => {
    // Создаем копию текущих настроек
    const newSettings = { ...currentSettings };
    
    // Разбиваем путь к свойству на части
    const path = property.split('.');
    
    // Обновляем значение по указанному пути
    let target = newSettings as any;
    for (let i = 0; i < path.length - 1; i++) {
      if (!target[path[i]]) {
        target[path[i]] = {};
      }
      target = target[path[i]];
    }
    target[path[path.length - 1]] = value;
    
    // Обновляем состояние, НО не сохраняем автоматически
    setCurrentSettings(newSettings);
    
    // Применяем настройки к DOM, чтобы пользователь видел эффект
    applySettingsToDOM(newSettings);
    
    // Сохранение произойдет только при явном нажатии кнопки "Сохранить"
    // saveSettings(newSettings); - удалено автоматическое сохранение
  };

  const saveSettings = async (settings: Settings) => {
    // Создаем состояние для отслеживания процесса сохранения
    let serverSaveSuccess = false;
    let localSaveSuccess = false;
    
    // ВАЖНО: Немедленно применяем настройки к DOM, чтобы пользователь видел эффект
    try {
      applySettingsToDOM(settings);
      console.log('Настройки успешно применены к DOM');
    } catch (e) {
      console.error('Ошибка при применении настроек к DOM:', e);
    }
    
    // Шаг 1: Сохраняем в localStorage для надежности (даже если сервер недоступен)
    try {
      // Используем структурированное клонирование для безопасного хранения в localStorage
      const safeSettings = JSON.parse(JSON.stringify(settings));
      localStorage.setItem('liveStyleEditorSettings', JSON.stringify(safeSettings));
      localSaveSuccess = true;
      console.log('Настройки успешно сохранены в localStorage');
      
      // Дополнительно сохраняем в sessionStorage для резервного копирования
      sessionStorage.setItem('liveStyleEditorSettings_backup', JSON.stringify(safeSettings));
    } catch (error) {
      console.error('Ошибка при сохранении в локальное хранилище:', error);
    }
    
    // Шаг 2: Сохраняем на сервер
    try {
      // Простой таймаут для запроса
      const timeoutMs = 5000;
      let timeoutId: NodeJS.Timeout | undefined;
      const controller = new AbortController();
      
      // Создаем таймаут и сохраняем его ID
      timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('authToken') ? { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } : {})
        },
        body: JSON.stringify(settings),
        credentials: 'include',
        signal: controller.signal
      });
      
      // Очищаем таймаут только если он был установлен
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
      }
      
      // Также сохраняем настройки интерфейса
      await fetch('/api/settings/ui', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('authToken') ? { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } : {})
        },
        body: JSON.stringify({ ui: settings.ui }),
        credentials: 'include'
      });
      
      // Обновляем кеш запросов
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      serverSaveSuccess = true;
      console.log('Настройки успешно сохранены на сервере');
    } catch (error) {
      console.error('Ошибка при сохранении на сервере:', error);
    }
    
    // Отображаем соответствующее уведомление в зависимости от результата
    if (serverSaveSuccess) {
      toast({
        title: 'Настройки сохранены',
        description: 'Изменения применены и сохранены на сервере',
        duration: 3000,
      });
    } else if (localSaveSuccess) {
      toast({
        title: 'Настройки сохранены локально',
        description: 'Изменения применены и сохранены в локальном хранилище',
        duration: 3000,
      });
    } else {
      toast({
        title: 'Настройки применены',
        description: 'Изменения применены, но возникли проблемы с сохранением',
        variant: 'destructive',
        duration: 3000,
      });
    }
    
    // Возвращаем результат для возможной обработки вызывающим кодом
    return { serverSaveSuccess, localSaveSuccess };
  };
  
  // Вспомогательная функция для применения настроек к DOM
  const applySettingsToDOM = (settings: Settings) => {
    if (settings?.ui?.colors) {
      const colors = settings.ui.colors;
      document.documentElement.style.setProperty('--primary-color', colors.primary || '#19c37d');
      document.documentElement.style.setProperty('--secondary-color', colors.secondary || '#6b7280');
      document.documentElement.style.setProperty('--accent-color', colors.accent || '#3b82f6');
    }
    
    if (settings?.ui?.typography) {
      const typography = settings.ui.typography;
      const isMobile = window.innerWidth < 768;
      
      const typoSettings = isMobile ? typography.mobile : typography.desktop;
      if (typoSettings?.fontSize) {
        document.documentElement.style.setProperty('--base-font-size', `${typoSettings.fontSize}px`);
      }
      
      if (typoSettings?.spacing) {
        document.documentElement.style.setProperty('--base-line-height', typoSettings.spacing.toString());
      }
      
      if (typoSettings?.fontFamily) {
        document.documentElement.style.setProperty('--font-family', typoSettings.fontFamily);
      }
    }
    
    // Применяем настройки виджета к превью в редакторе
    if (settings?.ui?.widget) {
      const widget = settings.ui.widget;
      
      // Находим элементы виджета в превью
      const widgetPreviewContainer = document.querySelector('.widget-preview-container');
      const widgetHeader = document.querySelector('.widget-header');
      const widgetTitle = document.querySelector('.widget-title');
      const widgetBody = document.querySelector('.widget-body');
      const widgetMessage = document.querySelector('.widget-message');
      const widgetButton = document.querySelector('.widget-button');
      
      if (widgetPreviewContainer) {
        (widgetPreviewContainer as HTMLElement).style.backgroundColor = widget.backgroundColor || '#1e1e1e';
      }
      
      if (widgetHeader) {
        (widgetHeader as HTMLElement).style.backgroundColor = widget.headerColor || '#272727';
      }
      
      if (widgetTitle) {
        (widgetTitle as HTMLElement).style.color = widget.textColor || '#ffffff';
        (widgetTitle as HTMLElement).textContent = widget.title || 'AI Ассистент';
      }
      
      if (widgetBody) {
        (widgetBody as HTMLElement).style.backgroundColor = widget.backgroundColor || '#1e1e1e';
        (widgetBody as HTMLElement).style.color = widget.textColor || '#ffffff';
      }
      
      if (widgetMessage) {
        (widgetMessage as HTMLElement).style.color = widget.textColor || '#ffffff';
      }
      
      if (widgetButton) {
        (widgetButton as HTMLElement).style.backgroundColor = widget.buttonColor || '#19c37d';
        
        // Применяем анимацию пульсации
        if (widget.pulsation) {
          (widgetButton as HTMLElement).style.animation = 'pulse 2s infinite';
        } else {
          (widgetButton as HTMLElement).style.animation = 'none';
        }
      }
      
      // Также применяем эти настройки к виджету на сайте через CSS переменные
      document.documentElement.style.setProperty('--widget-bg-color', widget.backgroundColor || '#1e1e1e');
      document.documentElement.style.setProperty('--widget-header-color', widget.headerColor || '#272727');
      document.documentElement.style.setProperty('--widget-text-color', widget.textColor || '#ffffff');
      document.documentElement.style.setProperty('--widget-button-color', widget.buttonColor || '#19c37d');
      
      // Обновляем опцию пульсации в CSS
      if (widget.pulsation) {
        document.documentElement.classList.add('widget-pulse-enabled');
      } else {
        document.documentElement.classList.remove('widget-pulse-enabled');
      }
    }
  };

  // Функции для редактирования текста
  const editElementText = (newText: string) => {
    if (!activeElement) return;
    activeElement.element.textContent = newText;
  };

  // Сброс стилей для элемента
  const resetElementStyles = () => {
    if (!activeElement) return;
    
    const { originalStyles, element } = activeElement;
    
    element.style.fontSize = originalStyles.fontSize;
    element.style.color = originalStyles.color;
    element.style.textAlign = originalStyles.textAlign;
    element.style.lineHeight = originalStyles.lineHeight;
    element.style.opacity = originalStyles.opacity;
    element.style.transform = originalStyles.transform;
    element.style.width = originalStyles.width;
    element.style.boxShadow = originalStyles.boxShadow;
    element.style.textShadow = originalStyles.textShadow;
    
    // Удаляем классы размеров
    element.classList.remove('fit-small', 'fit-medium', 'fit-large');
    
    // Обновляем активный элемент
    setActiveElement({
      element,
      type: activeElement.type,
      style: {
        fontSize: parseInt(originalStyles.fontSize),
        color: originalStyles.color,
        alignment: originalStyles.textAlign as 'left' | 'center' | 'right',
        spacing: parseFloat(originalStyles.lineHeight),
        opacity: parseFloat(originalStyles.opacity) * 100,
        rotate: 0,
        fit: 'medium',
        effectType: 'none'
      },
      originalStyles
    });
  };
  
  // Обработчики для перетаскивания редактора
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Проверяем, что нажатие было на заголовке, а не на элементах управления внутри редактора
    const target = e.target as HTMLElement;
    const isHeader = target.tagName === 'H3' || 
                     target.classList.contains('drag-handle') || 
                     target === e.currentTarget.querySelector('.flex.justify-between');
                     
    if (isHeader) {
      setIsDragging(true);
      setDragStartPosition({ 
        x: e.clientX - editorPosition.left, 
        y: e.clientY - editorPosition.top 
      });
    }
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const left = e.clientX - dragStartPosition.x;
    const top = e.clientY - dragStartPosition.y;
    
    // Убедимся, что редактор не выходит за пределы экрана
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const editorWidth = editorRef.current?.offsetWidth || 300;
    const editorHeight = editorRef.current?.offsetHeight || 400;
    
    const constrainedLeft = Math.max(0, Math.min(left, viewportWidth - editorWidth));
    const constrainedTop = Math.max(0, Math.min(top, viewportHeight - editorHeight));
    
    setEditorPosition({ top: constrainedTop, left: constrainedLeft });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Добавляем глобальные обработчики для перетаскивания
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isActive) return null;

  return (
    <div 
      ref={editorRef}
      className="fixed bg-white dark:bg-gray-900 p-5 rounded-l-xl shadow-2xl z-50 border-l border-t border-b border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-100 w-[350px]"
      style={{ 
        top: '0',
        right: '0',
        height: '100vh',
        overflowY: 'auto',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderTopLeftRadius: '16px',
        borderBottomLeftRadius: '16px',
        boxShadow: '-5px 0 25px rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.3s ease-in-out',
        transform: isActive ? 'translateX(0)' : 'translateX(100%)'
      }}
    >
      <div 
        className="flex justify-between items-center mb-5 cursor-grab drag-handle border-b pb-3" 
        onMouseDown={handleMouseDown}
      >
        <h3 className="font-semibold text-base text-gray-700 dark:text-gray-200">Редактор стилей</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none transition-colors duration-200"
          aria-label="Закрыть редактор"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hover:scale-110 transition-transform">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {!activeElement && (
        <>
          {/* Секция настроек виджета для сайта */}
          <div className="mb-8 border-b pb-8">
            <h3 className="font-medium text-base mb-4">Настройки виджета для сайта</h3>
            
            {/* Превью виджета */}
            <div className="website-widget-preview bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4 relative">
              <div className="widget-preview-container" style={{ 
                maxWidth: '240px',
                borderRadius: '16px',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                backgroundColor: currentSettings?.ui?.widget?.backgroundColor || '#1e1e1e'
              }}>
                <div className="widget-header p-3 flex justify-between items-center" style={{
                  backgroundColor: currentSettings?.ui?.widget?.headerColor || '#272727'
                }}>
                  <span className="font-medium text-sm widget-title" style={{ 
                    color: currentSettings?.ui?.widget?.textColor || '#ffffff'
                  }}>
                    {currentSettings?.ui?.widget?.title || 'AI Ассистент'}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </div>
                <div className="widget-body p-3" style={{
                  backgroundColor: currentSettings?.ui?.widget?.backgroundColor || '#1e1e1e',
                  color: currentSettings?.ui?.widget?.textColor || '#ffffff'
                }}>
                  <p className="text-sm widget-message">Здравствуйте! Чем я могу вам помочь?</p>
                </div>
              </div>
              
              <div className="mt-3 flex justify-end">
                <div className="widget-button" style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: currentSettings?.ui?.widget?.buttonColor || '#19c37d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                  animation: currentSettings?.ui?.widget?.pulsation ? 'pulse 2s infinite' : 'none'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Настройки виджета */}
            <div className="space-y-4">
              {/* Заголовок виджета */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Заголовок виджета</label>
                <input 
                  type="text" 
                  value={currentSettings?.ui?.widget?.title || 'AI Ассистент'}
                  onChange={(e) => updateSettingsProperty('ui.widget.title', e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Введите заголовок"
                />
              </div>
              
              {/* Цвета виджета */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Цвет фона</label>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer shadow-sm transition-transform hover:scale-105"
                    style={{ backgroundColor: currentSettings?.ui?.widget?.backgroundColor || '#1e1e1e' }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'color';
                      input.value = currentSettings?.ui?.widget?.backgroundColor || '#1e1e1e';
                      input.addEventListener('change', (e) => {
                        updateSettingsProperty('ui.widget.backgroundColor', (e.target as HTMLInputElement).value);
                      });
                      input.click();
                    }}
                  />
                  <input 
                    type="text" 
                    value={currentSettings?.ui?.widget?.backgroundColor || '#1e1e1e'}
                    onChange={(e) => updateSettingsProperty('ui.widget.backgroundColor', e.target.value)}
                    className="flex-1 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Цвет заголовка</label>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer shadow-sm transition-transform hover:scale-105"
                    style={{ backgroundColor: currentSettings?.ui?.widget?.headerColor || '#272727' }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'color';
                      input.value = currentSettings?.ui?.widget?.headerColor || '#272727';
                      input.addEventListener('change', (e) => {
                        updateSettingsProperty('ui.widget.headerColor', (e.target as HTMLInputElement).value);
                      });
                      input.click();
                    }}
                  />
                  <input 
                    type="text" 
                    value={currentSettings?.ui?.widget?.headerColor || '#272727'}
                    onChange={(e) => updateSettingsProperty('ui.widget.headerColor', e.target.value)}
                    className="flex-1 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Цвет текста</label>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer shadow-sm transition-transform hover:scale-105"
                    style={{ backgroundColor: currentSettings?.ui?.widget?.textColor || '#ffffff' }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'color';
                      input.value = currentSettings?.ui?.widget?.textColor || '#ffffff';
                      input.addEventListener('change', (e) => {
                        updateSettingsProperty('ui.widget.textColor', (e.target as HTMLInputElement).value);
                      });
                      input.click();
                    }}
                  />
                  <input 
                    type="text" 
                    value={currentSettings?.ui?.widget?.textColor || '#ffffff'}
                    onChange={(e) => updateSettingsProperty('ui.widget.textColor', e.target.value)}
                    className="flex-1 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Цвет кнопки</label>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer shadow-sm transition-transform hover:scale-105"
                    style={{ backgroundColor: currentSettings?.ui?.widget?.buttonColor || '#19c37d' }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'color';
                      input.value = currentSettings?.ui?.widget?.buttonColor || '#19c37d';
                      input.addEventListener('change', (e) => {
                        updateSettingsProperty('ui.widget.buttonColor', (e.target as HTMLInputElement).value);
                      });
                      input.click();
                    }}
                  />
                  <input 
                    type="text" 
                    value={currentSettings?.ui?.widget?.buttonColor || '#19c37d'}
                    onChange={(e) => updateSettingsProperty('ui.widget.buttonColor', e.target.value)}
                    className="flex-1 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              
              {/* Пульсация */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Эффект пульсации</label>
                  <div className="relative inline-block w-10 align-middle select-none">
                    <input 
                      type="checkbox"
                      checked={currentSettings?.ui?.widget?.pulsation || false}
                      onChange={(e) => updateSettingsProperty('ui.widget.pulsation', e.target.checked)}
                      className="hidden"
                      id="toggle-pulsation"
                    />
                    <label 
                      htmlFor="toggle-pulsation"
                      className={`block overflow-hidden h-6 rounded-full cursor-pointer ${
                        currentSettings?.ui?.widget?.pulsation ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span 
                        className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform ${
                          currentSettings?.ui?.widget?.pulsation ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      ></span>
                    </label>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Привлекает внимание анимацией пульсации кнопки чата</p>
              </div>
            </div>
          </div>
          
          {/* Инструкция по начальному редактированию */}
          <div className="flex flex-col items-center justify-center py-6 text-gray-500 dark:text-gray-400 text-sm space-y-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 text-blue-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
            </svg>
            <p>Кликните на элемент для редактирования</p>
            <p className="text-xs opacity-70">Текст, кнопки и другие элементы доступны для стилизации</p>
          </div>
        </>
      )}
      
      {/* Кнопка Сохранить внизу редактора (всегда видима) */}
      <div className="fixed bottom-0 right-0 w-[350px] p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
        <button
          onClick={() => saveSettings(currentSettings)}
          className="w-full py-2.5 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
        >
          Сохранить изменения
        </button>
      </div>
      
      {/* Добавляем отступ внизу для кнопки */}
      <div className="h-20"></div>
      
      {activeElement && (
        <div className="space-y-5">
          {/* Выравнивание */}
          <div className="space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Выравнивание</div>
            <div className="bg-gray-50 dark:bg-gray-800 p-1 rounded-lg flex items-center">
              <button 
                onClick={() => updateElementStyle('alignment', 'left')}
                className={`flex-1 p-2 rounded-md text-xs font-medium transition-all ${activeElement.style.alignment === 'left' 
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="15" y2="12"></line>
                  <line x1="3" y1="18" x2="18" y2="18"></line>
                </svg>
              </button>
              <button 
                onClick={() => updateElementStyle('alignment', 'center')}
                className={`flex-1 p-2 rounded-md text-xs font-medium transition-all ${activeElement.style.alignment === 'center' 
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                  <line x1="6" y1="18" x2="18" y2="18"></line>
                </svg>
              </button>
              <button 
                onClick={() => updateElementStyle('alignment', 'right')}
                className={`flex-1 p-2 rounded-md text-xs font-medium transition-all ${activeElement.style.alignment === 'right' 
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="9" y1="12" x2="21" y2="12"></line>
                  <line x1="6" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Цвет */}
          <div className="space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Цвет текста</div>
            <div className="flex items-center space-x-2">
              <div 
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer shadow-sm transition-transform hover:scale-105"
                style={{ backgroundColor: activeElement.style.color }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'color';
                  input.value = activeElement.style.color;
                  input.addEventListener('change', (e) => {
                    updateElementStyle('color', (e.target as HTMLInputElement).value);
                  });
                  input.click();
                }}
              />
              <input 
                type="text" 
                value={activeElement.style.color}
                onChange={(e) => updateElementStyle('color', e.target.value)}
                className="flex-1 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          
          {/* Размер текста */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Размер шрифта</div>
              <div className="font-medium text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">{activeElement.style.fontSize}px</div>
            </div>
            <input 
              type="range" 
              min="10" 
              max="48" 
              value={activeElement.style.fontSize}
              onChange={(e) => updateElementStyle('fontSize', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>10px</span>
              <span>48px</span>
            </div>
          </div>
          
          {/* Интервал */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Интервал строк</div>
              <div className="font-medium text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">{activeElement.style.spacing}x</div>
            </div>
            <input 
              type="range" 
              min="0.8" 
              max="2.5" 
              step="0.05"
              value={activeElement.style.spacing}
              onChange={(e) => updateElementStyle('spacing', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
          
          {/* Эффекты */}
          <div className="space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Эффект</div>
            <select
              value={activeElement.style.effectType}
              onChange={(e) => updateElementStyle('effectType', e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="none">Без эффекта</option>
              <option value="shadow">Тень</option>
              <option value="glow">Свечение</option>
              <option value="outline">Обводка</option>
            </select>
          </div>
          
          {/* Устройство (для разных размеров) */}
          <div className="space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Устройство</div>
            <div className="bg-gray-50 dark:bg-gray-800 p-1 rounded-lg flex">
              <button
                onClick={() => setIsMobileView(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${!isMobileView 
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                aria-label="Настройки для десктопа"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                <span>Десктоп</span>
              </button>
              <button
                onClick={() => setIsMobileView(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${isMobileView 
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                aria-label="Настройки для мобильных устройств"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="7" y="2" width="10" height="20" rx="2"></rect>
                  <line x1="12" y1="18" x2="12" y2="18.01"></line>
                </svg>
                <span>Мобильный</span>
              </button>
            </div>
          </div>
          
          {/* Кнопки действий */}
          <div className="border-t pt-4 mt-4 space-y-3">
            <button
              onClick={resetElementStyles}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              Сбросить стили
            </button>
            
            <button
              onClick={() => saveSettings(currentSettings)}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              Сохранить настройки
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveStyleEditor;