import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Chat } from "@shared/schema";
import { format } from "date-fns";

interface SidebarProps {
  chats: Chat[];
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  currentChatId: string | null;
}

const Sidebar = ({ chats, isOpen, onClose, onNewChat, currentChatId }: SidebarProps) => {
  const [groupedChats, setGroupedChats] = useState<{ [key: string]: Chat[] }>({});
  
  // Group chats by date
  useEffect(() => {
    const grouped: { [key: string]: Chat[] } = {};
    
    chats.forEach(chat => {
      const date = new Date(chat.createdAt);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateKey = format(date, 'MMM d, yyyy');
      
      if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
        dateKey = 'Today';
      } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
        dateKey = 'Yesterday';
      }
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(chat);
    });
    
    setGroupedChats(grouped);
  }, [chats]);
  
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div 
        id="sidebar" 
        className={`bg-[#202123] w-64 flex-shrink-0 h-full flex flex-col overflow-hidden transition-all duration-300 fixed md:static z-30 ${
          isOpen ? 'left-0' : '-left-64 md:left-0'
        }`}
      >
        <div className="p-2">
          <button 
            id="new-chat-button" 
            className="flex items-center gap-3 w-full rounded p-3 text-sm hover:bg-gray-700 text-white border border-gray-600"
            onClick={onNewChat}
          >
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
          {Object.keys(groupedChats).length > 0 ? (
            Object.entries(groupedChats).map(([date, dateChats]) => (
              <div key={date}>
                <div className="text-xs text-[#8E8EA0] mb-1 px-2 py-1">{date}</div>
                {dateChats.map(chat => (
                  <Link key={chat.id} href={`/chat/${chat.id}`}
                    className={`chat-history-item flex py-2 px-2 items-center gap-2 relative rounded hover:bg-gray-700 cursor-pointer ${
                      currentChatId === chat.id ? 'bg-gray-700' : ''
                    }`}
                  >
                    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <div className="flex-1 text-sm truncate">{chat.title}</div>
                  </Link>
                ))}
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-sm text-[#8E8EA0]">No chat history yet</div>
          )}
        </div>
        
        <div className="border-t border-gray-700 pt-2 pb-4 px-2">
          <div className="user-info flex items-center gap-2 p-3 text-sm text-gray-200 rounded hover:bg-gray-700 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-[#10A37F] flex items-center justify-center text-white">U</div>
            <div className="flex-1">User Account</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
