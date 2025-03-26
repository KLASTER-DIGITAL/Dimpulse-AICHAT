(function() {
  // Получаем настройки из атрибутов скрипта
  const scriptTag = document.currentScript;
  const position = scriptTag.getAttribute('data-position') || 'right';
  const theme = scriptTag.getAttribute('data-theme') || 'dark';
  const fontSize = scriptTag.getAttribute('data-font-size') || '16';
  const greetingText = scriptTag.getAttribute('data-greeting') || 'Онлайн-чат';
  
  // Создаем стили для виджета с поддержкой пульсации и улучшенными темами
  const style = document.createElement('style');
  style.textContent = `
    /* Глобальный стиль для текста */
    .chat-widget-text {
      font-size: ${fontSize}px;
    }
    .chat-widget-button {
      position: fixed;
      bottom: 20px;
      ${position === 'right' ? 'right: 20px' : 'left: 20px'};
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: ${theme === 'light' ? '#ffffff' : '#202123'};
      color: ${theme === 'light' ? '#202123' : '#ffffff'};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      transition: all 0.3s ease;
      border: none;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 ${theme === 'light' ? 'rgba(32, 33, 35, 0.4)' : 'rgba(255, 255, 255, 0.4)'};
        transform: scale(1);
      }
      70% {
        box-shadow: 0 0 0 10px ${theme === 'light' ? 'rgba(32, 33, 35, 0)' : 'rgba(255, 255, 255, 0)'};
        transform: scale(1.05);
      }
      100% {
        box-shadow: 0 0 0 0 ${theme === 'light' ? 'rgba(32, 33, 35, 0)' : 'rgba(255, 255, 255, 0)'};
        transform: scale(1);
      }
    }
    
    .chat-widget-button:hover {
      transform: scale(1.1);
      animation-play-state: paused;
    }
    
    .chat-widget-icon {
      width: 30px;
      height: 30px;
    }
    
    .chat-widget-container {
      position: fixed;
      bottom: 90px;
      ${position === 'right' ? 'right: 20px' : 'left: 20px'};
      width: 350px;
      height: 500px;
      background-color: ${theme === 'light' ? '#ffffff' : '#202123'};
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      z-index: 9998;
      overflow: hidden;
      display: none;
      flex-direction: column;
      border: 1px solid ${theme === 'light' ? '#e5e5e5' : '#333333'};
    }
    
    /* Стили для расположения текстового поля внизу чата */
    .chat-widget-iframe-container {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .chat-widget-container.open {
      display: flex;
    }
    
    .chat-widget-header {
      padding: 16px;
      border-bottom: 1px solid ${theme === 'light' ? '#e5e5e5' : '#333333'};
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: ${theme === 'light' ? '#f8f8f8' : '#1a1a1a'};
    }
    
    .chat-widget-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: ${theme === 'light' ? '#202123' : '#ffffff'};
    }
    
    .chat-widget-close {
      background: transparent;
      border: none;
      color: ${theme === 'light' ? '#202123' : '#ffffff'};
      cursor: pointer;
      font-size: 16px;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .chat-widget-iframe {
      flex: 1;
      width: 100%;
      height: 100%;
      border: none;
      background-color: ${theme === 'light' ? '#ffffff' : '#202123'};
    }
  `;
  
  document.head.appendChild(style);
  
  // Создаем HTML для кнопки виджета
  const button = document.createElement('button');
  button.className = 'chat-widget-button';
  button.innerHTML = `
    <svg class="chat-widget-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  
  // Создаем HTML для контейнера чата
  const container = document.createElement('div');
  container.className = 'chat-widget-container';
  
  // Применяем размеры виджета если они указаны
  container.style.width = scriptTag.getAttribute('data-width') || '350px';
  container.style.height = scriptTag.getAttribute('data-height') || '500px';
  
  container.innerHTML = `
    <div class="chat-widget-header">
      <h3 class="chat-widget-title chat-widget-text">${greetingText}</h3>
      <button class="chat-widget-close">✕</button>
    </div>
    <div class="chat-widget-iframe-container">
      <iframe class="chat-widget-iframe" src="${serverUrl}?embed=true&theme=${theme}&fontSize=${fontSize}"></iframe>
    </div>
  `;
  
  // Добавляем элементы на страницу
  document.body.appendChild(button);
  document.body.appendChild(container);
  
  // Обработчики событий
  button.addEventListener('click', function() {
    container.classList.add('open');
    button.style.display = 'none';
  });
  
  container.querySelector('.chat-widget-close').addEventListener('click', function() {
    container.classList.remove('open');
    button.style.display = 'flex';
  });
})();