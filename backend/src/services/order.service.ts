import { BAD_REQUEST, FORBIDDEN, NOT_FOUND } from '@/constants/http';
import {
  CartModel,
  OrderModel,
  ProductModel,
  UserModel,
  NotificationModel,
  SettingsModel,
  ReviewModel,
  StoreModel,
  CampaignModel,
  UserVoucherModel,
} from '@/models';
import { CampaignStatus } from '@/types/campaign.type';
import { DiscountType } from '@/types/voucher.type';
import appAssert from '@/utils/app-assert';
import withTransaction from '@/utils/with-transaction';
import { validateVoucher } from './voucher.service';
import { TPlaceOrderValidator } from '@/validators/order.validator';
import mongoose from 'mongoose';
import { PaymentMethod, OrderStatus } from '@/types/order.type';
import { createPaymentLink } from './payos.service';
import { APP_ORIGIN } from '@/constants/env';
import { parseOrderNoteForStaff } from './ai.service';
import { createAuditLog } from './audit-log.service';
import { AuditEntityType, AuditLogAction, NotificationType, Role, UserVoucherStatus } from '@/types';
import * as membershipService from './membership.service';
import { PointTransactionType } from '@/types/point-transaction.type';
import { createOrderStatusNotification } from './notification.service';
import { scheduleAiModelRetrain } from './ai-retrain.service';
import { attachSharedToppingVariants } from './shared-topping.service';

const INNER_WARDS = [
  'Hải Châu I',
  'Hải Châu II',
  'Thạch Thang',
  'Thanh Bình',
  'Thuận Phước',
  'Hòa Thuận Đông',
  'Hòa Thuận Tây',
  'Nam Dương',
  'Phước Ninh',
  'Bình Hiên',
  'Bình Thuận',
  'Hòa Cường Bắc',
  'Hòa Cường Nam',
  'Hải Châu',
  'Hòa Cường',

  'Vĩnh Trung',
  'Tân Chính',
  'Thạc Gián',
  'Chính Gián',
  'Tam Thuận',
  'Xuân Hà',
  'An Khê',
  'Hòa Khê',
  'Thanh Khê Đông',
  'Thanh Khê Tây',
  'Thanh Khê',

  'An Hải Bắc',
  'An Hải Tây',
  'An Hải Đông',
  'Phước Mỹ',
  'Nại Hiên Đông',
  'Mân Thái',
  'Thọ Quang',
  'Sơn Trà',
  'An Hải',

  'Mỹ An',
  'Khuê Mỹ',
  'Hòa Hải',
  'Hòa Quý',
  'Ngũ Hành Sơn',

  'Khuê Trung',
  'Hòa Thọ Đông',
  'Hòa An',
  'Hòa Phát',
  'Cẩm Lệ',
];

const OUTER_WARDS = [
  'Hòa Thọ Tây',
  'Hòa Xuân',
  'Hòa Minh',
  'Hòa Khánh Nam',
  'Hòa Khánh Bắc',
  'Hòa Hiệp Nam',
  'Hòa Hiệp Bắc',
  'Liên Chiểu',
  'Hòa Khánh',
  'Hải Vân',
];

const DELIVERABLE_CITY = 'Đà Nẵng';

const DEFAULT_BASE_FEE = 15_000;
const DEFAULT_FEE_PER_KM = 5_000;
const DEFAULT_FREE_THRESHOLD = 300_000;

