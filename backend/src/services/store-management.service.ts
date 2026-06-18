import mongoose from 'mongoose';
import { StoreModel } from '@/models';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';

export const listAllStores = async (
  page: number = 1,
  limit: number = 20,
  filters: { isActive?: boolean; search?: string } = {}
) => {
  const query: Record<string, any> = {};

  if (typeof filters.isActive === 'boolean') {
    query.isActive = filters.isActive;
  }

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { address: { $regex: filters.search, $options: 'i' } },
      { district: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [stores, total] = await Promise.all([
    StoreModel.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    StoreModel.countDocuments(query),
  ]);

  return {
    stores,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const getStoreById = async (storeId: string) => {
  appAssert(mongoose.Types.ObjectId.isValid(storeId), BAD_REQUEST, 'Id cửa hàng không hợp lệ');

  const store = await StoreModel.findById(storeId).lean();
  appAssert(store, NOT_FOUND, 'Không tìm thấy cửa hàng');

  return store;
};

export const createStore = async (data: {
  name: string;
  location: { type: 'Point'; coordinates: number[] };
  address: string;
  district: string;
}) => {
  const store = await StoreModel.create(data);
  return store.toObject();
};

export const updateStore = async (
  storeId: string,
  data: {
    name?: string;
    location?: { type: 'Point'; coordinates: number[] };
    address?: string;
    district?: string;
  }
) => {
  appAssert(mongoose.Types.ObjectId.isValid(storeId), BAD_REQUEST, 'Id cửa hàng không hợp lệ');

  const store = await StoreModel.findByIdAndUpdate(storeId, { $set: data }, { new: true, runValidators: true }).lean();
  appAssert(store, NOT_FOUND, 'Không tìm thấy cửa hàng');

  return store;
};

export const setStoreActive = async (storeId: string, isActive: boolean) => {
  appAssert(mongoose.Types.ObjectId.isValid(storeId), BAD_REQUEST, 'Id cửa hàng không hợp lệ');

  const store = await StoreModel.findByIdAndUpdate(storeId, { $set: { isActive } }, { new: true }).lean();

  appAssert(store, NOT_FOUND, 'Không tìm thấy cửa hàng');

  return store;
};
