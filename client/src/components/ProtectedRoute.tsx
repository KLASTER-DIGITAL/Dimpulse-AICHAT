
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

interface AuthUser {
  id: number;
  username: string;
}

// Проверить токен через API
const checkAuthToken = async (token: string): Promise<AuthUser | null> => {
  try {
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(err => {
      console.error("Network error checking auth token:", err);
      throw new Error("Ошибка сети при проверке токена авторизации");
    });
    
    if (!response || !response.ok) {
      console.log("Auth check returned error status:", response?.status);
      return null;
    }
    
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error("Error parsing auth check response:", jsonError);
      throw new Error("Неверный формат ответа при проверке авторизации");
    }
    
    if (!data || !data.user) {
      console.log("Auth check response missing user data:", data);
      return null;
    }
    
    return data.user;
  } catch (error) {
    console.error("Error checking auth token:", error);
    throw error;
  }
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [, navigate] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log("ProtectedRoute: checking authentication");
    
    const checkAuth = async () => {
      try {
        // Проверяем наличие токена в localStorage
        const token = localStorage.getItem("authToken");
        const savedAuthStatus = localStorage.getItem("isAuthenticated");
        
        if (!token) {
          console.log("ProtectedRoute: No auth token found");
          setIsAuthenticated(false);
          navigate("/login");
          return;
        }
        
        // Если у нас есть сохраненный статус аутентификации, временно используем его
        if (savedAuthStatus === "true") {
          // Устанавливаем временное состояние аутентификации, чтобы не мерцало
          setIsAuthenticated(true);
          
          console.log("ProtectedRoute: authStatus =", savedAuthStatus);
        }
        
        try {
          // Проверяем токен через API
          const user = await checkAuthToken(token);
          
          if (!user) {
            console.log("ProtectedRoute: Invalid or expired token");
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            localStorage.removeItem("isAuthenticated");
            setIsAuthenticated(false);
            
            toast({
              title: "Необходима авторизация",
              description: "Ваша сессия истекла. Пожалуйста, войдите снова.",
              variant: "destructive",
            });
            
            navigate("/login");
            return;
          }
          
          // Если токен валидный, обновляем информацию о пользователе
          localStorage.setItem("user", JSON.stringify(user));
          localStorage.setItem("isAuthenticated", "true");
          
          console.log("ProtectedRoute: User is authenticated:", user);
          setIsAuthenticated(true);
        } catch (apiError) {
          console.error("ProtectedRoute: API Error checking token:", apiError);
          
          // Если при проверке токена через API возникла ошибка, но у нас есть сохраненный статус
          // аутентификации и информация о пользователе, то временно считаем пользователя аутентифицированным
          if (savedAuthStatus === "true") {
            const savedUser = localStorage.getItem("user");
            if (savedUser) {
              console.log("ProtectedRoute: Using saved authentication status due to API error");
              setIsAuthenticated(true);
              return;
            }
          }
          
          // Иначе сбрасываем аутентификацию
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          localStorage.removeItem("isAuthenticated");
          setIsAuthenticated(false);
          
          toast({
            title: "Ошибка проверки аутентификации",
            description: "Произошла ошибка при проверке вашей сессии. Пожалуйста, войдите снова.",
            variant: "destructive",
          });
          
          navigate("/login");
        }
      } catch (error) {
        console.error("ProtectedRoute: Error checking authentication:", error);
        setIsAuthenticated(false);
        navigate("/login");
      }
    };
    
    checkAuth();
  }, [navigate, toast]);

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-xl">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <div />;
};

export default ProtectedRoute;
