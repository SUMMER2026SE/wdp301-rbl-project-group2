import { OK } from '@/constants/http';
import { catchErrors } from '@/utils/asyncHandler';
import { changePassword } from '@/services/user.service';
import { z } from 'zod';

const changePasswordValidator = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
});

export const changePasswordHandler = catchErrors(async (req, res) => {
  const { currentPassword, newPassword } = changePasswordValidator.parse(req.body);
  await changePassword(req.userId, currentPassword, newPassword);
  return res.success(OK, { message: 'Đổi mật khẩu thành công' });
});
