import { Router } from 'express';
import { addToCartHandler, getCartHandler, mergeCartHandler, clearCartHandler, updateItemHandler, removeItemHandler } from '@/controllers/cart.controller';
import { authenticate } from '@/middlewares';

const router = Router();

router.get('/', authenticate, getCartHandler);
router.get('/', authenticate, getCartHandler);
router.post('/items', authenticate, addToCartHandler);
router.patch('/items', authenticate, updateItemHandler);
router.delete('/items', authenticate, removeItemHandler);
router.post('/merge', authenticate, mergeCartHandler);
router.delete('/', authenticate, clearCartHandler);

export default router;

