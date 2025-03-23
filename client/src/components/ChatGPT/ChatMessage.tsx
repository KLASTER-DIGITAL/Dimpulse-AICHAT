import { Message } from "@shared/schema";
import MarkdownRenderer from "./MarkdownRenderer";
import TypingAnimation from "./TypingAnimation";

interface ChatMessageProps {
  message: Message & { typing?: boolean };
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const isTyping = message.typing === true || message.content === "typing";
  
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
          <div className="flex-1 text-white">
            {isTyping ? (
              <div className="flex items-center">
                <TypingAnimation />
              </div>
            ) : (
              <div className="markdown">
                <MarkdownRenderer content={message.content} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
