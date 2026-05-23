import { Router } from 'express';
import { handleChat } from '@/controllers/chat.controller';
import authenticate from '@/middlewares/authenticate';

const chatRoutes = Router();

chatRoutes.post('/', authenticate, handleChat);

export default chatRoutes;
