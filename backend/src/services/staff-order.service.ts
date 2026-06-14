import mongoose from 'mongoose';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import OrderModel from '@/models/order.model';
import { OrderStatus } from '@/types/order.type';
import appAssert from '@/utils/app-assert';

const STAFF_TRANSITIONS: Record<string, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.READY_FOR_DELIVERY, OrderStatus.PROCESSING],
  [OrderStatus.PROCESSING]: [OrderStatus.READY_FOR_DELIVERY],
  [OrderStatus.READY_FOR_DELIVERY]: [OrderStatus.SHIPPING],
  [OrderStatus.SHIPPING]: [OrderStatus.COMPLETED, OrderStatus.DELIVERED],
};

const STAFF_NOT_FOUND_MESSAGE = 'Không tìm thấy dữ liệu hoặc dữ liệu không thuộc chi nhánh của bạn';

export const getStaffOrders = async (
  storeId: mongoose.Types.ObjectId,
  query: { status?: string; page?: number; limit?: number; sort?: string } = {}
) => {
  const { status, page, limit } = query;
  const filter: Record<string, unknown> = { storeId: storeId };

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

export const getStaffOrderById = async (storeId: mongoose.Types.ObjectId, orderId: string) => {
  const order = await OrderModel.findOne({ _id: orderId, storeId: storeId })
    .populate('cusId', 'username fullName email phone')
    .populate({ path: 'items.productId', select: 'name image price' });

  appAssert(order, NOT_FOUND, STAFF_NOT_FOUND_MESSAGE);
  return order;
};

export const transitionStaffOrderStatus = async (
  storeId: mongoose.Types.ObjectId,
  orderId: string,
  nextStatus: OrderStatus,
  actorId: mongoose.Types.ObjectId,
  options: { reason?: string; action: string }
) => {
  const order = await OrderModel.findOne({ _id: orderId, storeId: storeId });
  appAssert(order, NOT_FOUND, STAFF_NOT_FOUND_MESSAGE);

  const allowedNextStatuses = STAFF_TRANSITIONS[order.status] ?? [];
  appAssert(
    allowedNextStatuses.includes(nextStatus),
    BAD_REQUEST,
    `Không thể chuyển trạng thái từ ${order.status} sang ${nextStatus}`
  );

  const fromStatus = order.status;
  order.status = nextStatus;
  order.staffId = actorId;

  if (nextStatus === OrderStatus.SHIPPING) {
    order.deliveryInfo = order.deliveryInfo ?? {};
    order.deliveryInfo.driverId = actorId;
    order.deliveryInfo.shippedAt = new Date();
  }

  if (nextStatus === OrderStatus.COMPLETED) {
    order.deliveryInfo = order.deliveryInfo ?? {};
    order.deliveryInfo.deliveredAt = new Date();
  }

  order.statusHistory.push({
    status: nextStatus,
    changedBy: actorId,
    actorRole: 'staff',
    action: options.action,
    fromStatus,
    toStatus: nextStatus,
    reason: options.reason,
    createdAt: new Date(),
  });

  if (nextStatus === OrderStatus.CANCELLED) {
    order.cancellation = {
      reason: options.reason || 'Nhân viên từ chối đơn hàng',
      cancelledBy: 'staff',
      refundRequired: Boolean(order.paid),
      refundedAt: null,
    };
  }

  await order.save();
  return getStaffOrderById(storeId, orderId);
};
