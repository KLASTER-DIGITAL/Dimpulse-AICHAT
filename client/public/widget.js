/**
 * Виджет чата Dimpulse для встраивания на сайты
 * Версия: 1.0.0
 */
(function (window, document) {
  // Базовые настройки виджета
  const config = {
    position: "right",
    theme: "dark",
    buttonColor: "#4b6cf7",
    title: "Dimpulse Chat",
    welcomeMessage: "Привет! Чем могу помочь?",
    pulsation: true,
    icon: null
  };

  // Создаем стили для виджета
  function createStyles() {
    const themeColors = {
      dark: {
        bg: "#1e1e1e",
        header: "#272727",
        text: "#ffffff",
        button: config.buttonColor || "#4b6cf7",
        secondaryText: "#a0a0a0",
        border: "#3a3a3a"
      },
      light: {
        bg: "#ffffff",
        header: "#f5f5f5",
        text: "#333333",
        button: config.buttonColor || "#4b6cf7",
        secondaryText: "#666666",
        border: "#e0e0e0"
      }
    };

    const colors = themeColors[config.theme];
    
    const style = document.createElement("style");
    style.textContent = `
      .chat-widget-container {
        position: fixed;
        ${config.position}: 20px;
        bottom: 20px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      
      .chat-widget-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${colors.button};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
        transition: transform 0.2s ease;
        z-index: 10000;
      }
      
      .chat-widget-button:hover {
        transform: scale(1.05);
      }
      
      ${config.pulsation ? `
      .chat-widget-button:after {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background-color: ${colors.button};
        z-index: -1;
        opacity: 0.6;
        animation: pulse 1.5s infinite;
      }
      
      @keyframes pulse {
        0% {
          transform: scale(1);
          opacity: 0.6;
        }
        70% {
          transform: scale(1.3);
          opacity: 0;
        }
        100% {
          transform: scale(1.3);
          opacity: 0;
        }
      }` : ''}
      
      .chat-widget-button img {
        width: 28px;
        height: 28px;
      }
      
      .chat-widget-icon {
        width: 28px;
        height: 28px;
        fill: white;
      }
      
      .chat-widget-frame {
        position: absolute;
        bottom: 80px;
        ${config.position === "right" ? "right" : "left"}: 0;
        width: 350px;
        height: 450px;
        max-height: 80vh;
        background: ${colors.bg};
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        display: none;
        flex-direction: column;
        transition: all 0.3s ease;
      }
      
      .chat-widget-frame.active {
        display: flex;
      }
      
      .chat-widget-header {
        padding: 16px;
        background: ${colors.header};
        color: ${colors.text};
        font-weight: 600;
        border-bottom: 1px solid ${colors.border};
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .chat-widget-close {
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s;
      }
      
      .chat-widget-close:hover {
        opacity: 1;
      }
      
      .chat-widget-body {
        flex: 1;
        position: relative;
      }
      
      .chat-widget-iframe {
        width: 100%;
        height: 100%;
        border: none;
        position: absolute;
        top: 0;
        left: 0;
      }
    `;
    
    document.head.appendChild(style);
  }

  // Создаем DOM структуру виджета
  function createWidgetDOM() {
    const container = document.createElement("div");
    container.className = "chat-widget-container";
    
    // Создаем кнопку
    const button = document.createElement("div");
    button.className = "chat-widget-button";
    
    // Выбираем иконку
    if (config.icon) {
      const img = document.createElement("img");
      img.src = config.icon;
      img.alt = "Chat";
      button.appendChild(img);
    } else {
      // Иконка чата по умолчанию (SVG)
      button.innerHTML = `<svg class="chat-widget-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="white" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
        <path fill="white" d="M7 9h10v2H7z"/><path fill="white" d="M7 6h7v2H7z"/>
      </svg>`;
    }
    
    // Создаем фрейм для чата
    const frame = document.createElement("div");
    frame.className = "chat-widget-frame";
    
    // Создаем заголовок фрейма
    const header = document.createElement("div");
    header.className = "chat-widget-header";
    
    const title = document.createElement("div");
    title.textContent = config.title;
    
    const closeBtn = document.createElement("div");
    closeBtn.className = "chat-widget-close";
    closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 3.5L3.5 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M3.5 3.5L12.5 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Создаем тело фрейма
    const body = document.createElement("div");
    body.className = "chat-widget-body";
    
    // Создаем iframe для загрузки чата
    const iframe = document.createElement("iframe");
    iframe.className = "chat-widget-iframe";
    iframe.src = `${window.location.origin}/embed?theme=${config.theme}`;
    iframe.title = "Chat";
    iframe.allow = "microphone; camera";
    
    body.appendChild(iframe);
    
    // Собираем виджет
    frame.appendChild(header);
    frame.appendChild(body);
    
    container.appendChild(button);
    container.appendChild(frame);
    
    document.body.appendChild(container);
    
    // Добавляем обработчики событий
    button.addEventListener("click", () => {
      frame.classList.add("active");
    });
    
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      frame.classList.remove("active");
    });
  }

  // Читаем параметры виджета из атрибутов скрипта
  function readConfig() {
    const scripts = document.getElementsByTagName("script");
    const currentScript = scripts[scripts.length - 1];
    
    if (currentScript.hasAttribute("data-position")) {
      config.position = currentScript.getAttribute("data-position");
    }
    
    if (currentScript.hasAttribute("data-theme")) {
      config.theme = currentScript.getAttribute("data-theme");
    }
    
    if (currentScript.hasAttribute("data-button-color")) {
      config.buttonColor = currentScript.getAttribute("data-button-color");
    }
    
    if (currentScript.hasAttribute("data-title")) {
      config.title = currentScript.getAttribute("data-title");
    }
    
    if (currentScript.hasAttribute("data-welcome")) {
      config.welcomeMessage = currentScript.getAttribute("data-welcome");
    }
    
    if (currentScript.hasAttribute("data-pulsation")) {
      config.pulsation = currentScript.getAttribute("data-pulsation") === "true";
    }
    
    if (currentScript.hasAttribute("data-icon")) {
      config.icon = currentScript.getAttribute("data-icon");
    }
  }

  // Инициализация виджета
  function init() {
    readConfig();
    createStyles();
    createWidgetDOM();
  }

  // Запускаем виджет когда DOM полностью загружен
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);