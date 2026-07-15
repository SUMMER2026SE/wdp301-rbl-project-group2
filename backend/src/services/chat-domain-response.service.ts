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

const isVoucherQuestion = (message: string) =>
  /\b(voucher|ma giam gia|ma khuyen mai|coupon|uu dai cua toi|voucher cua toi)\b/.test(normalizeVietnameseText(message));

const isStoreQuestion = (message: string) =>
  /\b(chi nhanh|cua hang|dia chi|gan nhat|store|branch)\b/.test(normalizeVietnameseText(message));

const listActiveCampaigns = async () => {
  const now = new Date();
  return CampaignModel.find({
    status: { $in: ['APPROVED', 'approved'] },
    startTime: { $lte: now },
    endTime: { $gte: now },
  })
    .select('name type discount fixedPrice startTime endTime products')
    .sort({ endTime: 1 })
    .limit(5)
    .lean()
    .maxTimeMS(800);
};

const buildCampaignResponse = async (): Promise<DeterministicChatResponse> => {
  const campaigns = await listActiveCampaigns();
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
    return isVoucherQuestion(message) ? buildVoucherResponse(userId) : buildCampaignResponse();
  }

  if (intent === 'STORE_HOURS' || isStoreQuestion(message)) {
    return buildStoreResponse(storeId);
  }

  return null;
};
