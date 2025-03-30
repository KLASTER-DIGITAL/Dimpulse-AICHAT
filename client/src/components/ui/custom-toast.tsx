import { toast } from '@/hooks/use-toast';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Отображает toast-уведомление об успешной операции с зеленым индикатором и иконкой галочки
 */
export const showSuccessToast = (title: string, message: string, duration: number = 3000) => {
  return toast({
    title: title,
    description: message,
    duration: duration,
    variant: "default",
    className: "bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-800 group",
  });
};

/**
 * Отображает toast-уведомление об ошибке с красным индикатором и иконкой X
 */
export const showErrorToast = (title: string, message: string, duration: number = 3000) => {
  return toast({
    title: title,
    description: message,
    duration: duration,
    variant: "destructive",
  });
};

/**
 * Отображает предупреждающее toast-уведомление с желтым индикатором и иконкой предупреждения
 */
export const showWarningToast = (title: string, message: string, duration: number = 3000) => {
  return toast({
    title: title,
    description: message,
    duration: duration,
    variant: "default",
    className: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900 dark:border-yellow-800 group",
  });
};

/**
 * Отображает информационное toast-уведомление с синим индикатором и иконкой информации
 */
export const showInfoToast = (title: string, message: string, duration: number = 3000) => {
  return toast({
    title: title,
    description: message,
    duration: duration,
    variant: "default",
    className: "bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800 group",
  });
};