import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import { CartModel, OrderModel, ProductModel, UserModel, NotificationModel, SettingsModel } from '@/models';
import { DiscountType } from '@/types/voucher.type';
import appAssert from '@/utils/appAssert';
import withTransaction from '@/utils/withTransaction';
import { validateVoucher } from './voucher.service';
import { TPlaceOrderValidator } from '@/validators/order.validator';
import mongoose from 'mongoose';
import { PaymentMethod, OrderStatus } from '@/types/order.type';
import { createPaymentLink } from './payos.service';
import { APP_ORIGIN } from '@/constants/env';
import { parseOrderNoteForStaff } from './ai.service';
import { createAuditLog } from './audit-log.service';
import { AuditEntityType, AuditLogAction } from '@/types/audit-log.type';
import * as membershipService from './membership.service';
import { PointTransactionType } from '@/types/point-transaction.type';
import { createOrderStatusNotification } from './notification.service';
import { scheduleAiModelRetrain } from './ai-retrain.service';

// ────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// Shipping utility
// ────────────────────────────────────────────────────────────────────────────

const INNER_DISTRICTS = ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn'];
const OUTER_DISTRICTS = ['Liên Chiểu', 'Cẩm Lệ', 'Hòa Vang'];
const DELIVERABLE_CITY = 'Đà Nẵng';

// Default fallback fees (matches frontend DEFAULT_SHIPPING_CONFIG)
const DEFAULT_BASE_FEE = 15_000;
const DEFAULT_FEE_PER_KM = 5_000;
const DEFAULT_FREE_THRESHOLD = 300_000;

export async function calculateShippingFee(
  district: string,
  city: string,
  subtotal: number
): Promise<{ fee: number; blocked: boolean; reason?: string }> {
  const normalCity = city.trim();
  const normalDistrict = district.trim();

  if (normalCity.toLowerCase() !== DELIVERABLE_CITY.toLowerCase()) {
    return { fee: 0, blocked: true, reason: 'Hiện tại chỉ giao hàng trong khu vực Đà Nẵng' };
  }

  const isInner = INNER_DISTRICTS.some((d) => d.toLowerCase() === normalDistrict.toLowerCase());
  const isOuter = OUTER_DISTRICTS.some((d) => d.toLowerCase() === normalDistrict.toLowerCase());

  if (!isInner && !isOuter) {
    return { fee: 0, blocked: true, reason: `Khu vực "${normalDistrict}" nằm ngoài vùng giao hàng` };
  }

  // Read dynamic settings from DB
  let baseDeliveryFee = DEFAULT_BASE_FEE;
  let feePerKm = DEFAULT_FEE_PER_KM;
  let freeDeliveryEnabled = true;
  let freeDeliveryThreshold = DEFAULT_FREE_THRESHOLD;

  try {
    const settings = await SettingsModel.findOne().lean();
    if (settings) {
      baseDeliveryFee = parseFloat(settings.baseDeliveryFee as string) || DEFAULT_BASE_FEE;
      feePerKm = parseFloat(settings.feePerKm as string) || DEFAULT_FEE_PER_KM;
      freeDeliveryEnabled = settings.freeDeliveryEnabled ?? true;
      freeDeliveryThreshold = parseFloat(settings.freeDeliveryThreshold as string) || DEFAULT_FREE_THRESHOLD;
    }
  } catch (_) {
    // On DB error, use defaults
  }

  if (freeDeliveryEnabled && subtotal >= freeDeliveryThreshold) return { fee: 0, blocked: false };
  if (isInner) return { fee: baseDeliveryFee, blocked: false };
  return { fee: baseDeliveryFee + feePerKm * 5, blocked: false };
}

// ────────────────────────────────────────────────────────────────────────────
// Helper: Calculate item-level sub_total
// ────────────────────────────────────────────────────────────────────────────

interface ResolvedItem {
  product_id: mongoose.Types.ObjectId;
  quantity: number;
  variations: { name: string; choice: string; extra_price: number }[];
  sub_total: number;
}

