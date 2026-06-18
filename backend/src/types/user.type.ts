import mongoose from 'mongoose';

export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
  CUSTOMER = 'customer',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  DELETED = 'deleted',
}

export enum UserTier {
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  PLATINUM = 'Platinum',
  DIAMOND = 'Diamond',
}

export interface IAddresses {
  _id?: mongoose.Types.ObjectId;
  label: string;
  receiverName: string;
  phone: string;
  detail: string;
  ward: string;
  district?: string;
  city: string;
  isDefault: boolean;
}

export interface IPreferences {
  dietary: string[];
  allergies: string[];
  healthGoals: string[];
}

export interface IHealthProfile {
  allergies: string[];
  calories: number;
}

export interface IUser extends mongoose.Document<mongoose.Types.ObjectId> {
  fullName?: string;
  username: string;
  email: string;
  phone: string;
  avatar?: string | null;
  avatarPublicId?: string | null;
  passwordHash: string;
  role: Role;
  addresses: IAddresses[];
  preferences?: IPreferences;
  health?: IHealthProfile;
  isHealthSetup: boolean;
  loginFailedCount: number;
  lockedUntil?: Date | null;
  verifiedAt?: Date | null;
  status: UserStatus;
  collectedPoints: number;
  tier?: UserTier;
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId | null;
  storeId?: mongoose.Types.ObjectId | null;
  receiveCampaignNotifications?: boolean;
  reviewModeration?: {
    toxicCount: number;
    reviewBannedUntil?: Date | null;
    lastToxicAt?: Date | null;
  };

  aiRecommendationsCache?: {
    data?: any;
    safeFoodsData?: any;
    updatedAt: Date;
  };

  healthProfile?: IHealthProfile;

  comparePassword(password: string): Promise<boolean>;
  omitPassword(): any;
}
