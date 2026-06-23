import mongoose from 'mongoose';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import UserModel from '@/models/user.model';
import StaffRequestModel from '@/models/staff-request.model';
import { Role, UserStatus } from '@/types/user.type';
import { StaffDeactivateReason, StaffRequestStatus, StaffRequestType } from '@/types/staff-request.type';
import { auditUserDisabled, auditUserEnabled } from './audit-log.service';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const listManagerStaff = async (
  storeId: mongoose.Types.ObjectId,
  query: { search?: string; status?: string } = {}
) => {
  const filter: Record<string, any> = {
    role: Role.STAFF,
    storeId: storeId,
  };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search) {
    const search = query.search.trim();
    filter.$or = [
      { fullName: new RegExp(search, 'i') },
      { username: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
    ];
  }

  return UserModel.find(filter)
    .select('_id username fullName email phone role status storeId createdAt updatedAt')
    .sort({ fullName: 1, username: 1 })
    .lean();
};

export const listManagerStaffRequests = async (
  storeId: mongoose.Types.ObjectId,
  query: { status?: string; type?: string } = {}
) => {
  const filter: Record<string, any> = { storeId: storeId };
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;

  return StaffRequestModel.find(filter)
    .populate('requestedBy', 'username fullName email')
    .populate('targetStaffId', 'username fullName email phone status storeId')
    .populate('reviewedBy', 'username fullName email')
    .sort({ createdAt: -1 });
};

export const getManagerStaffRequestById = async (storeId: mongoose.Types.ObjectId, requestId: string) => {
  const request = await StaffRequestModel.findById(requestId)
    .populate('requestedBy', 'username fullName email')
    .populate('targetStaffId', 'username fullName email phone status storeId')
    .populate('reviewedBy', 'username fullName email');

  appAssert(request, NOT_FOUND, 'Không tìm thấy đề xuất nhân sự');
  appAssert(request.storeId.toString() === storeId.toString(), NOT_FOUND, 'Đề xuất không thuộc chi nhánh của manager');

  return request;
};

export const createManagerCreateStaffRequest = async (
  storeId: mongoose.Types.ObjectId,
  managerId: mongoose.Types.ObjectId,
  payload: {
    fullName: string;
    email: string;
    phone: string;
    desiredPosition?: string;
    note?: string;
    confirmedStoreId?: string;
  }
) => {
  appAssert(payload.fullName?.trim(), BAD_REQUEST, 'Họ tên nhân viên là bắt buộc');
  appAssert(payload.email?.trim(), BAD_REQUEST, 'Email nhân viên là bắt buộc');
  appAssert(payload.phone?.trim(), BAD_REQUEST, 'Số điện thoại nhân viên là bắt buộc');
  appAssert(
    payload.confirmedStoreId === storeId.toString(),
    BAD_REQUEST,
    'Vui lòng xác nhận nhân viên thuộc chi nhánh hiện tại'
  );

  const email = normalizeEmail(payload.email);
  const existingUser = await UserModel.exists({ email });
  appAssert(!existingUser, BAD_REQUEST, 'Email đã tồn tại trong hệ thống');

  const duplicatePending = await StaffRequestModel.exists({
    type: StaffRequestType.CREATE_STAFF,
    status: StaffRequestStatus.PENDING,
    storeId: storeId,
    'candidate.email': email,
  });
  appAssert(!duplicatePending, BAD_REQUEST, 'Đã có đề xuất thêm nhân viên với email này đang chờ duyệt');

  return StaffRequestModel.create({
    type: StaffRequestType.CREATE_STAFF,
    storeId: storeId,
    requestedBy: managerId,
    status: StaffRequestStatus.PENDING,
    candidate: {
      fullName: payload.fullName.trim(),
      email,
      phone: payload.phone.trim(),
      desiredPosition: payload.desiredPosition?.trim() || undefined,
      note: payload.note?.trim() || undefined,
      confirmedStoreId: storeId,
    },
  });
};

export const createManagerDeactivateStaffRequest = async (
  storeId: mongoose.Types.ObjectId,
  managerId: mongoose.Types.ObjectId,
  payload: {
    targetStaffId: string;
    reason: StaffDeactivateReason | string;
    note?: string;
  }
) => {
  appAssert(payload.targetStaffId, BAD_REQUEST, 'Nhân viên cần xử lý là bắt buộc');
  appAssert(payload.reason, BAD_REQUEST, 'Lý do là bắt buộc');
  appAssert(
    payload.targetStaffId !== managerId.toString(),
    BAD_REQUEST,
    'Manager không thể tạo đề xuất cho chính mình'
  );

  const staff = await UserModel.findOne({
    _id: payload.targetStaffId,
    role: Role.STAFF,
    storeId: storeId,
    status: { $ne: UserStatus.DELETED },
  }).select('_id username fullName email phone role status storeId');

  appAssert(staff, NOT_FOUND, 'Không tìm thấy nhân viên thuộc chi nhánh');

  const duplicatePending = await StaffRequestModel.exists({
    type: StaffRequestType.DEACTIVATE_STAFF,
    status: StaffRequestStatus.PENDING,
    targetStaffId: staff._id,
  });
  appAssert(!duplicatePending, BAD_REQUEST, 'Đã có đề xuất xử lý nhân viên này đang chờ duyệt');

  // Solution 1: Temporarily suspend staff status immediately
  const oldData = { status: staff.status };
  const nextStatus = payload.reason === 'violation' ? UserStatus.BLOCKED : UserStatus.INACTIVE;
  staff.status = nextStatus;
  await staff.save();

  // Write audit log for deactivation by manager
  await auditUserDisabled(managerId, oldData, {
    userId: staff._id,
    status: staff.status,
    note: 'Tạm khóa nhanh bởi Manager chi nhánh',
  });

  return StaffRequestModel.create({
    type: StaffRequestType.DEACTIVATE_STAFF,
    storeId: storeId,
    requestedBy: managerId,
    status: StaffRequestStatus.PENDING,
    targetStaffId: staff._id,
    reason: payload.reason,
    note: payload.note?.trim() || undefined,
  });
};

export const cancelManagerStaffRequest = async (storeId: mongoose.Types.ObjectId, requestId: string) => {
  const request = await getManagerStaffRequestById(storeId, requestId);
  appAssert(request.status === StaffRequestStatus.PENDING, BAD_REQUEST, 'Chỉ có thể hủy đề xuất đang chờ duyệt');

  request.status = StaffRequestStatus.CANCELLED;
  await request.save();

  // Solution 1: Revert staff status to active when deactivation request is cancelled by manager
  if (request.type === StaffRequestType.DEACTIVATE_STAFF && request.targetStaffId) {
    const staff = await UserModel.findOne({
      _id: typeof request.targetStaffId === 'object' ? (request.targetStaffId as any)._id : request.targetStaffId,
      role: Role.STAFF,
      storeId: storeId,
    });
    if (staff) {
      const oldData = { status: staff.status };
      staff.status = UserStatus.ACTIVE;
      await staff.save();
      await auditUserEnabled(request.requestedBy as any, oldData, {
        userId: staff._id,
        status: staff.status,
        staffRequestId: request._id,
        note: 'Mở khóa tài khoản do Manager hủy yêu cầu',
      });
    }
  }

  return request;
};
