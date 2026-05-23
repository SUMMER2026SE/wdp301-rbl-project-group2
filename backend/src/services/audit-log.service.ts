import mongoose, {ClientSession} from "mongoose";
import AuditLogModel from '@/models/audit-log.model';
import { AuditEntityType, AuditLogAction } from '@/types/audit-log.type';

type TObjectIdLike = string | mongoose.Types.ObjectId;

type TAuditLogPayload = {
  actor_user_id: TObjectIdLike;
  entity_type: AuditEntityType;
  action: AuditLogAction;
  old_data?: Record<string, any> | null;
  new_data?: Record<string, any> | null;
  created_at?: Date; 
};

const toObjectId = (id: TObjectIdLike) =>
  typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;

export const createAuditLog = async (
  payload: TAuditLogPayload,
  opts?: { session?: ClientSession }
) => {
  const doc = {
    user_id: toObjectId(payload.actor_user_id),
    entity_type: payload.entity_type,
    action: payload.action,
    old_data: payload.old_data ?? null,
    new_data: payload.new_data ?? null,
    created_at: payload.created_at ?? new Date(), 
  };

  const [created] = await AuditLogModel.create([doc], {
    session: opts?.session,
  });

  return created;
};

export const auditUserCreated = async (
  actor_user_id: TObjectIdLike,
  newUserData: Record<string, any>,
  opts?: { session?: ClientSession }
) => {
  return createAuditLog(
    {
      actor_user_id,
      entity_type: AuditEntityType.USER,
      action: AuditLogAction.CREATE,
      old_data: null,
      new_data: newUserData,
    },
    opts
  );
};

export const auditUserUpdated = async (
  actor_user_id: TObjectIdLike,
  oldUserData: Record<string, any> | null,
  newUserData: Record<string, any> | null,
  opts?: { session?: ClientSession }
) => {
  return createAuditLog(
    {
      actor_user_id,
      entity_type: AuditEntityType.USER,
      action: AuditLogAction.UPDATE,
      old_data: oldUserData ?? null,
      new_data: newUserData ?? null,
    },
    opts
  );
};

export const auditUserDisabled = async (
  actor_user_id: TObjectIdLike,
  oldUserData: Record<string, any> | null,
  newUserData: Record<string, any> | null,
  opts?: { session?: ClientSession }
) => {
  return createAuditLog(
    {
      actor_user_id,
      entity_type: AuditEntityType.USER,
      action: AuditLogAction.DISABLE,
      old_data: oldUserData ?? null,
      new_data: newUserData ?? null,
    },
    opts
  );
};

export const auditUserEnabled = async (
  actor_user_id: TObjectIdLike,
  oldUserData: Record<string, any> | null,
  newUserData: Record<string, any> | null,
  opts?: { session?: ClientSession }
) => {
  return createAuditLog(
    {
      actor_user_id,
      entity_type: AuditEntityType.USER,
      action: AuditLogAction.ENABLE,
      old_data: oldUserData ?? null,
      new_data: newUserData ?? null,
    },
    opts
  );
};
