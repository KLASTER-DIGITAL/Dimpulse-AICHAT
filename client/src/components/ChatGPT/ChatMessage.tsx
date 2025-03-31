import React, { useMemo, useEffect, useRef } from "react";
import { ExtendedMessage } from "@shared/schema";
import MarkdownRenderer from "./MarkdownRenderer";
import TypingAnimation from "./TypingAnimation";

interface ChatMessageProps {
  message: ExtendedMessage;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const isTyping = message.typing === true || message.content === "typing";
  const htmlContentRef = useRef<HTMLDivElement>(null);
  
  // Check if the message content contains HTML/iframe or special script content
  const containsHtml = useMemo(() => {
    if (!message.content) return false;
    
    // Check for Cal.com embed code with HTML comments
    if (message.content.includes('<!-- Cal inline embed code begins -->')) {
      return true;
    }
    
    // Check for Cal.com JavaScript code
    if (message.content.includes('Cal(') && message.content.includes('function')) {
      return true;
    }
    
    // Check for regular HTML tags
    return /<\/?[a-z][\s\S]*>/i.test(message.content) && 
           (/<iframe[\s\S]*?<\/iframe>/i.test(message.content) || 
            /<div[\s\S]*?<\/div>/i.test(message.content) ||
            /<script[\s\S]*?<\/script>/i.test(message.content) ||
            /<embed[\s\S]*?>/i.test(message.content));
  }, [message.content]);
  
  // Execute scripts after component mounts or updates
  useEffect(() => {
    if (!containsHtml || !htmlContentRef.current) return;
    
    // For messages with Cal.com script
    if (message.content.includes('<!-- Cal inline embed code begins -->') || 
       (message.content.includes('Cal(') && message.content.includes('function'))) {
      
      // Allow time for DOM to update
      setTimeout(() => {
        const scripts = htmlContentRef.current?.querySelectorAll('script');
        
        if (scripts && scripts.length > 0) {
          console.log(`Found ${scripts.length} scripts to execute in message`);
          
          // Execute each script
          scripts.forEach((oldScript) => {
            const newScript = document.createElement('script');
            
            // Copy attributes
            Array.from(oldScript.attributes).forEach(attr => {
              newScript.setAttribute(attr.name, attr.value);
            });
            
            // Copy content
            newScript.textContent = oldScript.textContent;
            
            // Replace old script with new to trigger execution
            oldScript.parentNode?.replaceChild(newScript, oldScript);
          });
        }
      }, 500);
    }
  }, [containsHtml, message.content]);
  
