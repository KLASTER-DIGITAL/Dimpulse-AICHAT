import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    console.log("Login: login attempt with username:", username);

    // Простая проверка учетных данных (логин: admin, пароль: admin123)
    if (username === "admin" && password === "admin123") {
      console.log("Login: credentials correct");
      
      try {
        // Создаем запись о том, что пользователь авторизован
        localStorage.setItem("isAuthenticated", "true");
        console.log("Login: authentication status set in localStorage");
        
        // Показываем уведомление об успешном входе
        toast({
          title: "Успешный вход",
          description: "Вы успешно вошли в систему",
        });
        
        // Перенаправляем в личный кабинет
        console.log("Login: redirecting to /cabinet");
        navigate("/cabinet");
      } catch (error) {
        console.error("Login: Error during login process:", error);
        setError("Произошла ошибка при входе в систему");
      }
    } else {
      console.log("Login: incorrect credentials");
      setError("Неверное имя пользователя или пароль");
      toast({
        title: "Ошибка входа",
        description: "Неверное имя пользователя или пароль",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-black text-white">
      <Card className="w-[350px] bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl">Вход в личный кабинет</CardTitle>
          <CardDescription className="text-gray-400">
            Введите ваши учетные данные для доступа к настройкам
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Имя пользователя</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm p-2 bg-red-900/20 rounded border border-red-800">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !username || !password}
            >
              {isLoading ? "Вход..." : "Войти"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;