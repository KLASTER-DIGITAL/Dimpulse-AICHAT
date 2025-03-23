import { useRef, useEffect } from "react";
import { Message } from "@shared/schema";
import ChatMessage from "./ChatMessage";
import TypingAnimation from "./TypingAnimation";

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  isEmpty: boolean;
}

const ChatContainer = ({ messages, isLoading, isEmpty }: ChatContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div 
      id="chat-container" 
      ref={containerRef}
      className="flex-1 bg-black overflow-y-auto scrollbar-thin py-4 px-4 md:px-8 pb-32"
    >
      {isEmpty && !isLoading ? (
        <div className="h-full flex items-center justify-center">
          <h1 className="text-2xl font-semibold text-white mb-24">Чем я могу помочь?</h1>
        </div>
      ) : (
        <div id="messages-container" className="max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          
          {isLoading && (
            <div className="message ai-message mb-6">
              <div className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-[#10A37F] flex-shrink-0 flex items-center justify-center text-white mr-4">
                  <GPTLogo />
                </div>
                <div className="flex-1 markdown">
                  <TypingAnimation />
                </div>
              </div>
            </div>
          )}
        </div>
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

// Import GPTLogo component for ChatContainer
import GPTLogo from "./GPTLogo";

export default ChatContainer;
