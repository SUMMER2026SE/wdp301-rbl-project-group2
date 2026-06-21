import { CampaignModel, CampaignProductModel, UserModel } from '@/models';
import { CampaignStatus, ICampaign } from '@/types/campaign.type';
import { Role } from '@/types/user.type';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST, FORBIDDEN, NOT_FOUND } from '@/constants/http';
import { TCreateCampaignParams, TUpdateCampaignParams } from '@/validators/campaign.validator';
import mongoose from 'mongoose';
import { sendMail } from '@/utils/send-mail';

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
    const text = `Xin chào! Cửa hàng vừa ra mắt chiến dịch khuyến mãi "${campaign.name}" mới từ ngày ${new Date(campaign.startTime).toLocaleDateString('vi-VN')} đến ngày ${new Date(campaign.endTime).toLocaleDateString('vi-VN')}. Hãy ghé thăm thực đơn để nhận ngay các ưu đãi đặc biệt nhé!`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #f3ede7; border-radius: 12px; max-width: 600px;">
        <h2 style="color: #ea580c;">Khuyến mãi đặc biệt từ FoodieDash! 🎁</h2>
        <p>Xin chào quý khách,</p>
        <p>Chúng tôi xin trân trọng thông báo chiến dịch ưu đãi mới <strong>"${campaign.name}"</strong> chính thức bắt đầu từ ngày <strong>${new Date(campaign.startTime).toLocaleDateString('vi-VN')}</strong> đến ngày <strong>${new Date(campaign.endTime).toLocaleDateString('vi-VN')}</strong>.</p>
        <p>Nhanh tay truy cập FoodieDash để chọn mua các sản phẩm yêu thích với mức giá ưu đãi cực sốc!</p>
        <hr style="border: 0; border-top: 1px solid #e7dbcf; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9a734c;">Nếu bạn không muốn nhận các email thông báo này nữa, vui lòng thay đổi cấu hình trong trang cài đặt tài khoản của bạn.</p>
      </div>
    `;

    // Send emails asynchronously
    for (const customer of customers) {
      if (customer.email) {
        sendMail({
          to: customer.email,
          subject,
          text,
          html,
        }).catch((err) => console.error(`Failed to send campaign email to ${customer.email}:`, err));
      }
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

export const createCampaign = async (
  userId: mongoose.Types.ObjectId,
  userRole: Role,
  params: TCreateCampaignParams
) => {
  const start = new Date(params.startTime);
  const end = new Date(params.endTime);

  const nameCollision = await CampaignModel.findOne({
    name: { $regex: new RegExp(`^${params.name.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
    startTime: { $lt: end },
    endTime: { $gt: start }
  });
  appAssert(!nameCollision, BAD_REQUEST, 'Đã có chiến dịch cùng tên hoạt động trong khoảng thời gian này');

  const status = userRole === Role.ADMIN ? CampaignStatus.APPROVED : CampaignStatus.PENDING;

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

  // Manager can only edit their own pending campaigns
  if (userRole === Role.MANAGER) {
    appAssert(
      campaign.createdBy.toString() === userId.toString(),
      FORBIDDEN,
      'Bạn không có quyền chỉnh sửa chiến dịch của người khác'
    );
    appAssert(
      campaign.status === CampaignStatus.PENDING,
      BAD_REQUEST,
      'Không thể chỉnh sửa chiến dịch đã được phê duyệt hoặc từ chối'
    );
  }

  const start = params.startTime ? new Date(params.startTime) : campaign.startTime;
  const end = params.endTime ? new Date(params.endTime) : campaign.endTime;
  const name = params.name !== undefined ? params.name : campaign.name;

  const nameCollision = await CampaignModel.findOne({
    _id: { $ne: campaign._id },
    name: { $regex: new RegExp(`^${name.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
    startTime: { $lt: end },
    endTime: { $gt: start }
  });
  appAssert(!nameCollision, BAD_REQUEST, 'Đã có chiến dịch cùng tên hoạt động trong khoảng thời gian này');

  // Update properties
  if (params.name !== undefined) campaign.name = params.name;
  if (params.type !== undefined) campaign.type = params.type;
  if (params.products !== undefined) campaign.products = params.products as any;
  if (params.startTime !== undefined) campaign.startTime = new Date(params.startTime);
  if (params.endTime !== undefined) campaign.endTime = new Date(params.endTime);

  await campaign.save();
  await syncCampaignProducts(campaign);

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
      campaign.status === CampaignStatus.PENDING,
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
