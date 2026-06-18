import { apiClient as API } from '@/lib/api-client';

export interface IStore {
  _id: string;
  name: string;
  location: {
    type: 'Point';
    coordinates: number[]; // [lng, lat]
  };
  address: string;
  district: string;
  isActive: boolean;
}

export const getStores = (): Promise<{ success: boolean; data: IStore[] }> => {
  return API.get('/stores').then((res: any) => res.data);
};

// ── Admin store management ────────────────────────────────────

export interface AdminStoresParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}

export interface CreateStorePayload {
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  address: string;
  district: string;
}

export type UpdateStorePayload = Partial<CreateStorePayload>;

export interface AdminStoresResult {
  success: boolean;
  data: IStore[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
  };
}

export const getAdminStores = (params?: AdminStoresParams): Promise<AdminStoresResult> => {
  return API.get('/admin/stores', { params }).then((res: any) => res.data);
};

export const getAdminStoreById = (id: string): Promise<{ success: boolean; data: IStore }> => {
  return API.get(`/admin/stores/${id}`).then((res: any) => res.data);
};

export const createAdminStore = (data: CreateStorePayload): Promise<{ success: boolean; data: IStore; message: string }> => {
  return API.post('/admin/stores', data).then((res: any) => res.data);
};

export const updateAdminStore = (id: string, data: UpdateStorePayload): Promise<{ success: boolean; data: IStore; message: string }> => {
  return API.put(`/admin/stores/${id}`, data).then((res: any) => res.data);
};

export const deactivateStore = (id: string): Promise<{ success: boolean; data: IStore; message: string }> => {
  return API.patch(`/admin/stores/${id}/deactivate`).then((res: any) => res.data);
};

export const activateStore = (id: string): Promise<{ success: boolean; data: IStore; message: string }> => {
  return API.patch(`/admin/stores/${id}/activate`).then((res: any) => res.data);
};