const WARD_CENTROIDS: Record<string, [number, number]> = {
  // --- Hải Châu ---
  'Hải Châu I': [108.221, 16.066],
  'Hải Châu II': [108.217, 16.062],
  'Thạch Thang': [108.216, 16.073],
  'Thanh Bình': [108.211, 16.075],
  'Thuận Phước': [108.215, 16.085],
  'Hòa Thuận Đông': [108.219, 16.048],
  'Hòa Thuận Tây': [108.203, 16.046],
  'Nam Dương': [108.217, 16.059],
  'Phước Ninh': [108.22, 16.058],
  'Bình Hiên': [108.219, 16.055],
  'Bình Thuận': [108.218, 16.051],
  'Hòa Cường Bắc': [108.218, 16.037],
  'Hòa Cường Nam': [108.219, 16.026],
  'Hải Châu': [108.22, 16.06],
  'Hòa Cường': [108.22, 16.03],

  // --- Thanh Khê ---
  'Vĩnh Trung': [108.211, 16.06],
  'Tân Chính': [108.21, 16.066],
  'Thạc Gián': [108.208, 16.058],
  'Chính Gián': [108.2, 16.061],
  'Tam Thuận': [108.204, 16.071],
  'Xuân Hà': [108.196, 16.067],
  'An Khê': [108.172, 16.054],
  'Hòa Khê': [108.181, 16.056],
  'Thanh Khê Đông': [108.183, 16.068],
  'Thanh Khê Tây': [108.17, 16.066],
  'Thanh Khê': [108.18, 16.06],

  // --- Sơn Trà ---
  'An Hải Bắc': [108.237, 16.069],
  'An Hải Tây': [108.229, 16.061],
  'An Hải Đông': [108.236, 16.058],
  'Phước Mỹ': [108.243, 16.059],
  'Nại Hiên Đông': [108.234, 16.088],
  'Mân Thái': [108.244, 16.076],
  'Thọ Quang': [108.258, 16.104],
  'Sơn Trà': [108.24, 16.07],
  'An Hải': [108.23, 16.06],

  // --- Ngũ Hành Sơn ---
  'Mỹ An': [108.245, 16.045],
  'Khuê Mỹ': [108.248, 16.023],
  'Hòa Hải': [108.26, 15.985],
  'Hòa Quý': [108.232, 15.98],
  'Ngũ Hành Sơn': [108.25, 16.01],

  // --- Cẩm Lệ ---
  'Khuê Trung': [108.211, 16.022],
  'Hòa Thọ Đông': [108.199, 16.014],
  'Hòa Thọ Tây': [108.167, 16.009],
  'Hòa An': [108.176, 16.033],
  'Hòa Phát': [108.182, 16.023],
  'Hòa Xuân': [108.218, 15.992],
  'Cẩm Lệ': [108.21, 16.01],

  // --- Liên Chiểu ---
  'Hòa Minh': [108.174, 16.071],
  'Hòa Khánh Nam': [108.148, 16.06],
  'Hòa Khánh Bắc': [108.15, 16.081],
  'Hòa Hiệp Nam': [108.139, 16.096],
  'Hòa Hiệp Bắc': [108.118, 16.143],
  'Liên Chiểu': [108.16, 16.08],
  'Hòa Khánh': [108.15, 16.08],
  'Hải Vân': [108.13, 16.18],
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getWardCentroid = (wardName: string): [number, number] | null => {
  const normalized = wardName.trim().toLowerCase();
  for (const [key, coords] of Object.entries(WARD_CENTROIDS)) {
    if (key.toLowerCase() === normalized) {
      return coords;
    }
  }
  return null;
};

export async function calculateShippingFee(
  ward: string,
  city: string,
  subtotal: number,
  storeId?: string
): Promise<{ fee: number; blocked: boolean; reason?: string; distance?: number }> {
  const normalCity = city.trim();
  const normalWard = ward.trim();

  if (normalCity.toLowerCase() !== DELIVERABLE_CITY.toLowerCase()) {
    return { fee: 0, blocked: true, reason: 'Hiện tại chỉ giao hàng trong khu vực Đà Nẵng' };
  }

  const isInner = INNER_WARDS.some((w) => w.toLowerCase() === normalWard.toLowerCase());
  const isOuter = OUTER_WARDS.some((w) => w.toLowerCase() === normalWard.toLowerCase());

  if (!isInner && !isOuter) {
    return { fee: 0, blocked: true, reason: `Phường/Xã "${normalWard}" nằm ngoài vùng giao hàng` };
  }

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
  } catch (_) {}

  // Determine distance
  let distance = isInner ? 2.0 : 5.0; // fallback defaults
  if (storeId) {
    try {
      const store = await StoreModel.findById(storeId).lean();
      if (store && store.location && store.location.coordinates && store.location.coordinates.length === 2) {
        const wardCentroid = getWardCentroid(normalWard);
        if (wardCentroid) {
          const storeLng = store.location.coordinates[0];
          const storeLat = store.location.coordinates[1];
          const wardLng = wardCentroid[0];
          const wardLat = wardCentroid[1];
          const rawDistance = calculateDistance(storeLat, storeLng, wardLat, wardLng);
          // Round to 1 decimal place (e.g. 2.4 km)
          distance = Math.round(rawDistance * 10) / 10;
        }
      }
    } catch (_) {}
  }

  if (freeDeliveryEnabled && subtotal >= freeDeliveryThreshold) return { fee: 0, blocked: false, distance };

  const fee = Math.round(baseDeliveryFee + feePerKm * distance);
  return { fee, blocked: false, distance };
}

