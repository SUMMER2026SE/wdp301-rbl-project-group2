import { EMAIL_REGEX, INTERNATIONAL_PHONE_REGEX, VIETNAM_PHONE_REGEX } from '@/constants/regex';
import { IUser } from '@/types';
import { IAddresses, IHealthProfile, Role, UserTier } from '@/types/user.type';
import { compareValue, hashValue } from '@/utils/bcrypt';
import mongoose from 'mongoose';
import { randomBytes } from 'crypto';

const isValidPhone = (v: string) => VIETNAM_PHONE_REGEX.test(v) || INTERNATIONAL_PHONE_REGEX.test(v);

const AddressSchema = new mongoose.Schema<IAddresses>(
  {
    label: { type: String, required: true, trim: true },
    receiver_name: { type: String, required: true, trim: true },
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
    district: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  {
    _id: false,
  }
);

const PreferencesSchema = new mongoose.Schema(
  {
    dietary: { type: [String], default: [] },
    allergies: { type: [String], default: [] },
    health_goals: { type: [String], default: [] },
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
    avatar_public_id: { type: String, default: null },
    password_hash: { type: String, required: true, minLength: 6 },
    role: { type: String, required: true, enum: Role, default: Role.CUSTOMER },
    verified_at: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    addresses: [
      {
        type: AddressSchema,
        default: [],
      },
    ],
    collected_points: {
      type: Number,
      default: 0,
      min: [0, 'Collected points cannot be negative'],
    },
    tier: {
      type: String,
      enum: UserTier,
      default: UserTier.BRONZE,
    },
    referral_code: {
      type: String,
      unique: true,
      uppercase: true,
    },
    referred_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    preferences: {
      type: PreferencesSchema,
      default: () => ({ dietary: [], allergies: [], health_goals: [] }),
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

//indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });

// Middleware "pre-save" trong Mongoose:
// Hàm này sẽ tự động chạy TRƯỚC KHI document được lưu (save) vào MongoDB
UserSchema.pre('save', async function (next) {
  // Generate referral_code for new users
  if (this.isNew && !this.referral_code) {
    this.referral_code = `FOODIE-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  // ✅ Kiểm tra xem field "password" có bị thay đổi không
  if (!this.isModified('password_hash')) return next();

  // ✅ Nếu password đã thay đổi hoặc là lần đầu tạo user,
  // thì hash lại password trước khi lưu vào database
  this.password_hash = await hashValue(this.password_hash);

  // ✅ Gọi next() để cho phép Mongoose tiếp tục quá trình lưu document
  next();
});

//methods
UserSchema.methods.comparePassword = async function (value: string) {
  return await compareValue(value, this.password_hash);
};

UserSchema.methods.omitPassword = function () {
  const user = this.toObject();
  delete user.password_hash;
  return user;
};

const UserModel = mongoose.model<IUser>('User', UserSchema, 'users');

export default UserModel;
