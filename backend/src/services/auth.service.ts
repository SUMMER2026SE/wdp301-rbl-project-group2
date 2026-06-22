import { AUTH_REFRESH_TOKEN_TTL_DAYS } from '@/constants/env';
import { BAD_REQUEST, CONFLICT, INTERNAL_SERVER_ERROR, NOT_FOUND, TOO_MANY_REQUESTS, UNAUTHORIZED } from '@/constants/http';
import { RefreshTokenModel, UserModel, OrderModel, ReviewModel } from '@/models';
import { CONFLICT, INTERNAL_SERVER_ERROR, NOT_FOUND, TOO_MANY_REQUESTS, UNAUTHORIZED } from '@/constants/http';
import { RefreshTokenModel, UserModel, OrderModel, ReviewModel, PointTransactionModel } from '@/models';
import VerificationCodeModel from '@/models/verification-code.model';
import { VerificationCodeType } from '@/types/verification-code.type';
import { ReferralRewardStatus, Role, UserStatus } from '@/types/user.type';
import appAssert from '@/utils/app-assert';
import { hashValue } from '@/utils/bcrypt';
import { daysFromNow, fifteenMinutesFromNow, fiveMinutesAgo, ONE_DAY_MS, oneHourFromNow } from '@/utils/date';
import { getVerifyEmailOTPtemplate, getPasswordResetOTPtemplate } from '@/utils/email-templates';
import { generateRefreshToken, hashToken, signToKen } from '@/utils/jwt';
import { sendMail } from '@/utils/send-mail';
import withTransaction from '@/utils/with-transaction';
import { TLoginParams, TRegisterParams, TResetPasswordParams } from '@/validators/auth.validator';
import { randomBytes, randomUUID } from 'crypto';
import mongoose from 'mongoose';
import axios from 'axios';
import { calculateTier } from './membership.service';


const resolveReferrerId = async (referralCode: string | undefined, session: mongoose.ClientSession) => {
  if (!referralCode) return null;

  const referrer = await UserModel.findOne({
    referralCode: referralCode.trim().toUpperCase(),
    role: { $in: [Role.CUSTOMER, 'CUSTOMER'] },
  })
    .select('_id')
    .session(session);

  appAssert(referrer, BAD_REQUEST, 'Mã giới thiệu không hợp lệ');
  return referrer._id;
};

export const createUser = async ({ username, email, password, referralCode }: TRegisterParams) => {
  return withTransaction(async (session) => {
    //check if email already exists
    const emailExist = await UserModel.exists({ email }).session(session);
    appAssert(!emailExist, CONFLICT, 'Tài khoản email đã tồn tại');

    const usernameExist = await UserModel.exists({ username }).session(session);
    appAssert(!usernameExist, CONFLICT, 'Tên đăng nhập đã tồn tại');

    const referrerId = await resolveReferrerId(referralCode, session);

    //create user
    const user = new UserModel({
      username,
      email,
      passwordHash: password,
      referredBy: referrerId,
      referralRewardStatus: referrerId ? ReferralRewardStatus.PENDING : ReferralRewardStatus.NONE,
    });

    await user.save({ session });

    //create 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const verificationCode = new VerificationCodeModel({
      userId: user._id,
      type: VerificationCodeType.VERIFY_EMAIL,
      email,
      code,
      expiresAt: fifteenMinutesFromNow(),
    });

    await verificationCode.save({ session });

    //send email
    const { error } = await sendMail({
      to: email,
      ...getVerifyEmailOTPtemplate(code),
    });

    appAssert(!error, INTERNAL_SERVER_ERROR, 'Lỗi khi gửi email xác thực');

    return user.omitPassword();
  });
};

export const login = async ({ email, password, userAgent, deviceId }: TLoginParams) => {
  return withTransaction(async (session) => {
    //check exist email
    const user = await UserModel.findOne({ email }).session(session);
    appAssert(user, CONFLICT, 'Thông tin đăng nhập không hợp lệ');
    appAssert(
      user.status === 'active',
      UNAUTHORIZED,
      'Tài khoản chưa được kích hoạt. Vui lòng thiết lập mật khẩu từ email mời.'
    );

    //check password
    const isValidatePassword = await user.comparePassword(password);
    appAssert(isValidatePassword, CONFLICT, 'Thông tin đăng nhập không hợp lệ');
    appAssert(user.verifiedAt, CONFLICT, 'Tài khoản chưa xác thực, vui lòng kiểm tra email');

    const activeDeviceId = deviceId || randomUUID();

    //check old refresh_token then revoke token
    const oldRefreshToken = await RefreshTokenModel.findOne({ userId: user._id, deviceId: activeDeviceId }).session(
      session
    );
    if (oldRefreshToken) {
      oldRefreshToken.revoked = true;
      await oldRefreshToken.save({ session });
    }

    const payload = {
      userId: user._id,
      role: user.role,
      deviceId: activeDeviceId,
    };
    const accessToken = signToKen(payload);
    const refreshTokenVal = generateRefreshToken();
    const refresh = new RefreshTokenModel({
      userId: user._id,
      tokenHash: hashToken(refreshTokenVal),
      deviceId: payload.deviceId,
      userAgent: userAgent,
      expiresAt: daysFromNow(AUTH_REFRESH_TOKEN_TTL_DAYS),
    });

    await refresh.save({ session });

    return {
      user: user.omitPassword(),
      accessToken: accessToken,
      refreshToken: refreshTokenVal,
      deviceId: activeDeviceId,
    };
  });
};

