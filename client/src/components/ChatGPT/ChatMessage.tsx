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
      <div className="flex items-start">
        <div 
          className={`w-8 h-8 rounded-full ${
            isUser ? "bg-blue-500" : "bg-[#10A37F]"
          } flex-shrink-0 flex items-center justify-center text-white mr-4`}
        >
          {isUser ? (
            "U"
          ) : (
            <GPTLogo />
          )}
        </div>
        <div className="flex-1">
          {isUser ? (
            <div className="text-base whitespace-pre-wrap">
              {message.content}
            </div>
          ) : (
            <div className="markdown">
              <MarkdownRenderer content={message.content} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
