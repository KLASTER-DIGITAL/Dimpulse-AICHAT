(function() {
  // Получаем настройки из атрибутов скрипта
  const scriptTag = document.currentScript;
  const position = scriptTag.getAttribute('data-position') || 'right';
  const theme = scriptTag.getAttribute('data-theme') || 'dark'; // Можно игнорировать, будем использовать CSS переменные
  const fontSize = scriptTag.getAttribute('data-font-size') || '16';
  const greetingText = scriptTag.getAttribute('data-greeting') || 'AI Ассистент';
  const pulsation = scriptTag.getAttribute('data-pulsation') !== 'false'; // По умолчанию включено
  
  // Получаем настройки цветов с сервера или используем переданные в атрибутах
  let buttonColor = scriptTag.getAttribute('data-button-color') || '#19c37d';
  let backgroundColor = scriptTag.getAttribute('data-background-color') || '#1e1e1e';
  let headerColor = scriptTag.getAttribute('data-header-color') || '#272727';
  let textColor = scriptTag.getAttribute('data-text-color') || '#ffffff';
  
  // CSS переменные для стилей виджета
  const cssVariables = `
    :root {
      --widget-bg-color: ${backgroundColor};
      --widget-header-color: ${headerColor};
      --widget-text-color: ${textColor};
      --widget-button-color: ${buttonColor};
    }
  `;
  
  // Создаем стили для виджета с поддержкой пульсации
  const style = document.createElement('style');
  style.textContent = cssVariables + `
    /* Глобальный стиль для текста */
    .website-widget-text {
      font-size: ${fontSize}px;
      color: var(--widget-text-color);
    }
    
    /* Контейнер для виджета */
    .website-widget-container {
      position: fixed;
      bottom: 20px;
      ${position === 'right' ? 'right: 20px' : 'left: 20px'};
      z-index: 9999;
    }
    
    /* Кнопка виджета */
    .website-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: var(--widget-button-color);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      border: none;
      ${pulsation ? 'animation: pulse 2s infinite;' : ''}
    }
    
    /* Анимация пульсации */
    @keyframes pulse {
      0% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(25, 195, 125, 0.7);
      }
      
      70% {
        transform: scale(1.05);
        box-shadow: 0 0 0 10px rgba(25, 195, 125, 0);
      }
      
      100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(25, 195, 125, 0);
      }
    }
    
    .website-widget-button:hover {
      transform: scale(1.1);
      animation-play-state: paused;
    }
    
    .website-widget-icon {
      width: 30px;
      height: 30px;
    }
    
    /* Окно чата */
    .website-widget {
      position: fixed;
      bottom: 90px;
      ${position === 'right' ? 'right: 20px' : 'left: 20px'};
      width: 350px;
      height: 500px;
      background-color: var(--widget-bg-color);
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      z-index: 9998;
      overflow: hidden;
      display: none;
      flex-direction: column;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    /* Контейнер для iframe */
    .website-widget-iframe-container {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .website-widget.active {
      display: flex;
    }
    
    /* Заголовок виджета */
    .website-widget-header {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: var(--widget-header-color);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .website-widget-title {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--widget-text-color);
    }
    
    .website-widget-close {
      background: transparent;
      border: none;
      color: var(--widget-text-color);
      cursor: pointer;
      font-size: 16px;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    
    .website-widget-close:hover {
      opacity: 1;
    }
    
    .website-widget-iframe {
      flex: 1;
      width: 100%;
      height: 100%;
      border: none;
      background-color: var(--widget-bg-color);
    }
    
    /* Адаптивные стили для мобильных устройств */
    @media (max-width: 480px) {
      .website-widget {
        width: 90% !important;
        left: 5% !important;
        right: 5% !important;
        bottom: 80px !important;
      }
      
      .website-widget-button {
        width: 50px;
        height: 50px;
      }
      
      .website-widget-icon {
        width: 24px;
        height: 24px;
      }
    }
  `;
  
  document.head.appendChild(style);
  
  // Создаем контейнер для всего виджета
  const widgetContainer = document.createElement('div');
  widgetContainer.className = 'website-widget-container';
  
  // Создаем HTML для кнопки виджета
  const button = document.createElement('button');
  button.className = 'website-widget-button';
  button.innerHTML = `
    <svg class="website-widget-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7117 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0034 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92176 4.44061 8.37485 5.27072 7.03255C6.10083 5.69025 7.28825 4.60557 8.7 3.9C9.87812 3.30493 11.1801 2.99656 12.5 3H13C15.0843 3.11499 17.053 3.99476 18.5291 5.47086C20.0052 6.94696 20.885 8.91565 21 11V11.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  
  // Получаем URL сервера из источника скрипта
  let serverUrl = '';
  try {
    const scriptSrc = scriptTag.src;
    const url = new URL(scriptSrc);
    serverUrl = `${url.protocol}//${url.host}`;
  } catch (e) {
    console.error('Ошибка при получении URL сервера:', e);
    // Резервный вариант
    serverUrl = scriptTag.src.split('/widget.js')[0];
  }
  
  // Создаем HTML для окна чата
  const chatWidget = document.createElement('div');
  chatWidget.className = 'website-widget';
  
  // Применяем размеры виджета если они указаны
  chatWidget.style.width = scriptTag.getAttribute('data-width') || '350px';
  chatWidget.style.height = scriptTag.getAttribute('data-height') || '500px';
  
  chatWidget.innerHTML = `
    <div class="website-widget-header">
      <span class="website-widget-title website-widget-text">${greetingText}</span>
      <button class="website-widget-close">✕</button>
    </div>
    <div class="website-widget-iframe-container">
      <iframe class="website-widget-iframe" src="${serverUrl}?embed=true&fontSize=${fontSize}"></iframe>
    </div>
  `;
  
  // Добавляем все элементы в контейнер
  widgetContainer.appendChild(chatWidget);
  widgetContainer.appendChild(button);
  
  // Добавляем контейнер на страницу
  document.body.appendChild(widgetContainer);
  
  // Обработчики событий
  button.addEventListener('click', function() {
    chatWidget.classList.add('active');
    button.style.display = 'none';
  });
  
  chatWidget.querySelector('.website-widget-close').addEventListener('click', function() {
    chatWidget.classList.remove('active');
    button.style.display = 'flex';
  });
  
  // Устанавливаем функцию для получения настроек от сервера
  window.updateWidgetSettings = function(settings) {
    if (!settings) return;
    
    try {
      // Обновляем переменные CSS
      if (settings.widget) {
        document.documentElement.style.setProperty('--widget-bg-color', settings.widget.backgroundColor || '#1e1e1e');
        document.documentElement.style.setProperty('--widget-header-color', settings.widget.headerColor || '#272727');
        document.documentElement.style.setProperty('--widget-text-color', settings.widget.textColor || '#ffffff');
        document.documentElement.style.setProperty('--widget-button-color', settings.widget.buttonColor || '#19c37d');
        
        // Обновляем заголовок
        const titleElement = chatWidget.querySelector('.website-widget-title');
        if (titleElement && settings.widget.title) {
          titleElement.textContent = settings.widget.title;
        }
        
        // Включаем или выключаем пульсацию
        if (settings.widget.pulsation) {
          button.style.animation = 'pulse 2s infinite';
        } else {
          button.style.animation = 'none';
        }
      }
    } catch (error) {
      console.error('Ошибка при обновлении настроек виджета:', error);
    }
  };
})();