import mongoose from 'mongoose';
import { OrderModel, ProductModel, StoreSettingsModel } from '@/models';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST } from '@/constants/http';
import { createAuditLog } from '@/services/audit-log.service';
import { AuditEntityType, AuditLogAction } from '@/types/audit-log.type';
import { OrderStatus, PaymentMethod } from '@/types/order.type';
import { ProductStatus } from '@/types/product.type';

const IN_PROGRESS_STATUSES = [
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_DELIVERY,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERING,
  OrderStatus.DELIVERED,
];

const startOfDay = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfWeek = (date = new Date()) => {
  const day = date.getDay() || 7;
  const start = startOfDay(date);
  start.setDate(start.getDate() - day + 1);
  return start;
};
const startOfMonth = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1);

const codPaymentFilter = {
  $or: [{ 'payment.method': PaymentMethod.CASH }, { paymentMethod: PaymentMethod.CASH }],
};

const getOrderTotal = (order: any) => Number(order.totalPrice ?? 0);

const DEFAULT_OPEN_HOURS = { open: '08:00', close: '22:00' };

const normalizeDateParam = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date().toISOString().slice(0, 10);
  }
  return value;
};

const getDayRange = (dateText: string) => {
  const start = new Date(`${dateText}T00:00:00.000+07:00`);
  const end = new Date(`${dateText}T23:59:59.999+07:00`);
  return { start, end };
};

const getStoreSettingsOrDefault = async (storeId: mongoose.Types.ObjectId) => {
  const settings = await StoreSettingsModel.findOne({ storeId }).lean();
  return {
    openHours: settings?.openHours ?? DEFAULT_OPEN_HOURS,
    isOpen: settings?.isOpen ?? true,
  };
};

const getScopedProductFilter = (storeId: mongoose.Types.ObjectId) => ({
  $or: [{ storeId }, { storeId: { $exists: false } }, { storeId: null }],
});

const getProductKey = (product: { category?: unknown; name?: unknown }) =>
  `${String(product.category ?? '').trim().toLowerCase()}::${String(product.name ?? '').trim().toLowerCase()}`;

const preferStoreOverrides = <T extends { storeId?: unknown; name?: string; category?: string }>(
  products: T[],
  storeId: mongoose.Types.ObjectId
) => {
  const currentStoreId = storeId.toString();
  const byKey = new Map<string, T>();

  for (const product of products) {
    const key = getProductKey(product);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, product);
      continue;
    }

    const productStoreId = (product as any).storeId?.toString();
    const existingStoreId = (existing as any).storeId?.toString();
    if (productStoreId === currentStoreId && existingStoreId !== currentStoreId) {
      byKey.set(key, product);
    }
  }

  return Array.from(byKey.values());
};

const getDriverDisplay = (deliveryInfo: any) => {
  const driver = deliveryInfo?.driverId;
  if (driver && typeof driver === 'object') {
    return {
      driverId: driver._id?.toString?.() ?? 'unassigned',
      driverName: driver.fullName || driver.username || deliveryInfo?.driverName || 'Chưa gán shipper',
      driverPhone: driver.phone ?? deliveryInfo?.driverPhone ?? null,
    };
  }

  return {
    driverId: deliveryInfo?.driverId?.toString?.() ?? 'unassigned',
    driverName: deliveryInfo?.driverName || 'Chưa gán shipper',
    driverPhone: deliveryInfo?.driverPhone ?? null,
  };
};

const sumCompletedRevenue = async (storeId: mongoose.Types.ObjectId, from: Date) => {
  const orders = await OrderModel.find({
    storeId: storeId,
    status: OrderStatus.COMPLETED,
    updatedAt: { $gte: from },
  }).select('totalPrice');

  return orders.reduce((total, order) => total + getOrderTotal(order), 0);
};

const mapCashOrder = (order: any) => ({
  _id: order._id,
  code: order.code,
  totalPrice: order.totalPrice,
  paymentMethod: order.paymentMethod,
  payment: order.payment,
  deliveryInfo: order.deliveryInfo,
  completedAt: order.updatedAt,
  createdAt: order.createdAt,
  customer: order.cusId,
});

