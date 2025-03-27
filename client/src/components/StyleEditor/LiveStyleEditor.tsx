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
          colorSchemeEnabled: false, // Цветовая схема отключена по умолчанию
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
      // Больше не редактируем виджет в основном редакторе - он должен настраиваться только в кабинете в разделе интеграций
      const isWidgetElement = false;
      
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
      // Сбрасываем все эффекты
      element.style.boxShadow = 'none';
      element.style.textShadow = 'none';
      element.style.outline = 'none';
      
      // Применяем новый эффект
      switch (style.effectType) {
        case 'shadow':
          element.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
          break;
        case 'glow':
          element.style.textShadow = '0 0 5px rgba(25, 195, 125, 0.8), 0 0 10px rgba(25, 195, 125, 0.5)';
          break;
        case 'outline':
          element.style.outline = '2px solid rgba(25, 195, 125, 0.7)';
          element.style.outlineOffset = '2px';
          break;
      }
    }
  };

  // Сохранение настроек на сервер
  const saveSettings = async (settings: Settings) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('authToken') ? { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      
      // Сохраняем настройки в localStorage и sessionStorage для быстрого доступа в будущем
      try {
        localStorage.setItem('liveStyleEditorSettings', JSON.stringify(settings));
        sessionStorage.setItem('liveStyleEditorSettings_backup', JSON.stringify(settings));
        console.log('✅ Настройки успешно сохранены в локальное хранилище браузера');
      } catch (e) {
        console.warn('⚠️ Не удалось сохранить настройки в хранилище браузера:', e);
      }
      
      if (response) {
        toast({
          title: 'Настройки сохранены',
          description: 'Ваши настройки интерфейса успешно сохранены',
        });
        
        // Обновляем кэш в React Query
        queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
        
        return true;
      } else {
        toast({
          title: 'Ошибка сохранения',
          description: 'Не удалось сохранить настройки. Пожалуйста, попробуйте еще раз.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      toast({
        title: 'Ошибка сохранения',
        description: 'Возникла ошибка при сохранении настроек. Проверьте подключение к интернету.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Обновление настроек
  const updateSettingsProperty = (path: string, value: any) => {
    // Разбиваем путь на части
    const pathParts = path.split('.');
    
    // Создаем копию текущих настроек
    const updatedSettings = { ...currentSettings };
    
    // Рекурсивно обновляем значение в объекте
    let currentObj: any = updatedSettings;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!currentObj[part]) {
        currentObj[part] = {};
      }
      currentObj = currentObj[part];
    }
    
    // Устанавливаем новое значение
    currentObj[pathParts[pathParts.length - 1]] = value;
    
    // Обновляем состояние
    setCurrentSettings(updatedSettings);
    
    // Применяем настройки к DOM
    applySettingsToDOM(updatedSettings);
  };

  // Применение настроек к элементам DOM
  const applySettingsToDOM = (settings: Settings) => {
    if (!settings.ui || !settings.ui.enabled) return;
    
    try {
      // Применяем цветовую схему, если она включена
      if (settings.ui.colorSchemeEnabled) {
        const appElement = document.getElementById('app') || document.body;
        
        // Задаем CSS-переменные для цветов
        if (settings.ui.colors) {
          appElement.style.setProperty('--primary', settings.ui.colors.primary);
          appElement.style.setProperty('--secondary', settings.ui.colors.secondary);
          appElement.style.setProperty('--accent', settings.ui.colors.accent);
        }
      }
    } catch (e) {
      console.error('Ошибка при применении настроек:', e);
    }
  };

  // Обработчик перемещения редактора
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartPosition.x;
    const deltaY = e.clientY - dragStartPosition.y;
    
    setEditorPosition(prev => ({
      top: prev.top + deltaY,
      left: prev.left + deltaX
    }));
    
    setDragStartPosition({
      x: e.clientX,
      y: e.clientY
    });
  };

  // Обработчик начала перемещения редактора
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStartPosition({
      x: e.clientX,
      y: e.clientY
    });
  };

  // Обработчик окончания перемещения редактора
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Добавляем обработчики перемещения редактора
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleDragEnd);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleDragEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);

  // Обработчик сохранения настроек
  const handleSaveSettings = async () => {
    // Выполняем сохранение настроек
    const success = await saveSettings(currentSettings);
    
    if (success) {
      console.log('✅ Настройки успешно сохранены на сервере');
    }
  };

  if (!isActive) return null;

  return (
    <div 
      ref={editorRef}
      className={`live-style-editor fixed right-0 top-0 h-full overflow-auto z-50 bg-white dark:bg-gray-900 shadow-lg border-l border-gray-200 dark:border-gray-800 transition-all ${
        isMobileView ? 'w-full' : 'w-80'
      }`}
      style={{
        transform: isActive ? 'translateX(0)' : 'translateX(100%)',
      }}
    >
      <div 
        className="editor-header flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800"
        onMouseDown={handleDragStart}
      >
        <h2 className="text-lg font-semibold">Редактор стилей</h2>
        <button 
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={onClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="editor-content p-4">
      {!activeElement && (
        <>
          {/* Инструкция по начальному редактированию */}
          <div className="flex flex-col items-center justify-center py-6 text-gray-500 dark:text-gray-400 text-sm space-y-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 text-blue-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
            </svg>
            <p className="text-center">Наведите курсор на элемент страницы и кликните, чтобы начать редактирование.</p>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 w-full">
              <p className="font-semibold mb-1">Советы:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Вы можете редактировать текст, кнопки и блоки сообщений</li>
                <li>Используйте вкладки для доступа к разным типам настроек</li>
                <li>Изменения применяются мгновенно</li>
                <li>Не забудьте сохранить настройки после завершения редактирования</li>
              </ul>
            </div>
          </div>
          
          {/* Кнопка сохранения настроек */}
          <div className="save-settings-button mt-6">
            <button 
              onClick={handleSaveSettings}
              className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Сохранить настройки
            </button>
          </div>
        </>
      )}
        
        {activeElement && (
          <>
            <div className="editor-header mb-4">
              <h3 className="font-medium">
                Редактирование {
                  activeElement.type === 'text' ? 'текста' : 
                  activeElement.type === 'button' ? 'кнопки' : 
                  activeElement.type === 'message' ? 'сообщения' :
                  activeElement.type === 'user-message' ? 'сообщения пользователя' :
                  activeElement.type === 'assistant-message' ? 'сообщения ассистента' :
                  activeElement.type === 'typing' ? 'анимации набора текста' :
                  'элемента'
                }
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Настройте внешний вид выбранного элемента</p>
            </div>
            
            {/* Вкладки с настройками */}
            <div className="editor-tabs mb-4">
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button 
                  className={`py-2 px-4 text-sm font-medium ${
                    true ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Основные
                </button>
                {/* Дополнительные вкладки можно добавить здесь */}
              </div>
            </div>
            
            {/* Настройки элемента */}
            <div className="space-y-4">
              {/* Размер шрифта */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Размер шрифта</label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="8"
                    max="48"
                    step="1"
                    value={activeElement.style.fontSize}
                    onChange={(e) => {
                      const newFontSize = parseInt(e.target.value);
                      const newStyle = { ...activeElement.style, fontSize: newFontSize };
                      applyStyle(activeElement.element, { fontSize: newFontSize });
                      setActiveElement({ ...activeElement, style: newStyle });
                    }}
                    className="w-full mr-2"
                  />
                  <span className="text-sm font-medium w-8 text-center">{activeElement.style.fontSize}px</span>
                </div>
              </div>
              
              {/* Цвет текста */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Цвет текста</label>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer shadow-sm transition-transform hover:scale-105"
                    style={{ backgroundColor: activeElement.style.color }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'color';
                      input.value = activeElement.style.color;
                      input.addEventListener('change', (e) => {
                        const newColor = (e.target as HTMLInputElement).value;
                        const newStyle = { ...activeElement.style, color: newColor };
                        applyStyle(activeElement.element, { color: newColor });
                        setActiveElement({ ...activeElement, style: newStyle });
                      });
                      input.click();
                    }}
                  />
                  <input 
                    type="text" 
                    value={activeElement.style.color}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      const newStyle = { ...activeElement.style, color: newColor };
                      applyStyle(activeElement.element, { color: newColor });
                      setActiveElement({ ...activeElement, style: newStyle });
                    }}
                    className="flex-1 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              
              {/* Выравнивание текста */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Выравнивание</label>
                <div className="flex items-center space-x-2">
                  <button 
                    className={`flex-1 py-2 px-4 ${
                      activeElement.style.alignment === 'left' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                    } rounded-lg transition-colors focus:outline-none`}
                    onClick={() => {
                      const newStyle = { ...activeElement.style, alignment: 'left' as const };
                      applyStyle(activeElement.element, { alignment: 'left' });
                      setActiveElement({ ...activeElement, style: newStyle });
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
                      <line x1="17" y1="10" x2="3" y2="10"></line>
                      <line x1="21" y1="6" x2="3" y2="6"></line>
                      <line x1="21" y1="14" x2="3" y2="14"></line>
                      <line x1="17" y1="18" x2="3" y2="18"></line>
                    </svg>
                  </button>
                  <button 
                    className={`flex-1 py-2 px-4 ${
                      activeElement.style.alignment === 'center' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                    } rounded-lg transition-colors focus:outline-none`}
                    onClick={() => {
                      const newStyle = { ...activeElement.style, alignment: 'center' as const };
                      applyStyle(activeElement.element, { alignment: 'center' });
                      setActiveElement({ ...activeElement, style: newStyle });
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
                      <line x1="18" y1="10" x2="6" y2="10"></line>
                      <line x1="21" y1="6" x2="3" y2="6"></line>
                      <line x1="21" y1="14" x2="3" y2="14"></line>
                      <line x1="18" y1="18" x2="6" y2="18"></line>
                    </svg>
                  </button>
                  <button 
                    className={`flex-1 py-2 px-4 ${
                      activeElement.style.alignment === 'right' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                    } rounded-lg transition-colors focus:outline-none`}
                    onClick={() => {
                      const newStyle = { ...activeElement.style, alignment: 'right' as const };
                      applyStyle(activeElement.element, { alignment: 'right' });
                      setActiveElement({ ...activeElement, style: newStyle });
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
                      <line x1="21" y1="10" x2="7" y2="10"></line>
                      <line x1="21" y1="6" x2="3" y2="6"></line>
                      <line x1="21" y1="14" x2="3" y2="14"></line>
                      <line x1="21" y1="18" x2="7" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Междустрочный интервал */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Межстрочный интервал</label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0.8"
                    max="2.5"
                    step="0.1"
                    value={activeElement.style.spacing}
                    onChange={(e) => {
                      const newSpacing = parseFloat(e.target.value);
                      const newStyle = { ...activeElement.style, spacing: newSpacing };
                      applyStyle(activeElement.element, { spacing: newSpacing });
                      setActiveElement({ ...activeElement, style: newStyle });
                    }}
                    className="w-full mr-2"
                  />
                  <span className="text-sm font-medium w-8 text-center">{activeElement.style.spacing.toFixed(1)}</span>
                </div>
              </div>
              
              {/* Прозрачность */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Прозрачность</label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={activeElement.style.opacity}
                    onChange={(e) => {
                      const newOpacity = parseFloat(e.target.value);
                      const newStyle = { ...activeElement.style, opacity: newOpacity };
                      applyStyle(activeElement.element, { opacity: newOpacity });
                      setActiveElement({ ...activeElement, style: newStyle });
                    }}
                    className="w-full mr-2"
                  />
                  <span className="text-sm font-medium w-8 text-center">{activeElement.style.opacity}%</span>
                </div>
              </div>
              
              {/* Поворот */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Поворот</label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={activeElement.style.rotate}
                    onChange={(e) => {
                      const newRotate = parseInt(e.target.value);
                      const newStyle = { ...activeElement.style, rotate: newRotate };
                      applyStyle(activeElement.element, { rotate: newRotate });
                      setActiveElement({ ...activeElement, style: newStyle });
                    }}
                    className="w-full mr-2"
                  />
                  <span className="text-sm font-medium w-16 text-center">{activeElement.style.rotate}°</span>
                </div>
              </div>
              
              {/* Размер блока */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Размер блока</label>
                <div className="flex items-center space-x-2">
                  <button 
                    className={`flex-1 py-2 px-4 ${
                      activeElement.style.fit === 'small' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                    } rounded-lg transition-colors focus:outline-none text-sm`}
                    onClick={() => {
                      const newStyle = { ...activeElement.style, fit: 'small' as const };
                      applyStyle(activeElement.element, { fit: 'small' });
                      setActiveElement({ ...activeElement, style: newStyle });
                    }}
                  >
                    Узкий
                  </button>
                  <button 
                    className={`flex-1 py-2 px-4 ${
                      activeElement.style.fit === 'medium' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                    } rounded-lg transition-colors focus:outline-none text-sm`}
                    onClick={() => {
                      const newStyle = { ...activeElement.style, fit: 'medium' as const };
                      applyStyle(activeElement.element, { fit: 'medium' });
                      setActiveElement({ ...activeElement, style: newStyle });
                    }}
                  >
                    Средний
                  </button>
                  <button 
                    className={`flex-1 py-2 px-4 ${
                      activeElement.style.fit === 'large' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                    } rounded-lg transition-colors focus:outline-none text-sm`}
                    onClick={() => {
                      const newStyle = { ...activeElement.style, fit: 'large' as const };
                      applyStyle(activeElement.element, { fit: 'large' });
                      setActiveElement({ ...activeElement, style: newStyle });
                    }}
                  >
                    Широкий
                  </button>
                </div>
              </div>
              
              {/* Эффекты */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Эффекты</label>
                <div className="flex items-center space-x-2 flex-wrap">
                  <button 
                    className={`flex-1 py-2 px-4 ${
                      activeElement.style.effectType === 'none' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                    } rounded-lg transition-colors focus:outline-none text-sm mb-2`}
                    onClick={() => {
                      const newStyle = { ...activeElement.style, effectType: 'none' as const };
                      applyStyle(activeElement.element, { effectType: 'none' });
                      setActiveElement({ ...activeElement, style: newStyle });
                    }}
                  >
                    Нет
                  </button>
                  <button 
                    className={`flex-1 py-2 px-4 ${
                      activeElement.style.effectType === 'shadow' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                    } rounded-lg transition-colors focus:outline-none text-sm mb-2`}
                    onClick={() => {
                      const newStyle = { ...activeElement.style, effectType: 'shadow' as const };
                      applyStyle(activeElement.element, { effectType: 'shadow' });
                      setActiveElement({ ...activeElement, style: newStyle });
                    }}
                  >
                    Тень
                  </button>
                  <button 
                    className={`flex-1 py-2 px-4 ${
                      activeElement.style.effectType === 'glow' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                    } rounded-lg transition-colors focus:outline-none text-sm mb-2`}
                    onClick={() => {
                      const newStyle = { ...activeElement.style, effectType: 'glow' as const };
                      applyStyle(activeElement.element, { effectType: 'glow' });
                      setActiveElement({ ...activeElement, style: newStyle });
                    }}
                  >
                    Свечение
                  </button>
                  <button 
                    className={`flex-1 py-2 px-4 ${
                      activeElement.style.effectType === 'outline' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                    } rounded-lg transition-colors focus:outline-none text-sm mb-2`}
                    onClick={() => {
                      const newStyle = { ...activeElement.style, effectType: 'outline' as const };
                      applyStyle(activeElement.element, { effectType: 'outline' });
                      setActiveElement({ ...activeElement, style: newStyle });
                    }}
                  >
                    Контур
                  </button>
                </div>
              </div>
              
              {/* Сброс настроек элемента */}
              <div className="mt-6">
                <button 
                  className="w-full py-2 px-4 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                  onClick={() => {
                    // Возвращаем оригинальные стили элементу
                    activeElement.element.style.fontSize = activeElement.originalStyles.fontSize;
                    activeElement.element.style.color = activeElement.originalStyles.color;
                    activeElement.element.style.textAlign = activeElement.originalStyles.textAlign;
                    activeElement.element.style.lineHeight = activeElement.originalStyles.lineHeight;
                    activeElement.element.style.opacity = activeElement.originalStyles.opacity;
                    activeElement.element.style.transform = activeElement.originalStyles.transform;
                    activeElement.element.style.width = activeElement.originalStyles.width;
                    activeElement.element.style.boxShadow = activeElement.originalStyles.boxShadow;
                    activeElement.element.style.textShadow = activeElement.originalStyles.textShadow;
                    activeElement.element.style.outline = activeElement.originalStyles.outline;
                    
                    // Убираем классы размеров
                    activeElement.element.classList.remove('fit-small', 'fit-medium', 'fit-large');
                    
                    // Снимаем выделение с элемента
                    activeElement.element.style.outline = '';
                    activeElement.element.style.outlineOffset = '';
                    
                    // Сбрасываем активный элемент
                    setActiveElement(null);
                  }}
                >
                  Сбросить настройки
                </button>
              </div>
              
              {/* Кнопка сохранения настроек */}
              <div className="save-settings-button mt-4">
                <button 
                  onClick={handleSaveSettings}
                  className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  Сохранить настройки
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LiveStyleEditor;