import React, { useMemo, useEffect, useRef } from "react";
import { Message } from "@shared/schema";
import MarkdownRenderer from "./MarkdownRenderer";
import TypingAnimation from "./TypingAnimation";

interface ChatMessageProps {
  message: Message & { typing?: boolean };
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
    if (message.content.includes('<!-- Cal inline embed code begins -->')) {
      return (
        <div 
          ref={htmlContentRef}
          className="html-content w-full" 
          dangerouslySetInnerHTML={{ __html: message.content }}
        />
      );
    }
    
    // For other HTML content including Cal.com JavaScript without comments
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
  
  return (
    <div className={`message ${isUser ? "user-message" : "assistant-message"} chat-message mb-6`}>
      {isUser ? (
        <div className="flex justify-end mb-4">
          <div className="user-message bg-gray-800 rounded-full py-2 px-4 max-w-[80%] text-white shadow-sm">
            {message.content}
          </div>
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
