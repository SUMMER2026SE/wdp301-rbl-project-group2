import { Router } from 'express';
import {
    createProductHandler,
    deleteProductHandler,
    getAllProductsHandler,
    getProductByIdHandler,
    getProductCategoriesHandler,
    getProductHealthRiskHandler,
    updateProductHandler
} from '@/controllers/product.controller';
import { getRecommendationsHandler, getSafeFoodsHandler } from '@/controllers/recommendation.controller';
import authenticate from '@/middlewares/authenticate';
import optionalAuthenticate from '@/middlewares/optional-authenticate';
import authorize from '@/middlewares/authorize';
import { Role } from '@/types/user.type';

const router = Router();

// Public routes
router.get('/', optionalAuthenticate, getAllProductsHandler);
router.get('/categories', getProductCategoriesHandler);

// AI-powered routes (authenticated)
router.get('/recommendations', authenticate, async (req, res, next) => {
    const { getRecommendationsHandler } = await import('@/controllers/recommendation.controller');
    return getRecommendationsHandler(req, res, next);
});

router.get('/safe-foods', authenticate, async (req, res, next) => {
    const { getSafeFoodsHandler } = await import('@/controllers/recommendation.controller');
    return getSafeFoodsHandler(req, res, next);
});

router.get('/:id/health-risk', authenticate, getProductHealthRiskHandler);
router.get('/:id', optionalAuthenticate, getProductByIdHandler);

// Admin routes
router.post('/', authenticate, authorize(Role.ADMIN), createProductHandler);
router.put('/:id', authenticate, authorize(Role.ADMIN, Role.STAFF), updateProductHandler);
router.delete('/:id', authenticate, authorize(Role.ADMIN), deleteProductHandler);

export default router;
