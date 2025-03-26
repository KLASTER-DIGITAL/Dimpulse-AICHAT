
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
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error("Error checking auth token:", error);
    return null;
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
        
        if (!token) {
          console.log("ProtectedRoute: No auth token found");
          setIsAuthenticated(false);
          navigate("/login");
          return;
        }
        
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
