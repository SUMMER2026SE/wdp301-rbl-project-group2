import { APP_ORIGIN, AUTH_REFRESH_TOKEN_TTL_DAYS } from '@/constants/env';
import { CONFLICT, INTERNAL_SERVER_ERROR, NOT_FOUND, TOO_MANY_REQUESTS, UNAUTHORIZED } from '@/constants/http';
import { RefreshTokenModel, UserModel } from '@/models';
import VerificationCodeModel from '@/models/verificationCode.model';
import { IUser } from '@/types';
import { VerificationCodeType } from '@/types/verificationCode.type';
import appAssert from '@/utils/appAssert';
import { hashValue } from '@/utils/bcrypt';
import { daysFromNow, fifteenMinutesFromNow, fiveMinutesAgo, ONE_DAY_MS, oneHourFromNow } from '@/utils/date';
import { getVerifyEmailOTPtemplate, getPasswordResetOTPtemplate } from '@/utils/emailTemplates';
import { generateRefreshToken, hashToken, signToKen } from '@/utils/jwt';
import { sendMail } from '@/utils/sendMail';
import withTransaction from '@/utils/withTransaction';
import { TLoginParams, TRegisterParams, TResetPasswordParams } from '@/validators/auth.validator';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';

export const createUser = async ({ username, email, password }: TRegisterParams) => {
  return withTransaction(async (session) => {
    //check if email already exists
    const email_exist = await UserModel.exists({ email }).session(session);
    appAssert(!email_exist, CONFLICT, 'Tài khoản email đã tồn tại');

    const username_exist = await UserModel.exists({ username }).session(session);
    appAssert(!username_exist, CONFLICT, 'Tên đăng nhập đã tồn tại');

    //create user
    const user = new UserModel({
      username,
      email,
      password_hash: password,
    });

    await user.save({ session });

    //create 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const verification_code = new VerificationCodeModel({
      user_id: user._id,
      type: VerificationCodeType.VERIFY_EMAIL,
      email,
      code,
      expires_at: fifteenMinutesFromNow(),
    });

    await verification_code.save({ session });

    //send email
    const { error } = await sendMail({
      to: email,
      ...getVerifyEmailOTPtemplate(code),
    });

    appAssert(!error, INTERNAL_SERVER_ERROR, 'Lỗi khi gửi email xác thực');

    return user.omitPassword();
  });
};

export const login = async ({ email, password, user_agent, device_id }: TLoginParams) => {
  return withTransaction(async (session) => {
    //check exist email
    const user = await UserModel.findOne({ email }).session(session);
    appAssert(user, CONFLICT, 'Thông tin đăng nhập không hợp lệ');
    appAssert(user.isActive, UNAUTHORIZED, 'Tài khoản chưa được kích hoạt. Vui lòng thiết lập mật khẩu từ email mời.');

    //check password
    const isValidatePassword = await user.comparePassword(password);
    appAssert(isValidatePassword, CONFLICT, 'Thông tin đăng nhập không hợp lệ');
    appAssert(user.verified_at, CONFLICT, 'Tài khoản chưa xác thực, vui lòng kiểm tra email');

    //check old refresh_token then revoke token
    const old_refresh_token = await RefreshTokenModel.findOne({ user_id: user._id, device_id }).session(session);
    if (old_refresh_token) {
      old_refresh_token.revoked = true;
      await old_refresh_token.save({ session });
    }

    const deviceId = device_id || randomUUID();

    const payload = {
      user_id: user._id,
      role: user.role,
      device_id: deviceId,
    };
    const access_token = signToKen(payload);
    const refresh_token = generateRefreshToken();
    const refresh = new RefreshTokenModel({
      user_id: user._id,
      token_hash: hashToken(refresh_token),
      device_id: payload.device_id,
      user_agent,
      expires_at: daysFromNow(AUTH_REFRESH_TOKEN_TTL_DAYS),
    });

    await refresh.save({ session });

    return {
      user: user.omitPassword(),
      access_token,
      refresh_token: refresh_token,
      deviceId,
    };
  });
};

export const refreshUserAccessToken = async (refresh_token: string) => {
  const token_hash = hashToken(refresh_token);

  let refreshToken = await RefreshTokenModel.findOne({
    token_hash,
    revoked: false,
    expires_at: { $gt: new Date() },
  });

  appAssert(refreshToken, UNAUTHORIZED, 'Token không hợp lệ');

  const needRefresh = refreshToken.expires_at.getTime() - Date.now() < ONE_DAY_MS;

  let newRefreshToken = refresh_token;

  if (needRefresh) {
    await refreshToken.updateOne({ revoked: true });

    newRefreshToken = generateRefreshToken();
    refreshToken = await RefreshTokenModel.create({
      user_id: refreshToken.user_id,
      device_id: refreshToken.device_id,
      user_agent: refreshToken.user_agent,
      token_hash: hashToken(newRefreshToken),
      expires_at: daysFromNow(AUTH_REFRESH_TOKEN_TTL_DAYS),
    });
  }

  const user = await UserModel.findById(refreshToken.user_id);
  appAssert(user, UNAUTHORIZED, 'User không tồn tại');

  const access_token = signToKen({
    user_id: user._id,
    role: user.role,
    device_id: refreshToken.device_id,
  });

  return {
    access_token,
    refresh_token: newRefreshToken,
  };
};

