import mongoose from 'mongoose';

export enum Role {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

export enum UserTier {
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  PLATINUM = 'Platinum',
  DIAMOND = 'Diamond',
}

export interface IAddresses {
  label: string;
  receiver_name: string;
  phone: string;
  detail: string;
  district: string;
  city: string;
  isDefault: boolean;
}

export interface IPreferences {
  dietary: string[];
  allergies: string[];
  health_goals: string[];
}

export interface IHealthProfile {
  allergies: string[];
  conditions: string[];
  dietaryGoals: string[];
}

export default interface IUser extends mongoose.Document<mongoose.Types.ObjectId> {
  fullName?: string;
  username: string;
  email: string;
  phone: string;
  avatar?: string | null;
  avatar_public_id?: string | null;
  password_hash: string;
  role: Role;
  addresses: IAddresses[];
  preferences: IPreferences;
  verified_at: Date;
  isActive: boolean;
  collected_points: number;
  tier: UserTier;
  referral_code: string;
  referred_by?: mongoose.Types.ObjectId | null;

  aiRecommendationsCache?: {
    data?: any;
    safeFoodsData?: any;
    updatedAt: Date;
  };

  healthProfile?: IHealthProfile;

  comparePassword(password: string): Promise<boolean>;
  omitPassword(): Omit<IUser, 'password_hash'>;
}
