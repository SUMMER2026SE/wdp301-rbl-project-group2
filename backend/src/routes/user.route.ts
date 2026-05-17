import { Router } from 'express';
import { authenticate } from '@/middlewares';
import { getMeHandler } from '@/controllers/auth.controller';
import { changePasswordHandler } from '@/controllers/user.controller';

const userRoutes = Router();

userRoutes.get('/me', authenticate, getMeHandler);
userRoutes.patch('/me/password', authenticate, changePasswordHandler);

export default userRoutes;
