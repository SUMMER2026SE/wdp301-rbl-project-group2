import mongoose from 'mongoose';

export interface IStore extends mongoose.Document<mongoose.Types.ObjectId> {
  name: string;
  location: {
    type: 'Point';
    coordinates: number[]; // [lng, lat]
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStoreSettings extends mongoose.Document<mongoose.Types.ObjectId> {
  storeId: mongoose.Types.ObjectId;
  openHours: {
    open: string;  // e.g. "08:00"
    close: string; // e.g. "22:00"
  };
  provider: string; // shipping provider
  isOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
}
