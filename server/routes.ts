import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import { insertChatSchema, insertMessageSchema } from "@shared/schema";
import fetch from "node-fetch";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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
      // Сначала делаем запрос для активации webhook (теперь не требуется)
      console.log("Using regular webhook, pre-activation not needed...");
      
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
      const { content } = req.body;
      
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
      let aiResponse = "К сожалению, сервис обработки сообщений в данный момент недоступен. Для активации сервиса необходимо нажать кнопку 'Test workflow' в интерфейсе n8n.";
      
      // Отправляем запрос к webhook
      const webhookUrl = 'https://n8n.klaster.digital/webhook/4a1fed67-dcfb-4eb8-a71b-d47b1d651509';
      
      // Активируем webhook перед запросом
      await activateWebhook();
      
      console.log("Sending webhook request:", {
        url: webhookUrl,
        body: { message: content }
      });
      
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: content }),
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
            aiResponse = "К сожалению, сервис обработки сообщений в данный момент недоступен. Для активации сервиса необходимо нажать кнопку 'Test workflow' в интерфейсе n8n.";
            console.log("Using Russian error message for webhook not registered");
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
            if (aiResponse === "К сожалению, сервис обработки сообщений в данный момент недоступен. Для активации сервиса необходимо нажать кнопку 'Test workflow' в интерфейсе n8n." &&
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

  // Настройка multer для загрузки аудиофайлов
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const tempDir = path.join(os.tmpdir(), 'audio-uploads');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `audio-${uniqueSuffix}${path.extname(file.originalname)}`);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB максимальный размер файла
    },
    fileFilter: (req, file, cb) => {
      // Принимаем только аудиофайлы
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Только аудиофайлы!'));
      }
    }
  });

  // Эндпоинт для транскрипции аудио через webhook
  app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Аудиофайл не найден' });
      }

      const audioFilePath = req.file.path;
      console.log('Аудиофайл сохранен:', audioFilePath);
      
      // Формируем данные для отправки на webhook
      // Здесь мы отправляем путь к файлу, а не сам файл
      // Для реального использования можно либо:
      // 1. Конвертировать файл в base64 и отправлять его
      // 2. Загрузить файл в облачное хранилище и отправить ссылку
      // 3. Использовать сторонний сервис транскрипции
      
      // В данном случае отправляем информацию о файле на webhook
      const webhookUrl = 'https://n8n.klaster.digital/webhook/4a1fed67-dcfb-4eb8-a71b-d47b1d651509';
      
      console.log('Отправляем информацию о голосовом сообщении на webhook:', {
        url: webhookUrl
      });
      
      // Конвертируем файл в base64
      const audioFileContent = fs.readFileSync(audioFilePath);
      const audioBase64 = audioFileContent.toString('base64');
      
      // Отправляем на webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_base64: audioBase64,
          audio_filename: req.file.originalname,
          message_type: 'voice',
          transcription_request: true
        }),
      });
      
      console.log('Webhook response status:', response.status);
      
      // Пытаемся получить ответ от webhook
      let transcript = '';
      
      try {
        const data = await response.json();
        console.log('Webhook response data:', JSON.stringify(data, null, 2));
        
        // Обрабатываем различные варианты ответа от webhook
        if (data && data.transcript) {
          transcript = data.transcript;
        } else if (data && data.text) {
          transcript = data.text;
        } else if (data && data.content) {
          transcript = data.content;
        } else if (data && data.message) {
          transcript = data.message;
        } else if (Array.isArray(data) && data[0]) {
          if (typeof data[0] === 'string') {
            transcript = data[0];
          } else if (data[0].transcript) {
            transcript = data[0].transcript;
          } else if (data[0].text) {
            transcript = data[0].text;
          } else if (data[0].content) {
            transcript = data[0].content;
          }
        } else {
          // Если не нашли подходящий формат, используем текст по умолчанию
          transcript = 'Не удалось распознать текст аудиосообщения. Пожалуйста, попробуйте еще раз.';
        }
      } catch (error) {
        console.log('Ошибка при обработке ответа от webhook:', error);
        transcript = 'Произошла ошибка при обработке аудио. Пожалуйста, попробуйте еще раз.';
      }
      
      // Очищаем временный файл
      try {
        fs.unlinkSync(audioFilePath);
        console.log('Временный файл удален:', audioFilePath);
      } catch (unlinkError) {
        console.log('Ошибка при удалении временного файла:', unlinkError);
      }
      
      res.json({ transcript });
    } catch (error) {
      console.error('Ошибка при обработке аудио:', error);
      res.status(500).json({ error: 'Ошибка при обработке аудио', details: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
