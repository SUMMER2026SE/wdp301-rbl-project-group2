import {
  cancelOrderHandler,
  confirmOrderHandler,
  getAllOrdersHandler,
  getMyOrdersHandler,
  getOrderDetailHandler,
  markReadyHandler,
  placeOrderHandler,
  rejectOrderHandler,
  updateOrderStatusHandler,
  getWeeklyRevenueHandler,
  getDashboardStatsHandler,
  getRecentOrdersHandler,
  assignDeliveryHandler,
  completeDeliveryHandler,
  customerConfirmOrderHandler,
  getStaffOrders,
  getStaffOrderById,
  staffAssignDelivery,
  staffCompleteDelivery,
  staffConfirmOrder,
  staffMarkOrderReady,
  staffRejectOrder,
} from '@/controllers/order.controller';
import { authenticate, authorize, requireStaffStore } from '@/middlewares';
import { Role } from '@/types/user.type';
import { Router } from 'express';

const orderRoutes = Router();

// POST /api/orders — Place a new order (authenticated)
orderRoutes.post('/', authenticate, placeOrderHandler);

// GET /api/orders/me — Get current user's order history
orderRoutes.get('/me', authenticate, getMyOrdersHandler);

// ── Staff-scoped routes ─────────────────────────────────────────────────────
orderRoutes.get('/staff/orders', authenticate, authorize(Role.STAFF), requireStaffStore, getStaffOrders);
orderRoutes.get('/staff/orders/:id', authenticate, authorize(Role.STAFF), requireStaffStore, getStaffOrderById);
orderRoutes.patch(
  '/staff/orders/:id/confirm',
  authenticate,
  authorize(Role.STAFF),
  requireStaffStore,
  staffConfirmOrder
);
orderRoutes.patch('/staff/orders/:id/reject', authenticate, authorize(Role.STAFF), requireStaffStore, staffRejectOrder);
orderRoutes.patch(
  '/staff/orders/:id/ready',
  authenticate,
  authorize(Role.STAFF),
  requireStaffStore,
  staffMarkOrderReady
);
orderRoutes.patch(
  '/staff/orders/:id/deliver',
  authenticate,
  authorize(Role.STAFF),
  requireStaffStore,
  staffAssignDelivery
);
orderRoutes.patch(
  '/staff/orders/:id/complete',
  authenticate,
  authorize(Role.STAFF),
  requireStaffStore,
  staffCompleteDelivery
);

// GET /api/orders/:idOrCode — Get detail of a specific order
orderRoutes.get('/:idOrCode', authenticate, getOrderDetailHandler);

// GET /api/orders — Get all orders (Admin/Staff only)
orderRoutes.get('/', authenticate, authorize(Role.ADMIN, Role.STAFF), getAllOrdersHandler);

// PATCH /api/orders/:id/status — Update order status (Admin/Staff only)
orderRoutes.patch('/:id/status', authenticate, authorize(Role.ADMIN, Role.STAFF), updateOrderStatusHandler);

// PATCH /api/orders/:id/cancel — Cancel an order
orderRoutes.patch('/:id/cancel', authenticate, cancelOrderHandler);

// PATCH /api/orders/:id/customer-confirm — Customer confirms receipt of order
orderRoutes.patch('/:id/customer-confirm', authenticate, customerConfirmOrderHandler);
//get /api/orders/revenue/weekly
orderRoutes.get('/revenue/weekly', getWeeklyRevenueHandler);
orderRoutes.get('/dashboard/stats', getDashboardStatsHandler);
orderRoutes.get('/recent', getRecentOrdersHandler);

// ── Staff-only actions ────────────────────────────────────────────────────
// PATCH /api/orders/:id/confirm — Staff nhận đơn (PENDING → CONFIRMED)
orderRoutes.patch('/:id/confirm', authenticate, authorize(Role.STAFF, Role.ADMIN), confirmOrderHandler);

// PATCH /api/orders/:id/reject  — Staff từ chối (PENDING → CANCELLED)
orderRoutes.patch('/:id/reject', authenticate, authorize(Role.STAFF, Role.ADMIN), rejectOrderHandler);

// PATCH /api/orders/:id/ready   — Staff đánh dấu xong (CONFIRMED/PROCESSING → READY_FOR_DELIVERY)
orderRoutes.patch('/:id/ready', authenticate, authorize(Role.STAFF, Role.ADMIN), markReadyHandler);

// PATCH /api/orders/:id/deliver — Staff đi giao (READY_FOR_DELIVERY → SHIPPING)
orderRoutes.patch('/:id/deliver', authenticate, authorize(Role.STAFF, Role.ADMIN), assignDeliveryHandler);

// PATCH /api/orders/:id/complete — Staff giao xong (SHIPPING → COMPLETED)
orderRoutes.patch('/:id/complete', authenticate, authorize(Role.STAFF, Role.ADMIN), completeDeliveryHandler);

export default orderRoutes;
