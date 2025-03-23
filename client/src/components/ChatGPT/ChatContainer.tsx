import { useRef, useEffect, useState } from "react";
import { Message } from "@shared/schema";
import ChatMessage from "./ChatMessage";
import TypingAnimation from "./TypingAnimation";
import GPTLogo from "./GPTLogo";

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  isEmpty: boolean;
  tempTypingMessage?: (Message & { typing?: boolean }) | null;
}

const ChatContainer = ({ messages, isLoading, isEmpty, tempTypingMessage }: ChatContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [atBottom, setAtBottom] = useState(true);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (containerRef.current && atBottom) {
      scrollToBottom();
    }
  }, [messages]);

  // Проверка положения скролла и отображение кнопки прокрутки
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Если до конца скролла осталось менее 100px, считаем что мы у низа
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setAtBottom(isAtBottom);
      setShowScrollButton(!isAtBottom && scrollHeight > clientHeight + 200);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Функция для прокрутки вниз
  const scrollToBottom = () => {
    if (containerRef.current) {
      const { scrollHeight } = containerRef.current;
      containerRef.current.scrollTo({
        top: scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div 
      id="chat-container" 
      ref={containerRef}
      className="flex-1 bg-black overflow-y-auto py-4 px-4 md:px-8 pb-32 mb-16 relative"
    >
      {isEmpty && !isLoading ? (
        <div className="h-full flex items-center justify-center">
          <h1 className="text-2xl font-semibold text-white mb-24">Чем я могу помочь?</h1>
        </div>
      ) : (
        <div id="messages-container" className="max-w-3xl mx-auto relative">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          
          {tempTypingMessage && (
            <ChatMessage key="typing" message={tempTypingMessage} />
          )}
          
          {isLoading && !tempTypingMessage && (
            <div className="message ai-message mb-6">
              <div className="flex items-start">
                <div className="flex-1 markdown">
                  <TypingAnimation />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Кнопка прокрутки вниз - в стиле ChatGPT */}
      {showScrollButton && (
        <button 
          onClick={scrollToBottom}
          className="absolute left-1/2 bottom-16 transform -translate-x-1/2 bg-zinc-800/90 hover:bg-zinc-700 text-white rounded-full py-2 px-4 flex items-center gap-2 shadow-lg transition-all duration-200 border border-zinc-700/50 backdrop-blur-sm"
          aria-label="Прокрутить вниз"
        >
          <span className="text-sm font-medium">Прокрутить вниз</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 14l-7 7-7-7M19 10l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      
      {/* Дополнительные действия под сообщениями */}
      {messages.length > 0 && !isLoading && (
        <div className="flex items-center justify-start mt-2 max-w-3xl mx-auto">
          {/* Действия с последним сообщением */}
          <div className="flex space-x-2 mt-1">
            <button className="text-gray-400 hover:text-white p-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 10 9 16l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="text-gray-400 hover:text-white p-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="text-gray-400 hover:text-white p-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="text-gray-400 hover:text-white p-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 8h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="text-gray-400 hover:text-white p-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 16v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
