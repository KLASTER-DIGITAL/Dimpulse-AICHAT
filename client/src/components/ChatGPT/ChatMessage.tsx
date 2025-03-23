import { Message } from "@shared/schema";
import MarkdownRenderer from "./MarkdownRenderer";
import GPTLogo from "./GPTLogo";

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";
  
  return (
    <div className={`message ${isUser ? "user-message" : "ai-message"} mb-6`}>
      {isUser ? (
        <div className="flex justify-end mb-4">
          <div className="bg-gray-800 rounded-full py-2 px-4 max-w-[80%] text-white">
            {message.content}
          </div>
        </div>
      ) : (
        <div className="flex items-start">
          <div 
            className="w-8 h-8 rounded-full bg-[#10A37F] flex-shrink-0 flex items-center justify-center text-white mr-4"
          >
            <GPTLogo />
          </div>
          <div className="flex-1 text-white">
            <div className="markdown">
              <MarkdownRenderer content={message.content} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
