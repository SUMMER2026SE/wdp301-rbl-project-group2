import { APP_ORIGIN, NODE_ENV } from '@/constants/env';
import { CONFLICT, INTERNAL_SERVER_ERROR, NOT_FOUND } from '@/constants/http';
import { OrderModel, UserModel, ProductModel, ReviewModel, IngredientModel } from '@/models';
import VerificationCodeModel from '@/models/verification-code.model';
import { Role, UserStatus } from '@/types/user.type';
import { OrderStatus, PaymentMethod } from '@/types/order.type';
import { VerificationCodeType } from '@/types/verification-code.type';
import appAssert from '@/utils/app-assert';
import { oneHourFromNow } from '@/utils/date';
import { sendMail } from '@/utils/send-mail';
import withTransaction from '@/utils/with-transaction';
import { randomUUID } from 'crypto';
import AuditLogModel from '@/models/audit-log.model';
import { AuditEntityType, AuditLogAction } from '@/types/audit-log.type';
import { generateUsernameFromEmail } from '@/utils/generate-username';
import { getStaffInviteTemplate } from '@/utils/email-templates';
import mongoose from 'mongoose';
import { assignDelivery } from '@/services/order.service';
import { listIngredients } from '@/services/ingredient.service';

export const createStaffByAdmin = async (
  adminId: mongoose.Types.ObjectId | string,
  { name, email, phone }: { name: string; email: string; phone?: string }
) => {
  return withTransaction(async (session) => {
    const normalizedEmail = email.trim().toLowerCase();

    const emailExist = await UserModel.exists({ email: normalizedEmail }).session(session);
    appAssert(!emailExist, CONFLICT, 'Tài khoản email đã tồn tại');

    const username = await generateUsernameFromEmail(normalizedEmail, session);

    const staff = new UserModel({
      fullName: name,
      username,
      email: normalizedEmail,
      phone,
      role: Role.STAFF,
      passwordHash: randomUUID(),
      isActive: false,
    });

    await staff.save({ session });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const verificationCode = new VerificationCodeModel({
      userId: staff._id,
      type: VerificationCodeType.STAFF_INVITE,
      email: staff.email,
      code,
      expiresAt: oneHourFromNow(),
    });

    await verificationCode.save({ session });

    const url = `${APP_ORIGIN}/reset-password?code=${code}&email=${staff.email}&type=invite`;

    const { error } = await sendMail({
      to: staff.email,
      ...getStaffInviteTemplate(url),
    });

    if (error) {
      if (NODE_ENV === 'development') {
        console.warn('⚠ [DEV] Gửi email mời staff thất bại. URL:', url);
        console.warn('⚠ [DEV] Lỗi:', (error as Error)?.message);
      } else {
        appAssert(!error, INTERNAL_SERVER_ERROR, 'Lỗi khi gửi email mời staff thiết lập mật khẩu');
      }
    }

    const actorId = typeof adminId === 'string' ? new mongoose.Types.ObjectId(adminId) : adminId;

    await AuditLogModel.create(
      [
        {
          userId: actorId,
          entityType: AuditEntityType.USER,
          action: AuditLogAction.CREATE,
          oldData: null,
          newData: {
            id: staff._id,
            username: staff.username,
            email: staff.email,
            phone: staff.phone,
            role: staff.role,
            status: staff.status,
          },
          createdAt: new Date(),
        },
      ],
      { session }
    );

    return staff.omitPassword();
  });
};

export const updateStaffStatus = async (
  adminId: mongoose.Types.ObjectId | string,
  staffId: string,
  isActive: boolean
) => {
  return withTransaction(async (session) => {
    const staff = await UserModel.findOne({ _id: staffId, role: Role.STAFF }).session(session);
    appAssert(staff, NOT_FOUND, 'Không tìm thấy nhân viên');

    const oldData = {
      id: staff._id,
      status: staff.status,
    };

    staff.status = isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE;
    await staff.save({ session });

    const actorId = typeof adminId === 'string' ? new mongoose.Types.ObjectId(adminId) : adminId;

    await AuditLogModel.create(
      [
        {
          userId: actorId,
          entityType: AuditEntityType.USER,
          action: AuditLogAction.UPDATE,
          oldData,
          newData: {
            id: staff._id,
            status: staff.status,
          },
          createdAt: new Date(),
        },
      ],
      { session }
    );

    return staff.omitPassword();
  });
};

