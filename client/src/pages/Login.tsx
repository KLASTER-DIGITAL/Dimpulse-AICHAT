import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthResponse {
  user: {
    id: number;
    username: string;
  };
  token: string;
}

const Login = () => {
  // Состояние для обоих вкладок
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  
  // Состояние для логина
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Состояние для регистрации
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [isRegLoading, setIsRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    console.log("Login: login attempt with username:", username);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Ошибка при входе в систему");
      }
      
      const data = await response.json() as AuthResponse;
      console.log("Login: successful login response", data);
      
      // Сохраняем токен и информацию о пользователе
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("isAuthenticated", "true");
      
      // Показываем уведомление об успешном входе
      toast({
        title: "Успешный вход",
        description: "Вы успешно вошли в систему",
      });
      
      // Перенаправляем в личный кабинет
      console.log("Login: redirecting to /cabinet");
      navigate("/cabinet");
    } catch (error: any) {
      console.error("Login: Error during login process:", error);
      const errorMessage = error?.message || "Произошла ошибка при входе в систему";
      setError(errorMessage);
      toast({
        title: "Ошибка входа",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверка пароля
    if (regPassword !== regPasswordConfirm) {
      setRegError("Пароли не совпадают");
      toast({
        title: "Ошибка регистрации",
        description: "Пароли не совпадают",
        variant: "destructive",
      });
      return;
    }
    
    setIsRegLoading(true);
    setRegError("");
    
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: regUsername, password: regPassword }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Ошибка при регистрации");
      }
      
      const data = await response.json();
      console.log("Register: successful registration response", data);
      
      // Показываем уведомление об успешной регистрации
      toast({
        title: "Успешная регистрация",
        description: "Вы успешно зарегистрировались в системе",
      });
      
      // Переключаемся на вкладку логина
      setActiveTab("login");
      setUsername(regUsername);
      setPassword("");
      
      // Очищаем форму регистрации
      setRegUsername("");
      setRegPassword("");
      setRegPasswordConfirm("");
    } catch (error: any) {
      console.error("Register: Error during registration process:", error);
      const errorMessage = error?.message || "Произошла ошибка при регистрации";
      setRegError(errorMessage);
      toast({
        title: "Ошибка регистрации",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRegLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-black text-white">
      <Card className="w-[400px] bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl">Личный кабинет</CardTitle>
          <CardDescription className="text-gray-400">
            Войдите или зарегистрируйтесь для доступа к настройкам
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs 
            defaultValue="login" 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as "login" | "register")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-gray-800">
              <TabsTrigger value="login" className="data-[state=active]:bg-gray-700">Вход</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-gray-700">Регистрация</TabsTrigger>
            </TabsList>
            
            {/* Вкладка входа */}
            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-4">
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
                <Button 
                  type="submit" 
                  className="w-full mt-4" 
                  disabled={isLoading || !username || !password}
                >
                  {isLoading ? "Вход..." : "Войти"}
                </Button>
              </form>
            </TabsContent>
            
            {/* Вкладка регистрации */}
            <TabsContent value="register" className="mt-0">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Имя пользователя</Label>
                  <Input
                    id="reg-username"
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Придумайте имя пользователя"
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Пароль</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password-confirm">Подтверждение пароля</Label>
                  <Input
                    id="reg-password-confirm"
                    type="password"
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                {regError && (
                  <div className="text-red-500 text-sm p-2 bg-red-900/20 rounded border border-red-800">
                    {regError}
                  </div>
                )}
                <Button 
                  type="submit" 
                  className="w-full mt-4" 
                  disabled={isRegLoading || !regUsername || !regPassword || !regPasswordConfirm}
                >
                  {isRegLoading ? "Регистрация..." : "Зарегистрироваться"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="justify-center text-sm text-gray-500 border-t border-gray-800 pt-4">
          <div>
            {activeTab === "login" ? (
              <p>Нет аккаунта? <Button variant="link" className="p-0 h-auto text-blue-500" onClick={() => setActiveTab("register")}>Регистрация</Button></p>
            ) : (
              <p>Уже есть аккаунт? <Button variant="link" className="p-0 h-auto text-blue-500" onClick={() => setActiveTab("login")}>Вход</Button></p>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;