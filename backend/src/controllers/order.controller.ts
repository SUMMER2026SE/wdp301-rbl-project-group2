import { CREATED, FORBIDDEN, OK } from '@/constants/http';
import {
  getOrderById,
  getOrders,
  getUserOrders,
  placeOrder,
  updateOrderStatus,
  getWeeklyRevenue,
  getDashboardStats,
  getRecentOrders,
  confirmOrder,
  rejectOrder,
  markOrderReady,
  assignDelivery,
  completeDelivery,
  confirmReceipt,
} from '@/services/order.service';
import {
  getStaffOrders as getStaffOrdersService,
  getStaffOrderById as getStaffOrderByIdService,
  transitionStaffOrderStatus,
} from '@/services/staff-order.service';
import { createOrderStatusNotification } from '@/services/notification.service';
import { OrderStatus } from '@/types/order.type';
import { catchErrors } from '@/utils/async-handler';
import { placeOrderValidator } from '@/validators/order.validator';
import { formatOrderNote } from '@/utils/format-order-note';
import appAssert from '@/utils/app-assert';
import z from 'zod';

/**
 * POST /api/order
 * Authenticated — Customer places a new order.
 * Returns the created order (including `code` for display on success page).
 */
export const placeOrderHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  const input = placeOrderValidator.parse(req.body);

  const formattedInput = {
    ...input,
    note: formatOrderNote(input.note),
  };

  const order = await placeOrder(userId, formattedInput);

  // Notify staff via socket (best-effort)
  const io = req.app.get('io');
  try {
    const fs = require('fs');
    const path = require('path');
    const logPath = path.join(__dirname, '../../../socket-debug.log');
    const hasIo = !!io;
    const staffSockets = io ? Array.from(io.sockets.adapter.rooms.get('staff') || []) : [];
    fs.appendFileSync(
      logPath,
      `[${new Date().toISOString()}] placeOrderHandler: code=${order.code}, storeId=${order.storeId}, hasIo=${hasIo}, active staff sockets in room = ${JSON.stringify(staffSockets)}\n`
    );
  } catch (e: any) {
    try {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(__dirname, '../../../socket-debug.log');
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] placeOrderHandler log error: ${e.message}\n`);
    } catch (_) {}
  }

  if (io) {
    io.to(`store:${order.storeId}`).emit('order:new', {
      _id: order._id,
      code: order.code,
      totalPrice: order.totalPrice,
      itemsCount: order.items.length,
      createdAt: (order as any).createdAt || new Date(),
    });
  }

  return res.success(CREATED, {
    data: {
      _id: order._id,
      code: order.code,
      status: order.status,
      items: order.items,
      subTotal: order.subTotal,
      totalPrice: order.totalPrice,
      note: order.note,
      staffNoteItems: order.staffNoteItems,
      payment: order.payment,
      deliveryAddress: order.deliveryAddress,
      voucherId: order.voucherId,
      checkoutUrl: (order as any).checkoutUrl,
      createdAt: (order as any).createdAt,
    },
    message: 'Đặt hàng thành công',
  });
});

/**
 * GET /api/orders/me
 * Get all orders for the current user.
 */
export const getMyOrdersHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  const orders = await getUserOrders(userId);
  console.log(`[OrderController:getMyOrders] UserId: ${userId}, Orders found: ${orders?.length}`);
  return res.success(OK, { data: orders });
});

/**
 * GET /api/orders
 * Get all orders in the system (Admin/Staff only)
 */
export const getAllOrdersHandler = catchErrors(async (req, res) => {
  const orders = await getOrders(req.query);
  return res.success(OK, { data: orders });
});

/**
 * GET /api/orders/:idOrCode
 */
export const getOrderDetailHandler = catchErrors(async (req, res) => {
  const order = await getOrderById(req.params.idOrCode);
  return res.success(OK, { data: order });
});

/**
 * PATCH /api/orders/:id/status
 */
export const updateOrderStatusHandler = catchErrors(async (req, res) => {
  const { status } = req.body;
  const order = await updateOrderStatus(req.params.id, status);

  // Create notification record
  if (order.cusId) {
    await createOrderStatusNotification({
      userId: order.cusId as any,
      orderCode: order.code,
      status: order.status,
    });
  }

  // Notify user via socket
  const io = req.app.get('io');
  if (io && order.cusId) {
    io.to(`user:${order.cusId}`).emit('order:status_updated', {
      orderId: order._id,
      code: order.code,
      status: order.status,
      message: `Đơn hàng #${order.code} đã chuyển sang trạng thái: ${order.status}`,
    });
  }

  return res.success(OK, { data: order });
});

/**
 * PATCH /api/orders/:id/cancel
 */
