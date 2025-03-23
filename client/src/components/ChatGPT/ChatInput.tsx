import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSendMessage: (message: string, audioData?: string) => void;
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
      // Отправка сообщения с аудиоданными, если они доступны
      onSendMessage(message.trim(), audioData || undefined);
      
      // Сбрасываем состояние
      setMessage("");
      setAudioData(null);
      
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
  
  // Добавляем ссылку на аудиоданные
  const [audioData, setAudioData] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const toggleVoiceRecording = () => {
    if (!onVoiceInput) return;
    
    if (!isRecording) {
      // Start recording
      setIsRecording(true);
      setAudioData(null);
      
      // Проверяем, поддерживает ли браузер запись аудио
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Запрашиваем доступ к микрофону
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => {
            // Создаем распознавание речи
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            
            if (SpeechRecognition) {
              const recognition = new SpeechRecognition();
              recognition.lang = 'ru-RU';
              recognition.continuous = false;
              recognition.interimResults = false;
              
              // Запускаем запись аудио
              audioChunksRef.current = [];
              mediaRecorderRef.current = new MediaRecorder(stream);
              
              mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                  audioChunksRef.current.push(event.data);
                }
              };
              
              mediaRecorderRef.current.onstop = () => {
                // Преобразуем запись в base64 строку для отправки
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                  const base64Audio = reader.result as string;
                  // Убираем префикс data:audio/wav;base64, для получения чистого base64
                  const base64AudioData = base64Audio.split(',')[1];
                  setAudioData(base64AudioData);
                };
              };
              
              mediaRecorderRef.current.start();
              
              recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setMessage(transcript);
                
                // Останавливаем запись аудио
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                  mediaRecorderRef.current.stop();
                  
                  // Останавливаем все треки
                  stream.getTracks().forEach(track => track.stop());
                }
                
                setIsRecording(false);
              };
              
              recognition.onerror = () => {
                setIsRecording(false);
                // Останавливаем запись аудио при ошибке
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                  mediaRecorderRef.current.stop();
                  stream.getTracks().forEach(track => track.stop());
                }
              };
              
              recognition.onend = () => {
                setIsRecording(false);
                // Останавливаем запись аудио если распознавание закончилось
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                  mediaRecorderRef.current.stop();
                  stream.getTracks().forEach(track => track.stop());
                }
              };
              
              recognition.start();
            } else {
              alert('Ваш браузер не поддерживает распознавание речи');
              setIsRecording(false);
              stream.getTracks().forEach(track => track.stop());
            }
          })
          .catch((error) => {
            console.error('Ошибка доступа к микрофону:', error);
            alert('Не удалось получить доступ к микрофону');
            setIsRecording(false);
          });
      } else {
        alert('Ваш браузер не поддерживает запись аудио');
        setIsRecording(false);
      }
    } else {
      // Stop recording
      setIsRecording(false);
      
      // Останавливаем запись аудио
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
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
              placeholder="Опишите вашу задачу..."
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
          
          {/* Кнопки быстрых подсказок - удалили "Обсуни" */}
        </form>
      </div>
    </div>
  );
};

export default ChatInput;
