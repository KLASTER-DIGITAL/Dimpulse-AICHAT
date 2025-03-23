import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import { insertChatSchema, insertMessageSchema, settingsSchema } from "@shared/schema";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";

// Middleware для CORS
const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Предварительный запрос CORS
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Применяем middleware для CORS ко всем маршрутам
  app.use(corsMiddleware);
  
  // Обработчик для widget.js
  app.get("/widget.js", (req, res) => {
    try {
      const widgetPath = path.join(process.cwd(), "client", "public", "widget.js");
      if (fs.existsSync(widgetPath)) {
        res.setHeader('Content-Type', 'application/javascript');
        res.sendFile(widgetPath);
      } else {
        console.error("Widget file not found at path:", widgetPath);
        res.status(404).send("Widget not found");
      }
    } catch (error) {
      console.error("Error serving widget.js:", error);
      res.status(500).send("Error serving widget");
    }
  });
  // Get all chats (for the sidebar)
  app.get("/api/chats", async (req, res) => {
    try {
      const chats = await storage.getChatsByUserId(null);
      res.json(chats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  // Create a new chat
  app.post("/api/chats", async (req, res) => {
    try {
      const chatId = randomUUID();
      const chatData = insertChatSchema.parse({
        id: chatId,
        title: "New Chat",
        userId: null,
      });

      const chat = await storage.createChat(chatData);
      
      // Больше не создаем автоматическое первое сообщение
      // Вместо этого, приветствие будет показываться на фронтенде
      
      res.status(201).json(chat);
    } catch (error) {
      res.status(400).json({ message: "Failed to create chat" });
    }
  });

  // Get a specific chat with its messages
  app.get("/api/chats/:chatId", async (req, res) => {
    try {
      const chatId = req.params.chatId;
      const chat = await storage.getChatById(chatId);
      
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      const messages = await storage.getMessagesByChatId(chatId);
      res.json({ chat, messages });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat" });
    }
  });



  // Send a message and get a response from the AI
  app.post("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const chatId = req.params.chatId;
      const { content, audioData } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      // Create user message
      const userMessageData = insertMessageSchema.parse({
        chatId,
        role: "user",
        content,
      });
      
      await storage.createMessage(userMessageData);
      
      // Это значение будет использоваться, только если обнаружена ошибка 404 с сообщением о неактивном webhook
      // В других случаях будем ждать ответа от webhook
      let aiResponse = "";
      
      // Получаем настройки webhook из хранилища
      const settings = await storage.getSettings();
      const webhookUrl = settings.webhook.url;
      const webhookEnabled = settings.webhook.enabled;
      
      // Проверяем, включен ли webhook
      if (!webhookEnabled) {
        console.log("Webhook is disabled in settings");
        return res.status(201).json({
          id: -1,
          chatId,
          role: "assistant",
          content: "typing",
          createdAt: new Date().toISOString(),
          typing: true
        });
      }
      
      // Не выполняем предварительную активацию webhook, требуется ручная активация
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Подготовка данных для отправки на webhook
      const requestTime = new Date().toISOString();
      
      // Создаем уникальный идентификатор сессии для пользователя на основе chatId
      // Это позволит n8n сохранять историю диалогов для каждого пользователя
      const sessionId = chatId;
      
      const requestBody: any = { 
        message: content,
        // Добавляем структурированное сообщение с текстом и голосом
        message_data: {
          text: content,
          // voice будет null если нет аудиоданных
          voice: audioData || null
        },
        // Добавляем время запроса для аналитики
        timestamp: requestTime,
        request_time: requestTime,
        // Добавляем идентификатор сессии для работы памяти в n8n
        session_id: sessionId
      };
      
      // Если есть аудио данные, добавляем их также как отдельную переменную
      if (audioData) {
        requestBody.audio = audioData;
        console.log("Including audio data in webhook request (audio data length: " + (audioData?.length || 0) + " characters)");
      }
      
      // Если есть файл, добавляем его как отдельную переменную верхнего уровня (не вложенный объект)
      const fileData = req.body.fileData;
      if (fileData) {
        // Добавляем файл как отдельный параметр верхнего уровня для n8n
        requestBody.file = fileData.content;
        requestBody.file_name = fileData.name;
        requestBody.file_type = fileData.type;
        // Также добавим адрес сообщения с указанием, что к нему прикреплен файл
        requestBody.message = `${content} [с приложенным файлом: ${fileData.name}]`;
        console.log(`Including file data in webhook request (${fileData.name}, type: ${fileData.type})`);
      }
      
      // Если есть массив файлов, обрабатываем его
      const filesData = req.body.filesData;
      if (filesData && filesData.length > 0) {
        // Если файл еще не установлен (из fileData), используем первый файл как основной
        if (!fileData) {
          requestBody.file = filesData[0].content;
          requestBody.file_name = filesData[0].name;
          requestBody.file_type = filesData[0].type;
          // Также добавим адрес сообщения с указанием количества файлов
          requestBody.message = `${content} [с приложенными файлами (${filesData.length})]`;
        }
        
        // Также добавляем все файлы как массив для возможной обработки
        requestBody.files = filesData.map(f => ({
          content: f.content,
          name: f.name,
          type: f.type
        }));
        
        console.log(`Including multiple files (${filesData.length}) in webhook request`);
      }
      
      console.log("Sending webhook request:", {
        url: webhookUrl,
        body: { 
          message: content, 
          hasAudio: !!audioData,
          hasVoice: !!audioData,
          messageData: requestBody.message_data,
          sessionId: sessionId
        }
      });
      console.log("Request payload size:", JSON.stringify(requestBody).length, "bytes");
      
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        console.log("Webhook response status:", response.status);
        
        // Пытаемся получить данные JSON
        try {
          const data = await response.json();
          console.log("Webhook response data:", JSON.stringify(data, null, 2));
          
          // Проверяем, получили ли мы ответ о незарегистрированном webhook
          if (response.status === 404 && data && data.message && 
              data.message.includes("webhook") && 
              data.message.includes("not registered")) {
            console.log("Webhook not registered - returning typing status");
            return res.status(201).json({
              id: -1,
              chatId,
              role: "assistant",
              content: "typing",
              createdAt: new Date().toISOString(),
              typing: true
            });
          }
          // Обработка всех возможных форматов ответа от webhook
          else if (data) {
            // Вариант 1: Массив объектов с форматированными данными
            if (Array.isArray(data)) {
              const item = data[0];
              if (item) {
                if (typeof item === 'string') {
                  aiResponse = item;
                } else if (item.message && item.message.content) {
                  aiResponse = item.message.content;
                } else if (item.output) {
                  aiResponse = item.output;
                } else if (item.choices && item.choices[0] && item.choices[0].message && item.choices[0].message.content) {
                  aiResponse = item.choices[0].message.content;
                } else if (item.text) {
                  aiResponse = item.text;
                } else if (item.result) {
                  aiResponse = item.result;
                }
              }
            } 
            // Вариант 2: Объект в формате OpenAI API
            else if (data.choices && data.choices[0]) {
              if (data.choices[0].message && data.choices[0].message.content) {
                aiResponse = data.choices[0].message.content;
              } else if (data.choices[0].text) {
                aiResponse = data.choices[0].text;
              }
            }
            // Вариант 3: Простой объект с ответом
            else if (data.response) {
              aiResponse = data.response;
            }
            // Вариант 4: Объект с полем text или content
            else if (data.text) {
              aiResponse = data.text;
            } else if (data.content) {
              aiResponse = data.content;
            }
            // Вариант 5: Объект с полем message (если это не сообщение об ошибке webhook)
            else if (data.message && !data.message.includes("webhook") && !data.message.includes("not registered")) {
              aiResponse = data.message;
            }
            // Вариант 6: Необработанный текст JSON
            else if (typeof data === 'string') {
              aiResponse = data;
            }
            
            // Если ответ не обработан ни одним из вариантов, но есть объект JSON
            if (aiResponse === "" && data) {
              // Преобразуем весь объект в строку как запасной вариант
              aiResponse = JSON.stringify(data);
            }
          }
        } catch (jsonError) {
          console.log("Error parsing JSON from webhook:", jsonError);
          // Пробуем получить текст ответа, если это не JSON
          try {
            const textResponse = await response.text();
            console.log("Webhook text response:", textResponse);
            if (textResponse && textResponse.length > 0) {
              aiResponse = textResponse;
            } else if (response.status === 200) {
              // Если статус 200, но ответ пустой, просто ждем ответа от webhook
              aiResponse = "typing";
              // Не создаем сообщение от ассистента, если нет ответа - вместо этого отправляем специальный статус
              return res.status(201).json({
                id: -1,
                chatId,
                role: "assistant",
                content: aiResponse,
                createdAt: new Date().toISOString(),
                typing: true
              });
            }
          } catch (textError) {
            console.log("Error getting text from webhook:", textError);
            // Если не можем получить текст, ждем ответа от webhook
            if (response.status === 200) {
              aiResponse = "typing";
              // Не создаем сообщение от ассистента, если нет ответа
              return res.status(201).json({
                id: -1,
                chatId,
                role: "assistant",
                content: aiResponse,
                createdAt: new Date().toISOString(),
                typing: true
              });
            }
          }
        }
      } catch (error) {
        console.log("Error contacting webhook:", error);
        // Оставляем сообщение по умолчанию
      }
      
      // Create AI message
      const aiMessageData = insertMessageSchema.parse({
        chatId,
        role: "assistant",
        content: aiResponse,
      });
      
      const aiMessage = await storage.createMessage(aiMessageData);
      
      res.status(201).json(aiMessage);
    } catch (error) {
      console.error("Message error:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // Получение настроек
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Обновление настроек
  app.put("/api/settings", async (req, res) => {
    try {
      const settings = settingsSchema.parse(req.body);
      const updatedSettings = await storage.updateSettings(settings);
      res.json(updatedSettings);
    } catch (error) {
      res.status(400).json({ message: "Failed to update settings" });
    }
  });

  // Обновление только URL вебхука
  app.put("/api/settings/webhook", async (req, res) => {
    try {
      const { url, enabled } = req.body;
      if (typeof url !== 'string') {
        return res.status(400).json({ message: "URL must be a string" });
      }
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: "Enabled must be a boolean" });
      }
      
      const updatedSettings = await storage.updateWebhookUrl(url, enabled);
      res.json(updatedSettings);
    } catch (error) {
      res.status(400).json({ message: "Failed to update webhook URL" });
    }
  });
  
  // Обновление только настроек интеграции
  app.put("/api/settings/integration", async (req, res) => {
    try {
      const { integration } = req.body;
      if (!integration || typeof integration !== 'object') {
        return res.status(400).json({ message: "Integration settings must be an object" });
      }
      
      // Получаем текущие настройки
      const currentSettings = await storage.getSettings();
      
      // Обновляем только настройки интеграции
      const updatedSettings = {
        ...currentSettings,
        integration
      };
      
      const result = await storage.updateSettings(updatedSettings);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Failed to update integration settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
