import mongoose from 'mongoose';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import OrderModel from '@/models/order.model';
import { OrderStatus } from '@/types/order.type';
import { AuditEntityType, AuditLogAction } from '@/types/audit-log.type';
import { createAuditLog } from '@/services/audit-log.service';
import { createOrderStatusNotification } from '@/services/notification.service';
import { awardOrderCompletionPoints, qualifyReferralFromCompletedOrder } from '@/services/membership.service';

const SENSITIVE_ACTIONS = new Set(['cancel', 'reject', 'move_status_backward', 'reassign_driver', 'manual_complete']);

const STATUS_ORDER: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_DELIVERY,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERING,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
];

const normalizeReason = (reason?: string) => reason?.trim() ?? '';

const assertReasonIfSensitive = (action: string, reason?: string) => {
  if (!SENSITIVE_ACTIONS.has(action)) return;

  appAssert(reason && reason.trim().length > 0, BAD_REQUEST, 'Lý do là bắt buộc cho thao tác override nhạy cảm');
};

const assertSameStore = (order: any, storeId: mongoose.Types.ObjectId) => {
  appAssert(
    order.storeId.toString() === storeId.toString(),
    NOT_FOUND,
    'Không tìm thấy đơn hàng trong chi nhánh của manager'
  );
};

const appendManagerHistory = (
  order: any,
  params: {
    managerId: mongoose.Types.ObjectId;
    action: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    reason?: string;
    note?: string;
  }
) => {
  order.statusHistory.push({
    status: params.toStatus,
    changedBy: params.managerId,
    actorRole: 'manager',
    action: params.action,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    reason: normalizeReason(params.reason) || undefined,
    note: params.note?.trim() || undefined,
    createdAt: new Date(),
  });
};

