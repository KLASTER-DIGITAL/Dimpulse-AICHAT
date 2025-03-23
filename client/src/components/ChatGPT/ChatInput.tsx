import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onVoiceInput?: (transcript: string) => void;
  onFileUpload?: (fileContent: string) => void;
  isLoading: boolean;
}

const ChatInput = ({ onSendMessage, onVoiceInput, onFileUpload, isLoading }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  
  const toggleVoiceRecording = () => {
    if (!onVoiceInput) return;
    
    if (!isRecording) {
      // Start recording
      setIsRecording(true);
      
      // Check if browser supports SpeechRecognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ru-RU';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setMessage(transcript);
          setIsRecording(false);
        };
        
        recognition.onerror = () => {
          setIsRecording(false);
        };
        
        recognition.onend = () => {
          setIsRecording(false);
        };
        
        recognition.start();
      } else {
        alert('Ваш браузер не поддерживает голосовой ввод');
        setIsRecording(false);
      }
    } else {
      // Stop recording
      setIsRecording(false);
    }
  };
  
  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onFileUpload) return;
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onFileUpload(content);
      }
    };
    
    if (file.type === 'text/plain' || file.type === 'application/json' || 
        file.type === 'text/html' || file.type === 'text/markdown') {
      reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
      // Обрабатываем как изображение
      setMessage(`Загружено изображение: ${file.name}`);
    } else {
      alert('Формат файла не поддерживается');
    }
    
    // Очищаем input для возможности повторной загрузки того же файла
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="p-4 fixed bottom-0 left-0 right-0">
      <div className="max-w-3xl mx-auto">
        <form id="chat-form" className="relative bg-black" onSubmit={handleSubmit}>
          <div className="rounded-full border border-gray-600 bg-[#101010] flex items-center pr-2">
            {/* Кнопка прикрепления файла */}
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-white focus:outline-none"
              onClick={handleFileSelect}
              disabled={isLoading || isRecording}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".txt,.json,.md,.jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </button>
            
            {/* Поле ввода */}
            <textarea 
              ref={textareaRef}
              id="message-input" 
              rows={1} 
              className="flex-1 bg-transparent text-white border-none px-3 py-3 focus:outline-none resize-none"
              placeholder="Спросите что-нибудь..."
              style={{ maxHeight: "200px", minHeight: "24px" }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isRecording}
            />
            
            {/* Кнопка отправки голосового сообщения */}
            <button 
              type="button" 
              className={`p-2 rounded-full ${isRecording ? 'text-red-500' : 'text-gray-400 hover:text-white'} focus:outline-none`}
              onClick={toggleVoiceRecording}
              disabled={isLoading}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            </button>
            
            {/* Кнопка отправки сообщения */}
            <button 
              type="submit" 
              id="send-button"
              className="p-2 rounded-full text-gray-400 hover:text-white disabled:hover:text-gray-500 disabled:opacity-40 focus:outline-none"
              disabled={(!message.trim() && !isRecording) || isLoading}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          
          {/* Дополнительные кнопки (обсуни) */}
          <div className="absolute left-1/2 transform -translate-x-1/2 -top-12 flex items-center gap-2">
            <button 
              type="button"
              className="border border-gray-700 rounded-full px-4 py-1.5 text-sm text-gray-400 hover:text-white flex items-center gap-2 bg-black bg-opacity-70"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Обсуни
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInput;