export const cancelOrderHandler = catchErrors(async (req, res) => {
  const order = await updateOrderStatus(req.params.id, OrderStatus.CANCELLED);

  // Create notification record
  if (order.cusId) {
    await createOrderStatusNotification({
      userId: order.cusId as any,
      orderCode: order.code,
      status: order.status,
    });
  }

  // Notify user via socket
  const { reason } = req.body;
  const io = req.app.get('io');
  if (io && order.cusId) {
    io.to(`user:${order.cusId}`).emit('order:status_updated', {
      orderId: order._id,
      code: order.code,
      status: order.status,
      message: `Đơn hàng #${order.code} đã bị hủy${reason ? `. Lý do: ${reason}` : ''}`,
    });
  }

  return res.success(OK, { data: order, message: 'Đã hủy đơn hàng' });
});

export const getWeeklyRevenueHandler = catchErrors(async (_req, res) => {
  const revenue = await getWeeklyRevenue();
  return res.success(OK, { data: revenue });
});

export const getDashboardStatsHandler = catchErrors(async (_req, res) => {
  const stats = await getDashboardStats();
  return res.success(OK, { data: stats });
});

export const getRecentOrdersHandler = catchErrors(async (_req, res) => {
  const orders = await getRecentOrders();
  return res.success(OK, { data: orders });
});

export const getStaffOrders = catchErrors(async (req, res) => {
  appAssert(req.scope?.storeId, FORBIDDEN, 'Tài khoản nhân viên chưa được gán chi nhánh');

  const result = await getStaffOrdersService(req.scope.storeId, {
    status: req.query.status as string | undefined,
    page: Number(req.query.page) || undefined,
    limit: Number(req.query.limit) || undefined,
    sort: req.query.sort as string | undefined,
  });

  return res.status(OK).json({
    success: true,
    data: result.orders,
    pagination: result.pagination,
  });
});

export const getStaffOrderById = catchErrors(async (req, res) => {
  appAssert(req.scope?.storeId, FORBIDDEN, 'Tài khoản nhân viên chưa được gán chi nhánh');
  const order = await getStaffOrderByIdService(req.scope.storeId, req.params.id);
  return res.status(OK).json({ success: true, data: order });
});

export const staffConfirmOrder = catchErrors(async (req, res) => {
  appAssert(req.scope?.storeId, FORBIDDEN, 'Tài khoản nhân viên chưa được gán chi nhánh');
  const order = await transitionStaffOrderStatus(req.scope.storeId, req.params.id, OrderStatus.CONFIRMED, req.userId, {
    action: 'staff_confirm_order',
  });
  return res.status(OK).json({ success: true, data: order });
});

export const staffRejectOrder = catchErrors(async (req, res) => {
  appAssert(req.scope?.storeId, FORBIDDEN, 'Tài khoản nhân viên chưa được gán chi nhánh');
  const { reason } = z.object({ reason: z.string().min(1, 'Vui lòng cung cấp lý do từ chối') }).parse(req.body);
  const order = await transitionStaffOrderStatus(req.scope.storeId, req.params.id, OrderStatus.CANCELLED, req.userId, {
    action: 'staff_reject_order',
    reason,
  });
  return res.status(OK).json({ success: true, data: order });
});

export const staffMarkOrderReady = catchErrors(async (req, res) => {
  appAssert(req.scope?.storeId, FORBIDDEN, 'Tài khoản nhân viên chưa được gán chi nhánh');
  const order = await transitionStaffOrderStatus(
    req.scope.storeId,
    req.params.id,
    OrderStatus.READY_FOR_DELIVERY,
    req.userId,
    { action: 'staff_mark_order_ready' }
  );
  return res.status(OK).json({ success: true, data: order });
});

export const staffAssignDelivery = catchErrors(async (req, res) => {
  appAssert(req.scope?.storeId, FORBIDDEN, 'Tài khoản nhân viên chưa được gán chi nhánh');
  const order = await transitionStaffOrderStatus(req.scope.storeId, req.params.id, OrderStatus.SHIPPING, req.userId, {
    action: 'staff_assign_delivery',
  });
  return res.status(OK).json({ success: true, data: order });
});

export const staffCompleteDelivery = catchErrors(async (req, res) => {
  appAssert(req.scope?.storeId, FORBIDDEN, 'Tài khoản nhân viên chưa được gán chi nhánh');
  const order = await transitionStaffOrderStatus(req.scope.storeId, req.params.id, OrderStatus.COMPLETED, req.userId, {
    action: 'staff_complete_delivery',
  });
  return res.status(OK).json({ success: true, data: order });
});

/**
 * PATCH /api/orders/:id/confirm  — Staff nhận đơn (PENDING → CONFIRMED)
 */
export const confirmOrderHandler = catchErrors(async (req, res) => {
  const order = await confirmOrder(req.params.id, req.userId);

  // Create notification record
  if (order.cusId) {
    await createOrderStatusNotification({
      userId: order.cusId as any,
      orderCode: order.code,
      status: order.status,
    });
  }

  // Notify user via socket
  const io = req.app.get('io');
  if (io && order.cusId) {
    io.to(`user:${order.cusId}`).emit('order:status_updated', {
      orderId: order._id,
      code: order.code,
      status: order.status,
      message: `Đơn hàng #${order.code} đã được xác nhận và đang được chuẩn bị`,
    });
  }

  return res.success(OK, { data: order, message: 'Đã xác nhận đơn hàng, bắt đầu chế biến' });
});

