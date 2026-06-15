export type ManagerStatus = "active" | "inactive" | "blocked" | "deleted";

export interface StoreOption {
  _id: string;
  name?: string;
  storeName?: string;
  address?: string;
  status?: string;
  isActive?: boolean;
}

export interface ManagerMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "manager";
  status: ManagerStatus;
  storeId: string;
  storeName: string;
  storeAddress?: string;
  joinDate: string;
  lastActive: string;
}

export interface ManagerAPI {
  _id: string;
  fullName?: string;
  name?: string;
  email: string;
  phone?: string;
  phoneNumber?: string;
  role: string;
  status?: ManagerStatus;
  isActive?: boolean;
  storeId?: string | StoreOption | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateManagerPayload {
  name: string;
  email: string;
  phone: string;
  storeId: string;
}

export interface AdminManagerResponse {
  success?: boolean;
  message?: string;
  data?:
    | ManagerAPI[]
    | {
        managers?: ManagerAPI[];
        users?: ManagerAPI[];
        pagination?: unknown;
      };
  managers?: ManagerAPI[];
  users?: ManagerAPI[];
}