const resolveOrderItems = async (
  rawItems: TPlaceOrderValidator['items'],
  session: mongoose.ClientSession
): Promise<{ resolvedItems: ResolvedItem[]; sub_total: number }> => {
  let sub_total = 0;
  const resolvedItems: ResolvedItem[] = [];

  for (const item of rawItems) {
    const product = await ProductModel.findById(item.product_id).session(session);

    appAssert(product, NOT_FOUND, `Không tìm thấy sản phẩm với id: ${item.product_id}`);
    appAssert(product.isAvailable, BAD_REQUEST, `Sản phẩm "${product.name}" hiện không có sẵn`);

    const normalizedVariations = (item.variations ?? []).map((selected) => {
      const variantGroup = product.variants?.find((variant: any) => variant.name === selected.name);

      appAssert(
        variantGroup,
        BAD_REQUEST,
        `Biến thể "${selected.name}" không tồn tại trong sản phẩm "${product.name}"`
      );

      const matchedOption = variantGroup.options?.find((option: any) => option.choice === selected.choice);

      appAssert(
        matchedOption,
        BAD_REQUEST,
        `Lựa chọn "${selected.choice}" không hợp lệ cho biến thể "${selected.name}"`
      );

      return {
        name: selected.name,
        choice: selected.choice,
        extra_price: matchedOption.extra_price ?? 0,
      };
    });

    const variationExtraPerUnit = normalizedVariations.reduce(
      (sum, variation) => sum + (variation.extra_price ?? 0),
      0
    );

    const unitPrice = product.price + variationExtraPerUnit;
    const itemSubTotal = unitPrice * item.quantity;

    sub_total += itemSubTotal;

    resolvedItems.push({
      product_id: new mongoose.Types.ObjectId(item.product_id),
      quantity: item.quantity,
      variations: normalizedVariations,
      sub_total: itemSubTotal,
    });
  }

  return { resolvedItems, sub_total };
};

// ────────────────────────────────────────────────────────────────────────────
// Helper: Calculate discount from voucher (reuses voucher.service logic)
// ────────────────────────────────────────────────────────────────────────────

const calcDiscount = (
  discountType: string,
  discountValue: number,
  maxDiscountAmount: number | null,
  sub_total: number
): number => {
  if (discountType === DiscountType.FIXED_AMOUNT) {
    return Math.min(discountValue, sub_total);
  }

  if (discountType === DiscountType.PERCENTAGE) {
    const raw = (sub_total * discountValue) / 100;
    return maxDiscountAmount !== null ? Math.min(raw, maxDiscountAmount) : raw;
  }

  // DiscountType.NONE or unknown
  return 0;
};

// ────────────────────────────────────────────────────────────────────────────
// FSS-40: Server-side allergy soft-check (defense-in-depth)
// Does NOT block the order — returns warnings so FE can display them.
// ────────────────────────────────────────────────────────────────────────────

import { buildForbiddenKeywordSet, fuzzyMatch } from '@/utils/healthFilter';

interface AllergyWarning {
  productName: string;
  conflictIngredients: string[];
  level: 'danger' | 'warning';
}

async function checkOrderHealthConflicts(
  resolvedItems: ResolvedItem[],
  preferences: any,
  session: mongoose.ClientSession
): Promise<AllergyWarning[]> {
  const forbiddenKeywords = buildForbiddenKeywordSet(preferences);

  if (forbiddenKeywords.size === 0) return [];

  const warnings: AllergyWarning[] = [];

  for (const item of resolvedItems) {
    const product = await ProductModel.findById(item.product_id).session(session).lean();
    if (!product) continue;

    const conflictIngredients: string[] = [];
    const recipe: { name: string }[] = (product as any).recipe ?? [];
    const tagList: string[] = [
      ...((product as any).tags ?? []),
      ...((product as any).health_tags ?? []),
    ];

    const keywordsToScan = [
      (product as any).name,
      (product as any).description,
      ...recipe.map((r) => r.name),
      ...tagList,
    ];

    for (const keyword of keywordsToScan) {
      if (!keyword) continue;
      for (const forbidden of forbiddenKeywords) {
        if (fuzzyMatch(forbidden, keyword) && !conflictIngredients.includes(forbidden)) {
          conflictIngredients.push(forbidden);
        }
      }
    }

    if (conflictIngredients.length > 0) {
      warnings.push({
        productName: product.name,
        conflictIngredients,
        level: 'danger',
      });
    }
  }

  return warnings;
}

// ────────────────────────────────────────────────────────────────────────────
// Main service — Place Order
// ────────────────────────────────────────────────────────────────────────────