/**
 * PATCH /api/orders/:id/reject  — Staff từ chối đơn (PENDING → CANCELLED)
 */
export const rejectOrderHandler = catchErrors(async (req, res) => {
  const { reason } = z.object({ reason: z.string().min(1, 'Vui lòng cung cấp lý do từ chối') }).parse(req.body);
  const order = await rejectOrder(req.params.id, req.userId, reason);

  // Create notification record
  if (order.cusId) {
    await createOrderStatusNotification({
      userId: order.cusId as any,
      orderCode: order.code,
      status: order.status,
    });
  }

  // Notify user via socket
  const io = req.app.get('io');
  if (io && order.cusId) {
    io.to(`user:${order.cusId}`).emit('order:status_updated', {
      orderId: order._id,
      code: order.code,
      status: order.status,
      message: `Đơn hàng #${order.code} đã bị từ chối. Lý do: ${reason}`,
    });
  }

  return res.success(OK, { data: order, message: 'Đã từ chối đơn hàng' });
});

/**
 * PATCH /api/orders/:id/ready   — Staff đánh dấu đã xong (CONFIRMED/PROCESSING → READY_FOR_DELIVERY)
 */
export const markReadyHandler = catchErrors(async (req, res) => {
  const order = await markOrderReady(req.params.id, req.userId);

  // Create notification record
  if (order.cusId) {
    await createOrderStatusNotification({
      userId: order.cusId as any,
      orderCode: order.code,
      status: order.status,
    });
  }

  // Notify user via socket
  const io = req.app.get('io');
  if (io && order.cusId) {
    io.to(`user:${order.cusId}`).emit('order:status_updated', {
      orderId: order._id,
      code: order.code,
      status: order.status,
      message: `Đơn hàng #${order.code} đã chuẩn bị xong và sẵn sàng để giao`,
    });
  }

  return res.success(OK, { data: order, message: 'Đơn hàng đã sẵn sàng để giao' });
});

/**
 * PATCH /api/orders/:id/deliver — Staff đi giao (READY_FOR_DELIVERY → SHIPPING)
 */
export const assignDeliveryHandler = catchErrors(async (req, res) => {
  const order = await assignDelivery(req.params.id, req.userId);

  // Create notification record
  if (order.cusId) {
    await createOrderStatusNotification({
      userId: order.cusId as any,
      orderCode: order.code,
      status: order.status,
    });
  }

  // Notify user via socket
  const io = req.app.get('io');
  if (io && order.cusId) {
    io.to(`user:${order.cusId}`).emit('order:status_updated', {
      orderId: order._id,
      code: order.code,
      status: order.status,
      message: `Đơn hàng #${order.code} đang được giao đến bạn`,
    });
  }

  return res.success(OK, { data: order, message: 'Đã nhận giao đơn hàng này' });
});

/**
 * PATCH /api/orders/:id/complete — Staff giao xong (SHIPPING → COMPLETED)
 */
export const completeDeliveryHandler = catchErrors(async (req, res) => {
  const order = await completeDelivery(req.params.id, req.userId);

  // Create notification record
  if (order.cusId) {
    await createOrderStatusNotification({
      userId: order.cusId as any,
      orderCode: order.code,
      status: order.status,
    });
  }

  // Notify user via socket
  const io = req.app.get('io');
  if (io && order.cusId) {
    io.to(`user:${order.cusId}`).emit('order:status_updated', {
      orderId: order._id,
      code: order.code,
      status: order.status,
      message: `Đơn hàng #${order.code} đã được giao tới bạn. Vui lòng xác nhận nhận hàng!`,
    });
  }

  return res.success(OK, { data: order, message: 'Đã giao đơn hàng thành công' });
});

export const customerConfirmOrderHandler = catchErrors(async (req, res) => {
  const order = await confirmReceipt(req.params.id, req.userId);

  // Create notification record
  if (order.cusId) {
    await createOrderStatusNotification({
      userId: order.cusId as any,
      orderCode: order.code,
      status: order.status,
    });
  }

  // Notify user and staff via socket
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${order.cusId}`).emit('order:status_updated', {
      orderId: order._id,
      code: order.code,
      status: order.status,
      message: `Bạn đã xác nhận nhận hàng cho đơn hàng #${order.code}. Cảm ơn bạn!`,
    });
    io.to(`store:${order.storeId}`).emit('order:status_updated', {
      orderId: order._id,
      code: order.code,
      status: order.status,
      message: `Khách hàng đã xác nhận đã nhận đơn hàng #${order.code}.`,
    });
  }

  return res.success(OK, { data: order, message: 'Xác nhận nhận hàng thành công' });
});
