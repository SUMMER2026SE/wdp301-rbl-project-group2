import { CampaignModel, CampaignProductModel, OrderModel, ProductModel, UserModel } from '@/models';
import { CampaignStatus, ICampaign } from '@/types/campaign.type';
import { ProductStatus } from '@/types';
import { Role } from '@/types/user.type';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST, FORBIDDEN, NOT_FOUND } from '@/constants/http';
import { TCreateCampaignParams, TUpdateCampaignParams } from '@/validators/campaign.validator';
import mongoose from 'mongoose';
import { emailQueue } from '@/jobs/email-queue';
import { APP_ORIGIN, OPENWEATHER_API_KEY } from '@/constants/env';
import { getAICampaignSuggestion } from '@/services/ai.service';
import axios from 'axios';


// Helper to notify customers when a campaign is approved/activated
async function notifyCustomersOfCampaign(campaign: ICampaign) {
  try {
    // Fetch all customers who opted in to receive notifications
    const customers = await UserModel.find({
      role: Role.CUSTOMER,
      receiveCampaignNotifications: { $ne: false },
    }).select('email username').lean();

    if (!customers.length) return;

    const subject = `🎉 Chiến dịch ưu đãi mới: ${campaign.name}`;
    const campaignUrl = `${APP_ORIGIN}/products-campaign/${campaign._id}`;
    const text = `Xin chào! Cửa hàng vừa ra mắt chiến dịch khuyến mãi "${campaign.name}" mới từ ngày ${new Date(campaign.startTime).toLocaleDateString('vi-VN')} đến ngày ${new Date(campaign.endTime).toLocaleDateString('vi-VN')}. Xem chi tiết chiến dịch tại: ${campaignUrl}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #f3ede7; border-radius: 12px; max-width: 600px;">
        <h2 style="color: #ea580c;">Khuyến mãi đặc biệt từ FoodieDash! 🎁</h2>
        <p>Xin chào quý khách,</p>
        <p>Chúng tôi xin trân trọng thông báo chiến dịch ưu đãi mới <strong>"${campaign.name}"</strong> chính thức bắt đầu từ ngày <strong>${new Date(campaign.startTime).toLocaleDateString('vi-VN')}</strong> đến ngày <strong>${new Date(campaign.endTime).toLocaleDateString('vi-VN')}</strong>.</p>
        <p>Nhanh tay truy cập FoodieDash để chọn mua các sản phẩm yêu thích với mức giá ưu đãi cực sốc!</p>
        <div style="margin: 24px 0;">
          <a href="${campaignUrl}" style="background-color: #ea580c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Xem chi tiết chiến dịch</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e7dbcf; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9a734c;">Nếu bạn không muốn nhận các email thông báo này nữa, vui lòng thay đổi cấu hình trong trang cài đặt tài khoản của bạn.</p>
      </div>
    `;

    const now = Date.now();
    const startTimeMs = new Date(campaign.startTime).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    let delayMs = 0;
    if (startTimeMs - now > sevenDaysMs) {
      // Trì hoãn gửi mail cho đến thời điểm cách ngày bắt đầu đúng 7 ngày
      delayMs = (startTimeMs - sevenDaysMs) - now;
    }

    // Thay thế vòng lặp cũ bằng việc đẩy jobs vào hàng đợi BullMQ
    const jobs = customers
      .filter(customer => customer.email)
      .map(customer => ({
        name: `campaign-notify-${campaign._id}-${customer._id}`,
        data: {
          email: customer.email,
          subject,
          text,
          html,
        },
        opts: {
          delay: delayMs,          // Cấu hình trì hoãn gửi nếu chiến dịch bắt đầu sau hơn 7 ngày
          attempts: 3,             // Tự động thử lại tối đa 3 lần nếu lỗi
          backoff: {
            type: 'exponential',   // Chờ giãn cách tăng dần (exponential backoff)
            delay: 5000,           // Lần đầu thử lại sau 5s, lần hai 10s...
          },
          removeOnComplete: true,  // Tự động xóa lịch sử job khi gửi thành công
          removeOnFail: 1000,      // Giữ lại tối đa 1000 jobs lỗi để debug
        }
      }));

    // Đẩy hàng loạt (Bulk insert) vào Redis để đạt hiệu năng tối ưu nhất
    if (jobs.length > 0) {
      await emailQueue.addBulk(jobs);
      console.log(`[Queue] Đã đẩy thành công ${jobs.length} email chiến dịch vào hàng đợi.`);
    }
  } catch (error) {
    console.error('Failed to notify customers of new campaign:', error);
  }
}