interface ResolvedItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  variations: { name: string; choice: string; extraPrice: number }[];
  subTotal: number;
}

const resolveOrderItems = async (
  rawItems: TPlaceOrderValidator['items'],
  session: mongoose.ClientSession
): Promise<{ resolvedItems: ResolvedItem[]; subTotal: number }> => {
  let subTotal = 0;
  const resolvedItems: ResolvedItem[] = [];

  for (const item of rawItems) {
    const productDoc = await ProductModel.findById(item.productId).session(session);
    const product = await attachSharedToppingVariants(productDoc?.toObject() as any);

    appAssert(product, NOT_FOUND, `Không tìm thấy sản phẩm với id: ${item.productId}`);
    appAssert(product.isAvailable, BAD_REQUEST, `Sản phẩm "${product.name}" hiện không có sẵn`);

    const normalizedVariations = [];
    if (item.variations && item.variations.length > 0) {
      const { VariationModel, VariationOptionModel } = await import('@/models/variation.model');
      for (const selected of item.variations) {
        // Find Variation by name that is referenced in product.variationIds
        const variation = await VariationModel.findOne({
          _id: { $in: product.variationIds },
          name: selected.name,
        }).session(session);

        appAssert(variation, BAD_REQUEST, `Biến thể "${selected.name}" không tồn tại trong sản phẩm "${product.name}"`);

        // Find VariationOption under that variation
        const matchedOption = await VariationOptionModel.findOne({
          variationId: variation._id,
          name: selected.choice,
          isAvailable: true,
        }).session(session);

        appAssert(
          matchedOption,
          BAD_REQUEST,
          `Lựa chọn "${selected.choice}" không hợp lệ cho biến thể "${selected.name}"`
        );

        normalizedVariations.push({
          name: selected.name,
          choice: selected.choice,
          extraPrice: matchedOption.extraPrice ?? 0,
        });
      }
    }

    const variationExtraPerUnit = normalizedVariations.reduce((sum, variation) => sum + (variation.extraPrice ?? 0), 0);

    // Apply active approved campaign discount if available
    let basePrice = product.price;
    const now = new Date();
    const activeCampaign = await CampaignModel.findOne({
      'products.productId': product._id,
      status: CampaignStatus.APPROVED,
      startTime: { $lte: now },
      endTime: { $gte: now },
    })
      .session(session)
      .lean();

    if (activeCampaign) {
      const rule = activeCampaign.products.find((p) => p.productId.toString() === product._id.toString());
      if (rule?.fixedPrice != null) {
        basePrice = rule.fixedPrice;
      } else if (rule?.discount != null) {
        basePrice = product.price * (1 - rule.discount / 100);
      }
    }

    const unitPrice = basePrice + variationExtraPerUnit;
    const itemSubTotal = unitPrice * item.quantity;

    subTotal += itemSubTotal;

    resolvedItems.push({
      productId: new mongoose.Types.ObjectId(item.productId),
      name: product.name,
      quantity: item.quantity,
      variations: normalizedVariations,
      subTotal: itemSubTotal,
    });
  }

  return { resolvedItems, subTotal };
};

import { buildForbiddenKeywordSet, fuzzyMatch } from '@/utils/health-filter';

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
    const product = await ProductModel.findById(item.productId).session(session).lean();
    if (!product) continue;

    const conflictIngredients: string[] = [];
    const recipe: { name: string }[] = (product as any).recipe ?? [];
    const tagList: string[] = [...((product as any).tags ?? []), ...((product as any).healthTags ?? [])];

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

