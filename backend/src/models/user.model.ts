import { EMAIL_REGEX, INTERNATIONAL_PHONE_REGEX, VIETNAM_PHONE_REGEX } from '@/constants/regex';
import { IUser } from '@/types';
import { IAddresses, IHealthProfile, Role, UserStatus } from '@/types/user.type';
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
    district: { type: String, required: true, trim: true },
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
    role: { type: String, required: true, enum: Role, default: Role.CUSTOMER },
    isHealthSetup: { type: Boolean, default: false },
    loginFailedCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    status: { type: String, required: true, enum: UserStatus, default: UserStatus.ACTIVE },
    collectedPoints: {
      type: Number,
      default: 0,
      min: [0, 'Collected points cannot be negative'],
    },
    addresses: [
      {
        type: AddressSchema,
        default: [],
      },
    ],
    health: {
      type: HealthSchema,
      default: () => ({ allergies: [] as string[], calories: 0 }),
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
