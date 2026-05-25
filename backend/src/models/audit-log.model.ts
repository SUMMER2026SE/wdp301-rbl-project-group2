import { IAuditLog, AuditAction } from '@/types';
import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema<IAuditLog>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    entityType: { type: String, required: true, trim: true },
    action: { type: String, required: true, enum: AuditAction },
    oldData: { type: mongoose.Schema.Types.Mixed, default: null },
    newData: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ entityType: 1 });
AuditLogSchema.index({ createdAt: -1 });

const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema, 'audit_logs');

export default AuditLogModel;
