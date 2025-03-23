import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import { insertChatSchema, insertMessageSchema } from "@shared/schema";
import fetch from "node-fetch";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Функция для активации webhook перед запросом
  async function activateWebhook() {
    try {
      // Сначала делаем запрос для активации webhook
      console.log("Pre-activating webhook...");
      await fetch('https://n8n.klaster.digital/webhook-test/4a1fed67-dcfb-4eb8-a71b-d47b1d651509', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'activation' }),
      }).catch(() => console.log("Pre-activation expected to fail, webhook should be ready now"));
      
      // Ждем 500 миллисекунд, чтобы убедиться, что webhook активировался
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log("Webhook should be activated now");
    } catch (error) {
      console.log("Activation error (can be ignored):", error);
    }
  }

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
      
      // Значение по умолчанию для сообщения об ошибке
      let aiResponse = "🔄 Для активации сервиса необходимо:\n\n1. Открыть интерфейс n8n по адресу:\n   https://n8n.klaster.digital\n\n2. Найти поток с webhook ID:\n   4a1fed67-dcfb-4eb8-a71b-d47b1d651509\n\n3. Нажать кнопку 'Test workflow'\n\n4. Вернуться сюда и отправить сообщение";
      
      // Отправляем запрос к webhook
      const webhookUrl = 'https://n8n.klaster.digital/webhook-test/4a1fed67-dcfb-4eb8-a71b-d47b1d651509';
      
      // Активируем webhook перед запросом
      await activateWebhook();
      
      // Подготовка данных для отправки на webhook
      const requestBody: any = { message: content };
      
      // Если есть аудио данные, добавляем их как отдельную переменную
      if (audioData) {
        requestBody.audio = audioData;
        console.log("Including audio data in webhook request (audio data length: " + (audioData?.length || 0) + " characters)");
      }
      
      console.log("Sending webhook request:", {
        url: webhookUrl,
        body: { message: content, hasAudio: !!audioData }
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
            aiResponse = "🔄 Для активации сервиса необходимо:\n\n1. Открыть интерфейс n8n по адресу:\n   https://n8n.klaster.digital\n\n2. Найти поток с webhook ID:\n   4a1fed67-dcfb-4eb8-a71b-d47b1d651509\n\n3. Нажать кнопку 'Test workflow'\n\n4. Вернуться сюда и отправить сообщение";
            console.log("Using detailed Russian error message for webhook not registered");
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
            if (aiResponse === "🔄 Для активации сервиса необходимо:\n\n1. Открыть интерфейс n8n по адресу:\n   https://n8n.klaster.digital\n\n2. Найти поток с webhook ID:\n   4a1fed67-dcfb-4eb8-a71b-d47b1d651509\n\n3. Нажать кнопку 'Test workflow'\n\n4. Вернуться сюда и отправить сообщение" &&
                !(response.status === 404 && data && data.message && 
                  data.message.includes("webhook") && 
                  data.message.includes("not registered"))) {
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
            }
          } catch (textError) {
            console.log("Error getting text from webhook:", textError);
            // Оставляем сообщение по умолчанию
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

  const httpServer = createServer(app);
  return httpServer;
}
