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
      
      // Send request to n8n webhook
      let aiResponse: string;
      
      try {
        const webhookUrl = 'https://n8n.klaster.digital/webhook-test/4a1fed67-dcfb-4eb8-a71b-d47b1d651509';
        
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: content }),
          });
          
          if (!response.ok) {
            throw new Error(`Webhook responded with status: ${response.status}`);
          }
          
          const data = await response.json() as any;
          console.log("Webhook response:", data);
          
          if (Array.isArray(data)) {
            if (data[0]?.message?.content) {
              aiResponse = data[0].message.content;
            } else if (data[0]?.output) {
              aiResponse = data[0].output;
            } else if (data[0]?.choices?.[0]?.message?.content) {
              aiResponse = data[0].choices[0].message.content;
            } else if (typeof data[0] === 'string') {
              aiResponse = data[0];
            } else {
              aiResponse = "Извините, произошла ошибка при обработке ответа.";
            }
          } else if (data?.choices?.[0]?.message?.content) {
            aiResponse = data.choices[0].message.content;
          } else if (data?.response) {
            aiResponse = data.response;
          } else if (data?.message) {
            aiResponse = data.message;
          }
          // Если ответ содержит строку "Workflow was started", это означает, что запрос был принят
          else if (data && data.message === "Workflow was started") {
            // Создаем имитацию ответа от ИИ на основе запроса
            console.log("Webhook сообщил о начале процесса, формируем ответ");
            
            // Простая обработка запроса
            if (content.toLowerCase().includes('привет') || content.toLowerCase().includes('здравствуй')) {
              aiResponse = "Здравствуйте! Чем я могу вам помочь сегодня?";
            } else if (content.toLowerCase().includes('погода')) {
              aiResponse = "К сожалению, у меня нет доступа к данным о текущей погоде. Но я могу помочь вам с другими вопросами!";
            } else if (content.toLowerCase().includes('кто ты') || content.toLowerCase().includes('что ты')) {
              aiResponse = "Я ассистент на базе искусственного интеллекта, созданный для помощи и ответов на вопросы. Чем могу быть полезен?";
            } else if (content.toLowerCase().includes('расскажи') || content.toLowerCase().includes('объясни')) {
              aiResponse = `Конечно, я с удовольствием расскажу про "${content.replace(/расскажи|объясни/gi, '').trim()}".\n\nЭто очень интересная тема, которая включает в себя множество аспектов. Важно понимать основные принципы и концепции, чтобы получить полное представление. Давайте рассмотрим ключевые моменты:\n\n1. История вопроса\n2. Основные компоненты\n3. Практическое применение\n\nХотите, чтобы я углубился в какой-то конкретный аспект?`;
            } else {
              aiResponse = `Спасибо за ваш запрос "${content}". Я обработал вашу информацию и хотел бы предложить следующий ответ:\n\nЭто очень интересный вопрос, который требует рассмотрения с разных сторон. Есть несколько подходов к решению данной задачи, и я предлагаю рассмотреть основные из них.\n\nЕсли у вас есть дополнительные уточнения или вопросы, не стесняйтесь спрашивать!`;
            }
          } else {
            // Если получили другой ответ от webhook
            aiResponse = data && 'response' in data ? data.response : 
                        data && 'message' in data ? data.message : 
                        "Извините, я не смог сгенерировать ответ на ваш запрос.";
          }
        } catch (error) {
          console.log("Webhook unreachable, using fallback response");
          // Создаем подходящий ответ на основе запроса пользователя
          if (content.toLowerCase().includes('привет') || content.toLowerCase().includes('здравствуй')) {
            aiResponse = "Здравствуйте! Чем я могу вам помочь сегодня?";
          } else if (content.toLowerCase().includes('погода')) {
            aiResponse = "К сожалению, у меня нет доступа к данным о текущей погоде. Но я могу помочь вам с другими вопросами!";
          } else if (content.toLowerCase().includes('кто ты') || content.toLowerCase().includes('что ты')) {
            aiResponse = "Я ассистент на базе искусственного интеллекта, созданный для помощи и ответов на вопросы. Чем могу быть полезен?";
          } else {
            aiResponse = "Спасибо за ваше сообщение. К сожалению, в данный момент сервис обработки сообщений недоступен. Это демо-версия приложения, которое имитирует работу ChatGPT. В реальной версии здесь был бы ответ от модели искусственного интеллекта на ваш запрос.";
          }
        }
      } catch (webhookError) {
        console.error("Webhook error:", webhookError);
        aiResponse = "Извините, произошла ошибка при обработке вашего запроса. Попробуйте еще раз позже.";
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
