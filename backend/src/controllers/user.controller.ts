import { OK } from '@/constants/http';
import { IUser } from '@/types';
import { catchErrors } from '@/utils/asyncHandler';
import { updateMe, changePassword } from '@/services/user.service';
import { updateMeValidator } from '@/validators/auth.validator';
import { z } from 'zod';

const changePasswordValidator = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
});
import { uploadBuffer, deleteFile } from "@/utils/uploadFile";
import User from '@/models/users.model';

export const updateMeHandler = catchErrors(async (req, res) => {
  const params = updateMeValidator.parse(req.body);

  const user = await updateMe(req.userId, params);

  return res.success<Omit<IUser, 'password_hash'>>(OK, {
    data: user,
    message: 'Cập nhật hồ sơ thành công',
  });
});

export const changePasswordHandler = catchErrors(async (req, res) => {
  const { currentPassword, newPassword } = changePasswordValidator.parse(req.body);
  await changePassword(req.userId, currentPassword, newPassword);
  return res.success(OK, { message: 'Đổi mật khẩu thành công' });
});

export const updateMyAvatarHandler = catchErrors(async (req, res) => {
  if (!req.file) {
    const msg = (req as any).fileValidationError || "Thiếu ảnh";
    return res.status(400).json({ success: false, message: msg });
  }

  const userId = req.userId;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  if (user.avatar_public_id) {
    try {
      await deleteFile(user.avatar_public_id, "image");
    } catch {}
  }

  const uploaded: any = await uploadBuffer({
    file: req.file,
    folder: "avatars",
    prefix: `users/${userId}`,
    resource_type: "image",
  });

  user.avatar = uploaded.secure_url;
  user.avatar_public_id = uploaded.public_id;
  await user.save();
  return res.success<Omit<IUser, "password_hash">>(OK, {
    data: user.toObject?.() ?? user,
    message: "Cập nhật avatar thành công",
  });
});