export const refreshUserAccessToken = async (refreshTokenVal: string) => {
  const tokenHash = hashToken(refreshTokenVal);

  let refreshToken = await RefreshTokenModel.findOne({
    tokenHash,
    revoked: false,
    expiresAt: { $gt: new Date() },
  });

  appAssert(refreshToken, UNAUTHORIZED, 'Token không hợp lệ');

  const needRefresh = refreshToken.expiresAt.getTime() - Date.now() < ONE_DAY_MS;

  let newRefreshToken = refreshTokenVal;

  if (needRefresh) {
    await refreshToken.updateOne({ revoked: true });

    newRefreshToken = generateRefreshToken();
    refreshToken = await RefreshTokenModel.create({
      userId: refreshToken.userId,
      deviceId: refreshToken.deviceId,
      userAgent: refreshToken.userAgent,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: daysFromNow(AUTH_REFRESH_TOKEN_TTL_DAYS),
    });
  }

  const user = await UserModel.findById(refreshToken.userId);
  appAssert(user, UNAUTHORIZED, 'User không tồn tại');

  const accessToken = signToKen({
    userId: user._id,
    role: user.role,
    deviceId: refreshToken.deviceId,
  });

  return {
    accessToken: accessToken,
    refreshToken: newRefreshToken,
  };
};

