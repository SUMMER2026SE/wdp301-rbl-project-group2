import { useEffect, useState } from "react";

type LocationState = {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
  isValid: boolean | null;
  area: string | null;
};

export function useUserLocation() {
  const [state, setState] = useState<LocationState>(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return {
        lat: null,
        lng: null,
        loading: false,
        error: "Trình duyệt không hỗ trợ định vị",
        isValid: false,
        area: null,
      };
    }
    return {
      lat: null,
      lng: null,
      loading: true,
      error: null,
      isValid: null,
      area: null,
    };
  });

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`${import.meta.env.VITE_BASE_API}/location`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: latitude,
              lng: longitude,
            }),
          });

          const data = await res.json();
          console.log("📦 BACKEND RESPONSE:", data);

          setState({
            lat: latitude,
            lng: longitude,
            loading: false,
            error: null,
            isValid: data.isValid,
            area: data.area,
          });
        } catch {
          setState((s) => ({
            ...s,
            loading: false,
            error: "Không kết nối được backend",
          }));
        }
      },
      (err) => {
        // code 1: user từ chối — hành vi bình thường, không log error
        // code 2: vị trí không xác định được
        // code 3: timeout
        const messages: Record<number, string> = {
          1: "Bạn chưa cho phép truy cập vị trí",
          2: "Không xác định được vị trí",
          3: "Hết thời gian lấy vị trí",
        };
        const message = messages[err.code] ?? "Không lấy được vị trí";

        if (err.code !== 1) {
          console.warn("⚠ Geolocation error:", err.message);
        }

        setState((s) => ({
          ...s,
          loading: false,
          error: message,
          isValid: false,
        }));
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  return state;
}
