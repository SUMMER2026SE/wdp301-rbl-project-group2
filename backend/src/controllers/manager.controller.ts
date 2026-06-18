import { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { UserModel } from '@/models';
import appAssert from '@/utils/app-assert';
import { catchErrors } from '@/utils/async-handler';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import { OrderStatus } from '@/types/order.type';
import {
  getManagerOrders,
  getManagerOrderById,
  managerAssignDelivery,
  managerCancelOrder,
  managerConfirmOrder,
  managerManualCompleteOrder,
  managerOverrideOrderStatus,
  managerRejectOrder,
} from '@/services/manager-order.service';
import {
  getManagerMenu,
  getManagerProductById,
  updateManagerProductAvailability,
} from '@/services/manager-menu.service';
import {
  cancelManagerStaffRequest,
  createManagerCreateStaffRequest,
  createManagerDeactivateStaffRequest,
  getManagerStaffRequestById,
  listManagerStaff,
  listManagerStaffRequests,
} from '@/services/manager-staff.service';
import {
  confirmManagerCodCollection,
  getManagerCashOverview,
  getManagerDashboardMetrics,
  getManagerSettings,
  updateManagerSettings,
} from '@/services/manager-dashboard.service';
import { updateStore } from '@/services/store-management.service';
import { updateStoreSchema } from '@/validators/store.validator';

const getRequiredManagerIds = (req: any) => {
  appAssert(req.userId, BAD_REQUEST, 'Manager id is required');
  appAssert(req.scope?.storeId, BAD_REQUEST, 'Manager store scope is required');

  return {
    managerId: new mongoose.Types.ObjectId(req.userId),
    storeId: req.scope.storeId as mongoose.Types.ObjectId,
  };
};

const parseOrderStatus = (status: unknown) => {
  appAssert(typeof status === 'string', BAD_REQUEST, 'Trạng thái đơn hàng là bắt buộc');
  appAssert(
    Object.values(OrderStatus).includes(status as OrderStatus),
    BAD_REQUEST,
    'Trạng thái đơn hàng không hợp lệ'
  );

  return status as OrderStatus;
};

export const getManagerContext: RequestHandler = catchErrors(async (req, res) => {
  const manager = await UserModel.findById(req.userId)
    .select('_id username fullName email phone role storeId status')
    .populate('storeId', '_id name address phone')
    .lean();

  appAssert(manager, NOT_FOUND, 'Manager not found');

  res.status(200).json({
    success: true,
    data: {
      manager,
      storeId: req.scope?.storeId,
    },
  });
});

export const getManagerDashboardMetricsHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId } = getRequiredManagerIds(req);
  const metrics = await getManagerDashboardMetrics(storeId);

  res.status(200).json({ success: true, data: metrics });
});

export const getManagerCashOverviewHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId } = getRequiredManagerIds(req);
  const cash = await getManagerCashOverview(storeId, req.query.date);

  res.status(200).json({ success: true, data: cash });
});

export const confirmManagerCodCollectionHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId, managerId } = getRequiredManagerIds(req);
  const result = await confirmManagerCodCollection(storeId, managerId, req.body.orderIds);

  res.status(200).json({ success: true, data: result });
});

export const getManagerSettingsHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId } = getRequiredManagerIds(req);
  const settings = await getManagerSettings(storeId);

  res.status(200).json({ success: true, data: settings });
});

export const updateManagerSettingsHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId } = getRequiredManagerIds(req);
  const settings = await updateManagerSettings(storeId, req.body);

  res.status(200).json({ success: true, data: settings });
});

export const getManagerOrdersHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId } = getRequiredManagerIds(req);
  const result = await getManagerOrders(storeId, req.query);

  res.status(200).json({
    success: true,
    data: result.orders,
    pagination: result.pagination,
  });
});

export const getManagerOrderDetailHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId } = getRequiredManagerIds(req);
  const order = await getManagerOrderById(storeId, req.params.id);

  res.status(200).json({ success: true, data: order });
});

