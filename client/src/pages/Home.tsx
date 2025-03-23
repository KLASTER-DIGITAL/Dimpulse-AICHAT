import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Chat, Message } from "@shared/schema";
import { nanoid } from "nanoid";

import Sidebar from "@/components/ChatGPT/Sidebar";
import ChatContainer from "@/components/ChatGPT/ChatContainer";
import ChatInput from "@/components/ChatGPT/ChatInput";
import MobileHeader from "@/components/ChatGPT/MobileHeader";

const Home = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [location, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  
  // Get all chats for the sidebar
  const { data: chats = [], isLoading: isLoadingChats } = useQuery<Chat[]>({
    queryKey: ['/api/chats'],
  });
  
  // Get current chat and its messages
  const { data: chatData, isLoading: isLoadingChat } = useQuery<{ chat: Chat, messages: Message[] }>({
    queryKey: ['/api/chats', currentChatId],
    enabled: !!currentChatId,
  });
  
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
        title: "Error",
        description: "Failed to create a new chat",
        variant: "destructive",
      });
    }
  });
  
  // Send a message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, message }: { chatId: string, message: string }) => {
      const res = await apiRequest('POST', `/api/chats/${chatId}/messages`, { content: message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats', currentChatId] });
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
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
    }
  }, [params?.id, chats, isLoadingChats, navigate]);
  
  // Handle creating a new chat
  const handleNewChat = () => {
    createChatMutation.mutate();
    setSidebarOpen(false);
  };
  
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
  
  return (
    <div className="flex h-screen w-full bg-[#050509] text-[#ECECF1]">
      {/* Sidebar */}
      <Sidebar 
        chats={chats}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        currentChatId={currentChatId}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative bg-[#343541]">
        {/* Mobile Header */}
        <MobileHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNewChat={handleNewChat}
          title={chatData?.chat?.title || "New Chat"}
        />
        
        {/* Chat Container */}
        <ChatContainer 
          messages={chatData?.messages || []}
          isLoading={isLoadingChat}
          isEmpty={!chatData?.messages?.length}
        />
        
        {/* Chat Input */}
        <ChatInput 
          onSendMessage={handleSendMessage}
          isLoading={sendMessageMutation.isPending}
        />
      </div>
    </div>
  );
};

export default Home;
