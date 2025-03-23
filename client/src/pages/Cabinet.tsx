import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// UI компоненты
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// Интерфейсы для данных
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
};

const Cabinet = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
  const [webhookEnabled, setWebhookEnabled] = useState<boolean>(
    settings?.webhook.enabled || defaultSettings.webhook.enabled
  );
  
  const [iframeEnabled, setIframeEnabled] = useState<boolean>(
    settings?.integration.iframe.enabled || defaultSettings.integration.iframe.enabled
  );
  const [iframeTheme, setIframeTheme] = useState<"light" | "dark" | "transparent">(
    settings?.integration.iframe.theme || defaultSettings.integration.iframe.theme
  );
  
  const [widgetEnabled, setWidgetEnabled] = useState<boolean>(
    settings?.integration.widget.enabled || defaultSettings.integration.widget.enabled
  );
  const [widgetPosition, setWidgetPosition] = useState<"left" | "right">(
    settings?.integration.widget.position || defaultSettings.integration.widget.position
  );
  const [widgetTheme, setWidgetTheme] = useState<"light" | "dark">(
    settings?.integration.widget.theme || defaultSettings.integration.widget.theme
  );

  // Обновляем локальное состояние когда данные загружены
  // eslint-disable-next-line react-hooks/rules-of-hooks
  React.useEffect(() => {
    if (settings) {
      setWebhookUrl(settings.webhook.url);
      setWebhookEnabled(settings.webhook.enabled);
      setIframeEnabled(settings.integration.iframe.enabled);
      setIframeTheme(settings.integration.iframe.theme);
      setWidgetEnabled(settings.integration.widget.enabled);
      setWidgetPosition(settings.integration.widget.position);
      setWidgetTheme(settings.integration.widget.theme);
    }
  }, [settings]);



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
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-semibold">Личный кабинет</h1>
        </div>
      </header>

      {/* Основной контент */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="webhook" className="space-y-6">
          <TabsList className="bg-gray-900 text-white">
            <TabsTrigger value="webhook">Настройка вебхука</TabsTrigger>
            <TabsTrigger value="integration">Интеграция</TabsTrigger>
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
                            title: "Скопировано",
                            description: "Код для вставки скопирован в буфер обмена",
                          });
                        }}
                      >
                        Скопировать код
                      </Button>
                    </div>
                  )}
                </CardContent>
                
                <Separator className="my-2 bg-gray-800" />
                
                {/* Настройка виджета */}
                <CardHeader>
                  <CardTitle>Встраиваемый виджет чата</CardTitle>
                  <CardDescription className="text-gray-400">
                    Настройте параметры для добавления плавающего виджета чата на ваш сайт.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="widget-enabled"
                      checked={widgetEnabled}
                      onCheckedChange={setWidgetEnabled}
                    />
                    <Label htmlFor="widget-enabled">Включить виджет чата</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Расположение на экране</Label>
                    <RadioGroup value={widgetPosition} onValueChange={(value) => setWidgetPosition(value as "left" | "right")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="left" id="widget-left" />
                        <Label htmlFor="widget-left">Слева внизу</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="right" id="widget-right" />
                        <Label htmlFor="widget-right">Справа внизу</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Тема оформления</Label>
                    <RadioGroup value={widgetTheme} onValueChange={(value) => setWidgetTheme(value as "light" | "dark")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="light" id="widget-light" />
                        <Label htmlFor="widget-light">Светлая</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dark" id="widget-dark" />
                        <Label htmlFor="widget-dark">Темная</Label>
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
                      <Button 
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          navigator.clipboard.writeText(getWidgetCode());
                          toast({
                            title: "Скопировано",
                            description: "Код для вставки скопирован в буфер обмена",
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
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Cabinet;