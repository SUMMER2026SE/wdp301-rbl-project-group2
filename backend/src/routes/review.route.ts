import { Router } from 'express';
import { authenticate } from '@/middlewares';
import optionalAuthenticate from '@/middlewares/optional-authenticate';
import {
  createOrderReviewsHandler,
  getFeaturedReviewsHandler,
  getProductReviewsHandler,
  getOrderReviewsHandler,
  setReviewReactionHandler,
} from '@/controllers/review.controller';

const reviewRoutes = Router();

// Public review routes
reviewRoutes.get('/featured', getFeaturedReviewsHandler);
reviewRoutes.get('/product/:productId', optionalAuthenticate, getProductReviewsHandler);

// Protected routes
reviewRoutes.get('/order/:orderId', authenticate, getOrderReviewsHandler);
reviewRoutes.put('/:reviewId/reaction', authenticate, setReviewReactionHandler);
reviewRoutes.post('/', authenticate, createOrderReviewsHandler);

export default reviewRoutes;
