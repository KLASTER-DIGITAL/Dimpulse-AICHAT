interface MobileHeaderProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  title: string;
}

const MobileHeader = ({ onToggleSidebar, onNewChat, title }: MobileHeaderProps) => {
  return (
    <div className="md:hidden flex items-center justify-between p-2 bg-[#343541] border-b border-gray-700">
      <button id="sidebar-toggle" className="p-2 rounded hover:bg-gray-700" onClick={onToggleSidebar}>
        <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <span className="text-[#ECECF1] font-medium">{title}</span>
      <button className="p-2 rounded hover:bg-gray-700" onClick={onNewChat}>
        <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
  );
};

export default MobileHeader;