// Sync Campaign Product mappings in the database based on campaign products definition
async function syncCampaignProducts(campaign: ICampaign, session?: mongoose.ClientSession) {
  // Clear old mappings first
  await CampaignProductModel.deleteMany({ campaignIds: campaign._id }, { session });

  // Only create mappings if approved
  if (campaign.status === CampaignStatus.APPROVED) {
    const mappings = campaign.products.map((p) => ({
      campaignIds: [campaign._id],
      productIds: [p.productId],
      fixedPrice: p.fixedPrice,
      discount: p.discount,
    }));
    if (mappings.length > 0) {
      await CampaignProductModel.insertMany(mappings, { session });
    }
  }
}

export const suggestCampaignWithAI = async (params: {
  days?: number;
  weather?: string;
  occasion?: string;
  goal?: string;
  productCount?: number;
}) => {
  const weather = params.weather ?? 'normal';
  const occasion = params.occasion ?? 'none';
  const goal = params.goal ?? 'boost_sales';
  const days = params.days ?? 14;
  const productCount = Math.min(6, Math.max(2, params.productCount ?? 3));

  console.log('[AI Campaign] suggestCampaignWithAI params → goal=%s weather=%s occasion=%s days=%d count=%d',
    goal, weather, occasion, days, productCount);

  return getAICampaignSuggestionService({ weather, occasion, goal, days, productCount });
};

