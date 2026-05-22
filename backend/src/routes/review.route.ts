import { Router } from 'express';
import { authenticate } from '@/middlewares';
import {
  createOrderReviewsHandler,
  getProductReviewsHandler,
  getOrderReviewsHandler
} from '@/controllers/review.controller';

const reviewRoutes = Router();

// Public route to get product reviews
reviewRoutes.get('/product/:productId', getProductReviewsHandler);

// Protected routes
reviewRoutes.get('/order/:orderId', authenticate, getOrderReviewsHandler);
reviewRoutes.post('/', authenticate, createOrderReviewsHandler);

export default reviewRoutes;
