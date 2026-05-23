import { Router } from 'express';
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/controllers/notification.controller';
import { authenticate } from '@/middlewares';

const notificationRoutes = Router();

notificationRoutes.get('/', authenticate, getMyNotifications);
notificationRoutes.get('/unread-count', authenticate, getUnreadNotificationCount);
notificationRoutes.patch('/read-all', authenticate, markAllNotificationsAsRead);
notificationRoutes.patch('/:id/read', authenticate, markNotificationAsRead);

export default notificationRoutes;
