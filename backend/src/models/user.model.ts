import { EMAIL_REGEX, INTERNATIONAL_PHONE_REGEX, VIETNAM_PHONE_REGEX } from '@/constants/regex';
import { IUser } from '@/types';
import { IAddresses, IHealthProfile, IPreferences, Role, UserStatus, UserTier } from '@/types/user.type';
import { compareValue, hashValue } from '@/utils/bcrypt';
import mongoose from 'mongoose';
import { randomBytes } from 'crypto';

const isValidPhone = (v: string) => VIETNAM_PHONE_REGEX.test(v) || INTERNATIONAL_PHONE_REGEX.test(v);

const AddressSchema = new mongoose.Schema<IAddresses>(
  {
    label: { type: String, required: true, trim: true },
    receiverName: { type: String, required: true, trim: true },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          if (v == null || v === '') return true;
          return isValidPhone(v);
        },
        message: 'Số điện thoại không hợp lệ',
      },
    },
    detail: { type: String, required: true, trim: true },
    ward: { type: String, required: true, trim: true },
    district: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  {
    _id: false,
  }
);

const HealthSchema = new mongoose.Schema<IHealthProfile>(
  {
    allergies: { type: [String], default: [] },
    calories: { type: Number, default: 0 },
  },
  { _id: false }
);

const PreferencesSchema = new mongoose.Schema<IPreferences>(
  {
    dietary: { type: [String], default: [] },
    allergies: { type: [String], default: [] },
    healthGoals: { type: [String], default: [] },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema<IUser>(
  {
    fullName: { type: String, trim: true },
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, match: EMAIL_REGEX },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          if (v == null || v === '') return true;
          return isValidPhone(v);
        },
        message: 'Số điện thoại không hợp lệ',
      },
    },
    avatar: { type: String, default: null },
    avatarPublicId: { type: String, default: null },
    passwordHash: { type: String, required: true, minLength: 6 },
    role: { 
      type: String, 
      required: true, 
      enum: [...Object.values(Role), 'ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'], 
      default: Role.CUSTOMER 
    },
    isHealthSetup: { type: Boolean, default: false },
    loginFailedCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    status: { 
      type: String, 
      required: true, 
      enum: Object.values(UserStatus), 
      default: UserStatus.ACTIVE 
    },
    collectedPoints: {
      type: Number,
      default: 0,
      min: [0, 'Collected points cannot be negative'],
    },
    accumulatedPoints: {
      type: Number,
      default: 0,
      min: [0, 'Accumulated points cannot be negative'],
    },
    tier: {
      type: String,
      enum: Object.values(UserTier),
      default: UserTier.BRONZE,
    },
    addresses: {
      type: [AddressSchema],
      default: [],
    },
    health: {
      type: HealthSchema,
      default: () => ({ allergies: [] as string[], calories: 0 }),
    },
    preferences: {
      type: PreferencesSchema,
      default: () => ({ dietary: [] as string[], allergies: [] as string[], healthGoals: [] as string[] }),
    },
    receiveCampaignNotifications: {
      type: Boolean,
      default: true,
    },
    reviewModeration: {
      type: {
        toxicCount: { type: Number, default: 0, min: 0 },
        reviewBannedUntil: { type: Date, default: null },
        lastToxicAt: { type: Date, default: null },
      },
      default: () => ({ toxicCount: 0, reviewBannedUntil: null, lastToxicAt: null }),
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      default: null,
    },
    referralCode: {
      type: String,
      unique: true,
      uppercase: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    aiRecommendationsCache: {
      type: {
        data: { type: mongoose.Schema.Types.Mixed }, // Main AI Recommendations
        safeFoodsData: { type: mongoose.Schema.Types.Mixed }, // Safe Foods AI Insights
        updatedAt: { type: Date }
      },
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phone: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ storeId: 1 });

// Middleware "pre-validate"
UserSchema.pre('validate', function (next) {
  if (this.addresses && this.addresses.length > 0) {
    this.addresses = this.addresses.filter(a => a.ward && a.receiverName) as any;
  }
  next();
});

// Middleware "pre-save"
UserSchema.pre('save', async function (next) {
  if (this.isNew && !this.referralCode) {
    this.referralCode = `FOODIE-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  if (!this.isModified('passwordHash')) return next();

  this.passwordHash = await hashValue(this.passwordHash as string);
  next();
});

// Methods
UserSchema.methods.comparePassword = async function (value: string) {
  return await compareValue(value, this.passwordHash);
};

UserSchema.methods.omitPassword = function () {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

const UserModel = mongoose.model<IUser>('User', UserSchema, 'users');

export default UserModel;
