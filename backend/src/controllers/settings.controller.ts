import { SettingsModel } from '@/models';
import { catchErrors } from '@/utils/asyncHandler';
import { updateSettingsValidator } from '@/validators/settings.validator';
import { OK } from '@/constants/http';

export const getSettingsHandler = catchErrors(async (req, res) => {
  let settings = await SettingsModel.findOne();

  // Create default settings if it doesn't exist yet
  if (!settings) {
    settings = await SettingsModel.create({});
  }

  return res.success(OK, {
    data: settings,
  });
});

export const updateSettingsHandler = catchErrors(async (req, res) => {
  const data = updateSettingsValidator.parse(req.body);

  let settings = await SettingsModel.findOne();
  if (!settings) {
    settings = await SettingsModel.create(data);
  } else {
    settings = await SettingsModel.findOneAndUpdate({}, data, { new: true, runValidators: true });
  }

  return res.success(OK, {
    message: 'Cập nhật cấu hình cửa hàng thành công',
    data: settings,
  });
});
