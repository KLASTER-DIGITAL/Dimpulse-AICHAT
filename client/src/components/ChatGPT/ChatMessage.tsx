import React, { useMemo } from "react";
import { ExtendedMessage } from "@shared/schema";
import MarkdownRenderer from "./MarkdownRenderer";
import TypingAnimation from "./TypingAnimation";

interface ChatMessageProps {
  message: ExtendedMessage;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const isTyping = message.typing === true || message.content === "typing";
  
  // Check if the message content contains HTML/iframe or special script content
  const containsHtml = useMemo(() => {
    if (!message.content) return false;
    
    // Check for regular HTML tags
    return /<\/?[a-z][\s\S]*>/i.test(message.content) && 
           (/<iframe[\s\S]*?<\/iframe>/i.test(message.content) || 
            /<div[\s\S]*?<\/div>/i.test(message.content) ||
            /<script[\s\S]*?<\/script>/i.test(message.content) ||
            /<embed[\s\S]*?>/i.test(message.content));
  }, [message.content]);
  
  // Render different content based on message type
  const renderContent = () => {
    if (isTyping) {
      return (
        <div className="flex items-center">
          <TypingAnimation />
        </div>
      );
    }
    
    // Use our improved Markdown renderer for all content
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
