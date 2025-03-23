import { useRef, useEffect } from "react";
import { Message } from "@shared/schema";
import ChatMessage from "./ChatMessage";
import EmptyState from "./EmptyState";
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
      className="flex-1 bg-[#343541] overflow-y-auto scrollbar-thin py-4 px-4 md:px-8"
    >
      {isEmpty && !isLoading ? (
        <EmptyState />
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
    </div>
  );
};

// Import GPTLogo component for ChatContainer
import GPTLogo from "./GPTLogo";

export default ChatContainer;
