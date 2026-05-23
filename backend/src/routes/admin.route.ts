import { Router } from 'express';
import authenticate from '@/middlewares/authenticate';
import authorize from '@/middlewares/authorize';
import { Role } from '@/types/user.type';
import {
  createStaffHandler,
  getCustomersHandler,
  getStaffHandler,
  updateStaffStatusHandler,
  collectCashHandler,
  getCashControlHandler,
  getCustomerIncidentsHandler,
  getAdminReviewsHandler,
  replyAdminReviewHandler,
  getAdminIngredientsHandler,
  getAdminInventoryHandler,
  getAdminShippersHandler,
  getAdminActiveDeliveriesHandler,
  getAdminDispatchPendingOrdersHandler,
  assignAdminDispatchOrderHandler,
} from '@/controllers/admin.controller';

const adminRoutes = Router();

adminRoutes.post('/staff', authenticate, authorize(Role.ADMIN), createStaffHandler);
adminRoutes.get('/staff', authenticate, authorize(Role.ADMIN), getStaffHandler);
adminRoutes.get('/customers', authenticate, authorize(Role.ADMIN), getCustomersHandler);
adminRoutes.patch('/staff/:id', authenticate, authorize(Role.ADMIN), updateStaffStatusHandler);
adminRoutes.get('/customers/:userId/incidents', authenticate, authorize(Role.ADMIN), getCustomerIncidentsHandler);
adminRoutes.get('/cash-control', authenticate, authorize(Role.ADMIN), getCashControlHandler);
adminRoutes.post('/collect-cash', authenticate, authorize(Role.ADMIN), collectCashHandler);

// ── Admin: reviews / ingredients / inventory / delivery / dispatch ─────────────
adminRoutes.get('/reviews', authenticate, authorize(Role.ADMIN), getAdminReviewsHandler);
adminRoutes.post('/reviews/:reviewId/reply', authenticate, authorize(Role.ADMIN), replyAdminReviewHandler);

adminRoutes.get('/ingredients', authenticate, authorize(Role.ADMIN), getAdminIngredientsHandler);
adminRoutes.get('/inventory', authenticate, authorize(Role.ADMIN), getAdminInventoryHandler);

adminRoutes.get('/shippers', authenticate, authorize(Role.ADMIN), getAdminShippersHandler);
adminRoutes.get('/deliveries/active', authenticate, authorize(Role.ADMIN), getAdminActiveDeliveriesHandler);

adminRoutes.get('/dispatch/pending-orders', authenticate, authorize(Role.ADMIN), getAdminDispatchPendingOrdersHandler);
adminRoutes.post('/dispatch/assign', authenticate, authorize(Role.ADMIN), assignAdminDispatchOrderHandler);

export default adminRoutes;

