import { Router } from 'express';
import { getStoresHandler } from '@/controllers/store.controller';

const storeRoutes = Router();

// Public endpoint to get all active stores
storeRoutes.get('/', getStoresHandler);

export default storeRoutes;
