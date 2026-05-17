import { IAuditLog} from '@/types';
import { AuditEntityType, AuditLogAction } from '@/types/audit-log.type';
import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema<IAuditLog>({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entity_type: { type: String, required: true, enum: Object.values(AuditEntityType) },
  action: { type: String, required: true, enum: Object.values(AuditLogAction) },
  old_data: { type: Object },
  new_data: { type: Object },
  created_at: { type: Date, required: true },
});

//indexes
AuditLogSchema.index({ user_id: 1 });
AuditLogSchema.index({ entity_type: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ created_at: -1 });

const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema, 'audit_logs');

export default AuditLogModel;