  // Render different content based on message type
  const renderContent = () => {
    if (isTyping) {
      return (
        <div className="flex items-center">
          <TypingAnimation />
        </div>
      );
    }
    
    // Special case for Cal.com embed with HTML comments
    if (message.content.includes('<!-- Cal inline embed code begins -->') || 
        (message.content.includes('Cal(') && message.content.includes('function'))) {
      
      // Generate a unique ID for this Cal.com instance
      const calContainerId = `cal-container-${message.id}`;
      
      // Directly use HTML with comments format, but update container ID to be unique
      // This preserves the entire Cal.com script exactly as provided
      if (message.content.includes('<!-- Cal inline embed code begins -->')) {
        // Extract the script content from the message
        const scriptContentMatch = message.content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        const originalScriptContent = scriptContentMatch ? scriptContentMatch[1] : '';
        
        // Create completely new content with updated IDs
        const modifiedContent = `
          <!-- Cal inline embed code begins -->
          <div style="width:100%;height:600px;overflow:auto" id="${calContainerId}"></div>
          <script type="text/javascript">
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
            
            Cal("init", "${calContainerId}", {origin:"https://cal.com"});
            
            Cal.ns["${calContainerId}"]("inline", {
              elementOrSelector:"#${calContainerId}",
              config: {"layout":"month_view","theme":"dark"},
              calLink: "dimpulse/30min",
            });
            
            Cal.ns["${calContainerId}"]("ui", {"theme":"dark","hideEventTypeDetails":false,"layout":"month_view"});
          </script>
          <!-- Cal inline embed code ends -->
        `;
        
        // After the browser renders this, we need to ensure the Cal.com script is loaded
        useEffect(() => {
          if (htmlContentRef.current) {
            // Load Cal.com script and wait for it to be ready
            const loadCalScript = () => {
              return new Promise<void>((resolve) => {
                // Check if script already exists
                const existingScript = document.querySelector('script[src="https://app.cal.com/embed/embed.js"]');
                if (existingScript) {
                  resolve();
                  return;
                }
                
                // Create new script element
                const calScript = document.createElement('script');
                calScript.src = 'https://app.cal.com/embed/embed.js';
                calScript.async = true;
                calScript.onload = () => resolve();
                document.head.appendChild(calScript);
              });
            };
            
            // Initialize Cal after script loading
            const initCal = () => {
              setTimeout(() => {
                try {
                  console.log(`Executing Cal.com initialization for ${calContainerId}`);
                  
                  // Find script tags and execute them
                  const scripts = htmlContentRef.current?.querySelectorAll('script');
                  if (scripts && scripts.length > 0) {
                    scripts.forEach((oldScript) => {
                      const newScript = document.createElement('script');
                      Array.from(oldScript.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                      });
                      
                      // Make sure script content uses the unique ID
                      let scriptContent = oldScript.textContent || '';
                      if (scriptContent.includes('Cal(') || scriptContent.includes('elementOrSelector')) {
                        // Ensure correct ID usage in script
                        scriptContent = scriptContent
                          .replace(/Cal\("init", "[^"]+"/g, `Cal("init", "${calContainerId}"`)
                          .replace(/elementOrSelector:"[^"]+"/g, `elementOrSelector:"#${calContainerId}"`);
                      }
                      
                      newScript.textContent = scriptContent;
                      document.body.appendChild(newScript);
                    });
                  }
                } catch (error) {
                  console.error('Error initializing Cal.com:', error);
                }
              }, 500);
            };
            
            // Execute initialization sequence
            loadCalScript().then(initCal);
          }
        }, [message.id, calContainerId]);
        
        return (
          <div 
            ref={htmlContentRef}
            className="html-content w-full" 
            dangerouslySetInnerHTML={{ __html: modifiedContent }}
          />
        );
      }
      
      // If it's a Cal.com message without HTML comments, we'll create a special implementation
      if (message.content.includes('Cal(') && message.content.includes('function')) {
        // Create custom HTML with unique container ID
        const customHtml = `
          <div style="width:100%;height:600px;overflow:auto" id="${calContainerId}"></div>
          <script type="text/javascript">
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
            
            Cal("init", "${calContainerId}", {origin:"https://cal.com"});
            
            Cal.ns["${calContainerId}"]("inline", {
              elementOrSelector:"#${calContainerId}",
              config: {"layout":"month_view","theme":"dark"},
              calLink: "dimpulse/30min",
            });
            
            Cal.ns["${calContainerId}"]("ui", {"theme":"dark","hideEventTypeDetails":false,"layout":"month_view"});
          </script>
        `;
        
        // Effect for script initialization
        useEffect(() => {
          if (htmlContentRef.current) {
            // Load Cal.com script first
            const loadCalScript = () => {
              return new Promise<void>((resolve) => {
                const existingScript = document.querySelector('script[src="https://app.cal.com/embed/embed.js"]');
                if (existingScript) {
                  resolve();
                  return;
                }
                
                const calScript = document.createElement('script');
                calScript.src = 'https://app.cal.com/embed/embed.js';
                calScript.async = true;
                calScript.onload = () => resolve();
                document.head.appendChild(calScript);
              });
            };
            
            // Initialize Cal script
            const initCalScript = () => {
              setTimeout(() => {
                try {
                  console.log(`Initializing Cal.com for container: ${calContainerId}`);
                  const scripts = htmlContentRef.current?.querySelectorAll('script');
                  if (scripts && scripts.length > 0) {
                    scripts.forEach((oldScript) => {
                      const newScript = document.createElement('script');
                      Array.from(oldScript.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                      });
                      newScript.textContent = oldScript.textContent;
                      document.body.appendChild(newScript);
                    });
                  }
                } catch (error) {
                  console.error('Error executing Cal.com script:', error);
                }
              }, 500);
            };
            
            // Execute initialization sequence
            loadCalScript().then(initCalScript);
          }
        }, [message.id, calContainerId]);
        
        return (
          <div 
            ref={htmlContentRef}
            className="html-content w-full" 
            dangerouslySetInnerHTML={{ __html: customHtml }}
          />
        );
      }
      
      // Fallback for Cal.com content
      return (
        <div 
          ref={htmlContentRef}
          className="html-content w-full" 
          dangerouslySetInnerHTML={{ __html: message.content }}
        />
      );
    }
    
    // For other HTML content
    if (containsHtml) {
      return (
        <div 
          ref={htmlContentRef}
          className="html-content w-full"
          dangerouslySetInnerHTML={{ __html: message.content }}
        />
      );
    }
    
    // Default for markdown content
    return (
      <div className="markdown">
        <MarkdownRenderer content={message.content} />
      </div>
    );
  };
  
  // Функция для отображения файлов
  const renderFiles = () => {
    if (!message.files || message.files.length === 0) return null;
    
    return (
      <div className="file-attachments mt-2 space-y-2">
        {message.files.map((file, index) => (
          <div key={index} className="file-item flex items-center p-2 bg-[#202020] rounded-md">
            {file.type.startsWith('image/') ? (
              // Отображаем превью для изображений
              <div className="w-10 h-10 mr-3 rounded-md overflow-hidden bg-black flex-shrink-0">
                <img 
                  src={file.content} 
                  alt={file.name}
                  className="w-full h-full object-cover" 
                />
              </div>
            ) : (
              // Отображаем иконку для других типов файлов
              <div className="w-10 h-10 flex items-center justify-center mr-3 bg-[#2b2b2b] rounded-md flex-shrink-0">
                {file.type.includes('pdf') ? (
                  // Иконка для PDF
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M9 15L15 15"></path>
                    <path d="M9 11L15 11"></path>
                  </svg>
                ) : (
                  // Иконка для прочих файлов
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                )}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <div className="text-sm text-white font-medium truncate">{file.name}</div>
              <div className="text-xs text-gray-400">
                {file.type.split('/')[1]?.toUpperCase() || 'ФАЙЛ'} • {(file.size / 1024).toFixed(0)} КБ
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`message ${isUser ? "user-message" : "assistant-message"} chat-message mb-6`}>
      {isUser ? (
        <div className="flex flex-col items-end mb-4">
          <div className="user-message bg-gray-800 rounded-full py-2 px-4 max-w-[80%] text-white shadow-sm">
            {message.content}
          </div>
          
          {/* Отображаем прикрепленные файлы пользователя */}
          {message.files && message.files.length > 0 && (
            <div className="mt-2 max-w-[80%]">
              {renderFiles()}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-start w-full">
          <div className={`assistant-message flex-1 text-white p-3 rounded-lg ${containsHtml ? 'w-full' : ''}`}>
            {renderContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
