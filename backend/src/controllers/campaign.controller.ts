import { CREATED, OK } from '@/constants/http';
import { Role } from '@/types/user.type';
import { catchErrors } from '@/utils/async-handler';
import {
  createCampaign,
  deleteCampaign,
  getCampaignById,
  getCampaigns,
  updateCampaign,
  updateCampaignStatus,
  trackCampaignActivity,
} from '@/services/campaign.service';
import { CampaignStatus } from '@/types/campaign.type';
import {
  createCampaignValidator,
  updateCampaignStatusValidator,
  updateCampaignValidator,
} from '@/validators/campaign.validator';

export const createCampaignHandler = catchErrors(async (req, res) => {
  const params = createCampaignValidator.parse(req.body);
  const campaign = await createCampaign(req.userId, req.role as Role, params);

  return res.success(CREATED, {
    data: campaign,
    message: req.role === Role.ADMIN ? 'Tạo và kích hoạt chiến dịch thành công' : 'Đề xuất chiến dịch thành công, đang chờ Admin phê duyệt',
  });
});

export const getCampaignsHandler = catchErrors(async (req, res) => {
  const role = req.role as Role | undefined;
  const activeOnly = role !== Role.ADMIN && role !== Role.MANAGER;
  const campaigns = await getCampaigns(role, activeOnly);
  return res.success(OK, { data: campaigns });
});

export const getCampaignByIdHandler = catchErrors(async (req, res) => {
  const campaign = await getCampaignById(req.params.id);
  return res.success(OK, { data: campaign });
});

export const updateCampaignHandler = catchErrors(async (req, res) => {
  const params = updateCampaignValidator.parse(req.body);
  const campaign = await updateCampaign(req.params.id, req.userId, req.role as Role, params);

  return res.success(OK, {
    data: campaign,
    message: 'Cập nhật chiến dịch thành công',
  });
});

export const deleteCampaignHandler = catchErrors(async (req, res) => {
  await deleteCampaign(req.params.id, req.userId, req.role as Role);
  return res.success(OK, { message: 'Xóa chiến dịch thành công' });
});

export const updateCampaignStatusHandler = catchErrors(async (req, res) => {
  const { status } = updateCampaignStatusValidator.parse(req.body);
  const campaign = await updateCampaignStatus(req.params.id, status as CampaignStatus);

  return res.success(OK, {
    data: campaign,
    message: status === 'approved' ? 'Phê duyệt chiến dịch thành công' : 'Từ chối chiến dịch thành công',
  });
});

export const trackCampaignActivityHandler = catchErrors(async (req, res) => {
  const { action } = req.body;
  if (action !== 'view' && action !== 'click') {
    return res.status(400).json({ success: false, message: 'Hành động không hợp lệ' });
  }

  const campaign = await trackCampaignActivity(req.params.id, action);
  return res.success(OK, {
    data: campaign,
    message: 'Ghi nhận lượt tương tác thành công',
  });
});
