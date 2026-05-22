import { Router } from 'express';
import authenticate from '@/middlewares/authenticate';
import {
    createOrGetConversation,
    getMessages,
    sendMessage,
    listStaffConversations,
    markAsRead,
    closeConversation,
    getSupportSettings,
    updateSupportSettings,
    listUserConversations
} from '@/controllers/support-chat.controller';

const supportChatRoutes = Router();

// Tất cả route yêu cầu user đăng nhập (user hoặc staff/admin)
supportChatRoutes.use(authenticate);

// User + Staff
supportChatRoutes.post('/conversations', createOrGetConversation);
supportChatRoutes.get('/conversations/:id/messages', getMessages);
supportChatRoutes.post('/conversations/:id/messages', sendMessage);
supportChatRoutes.patch('/conversations/:id/read', markAsRead);
supportChatRoutes.patch('/conversations/:id/close', closeConversation);
supportChatRoutes.get('/conversations', listUserConversations);

// Settings
supportChatRoutes.get('/settings', getSupportSettings);
supportChatRoutes.post('/settings', updateSupportSettings);

// Staff only (check role trong controller)
supportChatRoutes.get('/staff/conversations', listStaffConversations);

export default supportChatRoutes;

