import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import LiveStyleEditor from "@/components/StyleEditor/LiveStyleEditor";

// UI components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

// Interfaces for data
interface Settings {
  webhook: {
    url: string;
    enabled: boolean;
  };
  integration: {
    iframe: {
      enabled: boolean;
      theme: "light" | "dark" | "transparent";
    };
    widget: {
      enabled: boolean;
      position: "left" | "right";
      theme: "light" | "dark";
    };
  };
  ui: {
    enabled: boolean;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    elements: {
      roundedCorners: boolean;
      shadows: boolean;
      animations: boolean;
    };
  };
}

const defaultSettings: Settings = {
  webhook: {
    url: "https://n8n.klaster.digital/webhook-test/4a1fed67-dcfb-4eb8-a71b-d47b1d651509",
    enabled: true,
  },
  integration: {
    iframe: {
      enabled: false,
      theme: "dark",
    },
    widget: {
      enabled: false,
      position: "left",
      theme: "dark",
    },
  },
  ui: {
    enabled: false,
    colors: {
      primary: "#10a37f",
      secondary: "#343541",
      accent: "#202123"
    },
    elements: {
      roundedCorners: true,
      shadows: true,
      animations: true
    }
  }
};

const Cabinet = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [isStyleEditorActive, setIsStyleEditorActive] = useState(false);
  
  // Запрос настроек с сервера
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      try {
        const result = await apiRequest("/api/settings");
        return result as Settings;
      } catch (error) {
        console.error("Ошибка при получении настроек:", error);
        // Если настройки не получены, используем значения по умолчанию
        return defaultSettings;
      }
    },
  });

  const [webhookUrl, setWebhookUrl] = useState<string>(settings?.webhook.url || defaultSettings.webhook.url);
  const [webhookEnabled, setWebhookEnabled] = useState<boolean>(defaultSettings.webhook.enabled);
  const [iframeEnabled, setIframeEnabled] = useState<boolean>(defaultSettings.integration.iframe.enabled);
  const [iframeTheme, setIframeTheme] = useState<"light" | "dark" | "transparent">(defaultSettings.integration.iframe.theme);
  const [widgetEnabled, setWidgetEnabled] = useState<boolean>(defaultSettings.integration.widget.enabled);
  const [widgetPosition, setWidgetPosition] = useState<"left" | "right">(defaultSettings.integration.widget.position);
  const [widgetTheme, setWidgetTheme] = useState<"light" | "dark">(defaultSettings.integration.widget.theme);
  const [showWidgetPreview, setShowWidgetPreview] = useState(false);

  // Функция для создания превью виджета
  const createWidgetPreview = () => {
    const previewContainer = document.createElement('div');
    previewContainer.id = 'widget-preview';
    previewContainer.style.position = 'fixed';
    previewContainer.style.bottom = '20px';
    previewContainer.style[widgetPosition] = '20px';
    previewContainer.style.zIndex = '9999';
    previewContainer.style.transition = 'all 0.3s ease';
    
    const widgetButton = document.createElement('button');
    widgetButton.className = `widget-button ${widgetTheme}`;
    widgetButton.style.padding = '12px 24px';
    widgetButton.style.borderRadius = '8px';
    widgetButton.style.cursor = 'pointer';
    widgetButton.style.border = 'none';
    widgetButton.style.backgroundColor = widgetTheme === 'light' ? '#ffffff' : '#1a1a1a';
    widgetButton.style.color = widgetTheme === 'light' ? '#000000' : '#ffffff';
    widgetButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    widgetButton.textContent = 'Открыть чат';
    
    previewContainer.appendChild(widgetButton);
    document.body.appendChild(previewContainer);
    
    return () => {
      document.body.removeChild(previewContainer);
    };
  };
  
  // UI настройки
  const [uiEnabled, setUiEnabled] = useState<boolean>(
    settings?.ui?.enabled || defaultSettings.ui.enabled
  );
  const [primaryColor, setPrimaryColor] = useState<string>(
    settings?.ui?.colors.primary || defaultSettings.ui.colors.primary
  );
  const [secondaryColor, setSecondaryColor] = useState<string>(
    settings?.ui?.colors.secondary || defaultSettings.ui.colors.secondary
  );
  const [accentColor, setAccentColor] = useState<string>(
    settings?.ui?.colors.accent || defaultSettings.ui.colors.accent
  );
  const [roundedCorners, setRoundedCorners] = useState<boolean>(
    settings?.ui?.elements.roundedCorners || defaultSettings.ui.elements.roundedCorners
  );
  const [shadows, setShadows] = useState<boolean>(
    settings?.ui?.elements.shadows || defaultSettings.ui.elements.shadows
  );
  const [animations, setAnimations] = useState<boolean>(
    settings?.ui?.elements.animations || defaultSettings.ui.elements.animations
  );

  // Обновляем локальное состояние когда данные загружены
  React.useEffect(() => {
    if (settings) {
      // Webhook настройки
      if (settings.webhook) {
        setWebhookUrl(settings.webhook.url ?? defaultSettings.webhook.url);
        setWebhookEnabled(settings.webhook.enabled ?? defaultSettings.webhook.enabled);
      }
      
      // Интеграционные настройки
      if (settings.integration) {
        if (settings.integration.iframe) {
          setIframeEnabled(settings.integration.iframe.enabled ?? defaultSettings.integration.iframe.enabled);
          setIframeTheme(settings.integration.iframe.theme ?? defaultSettings.integration.iframe.theme);
        }
        if (settings.integration.widget) {
          setWidgetEnabled(settings.integration.widget.enabled ?? defaultSettings.integration.widget.enabled);
          setWidgetPosition(settings.integration.widget.position ?? defaultSettings.integration.widget.position);
          setWidgetTheme(settings.integration.widget.theme ?? defaultSettings.integration.widget.theme);
        }
      }
      
      // UI настройки
      if (settings.ui) {
        setUiEnabled(settings.ui.enabled ?? defaultSettings.ui.enabled);
        setPrimaryColor(settings.ui.colors?.primary ?? defaultSettings.ui.colors.primary);
        setSecondaryColor(settings.ui.colors?.secondary ?? defaultSettings.ui.colors.secondary);
        setAccentColor(settings.ui.colors?.accent ?? defaultSettings.ui.colors.accent);
        setRoundedCorners(settings.ui.elements?.roundedCorners ?? defaultSettings.ui.elements.roundedCorners);
        setShadows(settings.ui.elements?.shadows ?? defaultSettings.ui.elements.shadows);
        setAnimations(settings.ui.elements?.animations ?? defaultSettings.ui.elements.animations);
      }
    }
  }, [settings]);

  // Cleanup widget preview on unmount
  React.useEffect(() => {
    return () => {
      const existingPreview = document.getElementById('widget-preview');
      if (existingPreview) {
        document.body.removeChild(existingPreview);
      }
    };
  }, []);


  // Мутация для сохранения только настроек webhook
  const saveWebhookMutation = useMutation({
    mutationFn: async (data: { url: string; enabled: boolean }) => {
      const result = await apiRequest("/api/settings/webhook", {
        method: "PUT",
        data,
      });
      return result as Settings;
    },
    onSuccess: () => {
      toast({
        title: "Настройки вебхука сохранены",
        description: "Ваши изменения успешно применены",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить настройки вебхука. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      });
      console.error("Ошибка при сохранении настроек вебхука:", error);
    },
  });

  // Обработчик сохранения настроек вебхука
  const handleSaveWebhook = () => {
    if (!webhookUrl.trim()) {
      toast({
        title: "Ошибка",
        description: "URL вебхука не может быть пустым",
        variant: "destructive",
      });
      return;
    }

    saveWebhookMutation.mutate({
      url: webhookUrl,
      enabled: webhookEnabled,
    });
  };

  // Мутация для сохранения только настроек интеграции
  const saveIntegrationMutation = useMutation({
    mutationFn: async (integration: Settings['integration']) => {
      const result = await apiRequest("/api/settings/integration", {
        method: "PUT",
        data: { integration },
      });
      return result as Settings;
    },
    onSuccess: () => {
      toast({
        title: "Настройки интеграции сохранены",
        description: "Ваши изменения успешно применены",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить настройки интеграции. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      });
      console.error("Ошибка при сохранении настроек интеграции:", error);
    },
  });

  // Обработчик сохранения настроек интеграции
  const handleSaveIntegration = () => {
    const integration = {
      iframe: {
        enabled: iframeEnabled,
        theme: iframeTheme,
      },
      widget: {
        enabled: widgetEnabled,
        position: widgetPosition,
        theme: widgetTheme,
      },
    };

    saveIntegrationMutation.mutate(integration);
  };
  
  // Мутация для сохранения настроек UI
  const saveUiMutation = useMutation({
    mutationFn: async (ui: Settings['ui']) => {
      const result = await apiRequest("/api/settings/ui", {
        method: "PUT",
        data: { ui },
      });
      return result as Settings;
    },
    onSuccess: () => {
      toast({
        title: "Настройки интерфейса сохранены",
        description: "Ваши изменения успешно применены",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить настройки интерфейса. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      });
      console.error("Ошибка при сохранении настроек интерфейса:", error);
    },
  });
  
  // Обработчик сохранения настроек UI
  const handleSaveUi = () => {
    const ui = {
      enabled: uiEnabled,
      colors: {
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor,
      },
      elements: {
        roundedCorners: roundedCorners,
        shadows: shadows,
        animations: animations,
      },
    };

    saveUiMutation.mutate(ui);
  };

  // Генерация кода для iframe интеграции
  const getIframeCode = () => {
    return `<iframe 
  src="${window.location.origin}?embed=true&theme=${iframeTheme}" 
  width="100%" 
  height="600px" 
  frameborder="0" 
  allow="microphone"
></iframe>`;
  };

  // Генерация кода для виджета
  const getWidgetCode = () => {
    return `<script>
  (function(d, w) {
    var s = d.createElement('script');
    s.src = '${window.location.origin}/widget.js';
    s.setAttribute('data-position', '${widgetPosition}');
    s.setAttribute('data-theme', '${widgetTheme}');
    d.head.appendChild(s);
  })(document, window);
</script>`;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-xl">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white">
      {/* Хедер */}
      <header className="border-b border-gray-800 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Личный кабинет</h1>
          <Button 
            variant="outline" 
            onClick={() => {
              localStorage.removeItem("isAuthenticated");
              toast({
                title: "Выход из системы",
                description: "Вы успешно вышли из системы",
              });
              navigate("/");
            }}
          >
            Выйти
          </Button>
        </div>
      </header>

      {/* Основной контент */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="webhook" className="space-y-6">
          <TabsList className="bg-gray-900 text-white">
            <TabsTrigger value="webhook">Настройка вебхука</TabsTrigger>
            <TabsTrigger value="integration">Интеграция</TabsTrigger>
            <TabsTrigger value="ui">Настройки UI</TabsTrigger>
          </TabsList>

          {/* Раздел настройки вебхука */}
          <TabsContent value="webhook">
            <Card className="bg-gray-900 text-white border-gray-800">
              <CardHeader>
                <CardTitle>Настройка вебхука n8n</CardTitle>
                <CardDescription className="text-gray-400">
                  Укажите URL вебхука для обработки сообщений. Любые изменения вступят в силу немедленно.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">URL вебхука</Label>
                  <Input
                    id="webhook-url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://n8n.example.com/webhook-endpoint"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-400">
                    Формат: https://n8n.domain.com/webhook-path/uuid
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="webhook-enabled"
                    checked={webhookEnabled}
                    onCheckedChange={setWebhookEnabled}
                  />
                  <Label htmlFor="webhook-enabled">Включить вебхук</Label>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleSaveWebhook}
                  disabled={saveWebhookMutation.isPending}
                >
                  {saveWebhookMutation.isPending ? "Сохранение..." : "Сохранить настройки"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Раздел интеграции */}
          <TabsContent value="integration">
            <div className="space-y-6">
              {/* Настройка iframe */}
              <Card className="bg-gray-900 text-white border-gray-800">
                <CardHeader>
                  <CardTitle>Встраивание через iframe</CardTitle>
                  <CardDescription className="text-gray-400">
                    Настройте параметры для встраивания чата на ваш сайт через iframe.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="iframe-enabled"
                      checked={iframeEnabled}
                      onCheckedChange={setIframeEnabled}
                    />
                    <Label htmlFor="iframe-enabled">Включить iframe интеграцию</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Тема оформления</Label>
                    <RadioGroup value={iframeTheme} onValueChange={(value) => setIframeTheme(value as "light" | "dark" | "transparent")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="light" id="iframe-light" />
                        <Label htmlFor="iframe-light">Светлая</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dark" id="iframe-dark" />
                        <Label htmlFor="iframe-dark">Темная</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="transparent" id="iframe-transparent" />
                        <Label htmlFor="iframe-transparent">Прозрачная</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {iframeEnabled && (
                    <div className="mt-4 space-y-2">
                      <Label>Код для вставки</Label>
                      <div className="bg-gray-800 p-4 rounded-md">
                        <code className="text-sm text-green-400 whitespace-pre-wrap break-all">
                          {getIframeCode()}
                        </code>
                      </div>
                      <Button 
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          navigator.clipboard.writeText(getIframeCode());
                          toast({
                            title: "Скопировано!",
                            description: "Код iframe скопирован в буфер обмена",
                          });
                        }}
                      >
                        Скопировать код
                      </Button>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleSaveIntegration}
                    disabled={saveIntegrationMutation.isPending}
                  >
                    {saveIntegrationMutation.isPending ? "Сохранение..." : "Сохранить настройки"}
                  </Button>
                </CardFooter>
              </Card>

              {/* Настройка виджета для сайта */}
              <Card className="bg-gray-900 text-white border-gray-800">
                <CardHeader>
                  <CardTitle>Виджет для сайта</CardTitle>
                  <CardDescription className="text-gray-400">
                    Настройте параметры чат-виджета, который будет отображаться на вашем сайте.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="widget-enabled"
                      checked={widgetEnabled}
                      onCheckedChange={setWidgetEnabled}
                    />
                    <Label htmlFor="widget-enabled">Включить виджет</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Расположение на странице</Label>
                    <RadioGroup value={widgetPosition} onValueChange={(value) => setWidgetPosition(value as "left" | "right")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="left" id="position-left" />
                        <Label htmlFor="position-left">Слева</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="right" id="position-right" />
                        <Label htmlFor="position-right">Справа</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Тема оформления</Label>
                    <RadioGroup value={widgetTheme} onValueChange={(value) => setWidgetTheme(value as "light" | "dark")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="light" id="theme-light" />
                        <Label htmlFor="theme-light">Светлая</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dark" id="theme-dark" />
                        <Label htmlFor="theme-dark">Темная</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {widgetEnabled && (
                    <div className="mt-4 space-y-2">
                      <Label>Код для вставки</Label>
                      <div className="bg-gray-800 p-4 rounded-md">
                        <code className="text-sm text-green-400 whitespace-pre-wrap break-all">
                          {getWidgetCode()}
                        </code>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(getWidgetCode());
                            toast({
                              title: "Скопировано!",
                              description: "Код виджета скопирован в буфер обмена",
                            });
                          }}
                        >
                          Скопировать код
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            if (showWidgetPreview) {
                              setShowWidgetPreview(false);
                              const existingPreview = document.getElementById('widget-preview');
                              if (existingPreview) {
                                document.body.removeChild(existingPreview);
                              }
                            } else {
                              setShowWidgetPreview(true);
                              createWidgetPreview();
                            }
                          }}
                        >
                          {showWidgetPreview ? 'Скрыть превью' : 'Показать превью'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleSaveIntegration}
                    disabled={saveIntegrationMutation.isPending}
                  >
                    {saveIntegrationMutation.isPending ? "Сохранение..." : "Сохранить настройки"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {/* Раздел настроек UI */}
          <TabsContent value="ui">
            <Card className="bg-gray-900 text-white border-gray-800">
              <CardHeader>
                <CardTitle>Настройки пользовательского интерфейса</CardTitle>
                <CardDescription className="text-gray-400">
                  Настройте внешний вид интерфейса чата для ваших пользователей.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ui-enabled"
                    checked={uiEnabled}
                    onCheckedChange={setUiEnabled}
                  />
                  <Label htmlFor="ui-enabled">Включить пользовательские настройки интерфейса</Label>
                </div>
                
                {uiEnabled && (
                  <>
                    {/* Кнопка для активации визуального редактора */}
                    <div className="mb-6">
                      <Button 
                        onClick={() => setIsStyleEditorActive(true)}
                        variant="outline"
                        className="bg-gray-800 hover:bg-gray-700"
                      >
                        <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                        Включить интерактивное редактирование
                      </Button>
                      <p className="text-xs text-gray-400 mt-2">
                        Позволяет редактировать стили наводя курсор на элементы интерфейса
                      </p>
                    </div>
                    
                    {/* Настройки цветов */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Цветовая схема</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="primary-color">Основной цвет</Label>
                          <div className="flex space-x-2">
                            <Input
                              id="primary-color"
                              type="color"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="w-12 h-10 p-1 bg-gray-800 border-gray-700"
                            />
                            <Input
                              type="text"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="flex-1 bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="secondary-color">Вторичный цвет</Label>
                          <div className="flex space-x-2">
                            <Input
                              id="secondary-color"
                              type="color"
                              value={secondaryColor}
                              onChange={(e) => setSecondaryColor(e.target.value)}
                              className="w-12 h-10 p-1 bg-gray-800 border-gray-700"
                            />
                            <Input
                              type="text"
                              value={secondaryColor}
                              onChange={(e) => setSecondaryColor(e.target.value)}
                              className="flex-1 bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="accent-color">Акцентный цвет</Label>
                          <div className="flex space-x-2">
                            <Input
                              id="accent-color"
                              type="color"
                              value={accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              className="w-12 h-10 p-1 bg-gray-800 border-gray-700"
                            />
                            <Input
                              type="text"
                              value={accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              className="flex-1 bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-4 bg-gray-800 rounded-md">
                        <h4 className="text-md font-medium mb-2">Элементы интерфейса</h4>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Кнопки</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                placeholder="Высота (px)"
                                className="bg-gray-800 border-gray-700 text-white"
                                onChange={(e) => {
                                  const styles = document.documentElement.style;
                                  styles.setProperty('--button-height', `${e.target.value}px`);
                                }}
                              />
                              <Input
                                type="number"
                                placeholder="Скругление (px)"
                                className="bg-gray-800 border-gray-700 text-white"
                                onChange={(e) => {
                                  const styles = document.documentElement.style;
                                  styles.setProperty('--button-radius', `${e.target.value}px`);
                                }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Поля ввода</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                placeholder="Отступы (px)"
                                className="bg-gray-800 border-gray-700 text-white"
                                onChange={(e) => {
                                  const styles = document.documentElement.style;
                                  styles.setProperty('--input-padding', `${e.target.value}px`);
                                }}
                              />
                              <Input
                                type="number"
                                placeholder="Размер шрифта (px)"
                                className="bg-gray-800 border-gray-700 text-white"
                                onChange={(e) => {
                                  const styles = document.documentElement.style;
                                  styles.setProperty('--input-font-size', `${e.target.value}px`);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-4 bg-gray-800 rounded-md">
                        <h4 className="text-md font-medium mb-2">Предпросмотр цветов</h4>
                        <div className="flex flex-wrap gap-3">
                          <div 
                            className="w-24 h-12 rounded" 
                            style={{ backgroundColor: primaryColor }}
                            title="Основной цвет"
                          ></div>
                          <div 
                            className="w-24 h-12 rounded" 
                            style={{ backgroundColor: secondaryColor }}
                            title="Вторичный цвет"
                          ></div>
                          <div 
                            className="w-24 h-12 rounded" 
                            style={{ backgroundColor: accentColor }}
                            title="Акцентный цвет"
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-4 bg-gray-800" />
                    
                    {/* Настройки элементов */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Элементы интерфейса</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="rounded-corners">Скругленные углы</Label>
                          <Switch
                            id="rounded-corners"
                            checked={roundedCorners}
                            onCheckedChange={setRoundedCorners}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="shadows">Тени элементов</Label>
                          <Switch
                            id="shadows"
                            checked={shadows}
                            onCheckedChange={setShadows}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="animations">Анимации</Label>
                          <Switch
                            id="animations"
                            checked={animations}
                            onCheckedChange={setAnimations}
                          />
                        </div>
                      </div>
                      
                      <div className="mt-4 p-4 bg-gray-800 rounded-md">
                        <h4 className="text-md font-medium mb-2">Пример элемента</h4>
                        <div 
                          className={`w-full h-20 border-2 border-white/20 bg-gray-700 flex items-center justify-center 
                            ${roundedCorners ? 'rounded-xl' : ''} 
                            ${shadows ? 'shadow-lg' : ''} 
                            ${animations ? 'transition-all duration-300 hover:scale-[1.02]' : ''}`}
                          style={{ borderColor: primaryColor }}
                        >
                          <span style={{ color: primaryColor }}>Предпросмотр стиля</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleSaveUi}
                  disabled={saveUiMutation.isPending}
                >
                  {saveUiMutation.isPending ? "Сохранение..." : "Сохранить настройки"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Компонент визуального редактирования стилей */}
      {isStyleEditorActive && (
        <LiveStyleEditor 
          initialSettings={{
            webhook: {
              url: webhookUrl,
              enabled: webhookEnabled
            },
            integration: {
              iframe: {
                enabled: iframeEnabled,
                theme: iframeTheme
              },
              widget: {
                enabled: widgetEnabled,
                position: widgetPosition,
                theme: widgetTheme
              }
            },
            ui: {
              enabled: uiEnabled,
              colors: {
                primary: primaryColor,
                secondary: secondaryColor,
                accent: accentColor
              },
              elements: {
                roundedCorners: roundedCorners,
                shadows: shadows,
                animations: animations
              }
            }
          }}
          isActive={isStyleEditorActive}
          onClose={() => setIsStyleEditorActive(false)}
        />
      )}
    </div>
  );
};

export default Cabinet;