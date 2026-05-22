import { Router } from 'express';
import { getSettingsHandler, updateSettingsHandler } from '@/controllers/settings.controller';
import { authenticate, authorize } from '@/middlewares';
import { Role } from '@/types/user.type';

const settingsRoute = Router();

// Public route to get settings
settingsRoute.get('/', getSettingsHandler);

// Admin only route to update settings
settingsRoute.put('/', authenticate, authorize(Role.ADMIN), updateSettingsHandler);

export default settingsRoute;
