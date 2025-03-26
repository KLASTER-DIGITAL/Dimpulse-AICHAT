import { useEffect, useState } from 'react';

const TypingAnimation = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-2 text-gray-400 typing-animation">
      <div className="flex space-x-1">
        <span className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        <span className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></span>
      </div>
    </div>
  );
};

export default TypingAnimation;