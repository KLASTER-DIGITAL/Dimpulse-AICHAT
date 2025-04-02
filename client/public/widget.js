(function() {
  // Получаем настройки из атрибутов скрипта
  const scriptTag = document.currentScript;
  const position = scriptTag.getAttribute('data-position') || 'right';
  const theme = scriptTag.getAttribute('data-theme') || 'dark';
  const fontSize = scriptTag.getAttribute('data-font-size') || '16';
  const greetingText = scriptTag.getAttribute('data-greeting') || 'Есть вопросы? пишите!';
  const pulsation = scriptTag.getAttribute('data-pulsation') !== 'false'; // По умолчанию включено
  const widgetWidth = scriptTag.getAttribute('data-width') || '640';
  const widgetHeight = scriptTag.getAttribute('data-height') || '480';
  const customIcon = scriptTag.getAttribute('data-icon') || ''; // Кастомная иконка, если указана
  
  // Получаем настройки цветов или используем дефолтные
  let buttonColor = scriptTag.getAttribute('data-button-color') || '#4b6cf7';
  let backgroundColor = theme === 'dark' ? '#111827' : '#ffffff';
  let headerColor = theme === 'dark' ? '#1f2937' : '#f9fafb';
  let textColor = theme === 'dark' ? '#ffffff' : '#111827';
  let inputBackgroundColor = theme === 'dark' ? '#1f2937' : '#f3f4f6';
  let inputTextColor = theme === 'dark' ? '#e5e7eb' : '#111827';
  
  // CSS переменные для стилей виджета
  const cssVariables = `
    :root {
      --widget-bg-color: ${backgroundColor};
      --widget-header-color: ${headerColor};
      --widget-text-color: ${textColor};
      --widget-button-color: ${buttonColor};
      --widget-input-bg-color: ${inputBackgroundColor};
      --widget-input-text-color: ${inputTextColor};
      --widget-border-color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
      --widget-shadow-color: ${theme === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.1)'};
    }
  `;
  
  // Создаем стили для виджета с поддержкой пульсации и кастомной кнопкой
  const style = document.createElement('style');
  style.textContent = cssVariables + `
    /* Глобальный стиль для текста */
    .intercom-widget-text {
      font-size: ${fontSize}px;
      color: var(--widget-text-color);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }
    
    /* Контейнер для виджета */
    .intercom-widget-container {
      position: fixed;
      bottom: 20px;
      ${position === 'right' ? 'right: 20px' : 'left: 20px'};
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }
    
    /* Кнопка вызова виджета */
    .intercom-widget-launcher {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: var(--widget-button-color);
      color: white;
      box-shadow: 0 4px 12px var(--widget-shadow-color);
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      text-align: center;
      ${pulsation ? 'animation: intercom-pulse 2s infinite;' : ''}
    }
    
    .intercom-widget-launcher-icon {
      width: 28px;
      height: 28px;
      transition: all 0.3s ease;
    }
    
    /* Пузырек с приветственным сообщением */
    .intercom-widget-greeting {
      position: absolute;
      bottom: 70px;
      ${position === 'right' ? 'right: 0' : 'left: 0'};
      width: 260px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      padding: 12px 16px;
      transform-origin: bottom right;
      animation: intercom-pop-in 0.3s ease forwards;
      pointer-events: none;
      display: block; /* Всегда отображается */
      opacity: 1 !important; /* Принудительная видимость */
      visibility: visible !important; /* Принудительная видимость */
    }
    
    .intercom-widget-greeting::after {
      content: '';
      position: absolute;
      bottom: -8px;
      ${position === 'right' ? 'right: 20px' : 'left: 20px'};
      width: 16px;
      height: 16px;
      background-color: white;
      transform: rotate(45deg);
      z-index: -1;
    }
    
    .intercom-widget-greeting p {
      margin: 0;
      color: #111827;
      font-size: 14px;
      line-height: 1.4;
    }
    
    /* Анимация пульсации */
    @keyframes intercom-pulse {
      0% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(75, 108, 247, 0.7);
      }
      
      70% {
        transform: scale(1.05);
        box-shadow: 0 0 0 10px rgba(75, 108, 247, 0);
      }
      
      100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(75, 108, 247, 0);
      }
    }
    
    @keyframes intercom-pop-in {
      0% {
        opacity: 0;
        transform: scale(0.8) translateY(10px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    .intercom-widget-launcher:hover {
      transform: scale(1.05);
      animation-play-state: paused;
    }
    
    /* Окно чата */
    .intercom-widget-chatbox {
      position: fixed;
      bottom: 90px;
      ${position === 'right' ? 'right: 20px' : 'left: 20px'};
      width: ${widgetWidth}px;
      height: ${widgetHeight}px;
      background-color: var(--widget-bg-color);
      border-radius: 16px;
      box-shadow: 0 8px 24px var(--widget-shadow-color);
      z-index: 9998;
      overflow: hidden;
      display: none;
      flex-direction: column;
      border: 1px solid var(--widget-border-color);
      transition: all 0.3s ease;
    }
    
    .intercom-widget-chatbox.active {
      display: flex;
    }
    
    /* Заголовок виджета */
    .intercom-widget-header {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: var(--widget-header-color);
      border-bottom: 1px solid var(--widget-border-color);
    }
    
    .intercom-widget-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--widget-text-color);
    }
    
    .intercom-widget-controls {
      display: flex;
      gap: 8px;
    }
    
    .intercom-widget-button {
      background: transparent;
      border: none;
      color: var(--widget-text-color);
      cursor: pointer;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: opacity 0.2s;
      border-radius: 4px;
      padding: 0;
    }
    
    .intercom-widget-button:hover {
      opacity: 1;
      background-color: rgba(0, 0, 0, 0.1);
    }
    
    .intercom-widget-expand {
      color: var(--widget-text-color);
      opacity: 0.7;
    }
    
    .intercom-widget-expand svg, .intercom-widget-close svg {
      width: 18px;
      height: 18px;
    }
    
    /* Контейнер для iframe */
    .intercom-widget-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: var(--widget-bg-color);
    }
    
    .intercom-widget-iframe {
      flex: 1;
      width: 100%;
      height: 100%;
      border: none;
      background-color: var(--widget-bg-color);
    }
    
    /* Адаптивные стили для мобильных устройств */
    @media (max-width: 768px) {
      .intercom-widget-chatbox {
        width: 100% !important;
        height: 70% !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        border-radius: 16px 16px 0 0;
      }
      
      .intercom-widget-launcher {
        width: 52px;
        height: 52px;
      }
      
      .intercom-widget-launcher-icon {
        width: 24px;
        height: 24px;
      }
    }
  `;
  
  document.head.appendChild(style);
  
  // Создаем контейнер для всего виджета
  const widgetContainer = document.createElement('div');
  widgetContainer.className = 'intercom-widget-container';
  
  // Создаем HTML для кнопки вызова с приветственным пузырьком
  const launcherButton = document.createElement('button');
  launcherButton.className = 'intercom-widget-launcher';
  launcherButton.setAttribute('aria-label', 'Открыть чат');
  
  // Добавляем пузырек с приветственным сообщением
  const greetingBubble = document.createElement('div');
  greetingBubble.className = 'intercom-widget-greeting active';
  greetingBubble.innerHTML = `<p>${greetingText}</p>`;
  
  // Иконка для кнопки чата
  if (customIcon) {
    // Если указана пользовательская иконка, используем её
    if (customIcon.startsWith('http') || customIcon.startsWith('data:')) {
      // Это URL или data-URL изображения
      launcherButton.innerHTML = `<img class="intercom-widget-launcher-icon" src="${customIcon}" alt="Чат" />`;
    } else {
      // Считаем, что это HTML-код для SVG
      launcherButton.innerHTML = customIcon;
    }
  } else {
    // Стандартная иконка чата
    launcherButton.innerHTML = `
      <svg class="intercom-widget-launcher-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7117 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0034 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92176 4.44061 8.37485 5.27072 7.03255C6.10083 5.69025 7.28825 4.60557 8.7 3.9C9.87812 3.30493 11.1801 2.99656 12.5 3H13C15.0843 3.11499 17.053 3.99476 18.5291 5.47086C20.0052 6.94696 20.885 8.91565 21 11V11.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }
  
  // Прикрепляем пузырек к кнопке
  launcherButton.appendChild(greetingBubble);
  
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
  const chatbox = document.createElement('div');
  chatbox.className = 'intercom-widget-chatbox';
  
  // Содержимое окна чата
  chatbox.innerHTML = `
    <div class="intercom-widget-header">
      <span class="intercom-widget-title intercom-widget-text">${greetingText}</span>
      <div class="intercom-widget-controls">
        <button class="intercom-widget-button intercom-widget-expand" aria-label="Развернуть чат">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        </button>
        <button class="intercom-widget-button intercom-widget-close" aria-label="Закрыть чат">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    <div class="intercom-widget-content">
      <iframe class="intercom-widget-iframe" src="${serverUrl}?embed=true&fontSize=${fontSize}" title="Чат поддержки"></iframe>
    </div>
  `;
  
  // Добавляем все элементы в контейнер
  widgetContainer.appendChild(chatbox);
  widgetContainer.appendChild(launcherButton);
  
  // Добавляем контейнер на страницу
  document.body.appendChild(widgetContainer);
  
  // Переменная для отслеживания состояния расширенного вида
  let isExpanded = false;
  const defaultWidthPx = parseInt(widgetWidth);
  const defaultHeightPx = parseInt(widgetHeight);
  // Используем указанные размеры из настроек, а не вычисленные проценты
  const expandedWidthPx = Math.max(defaultWidthPx, 640); // Минимум 640px при расширении
  const expandedHeightPx = Math.max(defaultHeightPx, 480); // Минимум 480px при расширении
  
  // Обработчики событий
  launcherButton.addEventListener('click', function() {
    // Устанавливаем размеры чата согласно настройкам сразу при открытии
    // Сначала удаляем любые инлайн-стили, чтобы применились стандартные из CSS
    chatbox.style.removeProperty('width');
    chatbox.style.removeProperty('height');
    // Затем устанавливаем точные размеры из настроек
    setTimeout(() => {
      chatbox.style.width = `${defaultWidthPx}px`;
      chatbox.style.height = `${defaultHeightPx}px`;
    }, 10);
    
    chatbox.classList.add('active');
    launcherButton.style.display = 'none';
  });
  
  // Обработчик закрытия чата
  chatbox.querySelector('.intercom-widget-close').addEventListener('click', function() {
    chatbox.classList.remove('active');
    launcherButton.style.display = 'flex';
    
    // Если виджет был в развернутом виде, возвращаем к обычному размеру
    if (isExpanded) {
      toggleExpandChat();
    }
  });
  
  // Обработчик разворачивания/сворачивания чата
  const expandButton = chatbox.querySelector('.intercom-widget-expand');
  
  // Функция для переключения состояния расширенного вида
  function toggleExpandChat() {
    isExpanded = !isExpanded;
    
    if (isExpanded) {
      // Расширяем
      chatbox.style.width = `${expandedWidthPx}px`;
      chatbox.style.height = `${expandedHeightPx}px`;
      expandButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
        </svg>
      `;
    } else {
      // Возвращаем к обычному размеру
      chatbox.style.width = `${defaultWidthPx}px`;
      chatbox.style.height = `${defaultHeightPx}px`;
      expandButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
        </svg>
      `;
    }
  }
  
  expandButton.addEventListener('click', toggleExpandChat);
  
  // Устанавливаем функцию для обновления настроек от сервера
  window.updateWidgetSettings = function(settings) {
    if (!settings) return;
    
    try {
      // Обновляем переменные CSS
      if (settings.widget) {
        if (settings.widget.backgroundColor) {
          document.documentElement.style.setProperty('--widget-bg-color', settings.widget.backgroundColor);
        }
        if (settings.widget.headerColor) {
          document.documentElement.style.setProperty('--widget-header-color', settings.widget.headerColor);
        }
        if (settings.widget.textColor) {
          document.documentElement.style.setProperty('--widget-text-color', settings.widget.textColor);
        }
        if (settings.widget.buttonColor) {
          document.documentElement.style.setProperty('--widget-button-color', settings.widget.buttonColor);
          
          // Обновляем цвет пульсации
          const pulseKeyframes = `
            @keyframes intercom-pulse {
              0% {
                transform: scale(1);
                box-shadow: 0 0 0 0 ${settings.widget.buttonColor}70;
              }
              70% {
                transform: scale(1.05);
                box-shadow: 0 0 0 10px ${settings.widget.buttonColor}00;
              }
              100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 ${settings.widget.buttonColor}00;
              }
            }
          `;
          
          // Добавляем обновленные keyframes
          const styleElement = document.createElement('style');
          styleElement.textContent = pulseKeyframes;
          document.head.appendChild(styleElement);
        }
        
        // Обновляем заголовок и текст приветствия
        if (settings.widget.title) {
          const titleElement = chatbox.querySelector('.intercom-widget-title');
          if (titleElement) {
            titleElement.textContent = settings.widget.title;
          }
        }
        
        if (settings.widget.greetingText) {
          const greetingElement = greetingBubble.querySelector('p');
          if (greetingElement) {
            greetingElement.textContent = settings.widget.greetingText;
          }
        }
        
        // Включаем или выключаем пульсацию
        if (settings.widget.pulsation !== undefined) {
          launcherButton.style.animation = settings.widget.pulsation ? 'intercom-pulse 2s infinite' : 'none';
        }
        
        // Обновляем размеры
        if (settings.widget.width) {
          chatbox.style.width = `${settings.widget.width}px`;
        }
        if (settings.widget.height) {
          chatbox.style.height = `${settings.widget.height}px`;
        }
      }
    } catch (error) {
      console.error('Ошибка при обновлении настроек виджета:', error);
    }
  };
})();