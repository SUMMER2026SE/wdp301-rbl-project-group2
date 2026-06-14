import { Router } from 'express';
import authenticate from '@/middlewares/authenticate';
import authorize from '@/middlewares/authorize';
import { Role } from '@/types/user.type';
import {
  approveAdminStaffRequestHandler,
  createStaffHandler,
  getAdminStaffRequestDetailHandler,
  getAdminStaffRequestsHandler,
  getCustomersHandler,
  getCustomerDetailHandler,
  getStaffHandler,
  rejectAdminStaffRequestHandler,
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
adminRoutes.get('/customers', authenticate, authorize(Role.ADMIN, Role.STAFF), getCustomersHandler);
adminRoutes.get('/customers/:id', authenticate, authorize(Role.ADMIN, Role.STAFF), getCustomerDetailHandler);
adminRoutes.patch('/staff/:id', authenticate, authorize(Role.ADMIN), updateStaffStatusHandler);
adminRoutes.get(
  '/customers/:userId/incidents',
  authenticate,
  authorize(Role.ADMIN, Role.STAFF),
  getCustomerIncidentsHandler
);
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

// ── Admin: staff request approval ────────────────────────────────────
adminRoutes.get('/staff-requests', authenticate, authorize(Role.ADMIN), getAdminStaffRequestsHandler);
adminRoutes.get('/staff-requests/:id', authenticate, authorize(Role.ADMIN), getAdminStaffRequestDetailHandler);
adminRoutes.patch('/staff-requests/:id/approve', authenticate, authorize(Role.ADMIN), approveAdminStaffRequestHandler);
adminRoutes.patch('/staff-requests/:id/reject', authenticate, authorize(Role.ADMIN), rejectAdminStaffRequestHandler);

export default adminRoutes;
