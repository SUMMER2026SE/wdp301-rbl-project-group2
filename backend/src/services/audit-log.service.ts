import mongoose, {ClientSession} from "mongoose";
import AuditLogModel from '@/models/audit-log.model';
import { AuditEntityType, AuditLogAction } from '@/types/audit-log.type';

type TObjectIdLike = string | mongoose.Types.ObjectId;

type TAuditLogPayload = {
  userId: TObjectIdLike;
  entityType: AuditEntityType;
  action: AuditLogAction;
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  createdAt?: Date; 
};

const toObjectId = (id: TObjectIdLike) =>
  typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;

export const createAuditLog = async (
  payload: TAuditLogPayload,
  opts?: { session?: ClientSession }
) => {
  const doc = {
    userId: toObjectId(payload.userId),
    entityType: payload.entityType,
    action: payload.action,
    oldData: payload.oldData ?? null,
    newData: payload.newData ?? null,
    createdAt: payload.createdAt ?? new Date(), 
  };

  const [created] = await AuditLogModel.create([doc], {
    session: opts?.session,
  });

  return created;
};

export const auditUserCreated = async (
  userId: TObjectIdLike,
  newUserData: Record<string, any>,
  opts?: { session?: ClientSession }
) => {
  return createAuditLog(
    {
      userId,
      entityType: AuditEntityType.USER,
      action: AuditLogAction.CREATE,
      oldData: null,
      newData: newUserData,
    },
    opts
  );
};

export const auditUserUpdated = async (
  userId: TObjectIdLike,
  oldUserData: Record<string, any> | null,
  newUserData: Record<string, any> | null,
  opts?: { session?: ClientSession }
) => {
  return createAuditLog(
    {
      userId,
      entityType: AuditEntityType.USER,
      action: AuditLogAction.UPDATE,
      oldData: oldUserData ?? null,
      newData: newUserData ?? null,
    },
    opts
  );
};

export const auditUserDisabled = async (
  userId: TObjectIdLike,
  oldUserData: Record<string, any> | null,
  newUserData: Record<string, any> | null,
  opts?: { session?: ClientSession }
) => {
  return createAuditLog(
    {
      userId,
      entityType: AuditEntityType.USER,
      action: AuditLogAction.DISABLE,
      oldData: oldUserData ?? null,
      newData: newUserData ?? null,
    },
    opts
  );
};

export const auditUserEnabled = async (
  userId: TObjectIdLike,
  oldUserData: Record<string, any> | null,
  newUserData: Record<string, any> | null,
  opts?: { session?: ClientSession }
) => {
  return createAuditLog(
    {
      userId,
      entityType: AuditEntityType.USER,
      action: AuditLogAction.ENABLE,
      oldData: oldUserData ?? null,
      newData: newUserData ?? null,
    },
    opts
  );
};
