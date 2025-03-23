import GPTLogo from "./GPTLogo";

const EmptyState = () => {
  return (
    <div id="empty-state" className="h-full flex flex-col items-center justify-center">
      <div className="w-14 h-14 rounded-full bg-[#10A37F] flex items-center justify-center mb-3">
        <svg stroke="white" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" className="h-6 w-6">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
      <h2 className="text-2xl font-semibold mb-8">How can I help you today?</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl w-full">
        <div className="p-4 rounded border border-gray-700 hover:bg-gray-700 cursor-pointer">
          <h3 className="font-medium">Explain quantum computing in simple terms</h3>
        </div>
        <div className="p-4 rounded border border-gray-700 hover:bg-gray-700 cursor-pointer">
          <h3 className="font-medium">Write a Twitter post about climate change</h3>
        </div>
        <div className="p-4 rounded border border-gray-700 hover:bg-gray-700 cursor-pointer">
          <h3 className="font-medium">Create a workout plan for beginners</h3>
        </div>
        <div className="p-4 rounded border border-gray-700 hover:bg-gray-700 cursor-pointer">
          <h3 className="font-medium">Design a database schema for an e-commerce site</h3>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
