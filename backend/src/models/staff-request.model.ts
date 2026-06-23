import mongoose from 'mongoose';
import { IStaffRequest, StaffDeactivateReason, StaffRequestStatus, StaffRequestType } from '@/types/staff-request.type';

const CandidateSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    desiredPosition: { type: String, trim: true },
    note: { type: String, trim: true },
    confirmedStoreId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  },
  { _id: false }
);

const StaffRequestSchema = new mongoose.Schema<IStaffRequest>(
  {
    type: { type: String, enum: Object.values(StaffRequestType), required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(StaffRequestStatus),
      default: StaffRequestStatus.PENDING,
      required: true,
      index: true,
    },
    candidate: { type: CandidateSchema },
    targetStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, enum: Object.values(StaffDeactivateReason), trim: true },
    note: { type: String, trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    adminNote: { type: String, trim: true },
    createdUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

StaffRequestSchema.index({ storeId: 1, type: 1, status: 1, createdAt: -1 });
StaffRequestSchema.index({ requestedBy: 1, status: 1, createdAt: -1 });
StaffRequestSchema.index({ 'candidate.email': 1, storeId: 1, type: 1, status: 1 });
StaffRequestSchema.index({ targetStaffId: 1, type: 1, status: 1 });

const StaffRequestModel = mongoose.model<IStaffRequest>('StaffRequest', StaffRequestSchema, 'staff_requests');

export default StaffRequestModel;
