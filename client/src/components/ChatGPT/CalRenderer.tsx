import React, { useEffect, useRef, useState } from 'react';
import { ExtendedMessage } from '@shared/schema';

interface CalRendererProps {
  message: ExtendedMessage;
}

const CalRenderer: React.FC<CalRendererProps> = ({ message }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    if (!containerRef.current || !message.content) return;
    
    // Указываем фиксированные значения для надежности
    const calContainerId = 'my-cal-inline'; 
    const calNamespace = '30min';
    
    // Добавляем Cal.com скрипт
    const addCalScript = (): Promise<void> => {
      return new Promise((resolve) => {
        // Проверяем, не добавлен ли уже скрипт
        const existingScript = document.querySelector('script[src="https://app.cal.com/embed/embed.js"]');
        if (existingScript) {
          console.log('Cal.com script already exists');
          resolve();
          return;
        }

        console.log('Adding Cal.com script');
        const calScript = document.createElement('script');
        calScript.src = 'https://app.cal.com/embed/embed.js';
        calScript.async = true;
        calScript.onload = () => {
          console.log('Cal.com script loaded successfully');
          resolve();
        };
        calScript.onerror = (error) => {
          console.error('Error loading Cal.com script:', error);
          resolve(); // Продолжаем в любом случае
        };
        document.head.appendChild(calScript);
      });
    };
    
    // Инициализируем Cal.com
    const initializeCalInline = () => {
      try {
        console.log(`Initializing Cal.com for container with ID: ${calContainerId}`);
        
        // Создаем и выполняем скрипт инициализации
        const initScript = document.createElement('script');
        initScript.textContent = `
          (function (C, A, L) { 
            let p = function (a, ar) { a.q.push(ar); }; 
            let d = C.document; 
            C.Cal = C.Cal || function () { 
              let cal = C.Cal; 
              let ar = arguments; 
              if (!cal.loaded) { 
                cal.ns = {}; 
                cal.q = cal.q || []; 
                d.head.appendChild(d.createElement("script")).src = A; 
                cal.loaded = true; 
              } 
              if (ar[0] === L) { 
                const api = function () { p(api, arguments); }; 
                const namespace = ar[1]; 
                api.q = api.q || []; 
                if(typeof namespace === "string"){
                  cal.ns[namespace] = cal.ns[namespace] || api;
                  p(cal.ns[namespace], ar);
                  p(cal, ["initNamespace", namespace]);
                } else p(cal, ar); 
                return;
              } 
              p(cal, ar); 
            }; 
          })(window, "https://app.cal.com/embed/embed.js", "init");
          
          Cal("init", "${calNamespace}", {origin:"https://cal.com"});
          
          Cal.ns["${calNamespace}"]("inline", {
            elementOrSelector: "#${calContainerId}",
            config: {"layout":"month_view","theme":"dark"},
            calLink: "dimpulse/30min",
          });
          
          Cal.ns["${calNamespace}"]("ui", {"theme":"dark","hideEventTypeDetails":false,"layout":"month_view"});
        `;
        document.body.appendChild(initScript);
        setLoaded(true);
      } catch (error) {
        console.error('Error initializing Cal.com calendar:', error);
      }
    };
    
    // Очищаем контейнер для нового рендеринга
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    
    // Выполняем инициализацию
    addCalScript().then(() => {
      // Задержка для уверенности, что DOM обновился
      setTimeout(initializeCalInline, 300);
    });
    
    // Очистка при размонтировании компонента
    return () => {
      // Удаляем созданные скрипты при необходимости
    };
  }, [message.content]);
  
  return (
    <div className="cal-container w-full">
      <div 
        id="my-cal-inline" 
        ref={containerRef}
        style={{ 
          width: '100%', 
          height: '700px', 
          overflow: 'auto',
          border: '1px solid #333',
          borderRadius: '8px',
          backgroundColor: '#1a1a1a'
        }}
      />
      {!loaded && (
        <div className="text-center py-4 text-gray-400">Загрузка календаря...</div>
      )}
    </div>
  );
};

export default CalRenderer;