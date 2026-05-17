import mongoose from 'mongoose';
import { ISettings, IStoreHour } from '@/types/settings.type';

const StoreHourSchema = new mongoose.Schema<IStoreHour>({
  id: { type: String, required: true },
  label: { type: String, required: true },
  open: { type: Boolean, required: true },
  start: { type: String, required: true },
  end: { type: String, required: true },
}, { _id: false });

const WEEKDAYS = [
  { id: "mon", label: "Thứ Hai", open: true, start: "08:00", end: "22:00" },
  { id: "tue", label: "Thứ Ba", open: true, start: "08:00", end: "22:00" },
  { id: "wed", label: "Thứ Tư", open: true, start: "08:00", end: "22:00" },
  { id: "thu", label: "Thứ Năm", open: true, start: "08:00", end: "22:00" },
  { id: "fri", label: "Thứ Sáu", open: true, start: "08:00", end: "22:00" },
  { id: "sat", label: "Thứ Bảy", open: true, start: "08:00", end: "22:00" },
  { id: "sun", label: "Chủ Nhật", open: false, start: "08:00", end: "22:00" },
];

const SettingsSchema = new mongoose.Schema<ISettings>(
  {
    storeName: { type: String, required: true, default: 'FoodieDash Central' },
    supportEmail: { type: String, required: true, default: 'admin@foodiedash.com' },
    address: { type: String, required: true, default: '123 Đường Ẩm Thực, Quận 1, TP.HCM' },
    
    aiRecommendations: { type: Boolean, required: true, default: true },
    autoAssignDrivers: { type: Boolean, required: true, default: true },
    acceptCod: { type: Boolean, required: true, default: false },
    systemNotifications: { type: Boolean, required: true, default: true },
    
    baseDeliveryFee: { type: String, required: true, default: '25000' },
    feePerKm: { type: String, required: true, default: '5000' },
    freeDeliveryEnabled: { type: Boolean, required: true, default: true },
    freeDeliveryThreshold: { type: String, required: true, default: '150000' },
    maxDistance: { type: Number, required: true, default: 15 },
    
    hours: { type: [StoreHourSchema], required: true, default: WEEKDAYS },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISettings>('Settings', SettingsSchema);
