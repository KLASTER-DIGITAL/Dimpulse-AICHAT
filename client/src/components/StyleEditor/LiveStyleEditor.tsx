import { useState, useEffect } from 'react';
import { Settings } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface LiveStyleEditorProps {
  initialSettings: Settings;
  isActive: boolean;
  onClose: () => void;
}

const LiveStyleEditor = ({ initialSettings, isActive, onClose }: LiveStyleEditorProps) => {
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);
  const [currentSettings, setCurrentSettings] = useState<Settings>(initialSettings);
  const { toast } = useToast();

  useEffect(() => {
    if (!isActive) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('chat-message') || 
          target.classList.contains('chat-sidebar') || 
          target.classList.contains('chat-input-container') ||
          target.classList.contains('chat-input') ||
          target.classList.contains('primary') ||
          target.classList.contains('typing-animation') ||
          target.classList.contains('user-message') ||
          target.classList.contains('assistant-message')) {
        setHoveredElement(target);
        
        // Добавляем подсветку элемента
        target.style.outline = '2px dashed var(--primary-color)';
        target.style.outlineOffset = '2px';
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('chat-message') || 
          target.classList.contains('chat-sidebar') || 
          target.classList.contains('chat-input-container') ||
          target.classList.contains('chat-input') ||
          target.classList.contains('primary') ||
          target.classList.contains('typing-animation') ||
          target.classList.contains('user-message') ||
          target.classList.contains('assistant-message')) {
        setHoveredElement(null);
        
        // Убираем подсветку, если элемент не активный
        if (target !== activeElement) {
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
      if (activeElement && activeElement !== hoveredElement) {
        activeElement.style.outline = '';
        activeElement.style.outlineOffset = '';
      }
      
      setActiveElement(hoveredElement);
      
      // Добавляем постоянную подсветку для активного элемента
      hoveredElement.style.outline = '2px solid var(--primary-color)';
      hoveredElement.style.outlineOffset = '2px';
      
      // Показываем панель редактирования рядом с элементом
      showEditPanel(hoveredElement);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick);
      
      // Убираем все выделения при деактивации
      document.querySelectorAll('.chat-message, .chat-sidebar, .chat-input-container, .chat-input, .primary, .typing-animation, .user-message, .assistant-message').forEach((el) => {
        (el as HTMLElement).style.outline = '';
        (el as HTMLElement).style.outlineOffset = '';
      });
    };
  }, [isActive, hoveredElement, activeElement]);

  const showEditPanel = (element: HTMLElement) => {
    // Определяем тип элемента по классам
    let elementType = '';
    
    if (element.classList.contains('chat-sidebar')) elementType = 'sidebar';
    else if (element.classList.contains('chat-input') || element.classList.contains('chat-input-container')) elementType = 'input';
    else if (element.classList.contains('primary')) elementType = 'button';
    else if (element.classList.contains('typing-animation')) elementType = 'typing';
    else if (element.classList.contains('user-message')) elementType = 'user-message';
    else if (element.classList.contains('assistant-message')) elementType = 'assistant-message';
    else if (element.classList.contains('chat-message')) elementType = 'message';
    
    // Показываем соответствующие настройки в боковой панели
    console.log(`Редактирование элемента: ${elementType}`);
  };

  const updateSettingsProperty = (property: string, value: any) => {
    // Создаем копию текущих настроек
    const newSettings = { ...currentSettings };
    
    // Разбиваем путь к свойству на части
    const path = property.split('.');
    
    // Обновляем значение по указанному пути
    let target = newSettings as any;
    for (let i = 0; i < path.length - 1; i++) {
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
      await apiRequest('/api/settings', {
        method: 'POST',
        data: settings,
      });
      
      // Обновляем кеш запросов
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      
      toast({
        title: 'Настройки сохранены',
        description: 'Изменения успешно применены',
      });
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      toast({
        title: 'Ошибка сохранения',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 p-4 rounded-lg shadow-lg z-50 border border-gray-800 text-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Режим редактирования стилей</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white focus:outline-none"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="text-sm text-gray-300 mb-4">
        Наведите курсор на элемент и кликните для редактирования его стиля
      </div>
      
      {activeElement && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Основной цвет</label>
            <div className="flex items-center space-x-2">
              <input 
                type="color" 
                value={currentSettings.ui.colors.primary}
                onChange={(e) => updateSettingsProperty('ui.colors.primary', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input 
                type="text" 
                value={currentSettings.ui.colors.primary} 
                onChange={(e) => updateSettingsProperty('ui.colors.primary', e.target.value)}
                className="flex-1 bg-gray-800 px-2 py-1 rounded text-sm"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">Вторичный цвет</label>
            <div className="flex items-center space-x-2">
              <input 
                type="color" 
                value={currentSettings.ui.colors.secondary}
                onChange={(e) => updateSettingsProperty('ui.colors.secondary', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input 
                type="text" 
                value={currentSettings.ui.colors.secondary} 
                onChange={(e) => updateSettingsProperty('ui.colors.secondary', e.target.value)}
                className="flex-1 bg-gray-800 px-2 py-1 rounded text-sm"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">Дополнительный цвет</label>
            <div className="flex items-center space-x-2">
              <input 
                type="color" 
                value={currentSettings.ui.colors.accent}
                onChange={(e) => updateSettingsProperty('ui.colors.accent', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input 
                type="text" 
                value={currentSettings.ui.colors.accent} 
                onChange={(e) => updateSettingsProperty('ui.colors.accent', e.target.value)}
                className="flex-1 bg-gray-800 px-2 py-1 rounded text-sm"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Скругленные углы</label>
              <div className="relative inline-block w-10 h-5 rounded-full">
                <input 
                  type="checkbox" 
                  checked={currentSettings.ui.elements.roundedCorners}
                  onChange={(e) => updateSettingsProperty('ui.elements.roundedCorners', e.target.checked)}
                  className="opacity-0 w-0 h-0"
                  id="corners-toggle"
                />
                <label 
                  htmlFor="corners-toggle"
                  className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors duration-200 ease-in-out ${
                    currentSettings.ui.elements.roundedCorners ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span 
                    className={`absolute left-0.5 bottom-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                      currentSettings.ui.elements.roundedCorners ? 'transform translate-x-5' : ''
                    }`}
                  ></span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Тени</label>
              <div className="relative inline-block w-10 h-5 rounded-full">
                <input 
                  type="checkbox" 
                  checked={currentSettings.ui.elements.shadows}
                  onChange={(e) => updateSettingsProperty('ui.elements.shadows', e.target.checked)}
                  className="opacity-0 w-0 h-0"
                  id="shadows-toggle"
                />
                <label 
                  htmlFor="shadows-toggle"
                  className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors duration-200 ease-in-out ${
                    currentSettings.ui.elements.shadows ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span 
                    className={`absolute left-0.5 bottom-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                      currentSettings.ui.elements.shadows ? 'transform translate-x-5' : ''
                    }`}
                  ></span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Анимации</label>
              <div className="relative inline-block w-10 h-5 rounded-full">
                <input 
                  type="checkbox" 
                  checked={currentSettings.ui.elements.animations}
                  onChange={(e) => updateSettingsProperty('ui.elements.animations', e.target.checked)}
                  className="opacity-0 w-0 h-0"
                  id="animations-toggle"
                />
                <label 
                  htmlFor="animations-toggle"
                  className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors duration-200 ease-in-out ${
                    currentSettings.ui.elements.animations ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span 
                    className={`absolute left-0.5 bottom-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                      currentSettings.ui.elements.animations ? 'transform translate-x-5' : ''
                    }`}
                  ></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!activeElement && (
        <div className="text-center py-4 text-gray-400">
          Кликните на элемент для начала редактирования
        </div>
      )}
    </div>
  );
};

export default LiveStyleEditor;