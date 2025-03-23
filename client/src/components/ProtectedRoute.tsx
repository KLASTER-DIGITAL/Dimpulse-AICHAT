import { useEffect } from "react";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Проверяем, авторизован ли пользователь
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    
    if (!isAuthenticated) {
      // Если не авторизован, перенаправляем на страницу входа
      navigate("/login");
    }
  }, [navigate]);

  // Получаем статус авторизации для рендеринга
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";

  // Если пользователь авторизован, показываем защищенный контент
  // Если нет, показываем пустой div (перенаправление произойдет через useEffect)
  return isAuthenticated ? <>{children}</> : <div />;
};

export default ProtectedRoute;