export const getManagerDashboardMetrics = async (storeId: mongoose.Types.ObjectId) => {
  const [newOrders, inProgress, completed, cancelled, completedOrders, today, week, month, codPendingOrders, products] =
    await Promise.all([
      OrderModel.countDocuments({ storeId: storeId, status: OrderStatus.PENDING }),
      OrderModel.countDocuments({ storeId: storeId, status: { $in: IN_PROGRESS_STATUSES } }),
      OrderModel.countDocuments({ storeId: storeId, status: OrderStatus.COMPLETED }),
      OrderModel.countDocuments({ storeId: storeId, status: OrderStatus.CANCELLED }),
      OrderModel.find({ storeId: storeId, status: OrderStatus.COMPLETED }).select(
        'createdAt updatedAt totalPrice payment paymentMethod deliveryInfo statusHistory'
      ),
      sumCompletedRevenue(storeId, startOfDay()),
      sumCompletedRevenue(storeId, startOfWeek()),
      sumCompletedRevenue(storeId, startOfMonth()),
      OrderModel.find({
        storeId: storeId,
        status: OrderStatus.COMPLETED,
        ...codPaymentFilter,
        'payment.cashCollectedAt': null,
      }).select('totalPrice'),
      ProductModel.find(getScopedProductFilter(storeId)).select('category name storeId status isAvailable operationalNote').lean(),
    ]);

  const averageProcessingMinutes = completedOrders.length
    ? Math.round(
        completedOrders.reduce((total, order) => {
          const start = order.createdAt ? new Date(order.createdAt).getTime() : 0;
          const end = order.updatedAt ? new Date(order.updatedAt).getTime() : start;
          return total + Math.max(0, end - start) / 60000;
        }, 0) / completedOrders.length
      )
    : 0;

  const codPending = codPendingOrders.reduce((total, order) => total + getOrderTotal(order), 0);
  const paymentMethodSplit = completedOrders.reduce<Record<string, number>>((split, order: any) => {
    const method = order.payment?.method ?? order.paymentMethod ?? 'unknown';
    split[method] = (split[method] ?? 0) + getOrderTotal(order);
    return split;
  }, {});

  const staffPerformanceMap = completedOrders.reduce<Record<string, any>>((staff, order: any) => {
    const driverId = order.deliveryInfo?.driverId?.toString();
    if (!driverId) return staff;

    staff[driverId] ??= {
      staffId: driverId,
      staffName: order.deliveryInfo?.driverName ?? 'Chưa gán shipper',
      completedOrders: 0,
      revenue: 0,
    };
    staff[driverId].completedOrders += 1;
    staff[driverId].revenue += getOrderTotal(order);
    return staff;
  }, {});
  const visibleProducts = preferStoreOverrides(products, storeId);

  return {
    orders: {
      newOrders,
      inProgress,
      completed,
      cancelled,
      averageProcessingMinutes,
    },
    revenue: {
      today,
      week,
      month,
      codPending,
      paymentMethodSplit,
    },
    staffPerformance: Object.values(staffPerformanceMap),
    menu: {
      activeSellingItems: visibleProducts.filter(
        (product) => product.status === ProductStatus.ACTIVE && product.isAvailable !== false
      ).length,
      outOfStockItems: visibleProducts.filter(
        (product) => product.status === ProductStatus.OUT_OF_STOCK || product.isAvailable === false
      ).length,
      disabledItems: visibleProducts.filter((product) => product.status === ProductStatus.INACTIVE).length,
      operationalNotes: visibleProducts.filter((product) => Boolean(product.operationalNote?.trim())).length,
    },
  };
};

export const getManagerSettings = async (storeId: mongoose.Types.ObjectId) => {
  const existing = await StoreSettingsModel.findOne({ storeId }).lean();
  if (existing) {
    return {
      storeId: existing.storeId,
      openHours: existing.openHours,
      isOpen: existing.isOpen,
    };
  }

  const created = await StoreSettingsModel.create({
    storeId,
    openHours: DEFAULT_OPEN_HOURS,
    isOpen: true,
  });

  return {
    storeId: created.storeId,
    openHours: created.openHours,
    isOpen: created.isOpen,
  };
};

