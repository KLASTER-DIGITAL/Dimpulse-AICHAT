import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface AudioRecorderProps {
  onAudioTranscribed: (transcript: string) => void;
  isLoading: boolean;
}

const AudioRecorder = ({ onAudioTranscribed, isLoading }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Начать запись
  const startRecording = async () => {
    chunksRef.current = [];
    setAudioBlob(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        
        // Остановить все аудиотреки
        stream.getTracks().forEach(track => track.stop());
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
      
      // Начать запись
      mediaRecorder.start();
      setIsRecording(true);
      
      // Запустить таймер
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Ошибка доступа к микрофону:', error);
      toast({
        title: "Ошибка доступа к микрофону",
        description: "Проверьте, что браузер имеет доступ к микрофону",
        variant: "destructive",
      });
    }
  };
  
  // Остановить запись
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Отправить аудио на обработку
  const sendAudioToWebhook = async () => {
    if (!audioBlob) return;
    
    try {
      // Создаем объект FormData для отправки аудио
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      
      // Показываем уведомление о начале отправки
      toast({
        title: "Отправка аудио",
        description: "Отправляем аудио на сервер для транскрипции...",
      });
      
      // Отправляем аудио на эндпоинт для транскрипции
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка при отправке аудио: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.transcript) {
        // Вызываем колбэк с полученной транскрипцией
        onAudioTranscribed(data.transcript);
        setAudioBlob(null); // Сбрасываем blob после успешной отправки
      } else {
        toast({
          title: "Ошибка транскрипции",
          description: "Не удалось распознать текст в аудиозаписи",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Ошибка при отправке аудио:', error);
      toast({
        title: "Ошибка отправки",
        description: "Не удалось отправить аудио на сервер",
        variant: "destructive",
      });
    }
  };
  
  // Форматирование времени записи
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="flex flex-col items-center gap-2 p-4 border border-gray-700 rounded-lg bg-[#101010]">
      <div className="flex items-center justify-center mb-2">
        {isRecording ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-sm text-gray-300">Запись {formatTime(recordingTime)}</span>
          </div>
        ) : audioBlob ? (
          <div className="text-sm text-gray-300">Аудио готово к отправке ({formatTime(recordingTime)})</div>
        ) : (
          <div className="text-sm text-gray-300">Нажмите для начала записи</div>
        )}
      </div>
      
      <div className="flex gap-2">
        {!isRecording && !audioBlob && (
          <Button 
            onClick={startRecording} 
            className="bg-gray-700 hover:bg-gray-600"
            disabled={isLoading}
          >
            Начать запись
          </Button>
        )}
        
        {isRecording && (
          <Button 
            onClick={stopRecording} 
            variant="destructive"
          >
            Остановить запись
          </Button>
        )}
        
        {audioBlob && !isRecording && (
          <>
            <Button 
              onClick={sendAudioToWebhook} 
              className="bg-green-700 hover:bg-green-600"
              disabled={isLoading}
            >
              Отправить аудио
            </Button>
            <Button 
              onClick={() => setAudioBlob(null)} 
              variant="outline"
              disabled={isLoading}
            >
              Отменить
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;