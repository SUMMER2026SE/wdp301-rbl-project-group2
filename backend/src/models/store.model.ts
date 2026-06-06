import { IStore, IStoreSettings } from '@/types/store.type';
import mongoose from 'mongoose';

// --- STORES ---
const StoreSchema = new mongoose.Schema<IStore>(
  {
    name: { type: String, required: true, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: { type: String, required: true },
    district: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
StoreSchema.index({ location: '2dsphere' });
StoreSchema.index({ isActive: 1 });

export const StoreModel = mongoose.model<IStore>('Store', StoreSchema, 'stores');

// --- STORE SETTINGS ---
const StoreSettingsSchema = new mongoose.Schema<IStoreSettings>(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, unique: true },
    openHours: {
      open: { type: String, required: true }, // e.g. "08:00"
      close: { type: String, required: true }, // e.g. "22:00"
    },
    provider: { type: String, trim: true },
    isOpen: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
StoreSettingsSchema.index({ storeId: 1 }, { unique: true });

export const StoreSettingsModel = mongoose.model<IStoreSettings>('StoreSettings', StoreSettingsSchema, 'store_settings');
