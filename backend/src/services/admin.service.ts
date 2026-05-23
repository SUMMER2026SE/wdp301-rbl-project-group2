import { APP_ORIGIN, NODE_ENV } from '@/constants/env';
import { CONFLICT, INTERNAL_SERVER_ERROR, NOT_FOUND } from '@/constants/http';
import { OrderModel, UserModel, ProductModel, ReviewModel } from '@/models';
import VerificationCodeModel from '@/models/verificationCode.model';
import { Role } from '@/types/user.type';
import { OrderStatus, PaymentMethod } from '@/types/order.type';
import { VerificationCodeType } from '@/types/verificationCode.type';
import appAssert from '@/utils/appAssert';
import { oneHourFromNow } from '@/utils/date';
import { sendMail } from '@/utils/sendMail';
import withTransaction from '@/utils/withTransaction';
import { randomUUID } from 'crypto';
import AuditLogModel from '@/models/audit-log.model';
import { AuditEntityType, AuditLogAction } from '@/types/audit-log.type';
import { generateUsernameFromEmail } from '@/utils/generateUsername';
import { getStaffInviteTemplate } from '@/utils/emailTemplates';
import mongoose from 'mongoose';
import { assignDelivery } from '@/services/order.service';

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
      password_hash: randomUUID(),
      isActive: false,
    });

    await staff.save({ session });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const verificationCode = new VerificationCodeModel({
      user_id: staff._id,
      type: VerificationCodeType.STAFF_INVITE,
      email: staff.email,
      code,
      expires_at: oneHourFromNow(),
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
          user_id: actorId,
          entity_type: AuditEntityType.USER,
          action: AuditLogAction.CREATE,
          old_data: null,
          new_data: {
            id: staff._id,
            username: staff.username,
            email: staff.email,
            phone: staff.phone,
            role: staff.role,
            isActive: staff.isActive,
          },
          created_at: new Date(),
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
      isActive: staff.isActive,
    };

    staff.isActive = isActive;
    await staff.save({ session });

    const actorId = typeof adminId === 'string' ? new mongoose.Types.ObjectId(adminId) : adminId;

    await AuditLogModel.create(
      [
        {
          user_id: actorId,
          entity_type: AuditEntityType.USER,
          action: AuditLogAction.UPDATE,
          old_data: oldData,
          new_data: {
            id: staff._id,
            isActive: staff.isActive,
          },
          created_at: new Date(),
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
        'payment.cash_collected_at': null,
        'delivery_info.driver_id': { $ne: null },
      },
    },
    {
      $group: {
        _id: '$delivery_info.driver_id',
        total_amount: { $sum: '$total_price' },
        order_count: { $sum: 1 },
        order_ids: { $push: '$_id' },
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
        total_amount: 1,
        order_count: 1,
        order_ids: 1,
        driver_name: '$driver.username',
        driver_email: '$driver.email',
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
      'delivery_info.driver_id': new mongoose.Types.ObjectId(driverId),
      status: OrderStatus.COMPLETED,
      'payment.method': PaymentMethod.CASH_ON_DELIVERY,
      'payment.cash_collected_at': null,
    },
    {
      $set: {
        'payment.cash_collected_at': new Date(),
        'payment.cash_collected_by': new mongoose.Types.ObjectId(adminId),
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
export const getCustomersWithStats = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const users = await UserModel.aggregate([
    { $match: { role: Role.CUSTOMER } },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'user_id',
        as: 'orders',
      },
    },
    {
      $addFields: {
        total_orders: { $size: '$orders' },
        cancelled_orders: {
          $size: {
            $filter: {
              input: '$orders',
              as: 'order',
              cond: { $eq: ['$$order.status', OrderStatus.CANCELLED] },
            },
          },
        },
        cancellation_rate: {
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
        password_hash: 0,
        orders: 0,
      },
    },
  ]);

  const total = await UserModel.countDocuments({ role: Role.CUSTOMER });

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
    user_id: new mongoose.Types.ObjectId(userId),
    status: OrderStatus.CANCELLED,
  })
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Admin: list all reviews + hasResponse based on existing reply (parent_reply).
 * Since FE mock needs dishName/customerName/date/time/status, we adapt Review schema.
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
      .populate('user_id', 'username avatar')
      .populate('product_id', 'name')
      .select('user_id product_id rating comment images parent_reply createdAt')
      .lean(),
    ReviewModel.countDocuments({}),
  ]);

  const reviewIds = reviews.map((r: any) => r._id);
  const replies = await ReviewModel.find({ parent_reply: { $in: reviewIds } })
    .select('parent_reply')
    .lean();

  const repliesByParent = new Set(replies.map((r: any) => String(r.parent_reply)));

  const formatted = reviews.map((r: any) => {
    const dt = new Date(r.createdAt);
    const date = dt.toISOString().slice(0, 10); // YYYY-MM-DD
    const time = dt.toISOString().slice(11, 16); // HH:mm
    const hasResponse = repliesByParent.has(String(r._id));
    const status = r.rating != null && Number(r.rating) <= 2 ? 'flagged' : 'published';

    return {
      id: String(r._id),
      customerName: r.user_id?.username || 'Unknown',
      avatar: r.user_id?.avatar ?? null,
      dishName: r.product_id?.name || 'Unknown dish',
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
 * Admin reply to a review (create/update reply review).
 */
export const replyAdminReview = async (adminId: mongoose.Types.ObjectId, reviewId: string, comment: string) => {
  const parentReview = await ReviewModel.findById(reviewId).select('_id user_id order_id product_id').lean();

  appAssert(parentReview, 404, 'Không tìm thấy đánh giá');

  // Upsert reply for admin (one reply per review per admin)
  const reply = await ReviewModel.findOneAndUpdate(
    {
      parent_reply: new mongoose.Types.ObjectId(reviewId),
      user_id: adminId,
    },
    {
      user_id: adminId,
      order_id: parentReview.order_id,
      product_id: parentReview.product_id,
      rating: null,
      comment,
      parent_reply: parentReview._id,
      isAnonymous: false,
    },
    { new: true, upsert: true }
  );

  return reply;
};

/**
 * Derived ingredients: unique recipe names from products.
 * Allergens/dietary are not stored in BE right now, so we return empty arrays.
 */
export const listAdminIngredients = async () => {
  const products = await ProductModel.find({}, { recipe: 1 }).lean();

  const map = new Map<string, { name: string; usedInProducts: number }>();
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-');

  for (const p of products) {
    const recipeNames = (p.recipe || []).map((r: any) => String(r.name || '').trim()).filter(Boolean);
    const uniq = new Set(recipeNames);
    for (const name of uniq) {
      const key = normalize(name);
      const prev = map.get(key);
      map.set(key, { name, usedInProducts: (prev?.usedInProducts || 0) + 1 });
    }
  }

  const items = Array.from(map.entries()).map(([key, v]) => ({
    id: `ing-${key}`,
    name: v.name,
    allergens: [] as string[],
    dietary: [] as string[],
    usedInProducts: v.usedInProducts,
  }));

  items.sort((a: any, b: any) => a.name.localeCompare(b.name));
  return items;
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
 * Admin shippers: STAFF users + compute current orders from order delivery_info.
 * Note: rating/zone may be derived as basic placeholders due to missing schema.
 */
export const listAdminShippers = async () => {
  const staff = await UserModel.find({ role: Role.STAFF }).select('_id username phone isActive').lean();
  const staffIds = staff.map((s: any) => s._id);

  const orders = await OrderModel.find({
    'delivery_info.driver_id': { $in: staffIds },
    status: { $in: [OrderStatus.READY_FOR_DELIVERY, OrderStatus.SHIPPING, OrderStatus.COMPLETED] },
  })
    .select('delivery_info.driver_id status delivery_info.shipped_at delivery_info.delivered_at delivery_address')
    .lean();

  const ordersByDriver = new Map<string, any[]>();
  for (const o of orders) {
    const id = String(o.delivery_info.driver_id);
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
        if (!o.delivery_info?.shipped_at || !o.delivery_info?.delivered_at) return null;
        const ms = new Date(o.delivery_info.delivered_at).getTime() - new Date(o.delivery_info.shipped_at).getTime();
        if (!Number.isFinite(ms) || ms < 0) return null;
        return ms / 60000;
      })
      .filter((t) => typeof t === 'number');

    const avgTime = times.length ? times.reduce((a, b) => a + (b as number), 0) / times.length : null;
    avgTimeByDriver.set(id, avgTime ?? 0);

    // most common district
    const districtCount: Record<string, number> = {};
    for (const o of assigned) {
      const district = String(o.delivery_address?.district || '').trim();
      if (!district) continue;
      districtCount[district] = (districtCount[district] || 0) + 1;
    }
    zonesByDriver.set(id, districtCount);

    const zone = Object.entries(districtCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    const status = !s.isActive ? 'offline' : currentOrders > 0 ? 'busy' : 'active';

    // FE expects: status 'active' | 'busy' | 'offline'
    // rating/zone/avgTime can be placeholders
    (zonesByDriver as any).set(id, districtCount);
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
 * We map order status to FE delivery status: pending/picking_up/delivering.
 */
export const listAdminActiveDeliveries = async () => {
  const orders = await OrderModel.find({
    status: { $in: [OrderStatus.READY_FOR_DELIVERY, OrderStatus.SHIPPING] },
  })
    .sort({ createdAt: -1 })
    .populate('user_id', 'username')
    .populate('delivery_info.driver_id', 'username phone isActive')
    .select(
      'code status createdAt delivery_info.driver_id delivery_info.shipped_at delivery_info.delivered_at delivery_address user_id'
    );

  return orders.map((o: any) => {
    const driver = o.delivery_info?.driver_id;
    const status = o.status === OrderStatus.READY_FOR_DELIVERY ? (driver ? 'picking_up' : 'pending') : 'delivering';

    const progress = status === 'pending' ? 10 : status === 'picking_up' ? 30 : 75;

    return {
      id: String(o._id),
      shipper: driver?.username || 'Chưa nhận',
      customer: o.user_id?.username || 'Unknown',
      address: `${o.delivery_address?.detail || ''}${o.delivery_address?.district ? `, ${o.delivery_address.district}` : ''}`,
      status,
      estimatedTime:
        o.delivery_info?.delivered_at && o.delivery_info?.shipped_at
          ? `${Math.max(0, Math.round((new Date(o.delivery_info.delivered_at).getTime() - new Date(o.delivery_info.shipped_at).getTime()) / 60000))} phút`
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
    'delivery_info.driver_id': null,
  })
    .sort({ createdAt: -1 })
    .populate('user_id', 'username')
    .select('code createdAt total_price status items delivery_address user_id');

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
    customer: o.user_id?.username || 'Unknown',
    address: `${o.delivery_address?.detail || ''}${o.delivery_address?.district ? `, ${o.delivery_address.district}` : ''}`,
    items: Array.isArray(o.items) ? o.items.length : 0,
    total: o.total_price || 0,
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
