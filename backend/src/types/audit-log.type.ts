  import mongoose from 'mongoose';

  export enum AuditEntityType {
    USER = 'USER',
    PRODUCT = 'PRODUCT',
    ORDER = 'ORDER', //...
  }

  export enum AuditLogAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    DISABLE = 'DISABLE',
    ENABLE = 'ENABLE',
  }

  export default interface IAuditLog extends mongoose.Document<mongoose.Types.ObjectId> {
    user_id: mongoose.Types.ObjectId;
    entity_type: AuditEntityType;
    action: AuditLogAction;
    old_data: Record<string, any> | null;
    new_data: Record<string, any> | null;
    created_at: Date;
  }