/**
 * Get total COD cash held by each staff member (uncollected)
 */
export const getCashControl = async () => {
  const result = await OrderModel.aggregate([
    {
      $match: {
        status: OrderStatus.COMPLETED,
        'payment.method': PaymentMethod.CASH_ON_DELIVERY,
        'payment.cashCollectedAt': null,
        'deliveryInfo.driverId': { $ne: null },
      },
    },
    {
      $group: {
        _id: '$deliveryInfo.driverId',
        totalAmount: { $sum: '$totalPrice' },
        orderCount: { $sum: 1 },
        orderIds: { $push: '$_id' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'driver',
      },
    },
    {
      $unwind: '$driver',
    },
    {
      $project: {
        _id: 1,
        totalAmount: 1,
        orderCount: 1,
        orderIds: 1,
        driverName: '$driver.username',
        driverEmail: '$driver.email',
      },
    },
  ]);

  return result;
};

/**
 * Mark all uncollected COD orders for a driver as collected
 */
export const collectCashFromDriver = async (adminId: string, driverId: string) => {
  const driverExists = await UserModel.exists({ _id: driverId, role: Role.STAFF });
  appAssert(driverExists, NOT_FOUND, 'Không tìm thấy nhân viên giao hàng');

  const result = await OrderModel.updateMany(
    {
      'deliveryInfo.driverId': new mongoose.Types.ObjectId(driverId),
      status: OrderStatus.COMPLETED,
      'payment.method': PaymentMethod.CASH_ON_DELIVERY,
      'payment.cashCollectedAt': null,
    },
    {
      $set: {
        'payment.cashCollectedAt': new Date(),
        'payment.cashCollectedBy': new mongoose.Types.ObjectId(adminId),
      },
    }
  );

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
};

/**
 * Get customers with order statistics (cancellation rate, etc.)
 */
export const getCustomersWithStats = async (
  page: number = 1,
  limit: number = 10,
  search?: string
) => {
  const skip = (page - 1) * limit;

  const matchQuery: any = { role: Role.CUSTOMER };

  if (search && search.trim() !== '') {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    matchQuery.$or = [
      { fullName: { $regex: escapedSearch, $options: 'i' } },
      { email: { $regex: escapedSearch, $options: 'i' } },
      { phone: { $regex: escapedSearch, $options: 'i' } },
      { username: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  const users = await UserModel.aggregate([
    { $match: matchQuery },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'cusId',
        as: 'orders',
      },
    },
    {
      $addFields: {
        totalOrders: { $size: '$orders' },
        cancelledOrders: {
          $size: {
            $filter: {
              input: '$orders',
              as: 'order',
              cond: { $eq: ['$$order.status', OrderStatus.CANCELLED] },
            },
          },
        },
        cancellationRate: {
          $cond: [
            { $gt: [{ $size: '$orders' }, 0] },
            {
              $multiply: [
                {
                  $divide: [
                    {
                      $size: {
                        $filter: {
                          input: '$orders',
                          as: 'order',
                          cond: { $eq: ['$$order.status', OrderStatus.CANCELLED] },
                        },
                      },
                    },
                    { $size: '$orders' },
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $project: {
        passwordHash: 0,
        orders: 0,
      },
    },
  ]);

  const total = await UserModel.countDocuments(matchQuery);

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get detailed history of cancelled/rejected orders for a customer
 */
export const getCustomerCancelledOrders = async (userId: string) => {
  return await OrderModel.find({
    cusId: new mongoose.Types.ObjectId(userId),
    status: OrderStatus.CANCELLED,
  })
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Admin: list all reviews + hasResponse based on existing reply.
 */
export const listAdminReviews = async (page: number = 1, limit: number = 20) => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const skip = (safePage - 1) * safeLimit;

  const [reviews, total] = await Promise.all([
    ReviewModel.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('userId', 'username avatar')
      .populate('productId', 'name')
      .select('userId productId rating comment images reply createdAt')
      .lean(),
    ReviewModel.countDocuments({}),
  ]);

  const formatted = reviews.map((r: any) => {
    const dt = new Date(r.createdAt);
    const date = dt.toISOString().slice(0, 10); // YYYY-MM-DD
    const time = dt.toISOString().slice(11, 16); // HH:mm
    const hasResponse = !!r.reply;
    const status = r.rating != null && Number(r.rating) <= 2 ? 'flagged' : 'published';

    return {
      id: String(r._id),
      customerName: r.userId?.username || 'Unknown',
      avatar: r.userId?.avatar ?? null,
      dishName: r.productId?.name || 'Unknown dish',
      rating: r.rating ?? 0,
      comment: r.comment || '',
      date,
      time,
      status,
      hasResponse,
    };
  });

  return {
    reviews: formatted,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
  };
};

/**
 * Admin reply to a review.
 */
export const replyAdminReview = async (adminId: mongoose.Types.ObjectId, reviewId: string, comment: string) => {
  const parentReview = await ReviewModel.findById(reviewId).select('_id userId orderId productId').lean();
  appAssert(parentReview, 404, 'Không tìm thấy đánh giá');

  const reply = await ReviewModel.findByIdAndUpdate(
    reviewId,
    {
      reply: comment,
    },
    { new: true }
  );

  return reply;
};

/**
 * Derived ingredients: unique recipe names from products.
 */
export const listAdminIngredients = async () => {
  const ingredients = await listIngredients();
  return ingredients.map((ing: any) => ({
    ...ing,
    allergens: ing.allergenTags || [],
    dietary: [] as string[],
  }));
};

/**
 * Derived inventory: placeholder stock/status derived from ingredients list.
 */
export const listAdminInventory = async () => {
  const ingredients = await listAdminIngredients();
  return ingredients.map((ing: any) => ({
    id: ing.id,
    name: ing.name,
    category: 'Nguyên liệu',
    currentStock: 0,
    unit: 'kg',
    minStock: 0,
    maxStock: 1,
    supplier: '—',
    lastRestocked: '',
    costPerUnit: 0,
    status: 'out-of-stock',
  }));
};

/**
 * Admin shippers: STAFF users + compute current orders from order deliveryInfo.
 */
export const listAdminShippers = async () => {
  const staff = await UserModel.find({ role: Role.STAFF }).select('_id username phone isActive').lean();
  const staffIds = staff.map((s: any) => s._id);

  const orders = await OrderModel.find({
    'deliveryInfo.driverId': { $in: staffIds },
    status: { $in: [OrderStatus.READY_FOR_DELIVERY, OrderStatus.SHIPPING, OrderStatus.COMPLETED] },
  })
    .select('deliveryInfo.driverId status deliveryInfo.shippedAt deliveryInfo.deliveredAt deliveryAddress')
    .lean();

  const ordersByDriver = new Map<string, any[]>();
  for (const o of orders) {
    const id = String(o.deliveryInfo.driverId);
    const arr = ordersByDriver.get(id) || [];
    arr.push(o);
    ordersByDriver.set(id, arr);
  }

  const zonesByDriver = new Map<string, Record<string, number>>();
  const avgTimeByDriver = new Map<string, number>();

  for (const s of staff) {
    const id = String(s._id);
    const assigned = ordersByDriver.get(id) || [];

    const currentOrders = assigned.filter(
      (o) => o.status === OrderStatus.READY_FOR_DELIVERY || o.status === OrderStatus.SHIPPING
    ).length;
    const totalDeliveries = assigned.filter((o) => o.status === OrderStatus.COMPLETED).length;
    const completed = assigned.filter((o) => o.status === OrderStatus.COMPLETED);

    // average delivery time in minutes
    const times = completed
      .map((o) => {
        if (!o.deliveryInfo?.shippedAt || !o.deliveryInfo?.deliveredAt) return null;
        const ms = new Date(o.deliveryInfo.deliveredAt).getTime() - new Date(o.deliveryInfo.shippedAt).getTime();
        if (!Number.isFinite(ms) || ms < 0) return null;
        return ms / 60000;
      })
      .filter((t) => typeof t === 'number');

    const avgTime = times.length ? times.reduce((a, b) => a + (b as number), 0) / times.length : null;
    avgTimeByDriver.set(id, avgTime ?? 0);

    // most common delivery ward
    const districtCount: Record<string, number> = {};
    for (const o of assigned) {
      const district = String(o.deliveryAddress?.ward || '').trim();
      if (!district) continue;
      districtCount[district] = (districtCount[district] || 0) + 1;
    }
    zonesByDriver.set(id, districtCount);
  }

  const result = staff.map((s: any) => {
    const id = String(s._id);
    const assigned = ordersByDriver.get(id) || [];
    const currentOrders = assigned.filter(
      (o) => o.status === OrderStatus.READY_FOR_DELIVERY || o.status === OrderStatus.SHIPPING
    ).length;
    const totalDeliveries = assigned.filter((o) => o.status === OrderStatus.COMPLETED).length;

    const districtCount = zonesByDriver.get(id) || {};
    const zone = Object.entries(districtCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const avgTime = avgTimeByDriver.get(id) || 0;

    const status = !s.isActive ? 'offline' : currentOrders > 0 ? 'busy' : 'active';

    return {
      id: String(s._id),
      name: s.username,
      phone: s.phone || '',
      status,
      currentOrders,
      totalDeliveries,
      rating: 0,
      avgTime: avgTime ? `${Math.round(avgTime)} phút` : '—',
      zone,
    };
  });

  return result;
};

/**
 * Active deliveries list for FE mock replacement.
 */
export const listAdminActiveDeliveries = async () => {
  const orders = await OrderModel.find({
    status: { $in: [OrderStatus.READY_FOR_DELIVERY, OrderStatus.SHIPPING] },
  })
    .sort({ createdAt: -1 })
    .populate('cusId', 'username fullName')
    .populate('deliveryInfo.driverId', 'username phone isActive')
    .select(
      'code status createdAt deliveryInfo.driverId deliveryInfo.shippedAt deliveryInfo.deliveredAt deliveryAddress cusId'
    );

  return orders.map((o: any) => {
    const driver = o.deliveryInfo?.driverId;
    const status = o.status === OrderStatus.READY_FOR_DELIVERY ? (driver ? 'picking_up' : 'pending') : 'delivering';

    const progress = status === 'pending' ? 10 : status === 'picking_up' ? 30 : 75;

    return {
      id: String(o._id),
      shipper: driver?.username || 'Chưa nhận',
      customer: o.cusId?.fullName || o.cusId?.username || 'Unknown',
      address: `${o.deliveryAddress?.detail || ''}${o.deliveryAddress?.ward ? `, ${o.deliveryAddress.ward}` : ''}`,
      status,
      estimatedTime:
        o.deliveryInfo?.deliveredAt && o.deliveryInfo?.shippedAt
          ? `${Math.max(0, Math.round((new Date(o.deliveryInfo.deliveredAt).getTime() - new Date(o.deliveryInfo.shippedAt).getTime()) / 60000))} phút`
          : '—',
      progress,
    };
  });
};

/**
 * Pending dispatch orders: READY_FOR_DELIVERY with no driver assigned.
 */
export const listAdminDispatchPendingOrders = async () => {
  const now = Date.now();
  const orders = await OrderModel.find({
    status: OrderStatus.READY_FOR_DELIVERY,
    'deliveryInfo.driverId': null,
  })
    .sort({ createdAt: -1 })
    .populate('cusId', 'username fullName')
    .select('code createdAt totalPrice status items deliveryAddress cusId');

  const formatRelative = (createdAt: Date) => {
    const diffMs = now - new Date(createdAt).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffH = Math.floor(diffMin / 60);
    return `${diffH} giờ trước`;
  };

  return orders.map((o: any) => ({
    id: String(o._id),
    orderNumber: o.code,
    customer: o.cusId?.fullName || o.cusId?.username || 'Unknown',
    address: `${o.deliveryAddress?.detail || ''}${o.deliveryAddress?.ward ? `, ${o.deliveryAddress.ward}` : ''}`,
    items: Array.isArray(o.items) ? o.items.length : 0,
    total: o.totalPrice || 0,
    time: formatRelative(o.createdAt),
  }));
};

/**
 * Admin assign delivery for dispatch screen (READY_FOR_DELIVERY -> SHIPPING).
 */
export const assignAdminDispatchOrder = async (orderId: string, driverId: string, adminId: mongoose.Types.ObjectId) => {
  appAssert(orderId, 400, 'Missing orderId');
  appAssert(driverId, 400, 'Missing driverId');

  const driver = await UserModel.exists({ _id: driverId, role: Role.STAFF, isActive: true });
  appAssert(driver, 404, 'Không tìm thấy nhân viên giao hàng đang hoạt động');

  const assigned = await assignDelivery(orderId, new mongoose.Types.ObjectId(driverId));

  return assigned;
};