export const placeOrder = async (userId: mongoose.Types.ObjectId, input: TPlaceOrderValidator) => {
  const { voucher: voucherInput, paymentMethod, items, deliveryAddress, returnUrl, cancelUrl } = input;

  return withTransaction(async (session) => {
    const { resolvedItems, subTotal } = await resolveOrderItems(items, session);

    const user = await UserModel.findById(userId).session(session);
    appAssert(user, NOT_FOUND, 'Không tìm thấy người dùng');

    const resolvedAddress = deliveryAddress ?? user.addresses.find((a: any) => a.isDefault);

    appAssert(resolvedAddress, BAD_REQUEST, 'Không tìm thấy địa chỉ giao hàng. Vui lòng thêm địa chỉ mặc định.');

    /**
     * Phải tính phí ship trước.
     * Vì voucher FREESHIP cần actualShippingFee để giảm đúng tiền ship.
     */
    const shippingCalc = await calculateShippingFee(
      resolvedAddress.ward,
      resolvedAddress.city,
      subTotal,
      input.storeId
    );

    appAssert(!shippingCalc.blocked, BAD_REQUEST, shippingCalc.reason || 'Địa chỉ nằm ngoài vùng giao hàng');

    const actualShippingFee = shippingCalc.fee;

    let actualDiscount = 0;
    let voucherObjectId: mongoose.Types.ObjectId | undefined;

    if (voucherInput) {
      let voucherCode = String(voucherInput);

      /**
       * Hỗ trợ cả 2 case:
       * - FE gửi voucherId
       * - FE gửi voucher code
       */
      if (mongoose.Types.ObjectId.isValid(String(voucherInput))) {
        const foundVoucher = await mongoose.model('Voucher').findById(voucherInput).session(session);

        appAssert(foundVoucher, NOT_FOUND, 'Không tìm thấy voucher');

        voucherCode = foundVoucher.code as string;
      }

      const { voucher, discountAmount } = await validateVoucher(voucherCode, subTotal, {
        userId: userId.toString(),
        shippingFee: actualShippingFee,
        deliveryFee: actualShippingFee,
      });

      actualDiscount = discountAmount;
      voucherObjectId = voucher._id as mongoose.Types.ObjectId;

      await mongoose.model('Voucher').findByIdAndUpdate(voucherObjectId, { $inc: { usedCount: 1 } }, { session });
      await UserVoucherModel.findOneAndUpdate(
        {
          userId,
          voucherId: voucherObjectId,
          status: UserVoucherStatus.AVAILABLE,
        },
        {
          $set: {
            status: UserVoucherStatus.USED,
            usedAt: new Date(),
          },
          $inc: { usageCount: 1 },
        },
        { session }
      );
    }

    const totalPrice = Math.max(0, subTotal + actualShippingFee - actualDiscount);

    const rawNote = input.note?.trim() || undefined;
    const staffNoteItems = rawNote ? await parseOrderNoteForStaff(rawNote) : [];

    const [order] = await OrderModel.create(
      [
        {
          storeId: input.storeId
            ? new mongoose.Types.ObjectId(input.storeId)
            : new mongoose.Types.ObjectId('60c72b2f9b1d8b2a3c8b4567'),

          cusId: userId,
          payment: {
            method: paymentMethod ?? PaymentMethod.CASH,
            paidAt: null,
          },
          paidAt: null,
          items: resolvedItems,
          voucherId: voucherObjectId ?? null,
          subTotal,
          shippingFee: actualShippingFee,
          discountAmount: actualDiscount,
          totalPrice,
          note: rawNote,
          staffNoteItems,
          deliveryAddress: {
            label: resolvedAddress.label,
            receiverName: resolvedAddress.receiverName,
            phone: resolvedAddress.phone,
            detail: resolvedAddress.detail,
            ward: resolvedAddress.ward,
            district: resolvedAddress.district,
            city: resolvedAddress.city,
          },
          deliveryInfo: {
            provider: null,
            driverName: null,
            driverPhone: null,
            providerId: null,
            driverId: null,
            shippedAt: null,
            deliveredAt: null,
          },
          paymentMethod: paymentMethod ?? PaymentMethod.CASH,
          paid: false,
        },
      ],
      { session }
    );

    let allergyWarnings: {
      productName: string;
      conflictIngredients: string[];
      level: string;
    }[] = [];

    try {
      allergyWarnings = await checkOrderHealthConflicts(resolvedItems, user.preferences, session);
      if (allergyWarnings.length > 0) {
        console.warn(`[FSS-40] Health conflict detected in order for user ${user.email}:`, allergyWarnings);
      }
    } catch (e) {
      console.error('[FSS-40] Health check failed (non-blocking):', e);
    }

    if (paymentMethod === PaymentMethod.BANK_TRANSFER) {
      console.log('💳 Handling PayOS payment for order:', order.code);

      const numericOrderCode = Date.now() * 1000 + Math.floor(Math.random() * 1000);
      console.log('🔢 Generated collision-resistant numeric order code:', numericOrderCode);

      const rUrl = returnUrl || `${APP_ORIGIN}/success?code=${order.code}`;
      const cUrl = cancelUrl || `${APP_ORIGIN}/failed?reason=cancel&orderCode=${numericOrderCode}`;

      order.payment.payosOrderCode = numericOrderCode;
      await order.save({ session });
      console.log('✅ Order updated with PayOS numeric code');

      try {
        const paymentLink = await createPaymentLink(
          numericOrderCode,
          order.totalPrice,
          `Thanh toan ${order.code}`,
          rUrl,
          cUrl
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

    return {
      ...order.toObject(),
      allergyWarnings,
    };
  });
};

export const getUserOrders = async (userId: mongoose.Types.ObjectId) => {
  const orders = await OrderModel.find({ cusId: userId })
    .sort({ createdAt: -1 })
    .populate({
      path: 'items.productId',
      select: 'name image price',
    })
    .lean();

  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o._id);
  const reviews = await ReviewModel.find({
    orderId: { $in: orderIds },
    userId,
  })
    .select('orderId')
    .lean();

  const reviewedOrderIds = new Set(reviews.map((r) => r.orderId.toString()));

  return orders.map((order) => ({
    ...order,
    isReviewed: reviewedOrderIds.has(order._id.toString()),
  }));
};

export const getOrders = async (query: any = {}) => {
  const { limit, page, status, driverId, ...rest } = query;
  const filter: Record<string, any> = { ...rest };

  if (status && typeof status === 'string') {
    const statuses = status
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
  }

  if (driverId && typeof driverId === 'string') {
    filter['deliveryInfo.driverId'] = driverId;
  }

  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 1000));
  const safePage = Math.max(1, Number(page) || 1);
  const skip = (safePage - 1) * safeLimit;

  return OrderModel.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(safeLimit)
    .populate('cusId', 'username fullName email phone')
    .populate({
      path: 'items.productId',
      select: 'name image price',
    });
};

