import mongoose from 'mongoose';

export enum StaffRequestType {
  CREATE_STAFF = 'CREATE_STAFF',
  DEACTIVATE_STAFF = 'DEACTIVATE_STAFF',
}

export enum StaffRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum StaffDeactivateReason {
  RESIGNATION = 'resignation',
  VIOLATION = 'violation',
  TRANSFER = 'transfer',
  OTHER = 'other',
}

export interface IStaffRequestCandidate {
  fullName: string;
  email: string;
  phone: string;
  desiredPosition?: string;
  note?: string;
  confirmedStoreId: mongoose.Types.ObjectId;
}

export interface IStaffRequest extends mongoose.Document<mongoose.Types.ObjectId> {
  type: StaffRequestType;
  storeId: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  status: StaffRequestStatus;
  candidate?: IStaffRequestCandidate;
  targetStaffId?: mongoose.Types.ObjectId;
  reason?: StaffDeactivateReason | string;
  note?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  adminNote?: string;
  createdUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
