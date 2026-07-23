import mongoose from 'mongoose';
import UserVoucherModel from '@/models/user-voucher.model';
import { CampaignModel } from '@/models/campaign.model';
import { StoreModel, StoreSettingsModel } from '@/models/store.model';
import { ChatIntent } from './chatbot.service';
import { normalizeVietnameseText } from './chat-query-planner.service';

export interface DeterministicChatResponse {
  response: string;
  recommendedProducts?: unknown[];
}

interface DeterministicChatInput {
  intent: ChatIntent;
  message: string;
  userId?: string;
  storeId?: string;
}

const formatVnd = (amount?: number | null) => `${Number(amount || 0).toLocaleString('vi-VN')}đ`;
const emptyRecommendations = (): unknown[] => [];

const getSalePrice = (campaign: any, item: any, basePrice: number) => {
  if (campaign.type === 'fixed_price' && item.fixedPrice != null) return Number(item.fixedPrice);
  if (item.discount != null) return Math.round(basePrice * (1 - Number(item.discount) / 100));
  return null;
};

const isProductActiveAtStore = (product: any, storeId?: string) => {
  if (product?.isAvailable === false) return false;
  if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) return true;

  const availability = Array.isArray(product.storeAvailability) ? product.storeAvailability : [];
  return availability.some((item: any) =>
    item.storeId?.toString() === storeId && item.status === 'active'
  );
};

const isVoucherQuestion = (message: string) =>
  /\b(voucher|ma giam gia|ma khuyen mai|coupon|uu dai cua toi|voucher cua toi)\b/.test(normalizeVietnameseText(message));

const isStoreQuestion = (message: string) =>
  /\b(chi nhanh|cua hang|dia chi|gan nhat|store|branch)\b/.test(normalizeVietnameseText(message));

const getCampaignMatch = (storeId?: string) => {
  const now = new Date();
  const match: any = {
    status: { $in: ['APPROVED', 'approved'] },
    startTime: { $lte: now },
    endTime: { $gte: now },
  };

  if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
    match.$or = [
      { storeIds: { $exists: false } },
      { storeIds: { $size: 0 } },
      { storeIds: new mongoose.Types.ObjectId(storeId) },
    ];
  }

  return match;
};

const listActiveCampaigns = async (storeId?: string) => {
  return CampaignModel.find(getCampaignMatch(storeId))
    .select('name type discount fixedPrice startTime endTime products')
    .sort({ endTime: 1 })
    .limit(5)
    .lean()
    .maxTimeMS(800);
};

const buildCampaignResponse = async (storeId?: string): Promise<DeterministicChatResponse> => {
  const campaigns = await listActiveCampaigns(storeId);
  if (!campaigns.length) {
    return {
      response: 'Hiện tại FOA chưa có chiến dịch khuyến mãi đang chạy. Bạn có thể kiểm tra lại sau hoặc xem voucher trong tài khoản nếu đã đăng nhập nhé.',
      recommendedProducts: emptyRecommendations(),
    };
  }

  const lines = campaigns.map((campaign: any) => {
    const discountText = campaign.fixedPrice
      ? `giá ưu đãi ${formatVnd(campaign.fixedPrice)}`
      : campaign.discount
        ? `giảm ${campaign.discount}%`
        : 'ưu đãi đang áp dụng';
    return `- **${campaign.name}**: ${discountText}, kết thúc ${new Date(campaign.endTime).toLocaleDateString('vi-VN')}`;
  });

  return {
    response: `Các chương trình đang hoạt động:\n${lines.join('\n')}`,
    recommendedProducts: emptyRecommendations(),
  };
};

const buildDiscountedProductsResponse = async (storeId?: string): Promise<DeterministicChatResponse> => {
  const campaigns = await CampaignModel.find(getCampaignMatch(storeId))
    .select('name type startTime endTime products')
    .populate('products.productId', 'name price description image category isAvailable storeAvailability')
    .sort({ endTime: 1 })
    .limit(8)
    .lean()
    .maxTimeMS(900);

  const seenProductIds = new Set<string>();
  const recommendedProducts: unknown[] = [];

  for (const campaign of campaigns) {
    for (const item of campaign.products || []) {
      const product = (item as any).productId;
      if (!product?._id || !isProductActiveAtStore(product, storeId)) continue;

      const productId = product._id.toString();
      if (seenProductIds.has(productId)) continue;

      const originalPrice = Number(product.price || 0);
      const salePrice = getSalePrice(campaign, item, originalPrice);
      if (salePrice == null || salePrice >= originalPrice) continue;

      seenProductIds.add(productId);
      recommendedProducts.push({
        _id: productId,
        name: product.name,
        price: salePrice,
        originalPrice,
        discountPercentage: Math.round(((originalPrice - salePrice) / originalPrice) * 100),
        campaignName: campaign.name,
        campaignEndTime: campaign.endTime,
        image: product.image || '',
        category: product.category,
        description: product.description,
      });

      if (recommendedProducts.length >= 10) break;
    }

    if (recommendedProducts.length >= 10) break;
  }

  if (!recommendedProducts.length) {
    return {
      response: 'Hiện tại mình chưa thấy món nào đang được giảm giá trong hệ thống.',
      recommendedProducts: emptyRecommendations(),
    };
  }

  return {
    response: 'Mình đã tìm thấy các món đang có ưu đãi trong hệ thống. Giá sale và giá gốc được hiển thị trong các thẻ món bên dưới.',
    recommendedProducts,
  };
};