export const placeOrder = async (userId: mongoose.Types.ObjectId, input: TPlaceOrderValidator) => {
  const { voucher: voucherId, payment_method, items, delivery_address, shipping_fee, return_url, cancel_url } = input;

  return withTransaction(async (session) => {
    // ── 1. Resolve & validate all items ──────────────────────────────────────
    const { resolvedItems, sub_total } = await resolveOrderItems(items, session);

    // ── 2. Apply voucher (optional) ──────────────────────────────────────────
    let actualDiscount = 0;
    let voucherObjectId: mongoose.Types.ObjectId | undefined;

    if (voucherId) {
      // Re-use the full validation logic from voucher.service
      // (checks active, dates, usage limits, min_order_amount)
      const { voucher, discountAmount } = await validateVoucher(
        // We validate by ID lookup — look up code from id first, or pass id directly
        // validateVoucher takes code, so find and pass code
        await (async () => {
          const v = await mongoose.model('Voucher').findById(voucherId).session(session);
          appAssert(v, NOT_FOUND, 'Không tìm thấy voucher');
          return v.code as string;
        })(),
        sub_total
      );

      actualDiscount = discountAmount;
      voucherObjectId = voucher._id as mongoose.Types.ObjectId;

      // Increment usage count atomically within the same transaction
      await mongoose
        .model('Voucher')
        .findByIdAndUpdate(voucherObjectId, { $inc: { current_usage_count: 1 } }, { session });
    }

    const total_price = Math.max(0, sub_total - actualDiscount + shipping_fee);

    // ── 3. Resolve delivery address ───────────────────────────────────────────
    const user = await UserModel.findById(userId).session(session);
    appAssert(user, NOT_FOUND, 'Không tìm thấy người dùng');

    // Use explicitly provided address, or fall back to user's default
    const resolvedAddress = delivery_address ?? user.addresses.find((a) => a.isDefault);
    appAssert(resolvedAddress, BAD_REQUEST, 'Không tìm thấy địa chỉ giao hàng. Vui lòng thêm địa chỉ mặc định.');

    // Keep client's shipping fee and bypass server calculation/validation as requested
    const rawNote = input.note?.trim() || undefined;
    const staffNoteItems = rawNote ? await parseOrderNoteForStaff(rawNote) : [];

    // ── 4. Create the order ───────────────────────────────────────────────────
    const [order] = await OrderModel.create(
      [
        {
          user_id: userId,
          payment: {
            method: payment_method ?? PaymentMethod.CASH_ON_DELIVERY,
            paid_at: null,
          },
          items: resolvedItems,
          voucher: voucherObjectId ?? null,
          sub_total,
          shipping_fee,
          total_price,
          note: rawNote,
          staff_note_items: staffNoteItems,
          delivery_address: {
            label: resolvedAddress.label,
            receiver_name: resolvedAddress.receiver_name,
            phone: resolvedAddress.phone,
            detail: resolvedAddress.detail,
            district: resolvedAddress.district,
            city: resolvedAddress.city,
          },
          delivery_info: {
            provider_id: null,
            driver_id: null,
            shipped_at: null,
            delivered_at: null,
          },
        },
      ],
      { session }
    );

    // ── 5a. FSS-40: Soft health scan (best-effort, does NOT block order) ────
    let allergyWarnings: { productName: string; conflictIngredients: string[]; level: string }[] = [];
    try {
      allergyWarnings = await checkOrderHealthConflicts(resolvedItems, user.preferences, session);
      if (allergyWarnings.length > 0) {
        console.warn(`[FSS-40] Health conflict detected in order for user ${user.email}:`, allergyWarnings);
      }
    } catch (e) {
      console.error('[FSS-40] Health check failed (non-blocking):', e);
    }

    // ── 5b. Handle PayOS if Bank Transfer ─────────────────────────────────────
    if (payment_method === PaymentMethod.BANK_TRANSFER) {
      console.log('💳 Handling PayOS payment for order:', order.code);
      const numericOrderCode = Date.now();
      console.log('🔢 Generated numeric order code:', numericOrderCode);

      const returnUrl = return_url || `${APP_ORIGIN}/success?code=${order.code}`;
      const cancelUrl = cancel_url || `${APP_ORIGIN}/failed?reason=cancel&orderCode=${numericOrderCode}`;

      // Update order with numeric code for PayOS mapping
      order.payment.payos_order_code = numericOrderCode;
      await order.save({ session });
      console.log('✅ Order updated with PayOS numeric code');

      try {
        const paymentLink = await createPaymentLink(
          numericOrderCode,
          order.total_price,
          `Thanh toan ${order.code}`,
          returnUrl,
          cancelUrl
        );
        console.log('🔗 PayOS link created:', paymentLink.checkoutUrl);

        return {
          ...order.toObject(),
          checkoutUrl: paymentLink.checkoutUrl,
          allergyWarnings,
        };
      } catch (payosError) {
        console.error('❌ PayOS link creation failed:', payosError);
        throw payosError;
      }
    }

    console.log('✅ COD order placed successfully');
    return { ...order.toObject(), allergyWarnings };
  });
};

