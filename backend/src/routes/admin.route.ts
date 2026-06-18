import { Router } from 'express';
import authenticate from '@/middlewares/authenticate';
import authorize from '@/middlewares/authorize';
import { Role } from '@/types/user.type';
import {
  approveAdminStaffRequestHandler,
  createManagerHandler,
  getManagersHandler,
  updateManagerStatusHandler,
  getAdminStaffRequestDetailHandler,
  getAdminStaffRequestsHandler,
  getCustomersHandler,
  getCustomerDetailHandler,
  rejectAdminStaffRequestHandler,
  collectCashHandler,
  getCashControlHandler,
  getCustomerIncidentsHandler,
  getAdminReviewsHandler,
  replyAdminReviewHandler,
  getAdminStoresHandler,
  getAdminIngredientsHandler,
  getAdminInventoryHandler,
  getAdminShippersHandler,
  getAdminActiveDeliveriesHandler,
  getAdminDispatchPendingOrdersHandler,
  assignAdminDispatchOrderHandler,
  getAdminStoreDetailHandler,
  createStoreHandler,
  updateStoreHandler,
  deactivateStoreHandler,
  activateStoreHandler,
} from '@/controllers/admin.controller';

const adminRoutes = Router();
adminRoutes.get('/stores', authenticate, authorize(Role.ADMIN), getAdminStoresHandler);
adminRoutes.get('/managers', authenticate, authorize(Role.ADMIN), getManagersHandler);
adminRoutes.post('/managers', authenticate, authorize(Role.ADMIN), createManagerHandler);
adminRoutes.patch('/managers/:id', authenticate, authorize(Role.ADMIN), updateManagerStatusHandler);
adminRoutes.get('/customers', authenticate, authorize(Role.ADMIN, Role.STAFF), getCustomersHandler);
adminRoutes.get('/customers/:id', authenticate, authorize(Role.ADMIN, Role.STAFF), getCustomerDetailHandler);
// adminRoutes.patch('/staff/:id', authenticate, authorize(Role.ADMIN), updateStaffStatusHandler);
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

// ── Admin: store management ────────────────────────────────────
adminRoutes.get('/stores', authenticate, authorize(Role.ADMIN), getAdminStoresHandler);
adminRoutes.get('/stores/:id', authenticate, authorize(Role.ADMIN), getAdminStoreDetailHandler);
adminRoutes.post('/stores', authenticate, authorize(Role.ADMIN), createStoreHandler);
adminRoutes.put('/stores/:id', authenticate, authorize(Role.ADMIN), updateStoreHandler);
adminRoutes.patch('/stores/:id/deactivate', authenticate, authorize(Role.ADMIN), deactivateStoreHandler);
adminRoutes.patch('/stores/:id/activate', authenticate, authorize(Role.ADMIN), activateStoreHandler);

export default adminRoutes;