export const createCampaign = async (
  userId: mongoose.Types.ObjectId,
  userRole: Role,
  params: TCreateCampaignParams
) => {
  const start = new Date(params.startTime);
  const end = new Date(params.endTime);

  const nameCollision = await CampaignModel.findOne({
    name: { $regex: new RegExp(`^${params.name.trim().replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
    startTime: { $lt: end },
    endTime: { $gt: start }
  });
  appAssert(!nameCollision, BAD_REQUEST, 'Đã có chiến dịch cùng tên hoạt động trong khoảng thời gian này');

  const status = params.status !== undefined
    ? params.status as CampaignStatus
    : CampaignStatus.DRAFT;

  const campaign = await CampaignModel.create({
    ...params,
    status,
    createdBy: userId,
  });

  await syncCampaignProducts(campaign);

  if (status === CampaignStatus.APPROVED) {
    // Notify customers asynchronously
    notifyCustomersOfCampaign(campaign);
  }

  return campaign;
};

export const getCampaigns = async (userRole?: Role, activeOnly?: boolean) => {
  const query: Record<string, any> = {};

  // If not Admin/Manager, only list approved campaigns
  if (userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
    query.status = CampaignStatus.APPROVED;
  }

  if (activeOnly) {
    const now = new Date();
    query.startTime = { $lte: now };
    query.endTime = { $gte: now };
  }

  return CampaignModel.find(query)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'username email')
    .populate('products.productId', 'name price image')
    .lean();
};

export const getCampaignById = async (id: string) => {
  const campaign = await CampaignModel.findById(id)
    .populate('createdBy', 'username email')
    .populate('products.productId', 'name price image');
  appAssert(campaign, NOT_FOUND, 'Không tìm thấy chiến dịch');
  return campaign;
};

export const updateCampaign = async (
  id: string,
  userId: mongoose.Types.ObjectId,
  userRole: Role,
  params: TUpdateCampaignParams
) => {
  const campaign = await CampaignModel.findById(id);
  appAssert(campaign, NOT_FOUND, 'Không tìm thấy chiến dịch');

  // Manager can only edit their own pending or draft campaigns
  if (userRole === Role.MANAGER) {
    appAssert(
      campaign.createdBy.toString() === userId.toString(),
      FORBIDDEN,
      'Bạn không có quyền chỉnh sửa chiến dịch của người khác'
    );
    appAssert(
      campaign.status === CampaignStatus.PENDING || campaign.status === CampaignStatus.DRAFT,
      BAD_REQUEST,
      'Không thể chỉnh sửa chiến dịch đã được phê duyệt hoặc từ chối'
    );
  }

  const start = params.startTime ? new Date(params.startTime) : campaign.startTime;
  const end = params.endTime ? new Date(params.endTime) : campaign.endTime;
  const name = params.name !== undefined ? params.name : campaign.name;

  const nameCollision = await CampaignModel.findOne({
    _id: { $ne: campaign._id },
    name: { $regex: new RegExp(`^${name.trim().replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
    startTime: { $lt: end },
    endTime: { $gt: start }
  });
  appAssert(!nameCollision, BAD_REQUEST, 'Đã có chiến dịch cùng tên hoạt động trong khoảng thời gian này');

  const wasApproved = campaign.status === CampaignStatus.APPROVED;

  // Update properties
  if (params.name !== undefined) campaign.name = params.name;
  if (params.type !== undefined) campaign.type = params.type;
  if (params.products !== undefined) campaign.products = params.products as any;
  if (params.startTime !== undefined) campaign.startTime = new Date(params.startTime);
  if (params.endTime !== undefined) campaign.endTime = new Date(params.endTime);
  if (params.status !== undefined) {
    if (params.status === CampaignStatus.APPROVED && userRole !== Role.ADMIN) {
      campaign.status = CampaignStatus.PENDING;
    } else {
      campaign.status = params.status as CampaignStatus;
    }
  }

  await campaign.save();
  await syncCampaignProducts(campaign);

  const isApprovedNow = campaign.status === CampaignStatus.APPROVED;
  if (!wasApproved && isApprovedNow) {
    notifyCustomersOfCampaign(campaign);
  }

  return campaign;
};

export const deleteCampaign = async (id: string, userId: mongoose.Types.ObjectId, userRole: Role) => {
  const campaign = await CampaignModel.findById(id);
  appAssert(campaign, NOT_FOUND, 'Không tìm thấy chiến dịch');

  if (userRole === Role.MANAGER) {
    appAssert(
      campaign.createdBy.toString() === userId.toString(),
      FORBIDDEN,
      'Bạn không có quyền xóa chiến dịch của người khác'
    );
    appAssert(
      campaign.status === CampaignStatus.PENDING || campaign.status === CampaignStatus.DRAFT,
      BAD_REQUEST,
      'Không thể xóa chiến dịch đã được phê duyệt hoặc từ chối'
    );
  }

  await CampaignModel.findByIdAndDelete(id);
  await CampaignProductModel.deleteMany({ campaignIds: id });
};

export const updateCampaignStatus = async (id: string, status: CampaignStatus) => {
  const campaign = await CampaignModel.findById(id);
  appAssert(campaign, NOT_FOUND, 'Không tìm thấy chiến dịch');

  appAssert(
    campaign.status === CampaignStatus.PENDING,
    BAD_REQUEST,
    'Không thể thay đổi trạng thái chiến dịch đã xử lý'
  );

  campaign.status = status;
  await campaign.save();

  await syncCampaignProducts(campaign);

  if (status === CampaignStatus.APPROVED) {
    notifyCustomersOfCampaign(campaign);
  }

  return campaign;
};

export const trackCampaignActivity = async (id: string, action: 'view' | 'click') => {
  const campaign = await CampaignModel.findById(id);
  appAssert(campaign, NOT_FOUND, 'Không tìm thấy chiến dịch');

  if (action === 'view') {
    campaign.views = (campaign.views || 0) + 1;
  } else if (action === 'click') {
    campaign.clicks = (campaign.clicks || 0) + 1;
  }

  await campaign.save();
  return campaign;
};

// ── AI Campaign Suggestions ──────────────────────────────────────────────────

async function fetchWeatherFromApi(city: string = 'Da Nang') {
  if (!OPENWEATHER_API_KEY) {
    return { type: 'normal', temp: 28, description: 'Trời mát mẻ, khí hậu bình thường' };
  }
  try {
    const res = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},vn&appid=${OPENWEATHER_API_KEY}&units=metric&lang=vi`,
      { timeout: 3000 }
    );
    const temp = res.data.main?.temp ?? 28;
    const description = res.data.weather?.[0]?.description ?? 'Thời tiết bình thường';

    // Phân loại thời tiết thành: hot, rainy, cold, sunny, normal
    let type = 'normal';
    const mainCondition = (res.data.weather?.[0]?.main ?? '').toLowerCase();

    if (mainCondition.includes('rain') || mainCondition.includes('drizzle') || mainCondition.includes('thunderstorm')) {
      type = 'rainy';
    } else if (temp > 33) {
      type = 'hot';
    } else if (temp < 22) {
      type = 'cold';
    } else if (mainCondition.includes('clear')) {
      type = 'sunny';
    }

    return { type, temp, description };
  } catch (error) {
    console.error('[Weather API] Failed to fetch weather, using fallback:', error);
    return { type: 'normal', temp: 28, description: 'Khí hậu ấm áp ổn định' };
  }
}

async function resolveWeatherContext() {
  return fetchWeatherFromApi('Da Nang');
}

function resolveOccasionContext(date = new Date()) {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const isTetWindow = (month === 1 && day >= 20) || (month === 2 && day <= 10) || (month === 12 && day >= 25);
  const isChristmasWindow = (month === 12 && day >= 20) || (month === 1 && day <= 5);
  const isSummerWindow = month >= 5 && month <= 8;
  const isValentineWindow = (month === 2 && day >= 7 && day <= 17) || (month === 2 && day === 14);

  if (isTetWindow) return 'tet';
  if (isChristmasWindow) return 'christmas';
  if (isSummerWindow) return 'summer';
  if (isValentineWindow) return 'valentine';
  return 'none';
}

export const getAICampaignSuggestionService = async (params: {
  weather: string;
  occasion: string;
  goal: string;
  days: number;
  productCount: number;
}) => {
  // 1. Lấy dữ liệu 10 món bán chạy nhất trong 30 ngày qua
  // Bao gồm tất cả trạng thái đơn hàng đã hoàn thành (không bao gồm cancelled/refunded)
  const FULFILLED_STATUSES = ['completed', 'delivered', 'shipping', 'delivering', 'ready_for_delivery'];
  const bestSellers = await OrderModel.aggregate([
    {
      $match: {
        status: { $in: FULFILLED_STATUSES },
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        totalQtySold: { $sum: '$items.quantity' },
      },
    },
    { $sort: { totalQtySold: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
  ]);

  let bestSellersFormatted = bestSellers.map((r) => ({
    productId: r._id.toString(),
    name: r.product.name,
    price: r.product.price,
    totalQtySold: r.totalQtySold,
    description: r.product.description || '',
  }));

  console.log('[AI Campaign] bestSellers found: %d (statuses: %s, window: 30d)', bestSellersFormatted.length, FULFILLED_STATUSES.join(','));

  // Fallback nếu chưa có đơn hàng nào
  if (bestSellersFormatted.length === 0) {
    const fallbackProducts = await ProductModel.find({ status: ProductStatus.ACTIVE, isAvailable: true })
      .limit(10)
      .lean();
    bestSellersFormatted = fallbackProducts.map((p) => ({
      productId: p._id.toString(),
      name: p.name,
      price: p.price,
      totalQtySold: 0,
      description: p.description || '',
    }));
  }

  // 2. Lấy danh sách toàn bộ sản phẩm đang kích hoạt để AI chọn lựa
  const allProducts = await ProductModel.find({ status: ProductStatus.ACTIVE, isAvailable: true }).lean();
  const allAvailableProductsFormatted = allProducts.map((p) => ({
    productId: p._id.toString(),
    name: p.name,
    price: p.price,
    category: p.category,
    tags: p.tags || [],
  }));

  // 3. Phân tích thời tiết và dịp lễ tự động — hoặc dùng giá trị do user chọn
  const weatherInfo = params.weather && params.weather !== 'normal'
    ? (() => {
      // User đã chọn thời tiết thủ công → dùng ngay, không gọi API
      const typeMap: Record<string, string> = {
        hot: 'Nắng nóng',
        sunny: 'Nắng đẹp',
        rainy: 'Mưa',
        cold: 'Lạnh',
        normal: 'Bình thường',
      };
      return { type: params.weather as string, temp: undefined as number | undefined, description: typeMap[params.weather] ?? 'Bình thường' };
    })()
    : await resolveWeatherContext();

  const occasion = params.occasion && params.occasion !== 'none' && params.occasion !== 'auto'
    ? params.occasion
    : resolveOccasionContext();

  const salesWindowDays = Math.max(1, params.days ?? 14);
  const salesByProduct = await OrderModel.aggregate([
    {
      $match: {
        status: { $in: FULFILLED_STATUSES },
        createdAt: { $gte: new Date(Date.now() - salesWindowDays * 24 * 60 * 60 * 1000) },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        totalQtySold: { $sum: '$items.quantity' },
      },
    },
  ]);

  const salesByProductMap = salesByProduct.reduce<Record<string, number>>((acc, item) => {
    acc[item._id.toString()] = item.totalQtySold;
    return acc;
  }, {});

  // 4. Gọi AI tạo gợi ý chiến dịch khuyến mãi
  const suggestion = await getAICampaignSuggestion(
    bestSellersFormatted,
    allAvailableProductsFormatted,
    weatherInfo,
    occasion,
    params.goal,
    salesWindowDays,
    params.productCount,
    salesByProductMap
  );

  return suggestion;
};