export const updateManagerSettings = async (
  storeId: mongoose.Types.ObjectId,
  input: { openHours?: { open?: string; close?: string }; isOpen?: boolean }
) => {
  const current = await getManagerSettings(storeId);
  const open = input.openHours?.open ?? current.openHours.open;
  const close = input.openHours?.close ?? current.openHours.close;

  appAssert(/^\d{2}:\d{2}$/.test(open), BAD_REQUEST, 'Giờ mở cửa không hợp lệ');
  appAssert(/^\d{2}:\d{2}$/.test(close), BAD_REQUEST, 'Giờ đóng cửa không hợp lệ');

  const updated = await StoreSettingsModel.findOneAndUpdate(
    { storeId },
    {
      $set: {
        openHours: { open, close },
        isOpen: input.isOpen ?? current.isOpen,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return {
    storeId: updated!.storeId,
    openHours: updated!.openHours,
    isOpen: updated!.isOpen,
  };
};

export const getManagerCashOverview = async (storeId: mongoose.Types.ObjectId, dateParam?: unknown) => {
  const selectedDate = normalizeDateParam(dateParam);
  const { start, end } = getDayRange(selectedDate);
  const settings = await getStoreSettingsOrDefault(storeId);

  const cashOrders = await OrderModel.find({
    storeId: storeId,
    status: OrderStatus.COMPLETED,
    ...codPaymentFilter,
    $or: [
      { 'deliveryInfo.deliveredAt': { $gte: start, $lte: end } },
      { 'deliveryInfo.deliveredAt': null, updatedAt: { $gte: start, $lte: end } },
      { 'deliveryInfo.deliveredAt': { $exists: false }, updatedAt: { $gte: start, $lte: end } },
    ],
  })
    .select('code totalPrice payment paymentMethod deliveryInfo createdAt updatedAt cusId')
    .populate('cusId', 'username fullName email phone')
    .populate('deliveryInfo.driverId', 'username fullName phone')
    .sort({ updatedAt: -1 });

  const pendingOrders = cashOrders.filter((order) => !order.payment?.cashCollectedAt);
  const collectedOrders = cashOrders.filter((order) => Boolean(order.payment?.cashCollectedAt));
  const totalPending = pendingOrders.reduce((total, order) => total + getOrderTotal(order), 0);
  const totalCollected = collectedOrders.reduce((total, order) => total + getOrderTotal(order), 0);

  const byDriver = cashOrders.reduce<Record<string, any>>((groups, order: any) => {
    const driver = getDriverDisplay(order.deliveryInfo ?? {});
    groups[driver.driverId] ??= {
      driverId: driver.driverId,
      driverName: driver.driverName,
      driverPhone: driver.driverPhone,
      pendingTotal: 0,
      collectedTotal: 0,
      pendingOrders: 0,
      collectedOrders: 0,
    };

    if (order.payment?.cashCollectedAt) {
      groups[driver.driverId].collectedTotal += getOrderTotal(order);
      groups[driver.driverId].collectedOrders += 1;
    } else {
      groups[driver.driverId].pendingTotal += getOrderTotal(order);
      groups[driver.driverId].pendingOrders += 1;
    }

    return groups;
  }, {});

  const dailyTotals = collectedOrders.reduce<Record<string, number>>((totals, order) => {
    const collectedAt = order.payment?.cashCollectedAt ?? order.updatedAt;
    const day = new Date(collectedAt).toISOString().slice(0, 10);
    totals[day] = (totals[day] ?? 0) + getOrderTotal(order);
    return totals;
  }, {});

  const today = new Date().toISOString().slice(0, 10);
  const closeTime = settings.openHours.close;
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);
  const closeAt = new Date();
  closeAt.setHours(closeHour, closeMinute, 0, 0);
  const shouldWarnCloseout = selectedDate === today && totalPending > 0 && new Date() >= closeAt;

  return {
    selectedDate,
    closeTime,
    isToday: selectedDate === today,
    shouldWarnCloseout,
    pending: {
      total: totalPending,
      count: pendingOrders.length,
      orders: pendingOrders.map(mapCashOrder),
    },
    collected: {
      total: totalCollected,
      count: collectedOrders.length,
      orders: collectedOrders.map(mapCashOrder),
    },
    byDriver: Object.values(byDriver),
    dailyTotals: Object.entries(dailyTotals).map(([date, total]) => ({ date, total })),
  };
};

export const confirmManagerCodCollection = async (
  storeId: mongoose.Types.ObjectId,
  managerId: mongoose.Types.ObjectId,
  orderIds: string[]
) => {
  appAssert(Array.isArray(orderIds) && orderIds.length > 0, BAD_REQUEST, 'Danh sách đơn COD là bắt buộc');

  const objectIds = orderIds.map((id) => new mongoose.Types.ObjectId(id));
  const now = new Date();
  const orders = await OrderModel.find({
    _id: { $in: objectIds },
    storeId: storeId,
    status: OrderStatus.COMPLETED,
    ...codPaymentFilter,
    'payment.cashCollectedAt': null,
  }).select('_id code totalPrice payment paymentMethod');

  appAssert(orders.length > 0, BAD_REQUEST, 'Không có đơn COD hợp lệ để xác nhận thu tiền');

  await OrderModel.updateMany(
    {
      _id: { $in: orders.map((order) => order._id) },
      storeId: storeId,
      status: OrderStatus.COMPLETED,
      ...codPaymentFilter,
      'payment.cashCollectedAt': null,
    },
    {
      $set: {
        'payment.cashCollectedAt': now,
        'payment.cashCollectedBy': managerId,
      },
    }
  );

  await createAuditLog({
    userId: managerId,
    entityType: AuditEntityType.ORDER,
    action: AuditLogAction.UPDATE,
    oldData: { cashCollectedAt: null, orderIds: orders.map((order) => order._id.toString()) },
    newData: {
      cashCollectedAt: now,
      cashCollectedBy: managerId,
      orderIds: orders.map((order) => order._id.toString()),
    },
  });

  return {
    collectedAt: now,
    collectedBy: managerId,
    updatedCount: orders.length,
    totalCollected: orders.reduce((total, order) => total + getOrderTotal(order), 0),
    orderIds: orders.map((order) => order._id),
  };
};
