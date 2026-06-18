import mongoose from 'mongoose';
import { CREATED, OK } from '@/constants/http';
import { catchErrors } from '@/utils/async-handler';
import {
  collectCashFromDriver,
  createStaffByAdmin,
  updateStaffStatus,
  getCashControl,
  getCustomerCancelledOrders,
  getCustomersWithStats,
  listAdminReviews,
  replyAdminReview,
  listAdminIngredients,
  listAdminInventory,
  listAdminShippers,
  listAdminActiveDeliveries,
  listAdminDispatchPendingOrders,
  assignAdminDispatchOrder,
} from '@/services/admin.service';
import {
  approveStaffRequest,
  getAdminStaffRequestById,
  listAdminStaffRequests,
  rejectStaffRequest,
} from '@/services/admin-staff-request.service';
import { createStaffValidator } from '@/validators/admin.validator';
import { getUsersByRole } from '@/services/user.service';
import { Role } from '@/types/user.type';
import { UserModel } from '@/models';
import appAssert from '@/utils/app-assert';
import { NOT_FOUND } from '@/constants/http';
import {
  listAllStores,
  getStoreById,
  createStore,
  updateStore,
  setStoreActive,
} from '@/services/store-management.service';
import { createStoreSchema, updateStoreSchema } from '@/validators/store.validator';

export const createStaffHandler = catchErrors(async (req, res) => {
  const body = createStaffValidator.parse(req.body);

  const adminId = req.userId!;
  const staff = await createStaffByAdmin(adminId, body);

  return res.success(CREATED, {
    message: 'Tạo tài khoản staff thành công. Vui lòng kiểm tra email để thiết lập mật khẩu.',
    data: staff,
  });
});

export const getCustomersHandler = catchErrors(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;

  const result = await getCustomersWithStats(page, limit, search);

  return res.success(OK, {
    message: 'Lấy danh sách khách hàng thành công',
    data: result,
  });
});

export const getCustomerDetailHandler = catchErrors(async (req, res) => {
  const user = await UserModel.findById(req.params.id).select('-passwordHash').lean();
  appAssert(user, NOT_FOUND, 'Không tìm thấy khách hàng');
  return res.success(OK, {
    message: 'Lấy thông tin khách hàng thành công',
    data: user,
  });
});

export const getCashControlHandler = catchErrors(async (req, res) => {
  const result = await getCashControl();

  return res.success(OK, {
    message: 'Lấy dữ liệu công nợ nhân viên thành công',
    data: result,
  });
});

export const collectCashHandler = catchErrors(async (req, res) => {
  const adminId = req.userId!;
  const { driverId } = req.body;

  const result = await collectCashFromDriver(adminId.toString(), driverId);

  return res.success(OK, {
    message: `Đã thu tiền thành công (${result.modifiedCount} đơn hàng)`,
    data: result,
  });
});

export const getCustomerIncidentsHandler = catchErrors(async (req, res) => {
  const { userId } = req.params;

  const result = await getCustomerCancelledOrders(userId);

  return res.success(OK, {
    message: 'Lấy lịch sử sự cố khách hàng thành công',
    data: result,
  });
});
export const getStaffHandler = catchErrors(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await getUsersByRole(Role.STAFF, page, limit);

  return res.success(OK, {
    message: 'Lấy danh sách nhân viên thành công',
    data: result,
  });
});

export const updateStaffStatusHandler = catchErrors(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const adminId = req.userId!;
  const staff = await updateStaffStatus(adminId, id, isActive);

  return res.success(OK, {
    message: `Đã ${isActive ? 'kích hoạt' : 'ngưng kích hoạt'} nhân viên thành công`,
    data: staff,
  });
});

// ── Admin: Reviews / Ingredients / Inventory / Delivery / Dispatch ────────────────

export const getAdminReviewsHandler = catchErrors(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await listAdminReviews(page, limit);

  return res.success(OK, { data: result });
});

