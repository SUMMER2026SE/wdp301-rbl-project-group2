import { Router } from 'express';
import authenticate from '@/middlewares/authenticate';
import authorize from '@/middlewares/authorize';
import { Role } from '@/types';
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
supportChatRoutes.patch('/conversations/:id/close', authorize(Role.STAFF, Role.ADMIN), closeConversation);
supportChatRoutes.get('/conversations', listUserConversations);

// Settings
supportChatRoutes.get('/settings', authorize(Role.STAFF, Role.ADMIN), getSupportSettings);
supportChatRoutes.post('/settings', authorize(Role.STAFF, Role.ADMIN), updateSupportSettings);

// Staff only
supportChatRoutes.get('/staff/conversations', authorize(Role.STAFF, Role.ADMIN), listStaffConversations);

export default supportChatRoutes;