/**
 * Get orders for the logged-in user
 */
export const getUserOrders = async (userId: mongoose.Types.ObjectId) => {
  return OrderModel.find({ user_id: userId })
    .sort({ createdAt: -1 })
    .populate({
      path: 'items.product_id',
      select: 'name image price',
      populate: { path: 'image', select: 'secure_url' },
    });
};

/**
 * Get all orders (for Admin/Staff)
 */
export const getOrders = async (query: any = {}) => {
  const { limit, page, status, driver_id, ...rest } = query;
  const filter: Record<string, any> = { ...rest };

  // status param can be a comma-separated list, e.g. "pending,confirmed"
  if (status && typeof status === 'string') {
    const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
    filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
  }

  if (driver_id && typeof driver_id === 'string') {
    filter['delivery_info.driver_id'] = driver_id;
  }

  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 1000));
  const safePage = Math.max(1, Number(page) || 1);
  const skip = (safePage - 1) * safeLimit;

  return OrderModel.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(safeLimit)
    .populate('user_id', 'username email phone')
    .populate({
      path: 'items.product_id',
      select: 'name image price',
      populate: { path: 'image', select: 'secure_url' },
    });
};

  /**
   * Get order detail by ID or Code
   */
  export const getOrderById = async (idOrCode: string) => {
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrCode);
    const isNumeric = !isNaN(Number(idOrCode));

    const query = isObjectId
      ? { _id: idOrCode }
      : isNumeric
        ? { $or: [{ code: idOrCode }, { 'payment.payos_order_code': Number(idOrCode) }] }
        : { code: idOrCode };

    const order = await OrderModel.findOne(query)
      .populate('user_id', 'username email phone')
      .populate({
        path: 'items.product_id',
        select: 'name image price',
        populate: { path: 'image', select: 'secure_url' },
      });

    appAssert(order, NOT_FOUND, 'Không tìm thấy đơn hàng');
    return order;
  };

  /**
   * Update order status
   */
  const VALID_TRANSITIONS: Record<string, string[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.READY_FOR_DELIVERY, OrderStatus.CANCELLED],
    [OrderStatus.PROCESSING]: [OrderStatus.READY_FOR_DELIVERY],
    [OrderStatus.READY_FOR_DELIVERY]: [OrderStatus.SHIPPING],
    [OrderStatus.COMPLETED]: [OrderStatus.COMPLETED],
    [OrderStatus.SHIPPING]: [],
    [OrderStatus.CANCELLED]: [],
  };

  export const updateOrderStatus = async (idOrCode: string, status: string) => {
    const order = await getOrderById(idOrCode);

    // Basic guard: once completed or cancelled, cannot change status further?
    // Depends on business logic, but usually yes.
    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      appAssert(false, BAD_REQUEST, 'Không thể thay đổi trạng thái đơn hàng đã hoàn thành hoặc đã hủy');
    }

    const validNext = VALID_TRANSITIONS[order.status] ?? [];
    appAssert(validNext.includes(status), BAD_REQUEST, `Không thể chuyển trạng thái từ "${order.status}" sang "${status}"`);

    order.status = status as any;
    await order.save();

    // Award points (1 point per 1000 VND)
    if (status === OrderStatus.COMPLETED) {
      const pointsAwarded = Math.floor(order.total_price / 1000);
      if (pointsAwarded > 0) {
        membershipService.addPoints(
          order.user_id as any,
          pointsAwarded,
          PointTransactionType.EARN,
          `Điểm tích lũy từ đơn hàng #${order.code}`,
          order._id as any
        ).catch((err) => console.error('Failed to award points:', err));
      }
      scheduleAiModelRetrain(`order #${order.code} completed (status update)`);
    }

    await createOrderStatusNotification({
      user_id: order.user_id._id ? order.user_id._id : order.user_id,
      orderCode: order.code,
      status,
    });

    return order;
  };

  /**
   * Handle confirmation of payment (webhook)
   */
  export const confirmPayment = async (orderCode: number) => {
    const order = await OrderModel.findOne({ 'payment.payos_order_code': orderCode });
    appAssert(order, NOT_FOUND, 'Không tìm thấy đơn hàng tương ứng với mã thanh toán');

    if (order.status === OrderStatus.PENDING) {
      order.status = OrderStatus.CONFIRMED;
      order.payment.paid_at = new Date();
      await order.save();

      await createOrderStatusNotification({
        user_id: order.user_id,
        orderCode: order.code,
        status: OrderStatus.CONFIRMED,
      });
    }

    return order;
  };

  /**
   * Handle cancellation of payment (return from PayOS cancelUrl)
   * Best-effort: only cancel if order is still pending and unpaid.
   */
  export const cancelPayosPayment = async (orderCode: number) => {
    const order = await OrderModel.findOne({ 'payment.payos_order_code': orderCode });
    appAssert(order, NOT_FOUND, 'Không tìm thấy đơn hàng tương ứng với mã thanh toán');

    const isUnpaid = !order.payment?.paid_at;
    if (order.status === OrderStatus.PENDING && isUnpaid) {
      order.status = OrderStatus.CANCELLED;
      await order.save();
    }

    return order;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Staff actions
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Staff confirms order: PENDING → CONFIRMED (bắt đầu chế biến)
   */
  export const confirmOrder = async (orderId: string, staffId: mongoose.Types.ObjectId) => {
    const order = await getOrderById(orderId);
    appAssert(order.status === OrderStatus.PENDING, BAD_REQUEST, 'Chỉ có thể xác nhận đơn hàng đang ở trạng thái chờ xử lý');

    order.status = OrderStatus.CONFIRMED;
    await order.save();

    // Notify customer (best-effort)
    NotificationModel.create({
      user_id: order.user_id.toString(),
      title: 'Đơn hàng đã được xác nhận',
      body: `Đơn hàng #${order.code} đã được nhà hàng nhận và đang chuẩn bị.`,
      type: 'order_confirmed',
    }).catch(() => { });

    // Audit log (best-effort)
    createAuditLog({
      actor_user_id: staffId,
      entity_type: AuditEntityType.ORDER,
      action: AuditLogAction.UPDATE,
      old_data: { status: OrderStatus.PENDING },
      new_data: { status: OrderStatus.CONFIRMED },
    }).catch(() => { });

    return order;
  };

  /**
   * Staff rejects order: PENDING → CANCELLED (ghi lý do + flag hoàn tiền)
   */
  export const rejectOrder = async (
    orderId: string,
    staffId: mongoose.Types.ObjectId,
    reason: string
  ) => {
    const order = await getOrderById(orderId);
    appAssert(order.status === OrderStatus.PENDING, BAD_REQUEST, 'Chỉ có thể từ chối đơn hàng đang ở trạng thái chờ xử lý');

    const refundRequired =
      order.payment.method !== PaymentMethod.CASH_ON_DELIVERY &&
      order.payment.paid_at !== null;

    order.status = OrderStatus.CANCELLED;
    (order as any).cancellation = {
      reason,
      cancelled_by: 'staff',
      refund_required: refundRequired,
      refunded_at: null,
    };
    await order.save();

    // Notify customer (best-effort)
    NotificationModel.create({
      user_id: order.user_id.toString(),
      title: 'Đơn hàng bị từ chối',
      body: `Đơn hàng #${order.code} đã bị từ chối. Lý do: ${reason}.`,
      type: 'order_rejected',
    }).catch(() => { });

    // Audit log (best-effort)
    createAuditLog({
      actor_user_id: staffId,
      entity_type: AuditEntityType.ORDER,
      action: AuditLogAction.UPDATE,
      old_data: { status: OrderStatus.PENDING },
      new_data: { status: OrderStatus.CANCELLED, cancellation: { reason, cancelled_by: 'staff', refund_required: refundRequired } },
    }).catch(() => { });

    return order;
  };

  /**
   * Staff marks order ready: CONFIRMED/PROCESSING → READY_FOR_DELIVERY
   */
  export const markOrderReady = async (orderId: string, staffId: mongoose.Types.ObjectId) => {
    const order = await getOrderById(orderId);
    appAssert(
      order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PROCESSING,
      BAD_REQUEST,
      'Chỉ có thể đánh dấu hoàn thành cho đơn hàng đang được chế biến'
    );

    const prevStatus = order.status;
    order.status = OrderStatus.READY_FOR_DELIVERY;
    await order.save();

    // Audit log (best-effort)
    createAuditLog({
      actor_user_id: staffId,
      entity_type: AuditEntityType.ORDER,
      action: AuditLogAction.UPDATE,
      old_data: { status: prevStatus },
      new_data: { status: OrderStatus.READY_FOR_DELIVERY },
    }).catch(() => { });

    return order;
  };

  /**
   * Staff starts delivery: READY_FOR_DELIVERY → SHIPPING
   */
  export const assignDelivery = async (orderId: string, staffId: mongoose.Types.ObjectId) => {
    const order = await getOrderById(orderId);
    appAssert(
      order.status === OrderStatus.READY_FOR_DELIVERY,
      BAD_REQUEST,
      'Chỉ có thể giao đơn hàng đang ở trạng thái chờ đi giao'
    );

    const prevStatus = order.status;
    order.status = OrderStatus.SHIPPING;
    order.delivery_info.driver_id = staffId;
    order.delivery_info.shipped_at = new Date();
    await order.save();

    createAuditLog({
      actor_user_id: staffId,
      entity_type: AuditEntityType.ORDER,
      action: AuditLogAction.UPDATE,
      old_data: { status: prevStatus },
      new_data: { status: OrderStatus.SHIPPING, driver_id: staffId },
    }).catch(() => { });

    return order;
  };

  /**
   * Staff completes delivery: SHIPPING → COMPLETED
   */
  export const completeDelivery = async (orderId: string, staffId: mongoose.Types.ObjectId) => {
    const order = await getOrderById(orderId);
    appAssert(
      order.status === OrderStatus.SHIPPING,
      BAD_REQUEST,
      'Chỉ có thể hoàn thành đơn hàng đang được giao'
    );
    appAssert(
      order.delivery_info.driver_id?.toString() === staffId.toString(),
      BAD_REQUEST,
      'Bạn không phải là người giao đơn hàng này'
    );

    const prevStatus = order.status;
    order.status = OrderStatus.COMPLETED;
    order.delivery_info.delivered_at = new Date();

    // If COD, mark as paid when delivered successfully
    if (order.payment.method === PaymentMethod.CASH_ON_DELIVERY && !order.payment.paid_at) {
      order.payment.paid_at = new Date();
    }

    await order.save();

    // Award points
    const pointsAwarded = Math.floor(order.total_price / 1000);
    if (pointsAwarded > 0) {
      membershipService.addPoints(
        order.user_id as any,
        pointsAwarded,
        PointTransactionType.EARN,
        `Điểm tích lũy từ đơn hàng #${order.code}`,
        order._id as any
      ).catch((err) => console.error('Failed to award points:', err));
    }

    scheduleAiModelRetrain(`order #${order.code} completed (delivery)`);

    createAuditLog({
      actor_user_id: staffId,
      entity_type: AuditEntityType.ORDER,
      action: AuditLogAction.UPDATE,
      old_data: { status: prevStatus },
      new_data: { status: OrderStatus.COMPLETED, delivered_at: order.delivery_info.delivered_at },
    }).catch(() => { });

    return order;
  };

  export const getWeeklyRevenue = async () => {
    const revenue = await OrderModel.aggregate([
      {
        $match: {
          status: OrderStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          revenue: { $sum: '$total_price' },
          orders: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const fullWeek = [
      { _id: 2, day: 'T2', revenue: 0, orders: 0 },
      { _id: 3, day: 'T3', revenue: 0, orders: 0 },
      { _id: 4, day: 'T4', revenue: 0, orders: 0 },
      { _id: 5, day: 'T5', revenue: 0, orders: 0 },
      { _id: 6, day: 'T6', revenue: 0, orders: 0 },
      { _id: 7, day: 'T7', revenue: 0, orders: 0 },
      { _id: 1, day: 'CN', revenue: 0, orders: 0 },
    ];

    const merged = fullWeek.map((dayItem) => {
      const found = revenue.find((item) => item._id === dayItem._id);
      return found
        ? {
          ...dayItem,
          revenue: found.revenue,
          orders: found.orders,
        }
        : dayItem;
    });

    return merged;
  };
  export const getDashboardStats = async () => {
    const stats = await OrderModel.aggregate([
      {
        $match: {
          status: OrderStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total_price' },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const totalCustomers = await UserModel.countDocuments({ role: 'CUSTOMER' });
    const totalProducts = await ProductModel.countDocuments();

    return {
      totalRevenue: stats[0]?.totalRevenue || 0,
      totalOrders: stats[0]?.totalOrders || 0,
      totalCustomers,
      totalProducts,
    };
  };
  export const getRecentOrders = async () => {
    return OrderModel.find().sort({ createdAt: -1 }).limit(5).populate('user_id', 'username email phone');
  };
