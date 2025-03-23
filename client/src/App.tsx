import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";

// Приветственный экран с сообщением по центру
function WelcomeScreen() {
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
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center mb-32">
          <h1 className="text-4xl font-semibold mb-2">{getTimeOfDayGreeting()}.</h1>
          <p className="text-2xl text-gray-300">Чем я могу помочь сегодня?</p>
        </div>
        
        {/* Input field at the bottom */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-3xl px-4">
          <div className="relative flex items-center">
            <input 
              type="text" 
              placeholder="Что ты хочешь узнать?"
              className="w-full bg-[#40414F] text-white placeholder-gray-400 py-3 px-4 pr-10 rounded-md focus:outline-none"
              readOnly
              onClick={() => window.location.href = "/chat/new"}
            />
            <button 
              className="absolute right-3 text-gray-400"
              onClick={() => window.location.href = "/chat/new"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13"></path>
                <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={WelcomeScreen} />
      <Route path="/chat/new" component={Home} />
      <Route path="/chat/:id" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