export const managerConfirmOrderHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId, managerId } = getRequiredManagerIds(req);
  const order = await managerConfirmOrder(storeId, managerId, req.params.id);

  res.status(200).json({ success: true, data: order });
});

export const managerRejectOrderHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId, managerId } = getRequiredManagerIds(req);
  const order = await managerRejectOrder(storeId, managerId, req.params.id, req.body.reason, req.body.note);

  res.status(200).json({ success: true, data: order });
});

export const managerCancelOrderHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId, managerId } = getRequiredManagerIds(req);
  const order = await managerCancelOrder(storeId, managerId, req.params.id, req.body.reason, req.body.note);

  res.status(200).json({ success: true, data: order });
});

export const managerAssignDeliveryHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId, managerId } = getRequiredManagerIds(req);
  appAssert(typeof req.body.driverId === 'string', BAD_REQUEST, 'Driver id là bắt buộc');

  const order = await managerAssignDelivery({
    storeId,
    managerId,
    orderId: req.params.id,
    driverId: req.body.driverId,
    reason: req.body.reason,
    note: req.body.note,
  });

  res.status(200).json({ success: true, data: order });
});

export const managerManualCompleteOrderHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId, managerId } = getRequiredManagerIds(req);
  const order = await managerManualCompleteOrder(storeId, managerId, req.params.id, req.body.reason, req.body.note);

  res.status(200).json({ success: true, data: order });
});

export const managerOrderOverrideStatusHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId, managerId } = getRequiredManagerIds(req);
  const order = await managerOverrideOrderStatus({
    storeId,
    managerId,
    orderId: req.params.id,
    status: parseOrderStatus(req.body.status),
    reason: req.body.reason,
    note: req.body.note,
  });

  res.status(200).json({ success: true, data: order });
});

export const getManagerMenuHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId } = getRequiredManagerIds(req);
  const products = await getManagerMenu(storeId, req.query);

  res.status(200).json({ success: true, data: products });
});

export const getManagerProductDetailHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId } = getRequiredManagerIds(req);
  const product = await getManagerProductById(storeId, req.params.id);

  res.status(200).json({ success: true, data: product });
});

export const updateManagerProductAvailabilityHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId } = getRequiredManagerIds(req);
  const product = await updateManagerProductAvailability(storeId, req.params.id, req.body);

  res.status(200).json({ success: true, data: product });
});

export const getManagerStaffHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId } = getRequiredManagerIds(req);
  const staff = await listManagerStaff(storeId, req.query);

  res.status(200).json({ success: true, data: staff });
});

export const getManagerStaffRequestsHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId } = getRequiredManagerIds(req);
  const requests = await listManagerStaffRequests(storeId, req.query);

  res.status(200).json({ success: true, data: requests });
});

export const getManagerStaffRequestDetailHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId } = getRequiredManagerIds(req);
  const request = await getManagerStaffRequestById(storeId, req.params.id);

  res.status(200).json({ success: true, data: request });
});

export const createManagerCreateStaffRequestHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId, managerId } = getRequiredManagerIds(req);
  const request = await createManagerCreateStaffRequest(storeId, managerId, req.body);

  res.status(201).json({ success: true, data: request });
});

export const createManagerDeactivateStaffRequestHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId, managerId } = getRequiredManagerIds(req);
  const request = await createManagerDeactivateStaffRequest(storeId, managerId, req.body);

  res.status(201).json({ success: true, data: request });
});

export const cancelManagerStaffRequestHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId } = getRequiredManagerIds(req);
  const request = await cancelManagerStaffRequest(storeId, req.params.id);

  res.status(200).json({ success: true, data: request });
});

export const updateManagerStoreHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId } = getRequiredManagerIds(req);
  const body = updateStoreSchema.parse(req.body);
  const store = await updateStore(storeId.toString(), body);

  res.status(200).json({ success: true, data: store });
});
