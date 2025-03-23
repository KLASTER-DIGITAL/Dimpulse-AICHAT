import { Message } from "@shared/schema";
import MarkdownRenderer from "./MarkdownRenderer";
import TypingAnimation from "./TypingAnimation";
import { useRef, useEffect, useState } from "react";

interface ChatMessageProps {
  message: Message & { typing?: boolean };
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const isTyping = message.typing === true || message.content === "typing";
  const messageRef = useRef<HTMLDivElement>(null);
  const [processedContent, setProcessedContent] = useState(message.content || "");
  
  // Обработка JSON в сообщениях, если это ответ от webhook
  useEffect(() => {
    if (!isUser && message.content) {
      try {
        // Проверяем, не JSON ли это
        if (message.content.trim().startsWith('{') && message.content.trim().endsWith('}')) {
          const jsonData = JSON.parse(message.content);
          
          // Извлекаем текст из разных возможных форматов JSON
          let textContent = "";
          
          // Проверяем различные форматы ответов
          if (jsonData.choices && jsonData.choices[0]) {
            if (jsonData.choices[0].message && jsonData.choices[0].message.content) {
              textContent = jsonData.choices[0].message.content;
            } else if (jsonData.choices[0].text) {
              textContent = jsonData.choices[0].text;
            }
          } else if (jsonData.response) {
            textContent = jsonData.response;
          } else if (jsonData.message) {
            textContent = jsonData.message;
          } else if (jsonData.content) {
            textContent = jsonData.content;
          } else if (jsonData.text) {
            textContent = jsonData.text;
          }
          
          // Если удалось извлечь текст, используем его
          if (textContent) {
            setProcessedContent(textContent);
          }
        }
      } catch (e) {
        // Если не удалось разобрать JSON, оставляем оригинальный контент
        console.log("Не удалось разобрать JSON:", e);
      }
    }
  }, [message.content, isUser]);
  
  // Добавляем класс анимации после монтирования
  useEffect(() => {
    if (messageRef.current) {
      setTimeout(() => {
        messageRef.current?.classList.add('message-appear');
      }, 10);
    }
  }, []);
  
  return (
    <div 
      ref={messageRef}
      className={`message ${isUser ? "user-message" : "ai-message"} mb-6 opacity-0 transition-opacity duration-300`}
    >
      {isUser ? (
        <div className="flex justify-end mb-4">
          <div className="bg-gray-800 rounded-2xl py-2.5 px-4 max-w-[85%] text-white shadow-sm">
            {message.content}
          </div>
        </div>
      ) : (
        <div className="flex items-start">
          <div className="mr-2 mt-1 flex-shrink-0">
            <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </div>
          <div className="flex-1 text-white bg-zinc-800/50 rounded-lg py-3 px-4 max-w-full">
            {isTyping ? (
              <div className="flex items-center">
                <TypingAnimation />
              </div>
            ) : (
              <div className="markdown">
                <MarkdownRenderer content={processedContent} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Добавляем глобальные стили для красивой анимации появления
const styleEl = document.createElement('style');
styleEl.innerHTML = `
  .message-appear {
    opacity: 1;
  }
  
  .markdown pre {
    background-color: rgba(40, 40, 40, 0.5);
    border-radius: 6px;
    padding: 12px;
    overflow-x: auto;
    margin: 16px 0;
  }
  
  .markdown code {
    font-family: 'Fira Code', monospace;
    background-color: rgba(40, 40, 40, 0.5);
    padding: 2px 4px;
    border-radius: 4px;
    font-size: 0.9em;
  }
  
  .markdown pre code {
    background-color: transparent;
    padding: 0;
  }
  
  .markdown ul, .markdown ol {
    margin-left: 20px;
    margin-bottom: 12px;
  }
  
  .markdown li {
    margin-bottom: 4px;
  }
  
  .markdown p {
    margin-bottom: 12px;
  }
`;
document.head.appendChild(styleEl);

export default ChatMessage;
