import { Router } from 'express';
import {
  getMeHandler,
  loginHandler,
  logout,
  refreshHandler,
  registerHandler,
  resendVerifyEmailHandler,
  resetPasswordHandler,
  sendPasswordResetHandler,
  verifyEmailHandler,
  verifyPasswordResetOTPHandler,
} from '@/controllers/auth.controller';
import { authenticate } from '@/middlewares';

const authRoutes = Router();

//prefix: /auth
authRoutes.post('/register', registerHandler);
authRoutes.post('/login', loginHandler);
authRoutes.post('/refresh', refreshHandler);
authRoutes.post('/verify-email', verifyEmailHandler);
authRoutes.post('/resend-verify-email', resendVerifyEmailHandler);
authRoutes.post('/password/forgot', sendPasswordResetHandler);
authRoutes.post('/password/verify-otp', verifyPasswordResetOTPHandler);
authRoutes.post('/password/reset', resetPasswordHandler);
authRoutes.get('/me', authenticate, getMeHandler);
authRoutes.post('/logout', authenticate, logout);

export default authRoutes;
