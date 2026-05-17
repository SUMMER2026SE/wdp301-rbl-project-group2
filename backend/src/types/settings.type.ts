import mongoose from 'mongoose';

export interface IStoreHour {
  id: string;
  label: string;
  open: boolean;
  start: string;
  end: string;
}

export interface ISettings extends mongoose.Document {
  storeName: string;
  supportEmail: string;
  address: string;
  aiRecommendations: boolean;
  autoAssignDrivers: boolean;
  acceptCod: boolean;
  systemNotifications: boolean;
  baseDeliveryFee: string;
  feePerKm: string;
  freeDeliveryEnabled: boolean;
  freeDeliveryThreshold: string;
  maxDistance: number;
  hours: IStoreHour[];
}
