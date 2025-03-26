import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [, navigate] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Проверяем, авторизован ли пользователь (только на стороне клиента)
    console.log("ProtectedRoute: checking authentication");
    try {
      const authStatus = localStorage.getItem("isAuthenticated") === "true";
      console.log("ProtectedRoute: authStatus =", authStatus);
      setIsAuthenticated(authStatus);
      
      if (!authStatus) {
        // Если не авторизован, перенаправляем на страницу входа
        console.log("ProtectedRoute: redirecting to /login");
        navigate("/login");
      } else {
        console.log("ProtectedRoute: user is authenticated");
      }
    } catch (error) {
      console.error("ProtectedRoute: Error checking authentication:", error);
      setIsAuthenticated(false);
      navigate("/login");
    }
  }, [navigate]);

  // Показываем загрузку, пока не определили статус аутентификации
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

  // Если пользователь авторизован, показываем защищенный контент
  // Если нет, показываем экран загрузки (перенаправление произойдет через useEffect)
  return isAuthenticated ? <>{children}</> : <div />;
};

export default ProtectedRoute;