export const verifyEmail = async (email: string, code: string) => {
  //get the verification code from db
  const validCode = await VerificationCodeModel.findOne({
    email,
    code,
    type: VerificationCodeType.VERIFY_EMAIL,
    expiresAt: { $gt: new Date() },
  });

  appAssert(validCode, NOT_FOUND, 'Mã xác thực không chính xác hoặc đã hết hạn');

  //update user verified true
  const updatedUser = await UserModel.findByIdAndUpdate(
    validCode.userId,
    {
      verifiedAt: new Date(),
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
  appAssert(!user.verifiedAt, CONFLICT, 'Tài khoản đã được xác thực');

  //check email rate limit
  const fiveMinAgo = fiveMinutesAgo();
  const count = await VerificationCodeModel.countDocuments({
    userId: user._id,
    type: VerificationCodeType.VERIFY_EMAIL,
    createdAt: { $gt: fiveMinAgo },
  });
  appAssert(count <= 2, TOO_MANY_REQUESTS, 'Quá nhiều lượt xác thực, vui lòng thử lại sau 5 phút.');

  //create 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  //create verification code
  const verificationCode = await VerificationCodeModel.create({
    userId: user._id,
    type: VerificationCodeType.VERIFY_EMAIL,
    email: user.email,
    code,
    expiresAt: fifteenMinutesFromNow(),
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
    userId: user._id,
    type: VerificationCodeType.FORGOT_PASSWORD,
    createdAt: { $gt: fiveMinAgo },
  });
  appAssert(count <= 1, TOO_MANY_REQUESTS, 'Too many requests. Please try again later.');

  //create 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  //create verification code
  const verificationCode = await VerificationCodeModel.create({
    userId: user._id,
    type: VerificationCodeType.FORGOT_PASSWORD,
    email: user.email,
    code,
    expiresAt: fifteenMinutesFromNow(),
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
    expiresAt: { $gt: new Date() },
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
    expiresAt: { $gt: new Date() },
  });
  appAssert(validCode, NOT_FOUND, 'Mã xác thực không hợp lệ hoặc đã hết hạn');

  // If this is a staff invite, we also activate the account
  const updateData: any = {
    passwordHash: await hashValue(password),
  };

  if (validCode.type === VerificationCodeType.STAFF_INVITE) {
    updateData.status = UserStatus.ACTIVE;
    updateData.verifiedAt = new Date();
  }

  //update user password
  const updatedUser = await UserModel.findByIdAndUpdate(validCode.userId, updateData, { new: true });
  appAssert(updatedUser, INTERNAL_SERVER_ERROR, 'Lỗi khi đặt lại mật khẩu');

  //delete verification code record
  await validCode.deleteOne();

  //revoke all refresh token of the user
  await RefreshTokenModel.updateMany({ userId: validCode.userId }, { revoked: true });

  return {
    user: updatedUser.omitPassword(),
  };
};

export const getMe = async (userId: mongoose.Types.ObjectId): Promise<any> => {
  const user = await UserModel.findById(userId);
  appAssert(user, NOT_FOUND, 'Không tìm thấy tài khoản người dùng');

  const [ordersCount, reviewsCount, totalEarnedResult] = await Promise.all([
    OrderModel.countDocuments({ cusId: userId }),
    ReviewModel.countDocuments({ userId: userId }),
    PointTransactionModel.aggregate([
      { $match: { userId, amount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  const accumulatedPoints = totalEarnedResult[0]?.total || user.accumulatedPoints || user.collectedPoints || 0;

  // Synchronize tier and accumulatedPoints if they are outdated
  const activeTier = calculateTier(accumulatedPoints);
  let hasChanges = false;
  if (user.tier !== activeTier) {
    user.tier = activeTier;
    hasChanges = true;
  }
  if (user.accumulatedPoints !== accumulatedPoints) {
    user.accumulatedPoints = accumulatedPoints;
    hasChanges = true;
  }
  if (hasChanges) {
    await user.save();
  }

  const userObj = user.omitPassword();
  return {
    ...userObj,
    accumulatedPoints,
    ordersCount,
    reviewsCount,
    savedCount: 0,
  };
};

export const logoutUser = async (userId: mongoose.Types.ObjectId, deviceId: string | undefined) => {
  await RefreshTokenModel.updateMany({ userId, deviceId, revoked: false }, { revoked: true });

  return true;
};

export const loginWithGoogle = async ({
  credential,
  userAgent,
  deviceId,
  referralCode,
}: {
  credential: string;
  userAgent?: string;
  deviceId?: string;
  referralCode?: string;
}) => {
  return withTransaction(async (session) => {
    let email: string;
    let name: string;
    let avatar: string | undefined;

    try {
      // Gọi tới Google UserInfo API với access token
      const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${credential}`,
        },
      });

      email = response.data.email;
      name = response.data.name || response.data.given_name || 'Google User';
      avatar = response.data.picture;

      appAssert(email, UNAUTHORIZED, 'Không lấy được email từ tài khoản Google');
    } catch (err: any) {
      console.error('Google verification error:', err?.response?.data || err.message);
      appAssert(false, UNAUTHORIZED, 'Xác thực tài khoản Google thất bại');
    }

    // Tìm kiếm user theo email
    let user = await UserModel.findOne({ email }).session(session);

    if (!user) {
      // Nếu chưa có user, tiến hành đăng ký mới
      const baseUsername = email.split('@')[0];
      let username = baseUsername;
      let suffix = 1;

      // Đảm bảo username là duy nhất
      while (await UserModel.exists({ username }).session(session)) {
        username = `${baseUsername}${suffix}`;
        suffix++;
      }

      const referrerId = await resolveReferrerId(referralCode, session);

      user = new UserModel({
        username,
        email,
        fullName: name,
        avatar: avatar || null,
        passwordHash: randomBytes(16).toString('hex'), // Mật khẩu ngẫu nhiên cho user đăng nhập Google
        role: Role.CUSTOMER,
        verifiedAt: new Date(),
        status: UserStatus.ACTIVE,
        referredBy: referrerId,
        referralRewardStatus: referrerId ? ReferralRewardStatus.PENDING : ReferralRewardStatus.NONE,
      });

      await user.save({ session });
    } else {
      // Nếu đã có user, có thể cập nhật avatar nếu rỗng
      if (!user.avatar && avatar) {
        user.avatar = avatar;
        await user.save({ session });
      }
    }

    // Tạo deviceId và refresh token giống login bình thường
    const activeDeviceId = deviceId || randomUUID();

    const oldRefreshToken = await RefreshTokenModel.findOne({
      userId: user._id,
      deviceId: activeDeviceId,
    }).session(session);

    if (oldRefreshToken) {
      oldRefreshToken.revoked = true;
      await oldRefreshToken.save({ session });
    }

    const payload = {
      userId: user._id,
      role: user.role,
      deviceId: activeDeviceId,
    };

    const accessToken = signToKen(payload);
    const refreshTokenVal = generateRefreshToken();

    const refresh = new RefreshTokenModel({
      userId: user._id,
      tokenHash: hashToken(refreshTokenVal),
      deviceId: payload.deviceId,
      userAgent: userAgent,
      expiresAt: daysFromNow(AUTH_REFRESH_TOKEN_TTL_DAYS),
    });

    await refresh.save({ session });

    return {
      user: user.omitPassword(),
      accessToken,
      refreshToken: refreshTokenVal,
      deviceId: activeDeviceId,
    };
  });
};