export const getOrderById = async (idOrCode: string) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(idOrCode);
  const isNumeric = !isNaN(Number(idOrCode));

  const query = isObjectId
    ? { _id: idOrCode }
    : isNumeric
      ? { $or: [{ code: idOrCode }, { 'payment.payosOrderCode': Number(idOrCode) }] }
      : { code: idOrCode };

  const order = await OrderModel.findOne(query).populate('cusId', 'username fullName email phone').populate({
    path: 'items.productId',
    select: 'name image price',
  });

  appAssert(order, NOT_FOUND, 'Không tìm thấy đơn hàng');
  return order;
};

export const getOrderByIdForRequester = async (
  idOrCode: string,
  requesterId: mongoose.Types.ObjectId,
  requesterRole: Role
) => {
  const order = await getOrderById(idOrCode);

  if (requesterRole.toLowerCase() === Role.CUSTOMER) {
    const customerId = (order.cusId as any)._id ?? order.cusId;
    appAssert(customerId.toString() === requesterId.toString(), FORBIDDEN, 'Ban khong co quyen xem don hang nay');
  }

  return order;
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [
    OrderStatus.PROCESSING,
    OrderStatus.READY_FOR_DELIVERY,
    OrderStatus.PREPARING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PROCESSING]: [OrderStatus.READY_FOR_DELIVERY, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [
    OrderStatus.DELIVERING,
    OrderStatus.READY_FOR_DELIVERY,
    OrderStatus.SHIPPING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.READY_FOR_DELIVERY]: [OrderStatus.SHIPPING, OrderStatus.DELIVERING, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPING]: [OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERING]: [OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

export const updateOrderStatus = async (idOrCode: string, status: string) => {
  const order = await getOrderById(idOrCode);

  if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
    appAssert(false, BAD_REQUEST, 'Không thể thay đổi trạng thái đơn hàng đã hoàn thành hoặc đã hủy');
  }

  const validNext = VALID_TRANSITIONS[order.status] ?? [];
  appAssert(
    validNext.includes(status),
    BAD_REQUEST,
    `Không thể chuyển trạng thái từ "${order.status}" sang "${status}"`
  );

  order.status = status as any;
  await order.save();

  if (status === OrderStatus.COMPLETED) {
    const pointsAwarded = Math.floor(order.totalPrice / 1000);
    if (pointsAwarded > 0) {
      membershipService
        .addPoints(
          order.cusId as any,
          pointsAwarded,
          PointTransactionType.EARN,
          `Điểm tích lũy từ đơn hàng #${order.code}`,
          order._id as any
        )
        .catch((err) => console.error('Failed to award points:', err));
    }
    scheduleAiModelRetrain(`order #${order.code} completed (status update)`);

    await membershipService
      .qualifyReferralFromCompletedOrder(order._id)
      .catch((err) => console.error('Failed to process referral reward:', err));
  }

  await createOrderStatusNotification({
    userId: (order.cusId as any)._id ? (order.cusId as any)._id : order.cusId,
    orderCode: order.code,
    status,
  });

  return order;
};

export const confirmPayment = async (orderCode: number) => {
  const order = await OrderModel.findOne({ 'payment.payosOrderCode': orderCode });
  appAssert(order, NOT_FOUND, 'Không tìm thấy đơn hàng tương ứng với mã thanh toán');

  if (order.status === OrderStatus.PENDING) {
    order.status = OrderStatus.CONFIRMED;
    order.payment.paidAt = new Date();
    order.paid = true;
    await order.save();

    await createOrderStatusNotification({
      userId: order.cusId,
      orderCode: order.code,
      status: OrderStatus.CONFIRMED,
    });
  }

  return order;
};

export const cancelPayosPayment = async (orderCode: number) => {
  const order = await OrderModel.findOne({ 'payment.payosOrderCode': orderCode });
  appAssert(order, NOT_FOUND, 'Không tìm thấy đơn hàng tương ứng với mã thanh toán');

  const isUnpaid = !order.payment?.paidAt;
  if (order.status === OrderStatus.PENDING && isUnpaid) {
    order.status = OrderStatus.CANCELLED;
    await order.save();
  }

  return order;
};

export const confirmOrder = async (orderId: string, staffId: mongoose.Types.ObjectId) => {
  const order = await getOrderById(orderId);
  appAssert(
    order.status === OrderStatus.PENDING,
    BAD_REQUEST,
    'Chỉ có thể xác nhận đơn hàng đang ở trạng thái chờ xử lý'
  );

  const updatedOrder = await OrderModel.findByIdAndUpdate(
    order._id,
    { $set: { status: OrderStatus.CONFIRMED } },
    { new: true }
  )
    .populate('cusId', 'username fullName email phone')
    .populate({
      path: 'items.productId',
      select: 'name image price',
    });

  appAssert(updatedOrder, NOT_FOUND, 'Không tìm thấy đơn hàng');

  NotificationModel.create({
    userId: ((updatedOrder.cusId as any)._id ?? updatedOrder.cusId).toString(),
    title: 'Đơn hàng đã được xác nhận',
    body: `Đơn hàng #${updatedOrder.code} đã được nhà hàng nhận và đang chuẩn bị.`,
    type: NotificationType.ORDER,
  }).catch(() => {});

  createAuditLog({
    userId: staffId,
    entityType: AuditEntityType.ORDER,
    action: AuditLogAction.UPDATE,
    oldData: { status: OrderStatus.PENDING },
    newData: { status: OrderStatus.CONFIRMED },
  }).catch(() => {});

  return updatedOrder;
};

export const rejectOrder = async (orderId: string, staffId: mongoose.Types.ObjectId, reason: string) => {
  const order = await getOrderById(orderId);
  appAssert(
    order.status === OrderStatus.PENDING,
    BAD_REQUEST,
    'Chỉ có thể từ chối đơn hàng đang ở trạng thái chờ xử lý'
  );

  const refundRequired = order.paymentMethod !== PaymentMethod.CASH && order.payment.paidAt !== null;

  order.status = OrderStatus.CANCELLED;
  order.cancellation = {
    reason,
    cancelledBy: 'staff',
    refundRequired,
    refundedAt: null,
  };
  await order.save();

  NotificationModel.create({
    userId: order.cusId.toString(),
    title: 'Đơn hàng bị từ chối',
    body: `Đơn hàng #${order.code} đã bị từ chối. Lý do: ${reason}.`,
    type: NotificationType.ORDER,
  }).catch(() => {});

  createAuditLog({
    userId: staffId,
    entityType: AuditEntityType.ORDER,
    action: AuditLogAction.UPDATE,
    oldData: { status: OrderStatus.PENDING },
    newData: { status: OrderStatus.CANCELLED, cancellation: { reason, cancelledBy: 'staff', refundRequired } },
  }).catch(() => {});

  return order;
};

export const markOrderReady = async (orderId: string, staffId: mongoose.Types.ObjectId) => {
  const order = await getOrderById(orderId);
  appAssert(
    order.status === OrderStatus.CONFIRMED ||
      order.status === OrderStatus.PREPARING ||
      order.status === OrderStatus.PROCESSING,
    BAD_REQUEST,
    'Chỉ có thể đánh dấu hoàn thành cho đơn hàng đang được chế biến'
  );

  const prevStatus = order.status;
  const updatedOrder = await OrderModel.findByIdAndUpdate(
    order._id,
    { $set: { status: OrderStatus.READY_FOR_DELIVERY } },
    { new: true }
  )
    .populate('cusId', 'username fullName email phone')
    .populate({
      path: 'items.productId',
      select: 'name image price',
    });

  appAssert(updatedOrder, NOT_FOUND, 'Không tìm thấy đơn hàng');

  createAuditLog({
    userId: staffId,
    entityType: AuditEntityType.ORDER,
    action: AuditLogAction.UPDATE,
    oldData: { status: prevStatus },
    newData: { status: OrderStatus.READY_FOR_DELIVERY },
  }).catch(() => {});

  return updatedOrder;
};

export const assignDelivery = async (orderId: string, staffId: mongoose.Types.ObjectId) => {
  const order = await getOrderById(orderId);
  appAssert(
    order.status === OrderStatus.READY_FOR_DELIVERY ||
      order.status === OrderStatus.PREPARING ||
      order.status === OrderStatus.CONFIRMED,
    BAD_REQUEST,
    'Chỉ có thể giao đơn hàng đang ở trạng thái chờ đi giao'
  );

  const prevStatus = order.status;
  const shippedAt = new Date();
  const updatedOrder = await OrderModel.findByIdAndUpdate(
    order._id,
    {
      $set: {
        status: OrderStatus.SHIPPING,
        'deliveryInfo.driverId': staffId,
        'deliveryInfo.shippedAt': shippedAt,
      },
    },
    { new: true }
  )
    .populate('cusId', 'username fullName email phone')
    .populate({
      path: 'items.productId',
      select: 'name image price',
    });

  appAssert(updatedOrder, NOT_FOUND, 'Không tìm thấy đơn hàng');

  createAuditLog({
    userId: staffId,
    entityType: AuditEntityType.ORDER,
    action: AuditLogAction.UPDATE,
    oldData: { status: prevStatus },
    newData: { status: OrderStatus.SHIPPING, driverId: staffId },
  }).catch(() => {});

  return updatedOrder;
};

export const completeDelivery = async (orderId: string, staffId: mongoose.Types.ObjectId) => {
  const order = await getOrderById(orderId);
  appAssert(
    order.status === OrderStatus.SHIPPING || order.status === OrderStatus.DELIVERING,
    BAD_REQUEST,
    'Chỉ có thể đánh dấu đã giao cho đơn hàng đang được vận chuyển'
  );
  appAssert(
    order.deliveryInfo.driverId?.toString() === staffId.toString(),
    BAD_REQUEST,
    'Bạn không phải là người giao đơn hàng này'
  );

  const prevStatus = order.status;
  const deliveredAt = new Date();
  const update: Record<string, any> = {
    status: OrderStatus.DELIVERED,
    'deliveryInfo.deliveredAt': deliveredAt,
  };

  const updatedOrder = await OrderModel.findByIdAndUpdate(order._id, { $set: update }, { new: true })
    .populate('cusId', 'username fullName email phone')
    .populate({
      path: 'items.productId',
      select: 'name image price',
    });

  appAssert(updatedOrder, NOT_FOUND, 'Không tìm thấy đơn hàng');

  createAuditLog({
    userId: staffId,
    entityType: AuditEntityType.ORDER,
    action: AuditLogAction.UPDATE,
    oldData: { status: prevStatus },
    newData: { status: OrderStatus.DELIVERED, deliveredAt },
  }).catch(() => {});

  return updatedOrder;
};

export const completeOrderInternal = async (orderId: string, actorId?: mongoose.Types.ObjectId) => {
  const order = await getOrderById(orderId);
  if (order.status === OrderStatus.COMPLETED) {
    await membershipService
      .qualifyReferralFromCompletedOrder(order._id)
      .catch((err) => console.error('Failed to process referral reward:', err));
    return order;
  }

  const prevStatus = order.status;
  const completedAt = new Date();

  const update: Record<string, any> = {
    status: OrderStatus.COMPLETED,
  };

  if (order.paymentMethod === PaymentMethod.CASH && !order.payment?.paidAt) {
    update['payment.paidAt'] = completedAt;
    update.paidAt = completedAt;
    update.paid = true;
  }

  const updatedOrder = await OrderModel.findByIdAndUpdate(order._id, { $set: update }, { new: true })
    .populate('cusId', 'username fullName email phone')
    .populate({
      path: 'items.productId',
      select: 'name image price',
    });

  appAssert(updatedOrder, NOT_FOUND, 'Không tìm thấy đơn hàng');

  const pointsAwarded = Math.floor(updatedOrder.totalPrice / 1000);
  if (pointsAwarded > 0) {
    membershipService
      .addPoints(
        updatedOrder.cusId as any,
        pointsAwarded,
        PointTransactionType.EARN,
        `Điểm tích lũy từ đơn hàng #${updatedOrder.code}`,
        updatedOrder._id as any
      )
      .catch((err) => console.error('Failed to award points:', err));
  }

  scheduleAiModelRetrain(`order #${updatedOrder.code} completed`);

  await membershipService
    .qualifyReferralFromCompletedOrder(updatedOrder._id)
    .catch((err) => console.error('Failed to process referral reward:', err));

  if (actorId) {
    createAuditLog({
      userId: actorId,
      entityType: AuditEntityType.ORDER,
      action: AuditLogAction.UPDATE,
      oldData: { status: prevStatus },
      newData: { status: OrderStatus.COMPLETED },
    }).catch(() => {});
  } else {
    createAuditLog({
      userId: updatedOrder.cusId as any, // fallback to customer if auto-completed
      entityType: AuditEntityType.ORDER,
      action: AuditLogAction.UPDATE,
      oldData: { status: prevStatus },
      newData: { status: OrderStatus.COMPLETED, note: 'Tự động hoàn thành hệ thống' },
    }).catch(() => {});
  }

  return updatedOrder;
};

export const confirmReceipt = async (orderId: string, userId: mongoose.Types.ObjectId) => {
  const order = await getOrderById(orderId);
  appAssert(order.status === OrderStatus.DELIVERED, BAD_REQUEST, 'Đơn hàng chưa được giao tới bạn');

  const rawCusId = order.cusId as any;
  const cusIdStr = rawCusId?._id ? rawCusId._id.toString() : rawCusId?.toString();
  appAssert(cusIdStr === userId.toString(), BAD_REQUEST, 'Bạn không sở hữu đơn hàng này');

  return completeOrderInternal(order._id.toString(), userId);
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
        revenue: { $sum: '$totalPrice' },
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
        totalRevenue: { $sum: '$totalPrice' },
        totalOrders: { $sum: 1 },
      },
    },
  ]);

  const totalCustomers = await UserModel.countDocuments({ role: Role.CUSTOMER });
  const totalProducts = await ProductModel.countDocuments();

  return {
    totalRevenue: stats[0]?.totalRevenue || 0,
    totalOrders: stats[0]?.totalOrders || 0,
    totalCustomers,
    totalProducts,
  };
};

export const getRecentOrders = async () => {
  return OrderModel.find().sort({ createdAt: -1 }).limit(5).populate('cusId', 'username fullName email phone');
};
