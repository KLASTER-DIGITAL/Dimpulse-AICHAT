import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatInput = ({ onSendMessage, isLoading }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea based on content
  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  };
  
  useEffect(() => {
    autoResize();
  }, [message]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage("");
      
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <div className="bg-[#343541] border-t border-gray-700 p-4">
      <div className="max-w-3xl mx-auto">
        <form id="chat-form" className="relative" onSubmit={handleSubmit}>
          <textarea 
            ref={textareaRef}
            id="message-input" 
            rows={1} 
            className="w-full bg-gray-700 text-[#ECECF1] rounded-lg pl-4 pr-12 py-3 focus:outline-none resize-none"
            placeholder="Send a message..."
            style={{ maxHeight: "200px", minHeight: "44px" }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            id="send-button"
            className="absolute right-2 bottom-1.5 p-1 rounded-md text-gray-400 hover:text-[#ECECF1] disabled:hover:text-gray-400 disabled:opacity-40"
            disabled={!message.trim() || isLoading}
          >
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
        <div className="text-xs text-center text-[#8E8EA0] mt-2">
          ChatGPT can make mistakes. Verify important information.
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
