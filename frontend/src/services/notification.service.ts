import { apiClient } from "@/lib/api-client";

const notificationService = {
  getMyNotifications: () => apiClient.get("/notifications"),
  getUnreadCount: () => apiClient.get("/notifications/unread-count"),
  markAsRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.patch("/notifications/read-all"),
};

export default notificationService;
