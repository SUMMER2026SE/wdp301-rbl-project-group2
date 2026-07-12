import { Router } from 'express';
import { handleChat } from '@/controllers/chat.controller';
import optionalAuthenticate from '@/middlewares/optional-authenticate';

const chatRoutes = Router();

chatRoutes.post('/', optionalAuthenticate, handleChat);

export default chatRoutes;
