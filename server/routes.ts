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
          
          if (!response.ok) {
            throw new Error(`Webhook responded with status: ${response.status}`);
          }
          
          const data = await response.json() as any;
          console.log("Webhook response data:", JSON.stringify(data, null, 2));
          
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
          // Если получили ответ "Workflow was started", сообщаем что сервис недоступен
          else if (data && data.message === "Workflow was started") {
            console.log("Webhook сообщил о начале процесса, но нет конкретного ответа");
            aiResponse = "К сожалению, сервис обработки сообщений в данный момент недоступен. Пожалуйста, попробуйте позже.";
          
          } else {
            // Если получили другой ответ от webhook
            aiResponse = data && 'response' in data ? data.response : 
                        data && 'message' in data ? data.message : 
                        "Извините, я не смог сгенерировать ответ на ваш запрос.";
          }
        } catch (error) {
          console.log("Webhook unreachable");
          aiResponse = "К сожалению, сервис обработки сообщений в данный момент недоступен. Пожалуйста, попробуйте позже.";
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
