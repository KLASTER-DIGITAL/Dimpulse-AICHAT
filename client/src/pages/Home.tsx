import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Chat, Message } from "@shared/schema";

import ChatContainer from "@/components/ChatGPT/ChatContainer";
import ChatInput from "@/components/ChatGPT/ChatInput";

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
  
  // Send a message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, message }: { chatId: string, message: string }) => {
      console.log("Отправка сообщения:", { chatId, message });
      const res = await apiRequest('POST', `/api/chats/${chatId}/messages`, { content: message });
      const data = await res.json();
      console.log("Ответ от сервера:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("Мутация успешна, обновляем запросы");
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${currentChatId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
    },
    onError: (error) => {
      console.error("Ошибка отправки сообщения:", error);
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
      setCurrentChatId(params.id);
    } else if (chats.length > 0 && !isLoadingChats) {
      navigate(`/chat/${chats[0].id}`);
    } else if (!isLoadingChats && chats.length === 0) {
      // Create a new chat if there are no chats
      createChatMutation.mutate();
    }
  }, [params?.id, chats, isLoadingChats, navigate]);
  
  // Handle sending a message
  const handleSendMessage = (message: string) => {
    if (!currentChatId) {
      createChatMutation.mutate();
      // We need to wait for the chat to be created before sending a message
      // This will be handled by the useEffect above
      return;
    }
    
    sendMessageMutation.mutate({ chatId: currentChatId, message });
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
  
  return (
    <div className="flex h-screen w-full bg-black text-[#ECECF1] flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Chat Container */}
        <ChatContainer 
          messages={chatData?.messages || []}
          isLoading={isLoadingChat || sendMessageMutation.isPending}
          isEmpty={!chatData?.messages?.length}
        />
        
        {/* Chat Input */}
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
