import { apiClient as API } from '@/lib/api-client';

export interface IStoreHour {
  id: string;
  label: string;
  open: boolean;
  start: string;
  end: string;
}

export interface ISettings {
  _id?: string;
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

export const getStoreSettings = (): Promise<{ data: ISettings }> => {
  return API.get('/settings').then((res: any) => res.data);
};

export const updateStoreSettings = (data: Partial<ISettings>): Promise<{ data: ISettings, message: string }> => {
  return API.put('/settings', data).then((res: any) => res.data);
};