export const verifyEmail = async (email: string, code: string) => {
  //get the verification code from db
  const validCode = await VerificationCodeModel.findOne({
    email,
    code,
    type: VerificationCodeType.VERIFY_EMAIL,
    expires_at: { $gt: new Date() },
  });

  appAssert(validCode, NOT_FOUND, 'Mã xác thực không chính xác hoặc đã hết hạn');

  //update user verified true
  const updatedUser = await UserModel.findByIdAndUpdate(
    validCode.user_id,
    {
      verified_at: new Date(),
    },
    { new: true }
  );

  appAssert(updatedUser, INTERNAL_SERVER_ERROR, 'Lỗi khi xác thực tài khoản');

  //delete verification code record
  await validCode.deleteOne();

  return {
    user: updatedUser.omitPassword(),
  };
};

export const resendVerifyEmail = async (email: string) => {
  //get user
  const user = await UserModel.findOne({ email });
  appAssert(user, NOT_FOUND, 'Không tìm thấy tài khoản người dùng');
  appAssert(!user.verified_at, CONFLICT, 'Tài khoản đã được xác thực');

  //check email rate limit
  const fiveMinAgo = fiveMinutesAgo();
  const count = await VerificationCodeModel.countDocuments({
    user_id: user._id,
    type: VerificationCodeType.VERIFY_EMAIL,
    created_at: { $gt: fiveMinAgo },
  });
  appAssert(count <= 2, TOO_MANY_REQUESTS, 'Quá nhiều lượt xác thực, vui lòng thử lại sau 5 phút.');

  //create 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  //create verification code
  const verificationCode = await VerificationCodeModel.create({
    user_id: user._id,
    type: VerificationCodeType.VERIFY_EMAIL,
    email: user.email,
    code,
    expires_at: fifteenMinutesFromNow(),
  });

  //send verification email
  const { error } = await sendMail({
    to: user.email,
    ...getVerifyEmailOTPtemplate(code),
  });

  appAssert(!error, INTERNAL_SERVER_ERROR, `Lỗi khi gửi email xác thực`);

  return true;
};

export const sendPasswordResetEmail = async (email: string) => {
  //get user
  const user = await UserModel.findOne({ email });
  appAssert(user, NOT_FOUND, 'Không tìm thấy tài khoản người dùng');

  //check email rate limit
  const fiveMinAgo = fiveMinutesAgo();
  const count = await VerificationCodeModel.countDocuments({
    user_id: user._id,
    type: VerificationCodeType.FORGOT_PASSWORD,
    created_at: { $gt: fiveMinAgo },
  });
  appAssert(count <= 1, TOO_MANY_REQUESTS, 'Too many requests. Please try again later.');

  //create 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  //create verification code
  const verificationCode = await VerificationCodeModel.create({
    user_id: user._id,
    type: VerificationCodeType.FORGOT_PASSWORD,
    email: user.email,
    code,
    expires_at: fifteenMinutesFromNow(),
  });

  //send email with the verification code
  const { error } = await sendMail({
    to: user.email,
    ...getPasswordResetOTPtemplate(code),
  });

  appAssert(!error, INTERNAL_SERVER_ERROR, `Lỗi khi gửi email`);
  //return success message
  return true;
};

export const verifyPasswordResetOTP = async (email: string, code: string) => {
  const validCode = await VerificationCodeModel.findOne({
    email,
    code,
    type: VerificationCodeType.FORGOT_PASSWORD,
    expires_at: { $gt: new Date() },
  });
  appAssert(validCode, NOT_FOUND, 'Mã xác thực không hợp lệ hoặc đã hết hạn');
  return true;
};

export const resetPassword = async ({ email, code, password }: TResetPasswordParams) => {
  //get the verification code from db
  const validCode = await VerificationCodeModel.findOne({
    email,
    code,
    type: { $in: [VerificationCodeType.FORGOT_PASSWORD, VerificationCodeType.STAFF_INVITE] },
    expires_at: { $gt: new Date() },
  });
  appAssert(validCode, NOT_FOUND, 'Mã xác thực không hợp lệ hoặc đã hết hạn');

  // If this is a staff invite, we also activate the account
  const updateData: any = {
    password_hash: await hashValue(password),
  };

  if (validCode.type === VerificationCodeType.STAFF_INVITE) {
    updateData.isActive = true;
    updateData.verified_at = new Date();
  }

  //update user password
  const updatedUser = await UserModel.findByIdAndUpdate(validCode.user_id, updateData, { new: true });
  appAssert(updatedUser, INTERNAL_SERVER_ERROR, 'Lỗi khi đặt lại mật khẩu');

  //delete verification code record
  await validCode.deleteOne();

  //revoke all refresh token of the user
  await RefreshTokenModel.updateMany({ user_id: validCode.user_id }, { revoked: true });

  return {
    user: updatedUser.omitPassword(),
  };
};

export const getMe = async (userId: mongoose.Types.ObjectId): Promise<Omit<IUser, 'password_hash'>> => {
  const user = await UserModel.findById(userId);
  appAssert(user, NOT_FOUND, 'Không tìm thấy tài khoản người dùng');
  return user.omitPassword();
};

export const logoutUser = async (userId: mongoose.Types.ObjectId, deviceId: string | undefined) => {
  await RefreshTokenModel.updateMany({ user_id: userId, device_id: deviceId, revoked: false }, { revoked: true });

  return true;
};
