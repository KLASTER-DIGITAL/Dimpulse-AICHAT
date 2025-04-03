import express from 'express';
import { handleLongPolling, sendMessage } from './polling';

const router = express.Router();

// Маршруты для long polling
router.get('/chat/:chatId/messages', handleLongPolling);
router.post('/chat/:chatId/messages', sendMessage);

export default router;
