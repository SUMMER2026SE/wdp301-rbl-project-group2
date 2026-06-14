import { Router } from 'express';
import {
    createProductHandler,
    deleteProductHandler,
    getAllProductsHandler,
    getProductByIdHandler,
    getProductCategoriesHandler,
    getProductHealthRiskHandler,
    updateProductAvailabilityHandler,
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

// Staff + Admin: toggle product availability only
router.patch('/:id/availability', authenticate, authorize(Role.ADMIN, Role.STAFF), updateProductAvailabilityHandler);

// Admin-only: full product CRUD
router.post('/', authenticate, authorize(Role.ADMIN), createProductHandler);
router.put('/:id', authenticate, authorize(Role.ADMIN), updateProductHandler);
router.delete('/:id', authenticate, authorize(Role.ADMIN), deleteProductHandler);

export default router;
