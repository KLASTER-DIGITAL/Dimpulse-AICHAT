import { useEffect, useState, useRef } from 'react';
import { Skeleton } from "@/components/ui/skeleton";

const TypingAnimation = () => {
  // Состояние для анимации
  const [progress, setProgress] = useState(0);
  const [currentPhrase, setCurrentPhrase] = useState(0);
  
  // Фразы для отображения
  const phrases = [
    'Генерирую ответ...',
    'Обрабатываю запрос...',
    'Анализирую информацию...',
    'Формирую решение...'
  ];
  
  // Анимация прогресса
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        // Если прогресс достиг 100%, меняем фразу и сбрасываем прогресс
        if (prevProgress >= 100) {
          setCurrentPhrase((prev) => (prev + 1) % phrases.length);
          return 0;
        }
        // Увеличиваем прогресс с разной скоростью для естественности
        const increment = Math.random() * 3 + 1;
        return Math.min(prevProgress + increment, 100);
      });
    }, 100);
    
    return () => clearInterval(timer);
  }, [phrases.length]);

  return (
    <div className="flex flex-col space-y-2 p-2 w-full max-w-[300px]">
      <div className="flex items-center space-x-2">
        {/* Анимированные точки */}
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <Skeleton 
              key={i}
              className="w-2 h-2 rounded-full bg-[#19c37d] opacity-80 animate-pulse" 
              style={{ animationDelay: `${i * 300}ms` }}
            />
          ))}
        </div>
        
        {/* Текст */}
        <span className="text-[#19c37d] text-sm font-medium">
          {phrases[currentPhrase]}
        </span>
      </div>
      
      {/* Прогресс-бар с использованием обычного div вместо компонента Progress */}
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-gray-800">
        <div 
          className="h-full bg-[#19c37d] transition-all" 
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default TypingAnimation;