export const replyAdminReviewHandler = catchErrors(async (req, res) => {
  const adminId = req.userId!;
  const { comment } = req.body;
  const { reviewId } = req.params;

  if (!comment || typeof comment !== 'string' || !comment.trim()) {
    return res.error(400, { message: 'Vui lòng nhập nội dung phản hồi' });
  }

  const reply = await replyAdminReview(adminId, reviewId, comment.trim());

  return res.success(OK, { data: reply });
});

export const getAdminIngredientsHandler = catchErrors(async (_req, res) => {
  const items = await listAdminIngredients();
  return res.success(OK, { data: items });
});

export const getAdminInventoryHandler = catchErrors(async (_req, res) => {
  const items = await listAdminInventory();
  return res.success(OK, { data: items });
});

export const getAdminShippersHandler = catchErrors(async (_req, res) => {
  const items = await listAdminShippers();
  return res.success(OK, { data: items });
});

export const getAdminActiveDeliveriesHandler = catchErrors(async (_req, res) => {
  const items = await listAdminActiveDeliveries();
  return res.success(OK, { data: items });
});

export const getAdminDispatchPendingOrdersHandler = catchErrors(async (_req, res) => {
  const items = await listAdminDispatchPendingOrders();
  return res.success(OK, { data: items });
});

export const assignAdminDispatchOrderHandler = catchErrors(async (req, res) => {
  const adminId = req.userId!;
  const { orderId, driverId } = req.body;

  if (!orderId || !driverId) {
    return res.error(400, { message: 'Missing orderId/driverId' });
  }

  const updated = await assignAdminDispatchOrder(orderId, driverId, adminId);
  return res.success(OK, { data: updated });
});

export const getAdminStaffRequestsHandler = catchErrors(async (req, res) => {
  const requests = await listAdminStaffRequests(req.query);
  return res.success(OK, { data: requests });
});

export const getAdminStaffRequestDetailHandler = catchErrors(async (req, res) => {
  const request = await getAdminStaffRequestById(req.params.id);
  return res.success(OK, { data: request });
});

export const approveAdminStaffRequestHandler = catchErrors(async (req, res) => {
  const adminId = new mongoose.Types.ObjectId(req.userId!);
  const request = await approveStaffRequest(adminId, req.params.id, req.body);
  return res.success(OK, { data: request });
});

export const rejectAdminStaffRequestHandler = catchErrors(async (req, res) => {
  const adminId = new mongoose.Types.ObjectId(req.userId!);
  const request = await rejectStaffRequest(adminId, req.params.id, req.body);
  return res.success(OK, { data: request });
});

// ── Admin: store management ────────────────────────────────────

export const getAdminStoresHandler = catchErrors(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
  const search = req.query.search as string | undefined;

  const result = await listAllStores(page, limit, { isActive, search });

  return res.success(OK, {
    message: 'Lấy danh sách cửa hàng thành công',
    data: result.stores,
    pagination: {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    },
  });
});

export const getAdminStoreDetailHandler = catchErrors(async (req, res) => {
  const store = await getStoreById(req.params.id);

  return res.success(OK, {
    message: 'Lấy thông tin cửa hàng thành công',
    data: store,
  });
});

export const createStoreHandler = catchErrors(async (req, res) => {
  const body = createStoreSchema.parse(req.body);
  const store = await createStore(body);

  return res.success(CREATED, {
    message: 'Tạo cửa hàng thành công',
    data: store,
  });
});

export const updateStoreHandler = catchErrors(async (req, res) => {
  const body = updateStoreSchema.parse(req.body);
  const store = await updateStore(req.params.id, body);

  return res.success(OK, {
    message: 'Cập nhật cửa hàng thành công',
    data: store,
  });
});

export const deactivateStoreHandler = catchErrors(async (req, res) => {
  const store = await setStoreActive(req.params.id, false);

  return res.success(OK, {
    message: 'Đã vô hiệu hóa cửa hàng',
    data: store,
  });
});

export const activateStoreHandler = catchErrors(async (req, res) => {
  const store = await setStoreActive(req.params.id, true);

  return res.success(OK, {
    message: 'Đã kích hoạt cửa hàng',
    data: store,
  });
});
