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
