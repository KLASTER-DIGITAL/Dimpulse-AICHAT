import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Chat, Message } from "@shared/schema";

import ChatContainer from "@/components/ChatGPT/ChatContainer";
import ChatInput from "@/components/ChatGPT/ChatInput";
import EmptyState from "@/components/ChatGPT/EmptyState";

const Home = () => {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [location, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  
  // Get all chats
  const { data: chats = [], isLoading: isLoadingChats } = useQuery<Chat[]>({
    queryKey: ['/api/chats'],
  });
  
  // Get current chat and its messages
  const { data: chatData, isLoading: isLoadingChat, refetch } = useQuery<{ chat: Chat, messages: Message[] }>({
    queryKey: [`/api/chats/${currentChatId}`],
    enabled: !!currentChatId,
  });
  
  // Автоматическое обновление сообщений каждые 2 секунды, если есть активный чат
  useEffect(() => {
    if (!currentChatId) return;
    
    const intervalId = setInterval(() => {
      console.log("Запрашиваем обновления сообщений");
      refetch();
    }, 2000);
    
    return () => clearInterval(intervalId);
  }, [currentChatId, refetch]);
  
  // Create a new chat
  const createChatMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/chats', {});
      return res.json();
    },
    onSuccess: (newChat: Chat) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      navigate(`/chat/${newChat.id}`);
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать новый чат",
        variant: "destructive",
      });
    }
  });
  
  // Временное сообщение для анимации печати
  const [tempTypingMessage, setTempTypingMessage] = useState<Message & { typing?: boolean } | null>(null);
  
  // Send a message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, message, audioData }: { chatId: string, message: string, audioData?: string }) => {
      console.log("Отправка сообщения:", { chatId, message, hasAudio: !!audioData });
      const payload = { content: message };
      
      // Если есть аудиоданные, добавляем их в запрос
      if (audioData) {
        Object.assign(payload, { audioData });
      }
      
      // Добавляем временное сообщение с анимацией печати
      setTempTypingMessage({
        id: -1,
        chatId,
        role: "assistant",
        content: "typing",
        createdAt: new Date(),
        typing: true
      });
      
      const res = await apiRequest('POST', `/api/chats/${chatId}/messages`, payload);
      const data = await res.json();
      console.log("Ответ от сервера:", data);
      
      // Если получили сообщение с typing: true, значит это промежуточное состояние
      if (data && data.typing) {
        console.log("Получено состояние набора текста, оставляем анимацию");
        return null;
      }
      
      // Если получили обычный ответ, убираем временное сообщение
      setTempTypingMessage(null);
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        console.log("Мутация успешна, обновляем запросы");
        queryClient.invalidateQueries({ queryKey: [`/api/chats/${currentChatId}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      }
    },
    onError: (error) => {
      console.error("Ошибка отправки сообщения:", error);
      // Убираем анимацию печати при ошибке
      setTempTypingMessage(null);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщение",
        variant: "destructive",
      });
    }
  });
  
  // Set current chat ID from URL param or create a new chat if needed
  useEffect(() => {
    if (params?.id) {
      if (params.id === 'new') {
        // Если это /chat/new, создаем новый чат
        createChatMutation.mutate();
      } else {
        // Иначе используем id из URL
        setCurrentChatId(params.id);
      }
    } else if (chats.length > 0 && !isLoadingChats) {
      navigate(`/chat/${chats[0].id}`);
    } else if (!isLoadingChats && chats.length === 0 && location !== "/") {
      // Create a new chat if there are no chats and we're not on the home page
      createChatMutation.mutate();
    }
  }, [params?.id, chats, isLoadingChats, navigate, location]);
  
  // Handle sending a message
  const handleSendMessage = (message: string, audioData?: string) => {
    if (!currentChatId) {
      createChatMutation.mutate();
      // We need to wait for the chat to be created before sending a message
      // This will be handled by the useEffect above
      return;
    }
    
    sendMessageMutation.mutate({ chatId: currentChatId, message, audioData });
  };

  // Handle voice input
  const handleVoiceInput = (transcript: string) => {
    if (transcript && !sendMessageMutation.isPending) {
      handleSendMessage(transcript);
    }
  };
  
  // Handle file upload
  const handleFileUpload = (fileContent: string) => {
    if (fileContent && !sendMessageMutation.isPending) {
      handleSendMessage(`Содержимое загруженного файла:\n${fileContent}`);
    }
  };
  
  // Получить приветственное сообщение в зависимости от времени суток
  const getTimeOfDayGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Доброе утро";
    if (hour >= 12 && hour < 18) return "Добрый день";
    if (hour >= 18 && hour < 23) return "Добрый вечер";
    return "Доброй ночи";
  };

  return (
    <div className="flex h-screen w-full bg-black text-[#ECECF1] flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Показываем приветственный экран вместо чата, если нет сообщений */}
        {!chatData?.messages?.length ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center mb-32 animate-fadeIn">
              <h1 className="text-4xl font-semibold mb-2 animate-textAppear">{getTimeOfDayGreeting()}!</h1>
              <p className="text-2xl text-gray-300 animate-textAppear animation-delay-300">Какие у вас задачи? Давайте мы поможем решить!</p>
              
              {/* Центрированное поле ввода для чата */}
              <div className="mt-8 w-full max-w-lg mx-auto animate-fadeIn animation-delay-600">
                <div className="border border-gray-600 bg-[#101010] rounded-full p-2 mx-auto flex items-center">
                  <input 
                    type="text" 
                    placeholder="Опишите вашу задачу..."
                    className="flex-1 bg-transparent text-white border-none px-3 py-2 focus:outline-none"
                    readOnly
                    onClick={() => window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})}
                  />
                  <button className="p-2 rounded-full text-gray-400 hover:text-white" onClick={() => window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Container */}
            <ChatContainer 
              messages={chatData?.messages || []}
              isLoading={isLoadingChat || sendMessageMutation.isPending}
              isEmpty={false}
              tempTypingMessage={tempTypingMessage}
            />
          </>
        )}
        
        {/* Chat Input - всегда отображается */}
        <ChatInput 
          onSendMessage={handleSendMessage}
          onVoiceInput={handleVoiceInput}
          onFileUpload={handleFileUpload}
          isLoading={sendMessageMutation.isPending}
        />
      </div>
    </div>
  );
};

export default Home;
