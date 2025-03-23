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
          aiResponse = data.response || "I apologize, but I couldn't generate a response.";
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
