import crypto from 'crypto';
import mongoose from 'mongoose';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND } from '@/constants/http';
import { APP_ORIGIN } from '@/constants/env';
import UserModel from '@/models/user.model';
import StaffRequestModel from '@/models/staff-request.model';
import VerificationCodeModel from '@/models/verification-code.model';
import { Role, UserStatus } from '@/types/user.type';
import { StaffRequestStatus, StaffRequestType } from '@/types/staff-request.type';
import { VerificationCodeType } from '@/types/verification-code.type';
import { createAuditLog, auditUserCreated, auditUserDisabled } from '@/services/audit-log.service';
import { AuditEntityType, AuditLogAction } from '@/types/audit-log.type';
import { oneHourFromNow } from '@/utils/date';
import { getStaffInviteTemplate } from '@/utils/email-templates';
import { sendMail } from '@/utils/send-mail';

const makeUsername = (email: string) =>
  email
    .split('@')[0]
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 24);
const makeTemporaryPassword = () => crypto.randomBytes(12).toString('base64url');

export const listAdminStaffRequests = async (query: { status?: string; type?: string; storeId?: string } = {}) => {
  const filter: Record<string, any> = {};
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;
  if (query.storeId) filter.storeId = query.storeId;

  return StaffRequestModel.find(filter)
    .populate('storeId', 'name address')
    .populate('requestedBy', 'username fullName email')
    .populate('targetStaffId', 'username fullName email phone status storeId')
    .populate('reviewedBy', 'username fullName email')
    .sort({ createdAt: -1 });
};

export const getAdminStaffRequestById = async (requestId: string) => {
  const request = await StaffRequestModel.findById(requestId)
    .populate('storeId', 'name address')
    .populate('requestedBy', 'username fullName email')
    .populate('targetStaffId', 'username fullName email phone status storeId')
    .populate('reviewedBy', 'username fullName email');

  appAssert(request, NOT_FOUND, 'Không tìm thấy đề xuất nhân sự');
  return request;
};

export const approveStaffRequest = async (
  adminId: mongoose.Types.ObjectId,
  requestId: string,
  payload: { adminNote?: string; deactivateStatus?: UserStatus.INACTIVE | UserStatus.BLOCKED } = {}
) => {
  const request = await StaffRequestModel.findById(requestId);
  appAssert(request, NOT_FOUND, 'Không tìm thấy đề xuất nhân sự');
  appAssert(request.status === StaffRequestStatus.PENDING, BAD_REQUEST, 'Chỉ có thể duyệt đề xuất đang chờ');

  if (request.type === StaffRequestType.CREATE_STAFF) {
    appAssert(request.candidate, BAD_REQUEST, 'Đề xuất thiếu thông tin ứng viên');
    const existingUser = await UserModel.exists({ email: request.candidate.email });
    appAssert(!existingUser, BAD_REQUEST, 'Email đã tồn tại trong hệ thống');

    const temporaryPassword = makeTemporaryPassword();
    const user = await UserModel.create({
      username: makeUsername(request.candidate.email),
      fullName: request.candidate.fullName,
      email: request.candidate.email,
      phone: request.candidate.phone,
      passwordHash: temporaryPassword,
      role: Role.STAFF,
      status: UserStatus.ACTIVE,
      storeId: request.storeId,
      verifiedAt: new Date(),
    });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await VerificationCodeModel.create({
      userId: user._id,
      type: VerificationCodeType.STAFF_INVITE,
      email: user.email,
      code,
      expiresAt: oneHourFromNow(),
    });

    const inviteUrl = `${APP_ORIGIN}/reset-password?code=${code}&email=${user.email}&type=invite`;
    const { error } = await sendMail({
      to: user.email,
      ...getStaffInviteTemplate(inviteUrl, {
        fullName: user.fullName,
        email: user.email,
      }),
    });
    appAssert(!error, INTERNAL_SERVER_ERROR, 'Lỗi khi gửi email mời nhân viên thiết lập mật khẩu');

    request.createdUserId = user._id;
    await auditUserCreated(adminId, {
      createdUserId: user._id,
      role: Role.STAFF,
      storeId: request.storeId,
      staffRequestId: request._id,
    });
  }

  if (request.type === StaffRequestType.DEACTIVATE_STAFF) {
    appAssert(request.targetStaffId, BAD_REQUEST, 'Đề xuất thiếu nhân viên mục tiêu');
    const nextStatus = payload.deactivateStatus === UserStatus.BLOCKED ? UserStatus.BLOCKED : UserStatus.INACTIVE;
    const staff = await UserModel.findOne({
      _id: request.targetStaffId,
      role: Role.STAFF,
      storeId: request.storeId,
    });
    appAssert(staff, NOT_FOUND, 'Không tìm thấy nhân viên thuộc chi nhánh');

    const oldData = { status: staff.status };
    staff.status = nextStatus;
    await staff.save();
    await auditUserDisabled(adminId, oldData, {
      userId: staff._id,
      status: staff.status,
      staffRequestId: request._id,
    });
  }

  request.status = StaffRequestStatus.APPROVED;
  request.reviewedBy = adminId;
  request.reviewedAt = new Date();
  request.adminNote = payload.adminNote?.trim() || undefined;
  await request.save();

  await createAuditLog({
    userId: adminId,
    entityType: AuditEntityType.USER,
    action: AuditLogAction.UPDATE,
    oldData: { staffRequestId: request._id, status: StaffRequestStatus.PENDING },
    newData: { staffRequestId: request._id, status: StaffRequestStatus.APPROVED, type: request.type },
  });

  return request;
};

export const rejectStaffRequest = async (
  adminId: mongoose.Types.ObjectId,
  requestId: string,
  payload: { adminNote: string }
) => {
  appAssert(payload.adminNote?.trim(), BAD_REQUEST, 'Vui lòng nhập lý do từ chối');

  const request = await StaffRequestModel.findById(requestId);
  appAssert(request, NOT_FOUND, 'Không tìm thấy đề xuất nhân sự');
  appAssert(request.status === StaffRequestStatus.PENDING, BAD_REQUEST, 'Chỉ có thể từ chối đề xuất đang chờ');

  request.status = StaffRequestStatus.REJECTED;
  request.reviewedBy = adminId;
  request.reviewedAt = new Date();
  request.adminNote = payload.adminNote.trim();
  await request.save();

  await createAuditLog({
    userId: adminId,
    entityType: AuditEntityType.USER,
    action: AuditLogAction.UPDATE,
    oldData: { staffRequestId: request._id, status: StaffRequestStatus.PENDING },
    newData: { staffRequestId: request._id, status: StaffRequestStatus.REJECTED, adminNote: request.adminNote },
  });

  return request;
};