export const getManagerOrders = async (
  storeId: mongoose.Types.ObjectId,
  query: { status?: string; page?: number; limit?: number; sort?: string } = {}
) => {
  const { status, page, limit } = query;
  const filter: Record<string, any> = { storeId: storeId };

  if (status && typeof status === 'string') {
    const statuses = status
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
  }

  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const safePage = Math.max(1, Number(page) || 1);
  const skip = (safePage - 1) * safeLimit;

  const [orders, total] = await Promise.all([
    OrderModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('cusId', 'username fullName email phone')
      .populate({ path: 'items.productId', select: 'name image price' }),
    OrderModel.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const getManagerOrderById = async (storeId: mongoose.Types.ObjectId, orderId: string) => {
  const order = await OrderModel.findById(orderId)
    .populate('cusId', 'username fullName email phone')
    .populate({ path: 'items.productId', select: 'name image price' })
    .populate('statusHistory.changedBy', 'username fullName')
    .populate('deliveryInfo.driverId', 'username fullName phone isActive');

  appAssert(order, NOT_FOUND, 'Không tìm thấy đơn hàng');
  assertSameStore(order, storeId);

  return order;
};

export const managerOverrideOrderStatus = async (params: {
  storeId: mongoose.Types.ObjectId;
  managerId: mongoose.Types.ObjectId;
  orderId: string;
  status: OrderStatus;
  reason?: string;
  note?: string;
}) => {
  const order = await getManagerOrderById(params.storeId, params.orderId);
  const fromStatus = order.status;
  const toStatus = params.status;

  const fromIndex = STATUS_ORDER.indexOf(fromStatus);
  const toIndex = STATUS_ORDER.indexOf(toStatus);
  
  let action = 'override_status';
  if (toIndex < fromIndex) {
    action = 'move_status_backward';
  } else if (toStatus === OrderStatus.CANCELLED) {
    action = 'cancel';
  } else if (toStatus === OrderStatus.COMPLETED) {
    action = 'manual_complete';
  }

  assertReasonIfSensitive(action, params.reason);

  order.status = toStatus;
  appendManagerHistory(order, {
    managerId: params.managerId,
    action,
    fromStatus,
    toStatus,
    reason: params.reason,
    note: params.note,
  });

  await order.save();

  if (toStatus === OrderStatus.COMPLETED) {
    await awardOrderCompletionPoints({
      orderId: order._id,
      userId: order.cusId as mongoose.Types.ObjectId,
      totalPrice: order.totalPrice,
      orderCode: order.code,
    });

    await qualifyReferralFromCompletedOrder(order._id)
      .catch((err) => console.error('Failed to process referral reward:', err));
  }

  await createOrderStatusNotification({
    userId: (order.cusId as any)._id ? (order.cusId as any)._id : order.cusId,
    orderCode: order.code,
    status: toStatus,
    reason: params.reason,
    orderId: order._id.toString(),
  });

  createAuditLog({
    userId: params.managerId,
    entityType: AuditEntityType.ORDER,
    action: AuditLogAction.UPDATE,
    oldData: { status: fromStatus },
    newData: { status: toStatus, reason: params.reason, note: params.note, actorRole: 'manager' },
  }).catch(() => {});

  return order;
};

export const managerConfirmOrder = async (
  storeId: mongoose.Types.ObjectId,
  managerId: mongoose.Types.ObjectId,
  orderId: string
) =>
  managerOverrideOrderStatus({
    storeId,
    managerId,
    orderId,
    status: OrderStatus.CONFIRMED,
    note: 'Manager xác nhận đơn',
  });

export const managerRejectOrder = async (
  storeId: mongoose.Types.ObjectId,
  managerId: mongoose.Types.ObjectId,
  orderId: string,
  reason: string,
  note?: string
) => managerOverrideOrderStatus({ storeId, managerId, orderId, status: OrderStatus.CANCELLED, reason, note });

export const managerCancelOrder = async (
  storeId: mongoose.Types.ObjectId,
  managerId: mongoose.Types.ObjectId,
  orderId: string,
  reason: string,
  note?: string
) => managerOverrideOrderStatus({ storeId, managerId, orderId, status: OrderStatus.CANCELLED, reason, note });

export const managerAssignDelivery = async (params: {
  storeId: mongoose.Types.ObjectId;
  managerId: mongoose.Types.ObjectId;
  orderId: string;
  driverId: string;
  reason?: string;
  note?: string;
}) => {
  const order = await getManagerOrderById(params.storeId, params.orderId);
  const alreadyShipping =
    order.status === OrderStatus.SHIPPING ||
    order.status === OrderStatus.DELIVERING ||
    order.status === OrderStatus.DELIVERED;
  const action = alreadyShipping ? 'reassign_driver' : 'assign_driver';

  assertReasonIfSensitive(action, params.reason);

  const fromStatus = order.status;
  order.status = OrderStatus.SHIPPING;
  order.deliveryInfo = {
    ...(order.deliveryInfo ?? {}),
    driverId: new mongoose.Types.ObjectId(params.driverId),
    shippedAt: order.deliveryInfo?.shippedAt ?? new Date(),
  };

  appendManagerHistory(order, {
    managerId: params.managerId,
    action,
    fromStatus,
    toStatus: OrderStatus.SHIPPING,
    reason: params.reason,
    note: params.note,
  });

  await order.save();

  createAuditLog({
    userId: params.managerId,
    entityType: AuditEntityType.ORDER,
    action: AuditLogAction.UPDATE,
    oldData: { status: fromStatus, driverId: order.deliveryInfo?.driverId },
    newData: { status: OrderStatus.SHIPPING, driverId: params.driverId, reason: params.reason, actorRole: 'manager' },
  }).catch(() => {});

  return order;
};

export const managerManualCompleteOrder = async (
  storeId: mongoose.Types.ObjectId,
  managerId: mongoose.Types.ObjectId,
  orderId: string,
  reason: string,
  note?: string
) => managerOverrideOrderStatus({ storeId, managerId, orderId, status: OrderStatus.COMPLETED, reason, note });
