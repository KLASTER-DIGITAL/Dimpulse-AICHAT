import { useState, useEffect, useRef } from 'react';
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
  
  // Загрузка настроек из localStorage при инициализации
  useEffect(() => {
    try {
      const localSettings = localStorage.getItem('liveStyleEditorSettings');
      if (localSettings) {
        const parsedSettings = JSON.parse(localSettings) as Settings;
        setCurrentSettings(parsedSettings);
        
        // Применяем настройки к UI
        document.documentElement.style.setProperty('--primary-color', parsedSettings.ui.colors.primary);
        document.documentElement.style.setProperty('--secondary-color', parsedSettings.ui.colors.secondary);
        document.documentElement.style.setProperty('--accent-color', parsedSettings.ui.colors.accent);
      }
    } catch (e) {
      console.error('Ошибка при загрузке настроек из localStorage:', e);
    }
  }, []);

  // Поддержка разных размеров для десктопа и мобильных устройств
  const [isMobileView, setIsMobileView] = useState(false);

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
      const editableSelectors = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'button', 'input', 'textarea',
        '.chat-message', '.user-message', '.assistant-message', '.typing-animation', '.primary'
      ];
      
      // Проверяем, что элемент подходит под один из селекторов или содержит текст
      const isEditable = editableSelectors.some(selector => {
        if (selector.startsWith('.')) {
          return target.classList.contains(selector.substring(1));
        } else {
          return target.tagName.toLowerCase() === selector;
        }
      }) && (target.innerText.trim().length > 0 || target.tagName.toLowerCase() === 'button');
      
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
    
    // Сохраняем изменения в глобальных настройках UI, если применимо
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
      
      setCurrentSettings(updatedSettings);
      saveSettings(updatedSettings);
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
    
    // Обновляем состояние
    setCurrentSettings(newSettings);
    
    // Сохраняем настройки на сервере
    saveSettings(newSettings);
  };

  const saveSettings = async (settings: Settings) => {
    try {
      // Сначала сохраняем в localStorage для резервного копирования
      localStorage.setItem('liveStyleEditorSettings', JSON.stringify(settings));
      
      // Затем пытаемся сохранить через API
      await apiRequest('/api/settings', {
        method: 'POST',
        data: settings,
      });
      
      // Обновляем кеш запросов
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      
      // Обновляем UI настройки локально
      document.documentElement.style.setProperty('--primary-color', settings.ui.colors.primary);
      document.documentElement.style.setProperty('--secondary-color', settings.ui.colors.secondary);
      document.documentElement.style.setProperty('--accent-color', settings.ui.colors.accent);
      
      // Отображаем уведомление
      toast({
        title: 'Настройки сохранены',
        description: 'Изменения успешно применены',
      });
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      
      // В случае ошибки пытаемся загрузить настройки из localStorage
      try {
        const localSettings = localStorage.getItem('liveStyleEditorSettings');
        if (localSettings) {
          // Обновляем UI настройки локально из localStorage
          const parsedSettings = JSON.parse(localSettings) as Settings;
          document.documentElement.style.setProperty('--primary-color', parsedSettings.ui.colors.primary);
          document.documentElement.style.setProperty('--secondary-color', parsedSettings.ui.colors.secondary);
          document.documentElement.style.setProperty('--accent-color', parsedSettings.ui.colors.accent);
          
          toast({
            title: 'Настройки сохранены локально',
            description: 'Не удалось сохранить настройки на сервере, но изменения применены локально',
          });
        } else {
          toast({
            title: 'Ошибка сохранения',
            description: 'Не удалось сохранить настройки',
            variant: 'destructive',
          });
        }
      } catch (e) {
        toast({
          title: 'Ошибка сохранения',
          description: 'Не удалось сохранить настройки',
          variant: 'destructive',
        });
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
      className="fixed bg-white p-4 rounded-lg shadow-lg z-50 border border-gray-200 text-gray-800 w-72"
      style={{ 
        top: `${editorPosition.top}px`, 
        left: `${editorPosition.left}px`,
        maxHeight: '80vh',
        overflowY: 'auto',
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
    >
      <div 
        className="flex justify-between items-center mb-4 cursor-grab drag-handle" 
        onMouseDown={handleMouseDown}
      >
        <h3 className="font-medium text-sm">Редактирование элемента</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {!activeElement && (
        <div className="text-center py-4 text-gray-500 text-sm">
          Кликните на элемент для начала редактирования
        </div>
      )}
      
      {activeElement && (
        <div className="space-y-4">
          {/* Выравнивание */}
          <div className="space-y-1">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Выравнивание</div>
            <div className="grid grid-cols-3 gap-1">
              <button 
                onClick={() => updateElementStyle('alignment', 'left')}
                className={`border py-1 rounded text-xs ${activeElement.style.alignment === 'left' ? 'bg-gray-200 border-gray-400' : 'border-gray-300'}`}
              >
                Left
              </button>
              <button 
                onClick={() => updateElementStyle('alignment', 'center')}
                className={`border py-1 rounded text-xs ${activeElement.style.alignment === 'center' ? 'bg-gray-200 border-gray-400' : 'border-gray-300'}`}
              >
                Center
              </button>
              <button 
                onClick={() => updateElementStyle('alignment', 'right')}
                className={`border py-1 rounded text-xs ${activeElement.style.alignment === 'right' ? 'bg-gray-200 border-gray-400' : 'border-gray-300'}`}
              >
                Right
              </button>
            </div>
          </div>
          
          {/* Цвет */}
          <div className="space-y-1">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Цвет</div>
            <div className="flex items-center space-x-2">
              <div 
                className="w-6 h-6 rounded-full border border-gray-300 cursor-pointer"
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
                className="flex-1 border border-gray-300 px-2 py-1 rounded text-xs"
              />
            </div>
          </div>
          
          {/* Размер текста */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Размер</div>
              <div className="font-medium text-sm">{activeElement.style.fontSize}</div>
            </div>
            <input 
              type="range" 
              min="10" 
              max="48" 
              value={activeElement.style.fontSize}
              onChange={(e) => updateElementStyle('fontSize', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          
          {/* Интервал */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Интервал</div>
              <div className="font-medium text-sm">{activeElement.style.spacing}</div>
            </div>
            <input 
              type="range" 
              min="0.8" 
              max="2.5" 
              step="0.05"
              value={activeElement.style.spacing}
              onChange={(e) => updateElementStyle('spacing', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          {/* Прозрачность */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Прозрачность</div>
              <div className="font-medium text-sm">{activeElement.style.opacity}</div>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={activeElement.style.opacity}
              onChange={(e) => updateElementStyle('opacity', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          
          {/* Поворот */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Поворот</div>
              <div className="font-medium text-sm">{activeElement.style.rotate}°</div>
            </div>
            <input 
              type="range" 
              min="-180" 
              max="180" 
              value={activeElement.style.rotate}
              onChange={(e) => updateElementStyle('rotate', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          
          {/* Действия */}
          <div className="space-y-1">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Действия</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(activeElement.element.innerText || '')}
                className="px-2 py-1 bg-gray-100 text-xs rounded border border-gray-300 hover:bg-gray-200"
              >
                Копировать
              </button>
              <button
                onClick={resetElementStyles}
                className="px-2 py-1 bg-gray-100 text-xs rounded border border-gray-300 hover:bg-gray-200"
              >
                Сбросить
              </button>
              <button
                onClick={() => {}}
                className="px-2 py-1 bg-gray-100 text-xs rounded border border-gray-300 hover:bg-gray-200"
              >
                Блокировать
              </button>
            </div>
            <div className="mt-1">
              <button
                onClick={() => {}}
                className="w-full px-2 py-1 bg-gray-100 text-xs rounded border border-gray-300 hover:bg-gray-200"
              >
                Сгруппировать
              </button>
            </div>
          </div>
          
          {/* Эффекты */}
          <div className="space-y-1">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Эффект</div>
            <select
              value={activeElement.style.effectType}
              onChange={(e) => updateElementStyle('effectType', e.target.value)}
              className="w-full border border-gray-300 rounded text-sm p-1"
            >
              <option value="none">Нет</option>
              <option value="shadow">Тень</option>
              <option value="glow">Свечение</option>
              <option value="outline">Обводка</option>
            </select>
          </div>
          
          {/* Устройство (для разных размеров) */}
          <div className="space-y-1 border-t pt-2 mt-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Устройство</div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsMobileView(false)}
                className={`flex-1 px-2 py-1 text-xs rounded ${!isMobileView ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-100 border border-gray-300'}`}
              >
                Десктоп
              </button>
              <button
                onClick={() => setIsMobileView(true)}
                className={`flex-1 px-2 py-1 text-xs rounded ${isMobileView ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-100 border border-gray-300'}`}
              >
                Мобильный
              </button>
            </div>
          </div>
          
          {/* Редактирование текста (если это текстовый элемент) */}
          {activeElement.type === 'text' && (
            <div className="space-y-1 border-t pt-2 mt-2">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Текст</div>
              <textarea
                value={activeElement.element.innerText || ''}
                onChange={(e) => editElementText(e.target.value)}
                className="w-full border border-gray-300 rounded text-sm p-2 h-20"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveStyleEditor;