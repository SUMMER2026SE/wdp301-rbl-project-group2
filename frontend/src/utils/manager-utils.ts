import type {
  AdminManagerResponse,
  ManagerAPI,
  ManagerMember,
  ManagerStatus,
  StoreOption,
} from "@/types/adminManager";

export const getStoreName = (store: StoreOption) => {
  return store.name || store.storeName || "Cửa hàng chưa đặt tên";
};

export const extractManagersFromResponse = (
  response: AdminManagerResponse,
): ManagerAPI[] => {
  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (response.data && typeof response.data === "object") {
    return response.data.managers || response.data.users || [];
  }

  return response.managers || response.users || [];
};

export const normalizeManagerFromApi = (manager: ManagerAPI): ManagerMember => {
  const store =
    manager.storeId && typeof manager.storeId === "object"
      ? manager.storeId
      : null;

  return {
    id: manager._id,
    name: manager.fullName ?? manager.name ?? "—",
    email: manager.email ?? "—",
    phone: manager.phone ?? manager.phoneNumber ?? "—",
    role: "manager",
    status: manager.status ?? (manager.isActive ? "active" : "inactive"),
    storeId:
      typeof manager.storeId === "string"
        ? manager.storeId
        : (manager.storeId?._id ?? ""),
    storeName: store ? getStoreName(store) : "Chưa gắn cửa hàng",
    storeAddress: store?.address,
    joinDate: manager.createdAt,
    lastActive: manager.updatedAt,
  };
};

export const getStatusBadge = (status: ManagerStatus) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";
    case "inactive":
      return "bg-gray-100 text-gray-600";
    case "blocked":
      return "bg-red-100 text-red-700";
    case "deleted":
      return "bg-zinc-100 text-zinc-500";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

export const getStatusLabel = (status: ManagerStatus) => {
  switch (status) {
    case "active":
      return "Đang hoạt động";
    case "inactive":
      return "Chưa kích hoạt";
    case "blocked":
      return "Đã khóa";
    case "deleted":
      return "Đã xóa";
    default:
      return "N/A";
  }
};

export const getStatusDotClass = (status: ManagerStatus) => {
  switch (status) {
    case "active":
      return "bg-green-600";
    case "inactive":
      return "bg-gray-500";
    case "blocked":
      return "bg-red-600";
    case "deleted":
      return "bg-zinc-500";
    default:
      return "bg-gray-500";
  }
};

export const getTimeAgo = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;

    return `${days} ngày trước`;
  } catch {
    return "N/A";
  }
};
