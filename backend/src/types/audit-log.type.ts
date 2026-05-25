import mongoose from 'mongoose';

export enum AuditAction {
  C = 'C',
  U = 'U',
  D = 'D',
}

export enum AuditEntityType {
  USER = 'USER',
  PRODUCT = 'PRODUCT',
  ORDER = 'ORDER',
}

export enum AuditLogAction {
  CREATE = 'C',
  UPDATE = 'U',
  DELETE = 'D',
  DISABLE = 'U',
  ENABLE = 'U',
}

export interface IAuditLog extends mongoose.Document<mongoose.Types.ObjectId> {
  userId?: mongoose.Types.ObjectId | null;
  entityType: string;
  action: AuditAction;
  oldData?: any;
  newData?: any;
  createdAt: Date;
}