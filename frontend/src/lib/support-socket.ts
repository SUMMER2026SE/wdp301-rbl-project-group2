import { io, type Socket } from "socket.io-client";
import { getToken } from "@/utils/storage";

function getSocketBaseUrl() {
  const apiUrl = import.meta.env.VITE_BASE_API;
  // Socket server is mounted at root (not /api)
  return apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;
}

let socket: Socket | null = null;

export function getSupportSocket() {
  if (!socket) {
    const token = getToken();
    socket = io(getSocketBaseUrl(), {
      withCredentials: true,
      transports: ["polling", "websocket"],
      auth: token ? { accessToken: token } : undefined,
      // Automatically reconnect
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      console.debug("[SupportSocket] connected:", socket?.id);
    });

    socket.on("connect_error", (err) => {
      console.debug("[SupportSocket] connect error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.debug("[SupportSocket] disconnected:", reason);
    });
  }
  return socket;
}

/**
 * Destroy and clear the socket instance. Call this on logout.
 */
export function disconnectSupportSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Reconnect the existing socket to refresh authentication credentials (cookies).
 * Preserves any registered event listeners.
 */
export function reconnectSupportSocket() {
  if (socket) {
    console.debug("[SupportSocket] Reconnecting socket to refresh auth...");
    const token = getToken();
    socket.auth = token ? { accessToken: token } : {};
    socket.disconnect();
    socket.connect();
  }
}