const buildVoucherResponse = async (userId?: string): Promise<DeterministicChatResponse> => {
  if (!userId) {
    return {
      response: 'Bạn cần đăng nhập để mình kiểm tra voucher khả dụng trong tài khoản nhé.',
      recommendedProducts: emptyRecommendations(),
    };
  }

  const vouchers = await UserVoucherModel.find({ userId, status: 'available' })
    .populate('voucherId')
    .sort({ claimedAt: -1 })
    .limit(5)
    .lean()
    .maxTimeMS(800);

  if (!vouchers.length) {
    return {
      response: 'Tài khoản của bạn hiện chưa có voucher khả dụng. Bạn có thể theo dõi mục ưu đãi để nhận thêm mã mới nhé.',
      recommendedProducts: emptyRecommendations(),
    };
  }

  const lines = vouchers.map((uv: any) => {
    const voucher = uv.voucherId || {};
    const discountText = voucher.discountType === 'percentage'
      ? `giảm ${voucher.discountValue}%`
      : `giảm ${formatVnd(voucher.discountValue)}`;
    return `- **${voucher.code || 'VOUCHER'}**: ${discountText}, đơn tối thiểu ${formatVnd(voucher.minOrderValue)}, hết hạn ${voucher.endAt ? new Date(voucher.endAt).toLocaleDateString('vi-VN') : 'không rõ'}`;
  });

  return {
    response: `Voucher khả dụng của bạn:\n${lines.join('\n')}`,
    recommendedProducts: emptyRecommendations(),
  };
};

const buildStoreResponse = async (storeId?: string): Promise<DeterministicChatResponse> => {
  if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
    const [store, settings] = await Promise.all([
      StoreModel.findOne({ _id: storeId, isActive: true }).select('name address district').lean().maxTimeMS(800),
      StoreSettingsModel.findOne({ storeId }).select('openHours isOpen provider').lean().maxTimeMS(800),
    ]);

    if (store) {
      const hours = settings?.openHours ? `${settings.openHours.open} - ${settings.openHours.close}` : '7:00 - 22:00';
      return {
        response: `Chi nhánh **${store.name}** ở ${store.address}, ${store.district}. Giờ hoạt động hiện tại: ${hours}. Trạng thái nhận đơn: ${settings?.isOpen === false ? 'đang tạm đóng' : 'đang mở'}.`,
        recommendedProducts: emptyRecommendations(),
      };
    }
  }

  const stores = await StoreModel.find({ isActive: true })
    .select('name address district')
    .sort({ name: 1 })
    .limit(5)
    .lean()
    .maxTimeMS(800);

  if (!stores.length) {
    return {
      response: 'Hiện tại mình chưa lấy được danh sách chi nhánh đang hoạt động. Bạn vui lòng thử lại sau nhé.',
      recommendedProducts: emptyRecommendations(),
    };
  }

  const lines = stores.map((store) => `- **${store.name}**: ${store.address}, ${store.district}`);
  return {
    response: `Các chi nhánh FOA đang hoạt động:\n${lines.join('\n')}`,
    recommendedProducts: emptyRecommendations(),
  };
};

export const buildDeterministicDomainResponse = async ({
  intent,
  message,
  userId,
  storeId,
}: DeterministicChatInput): Promise<DeterministicChatResponse | null> => {
  if (intent === 'PROMOTION') {
    if (isVoucherQuestion(message)) return buildVoucherResponse(userId);
    return buildCampaignResponse(storeId);
  }

  if (intent === 'DISCOUNTED_PRODUCTS') {
    return buildDiscountedProductsResponse(storeId);
  }

  if (intent === 'STORE_HOURS' || isStoreQuestion(message)) {
    return buildStoreResponse(storeId);
  }

  return null;
};
