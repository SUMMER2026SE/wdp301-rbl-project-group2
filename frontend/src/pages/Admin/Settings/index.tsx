import { useState, useEffect } from "react";
import { getStoreSettings, updateStoreSettings } from "@/services/settings.service";
import { useToast, ToastContainer } from "@/hooks/useToast";

const WEEKDAYS = [
  { id: "mon", label: "Thứ Hai", open: true, start: "08:00", end: "22:00" },
  { id: "tue", label: "Thứ Ba", open: true, start: "08:00", end: "22:00" },
  { id: "wed", label: "Thứ Tư", open: true, start: "08:00", end: "22:00" },
  { id: "thu", label: "Thứ Năm", open: true, start: "08:00", end: "22:00" },
  { id: "fri", label: "Thứ Sáu", open: true, start: "08:00", end: "22:00" },
  { id: "sat", label: "Thứ Bảy", open: true, start: "08:00", end: "22:00" },
  { id: "sun", label: "Chủ Nhật", open: false, start: "08:00", end: "22:00" },
];

const AdminSettings = () => {
  const [storeName, setStoreName] = useState("FoodieDash Central");
  const [supportEmail, setSupportEmail] = useState("admin@foodiedash.com");
  const [address, setAddress] = useState("123 Đường Ẩm Thực, Quận 1, TP.HCM");
  const [aiRecommendations, setAiRecommendations] = useState(true);
  const [autoAssignDrivers, setAutoAssignDrivers] = useState(true);
  const [acceptCod, setAcceptCod] = useState(false);
  const [systemNotifications, setSystemNotifications] = useState(true);
  const [baseDeliveryFee, setBaseDeliveryFee] = useState("25000");
  const [feePerKm, setFeePerKm] = useState("5000");
  const [freeDeliveryEnabled, setFreeDeliveryEnabled] = useState(true);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState("150000");
  const [maxDistance, setMaxDistance] = useState(15);
  const [hours, setHours] = useState(WEEKDAYS);
  const { toasts, toast, dismiss } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoreSettings().then(res => {
      const data = res.data;
      if (data) {
        setStoreName(data.storeName);
        setSupportEmail(data.supportEmail);
        setAddress(data.address);
        setAiRecommendations(data.aiRecommendations);
        setAutoAssignDrivers(data.autoAssignDrivers);
        setAcceptCod(data.acceptCod);
        setSystemNotifications(data.systemNotifications);
        setBaseDeliveryFee(data.baseDeliveryFee);
        setFeePerKm(data.feePerKm);
        setFreeDeliveryEnabled(data.freeDeliveryEnabled);
        setFreeDeliveryThreshold(data.freeDeliveryThreshold);
        setMaxDistance(data.maxDistance);
        if (data.hours && data.hours.length > 0) setHours(data.hours);
      }
    }).catch(err => {
      console.error(err);
      toast("Lỗi tải cấu hình", "error");
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateStoreSettings({
        storeName,
        supportEmail,
        address,
        aiRecommendations,
        autoAssignDrivers,
        acceptCod,
        systemNotifications,
        baseDeliveryFee,
        feePerKm,
        freeDeliveryEnabled,
        freeDeliveryThreshold,
        maxDistance,
        hours
      });
      toast("Đã lưu cấu hình cửa hàng", "success");
    } catch (error) {
      toast("Lỗi lưu cấu hình", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (id: string) => {
    setHours((prev) =>
      prev.map((d) => (d.id === id ? { ...d, open: !d.open } : d))
    );
  };

  return (
    <div className="max-w-7xl mx-auto w-full pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Cài đặt hệ thống
        </h1>
        <p className="text-muted-foreground mt-2">
          Quản lý vận hành cửa hàng, quy tắc giao hàng và cấu hình nền tảng.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Store Profile Card */}
        <section className="bg-card p-8 rounded-xl shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary">store</span>
            <h2 className="text-xl font-semibold text-foreground">
              Thông tin cửa hàng
            </h2>
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <img
                  className="w-24 h-24 rounded-full object-cover border-4 border-muted"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDa5Wrbz8bM7QxzZw9QxD8xdpi47Scbz_PcTkg4C1_3DUVLLaxIWoEUwas1iZkdB-sfxEdCa-jF_rJJU2mAAeNqDEHdc4qfSdFA7W-JI242QDqvbDQovNmXBMZDqXkOL5vX6AxoZVLYwsmMzbqsWe-8g8j8YiIiDYZdBFiRkHd7xF0PHlgLkA_ohVMJc3G1mc6eO-hSgWR1W0-mfOiFts9xVo9TzF59u7JR6DdwHaAEhFMw-NLFbFiVU0HCT-EnL4lU9iBMp8pFV9o"
                  alt="Logo"
                />
                <button
                  type="button"
                  className="absolute bottom-0 right-0 bg-primary p-2 rounded-full text-primary-foreground shadow-lg hover:scale-105 transition-transform"
                >
                  <span className="material-symbols-outlined text-sm">
                    photo_camera
                  </span>
                </button>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Logo thương hiệu</h3>
                <p className="text-sm text-muted-foreground">
                  JPG, PNG hoặc SVG vuông. Tối đa 2MB.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tên cửa hàng
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email hỗ trợ
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Địa chỉ đầy đủ
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:border-primary focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Operational Settings Card */}
        <section className="bg-card p-8 rounded-xl shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary">tune</span>
            <h2 className="text-xl font-semibold text-foreground">
              Cài đặt vận hành
            </h2>
          </div>
          <div className="space-y-6">
            {[
              {
                id: "ai",
                icon: "psychology",
                title: "Gợi ý sức khỏe AI",
                desc: "Gợi ý món ăn ít calo thay thế cho người dùng",
                checked: aiRecommendations,
                setChecked: setAiRecommendations,
              },
              {
                id: "drivers",
                icon: "local_shipping",
                title: "Tự động phân tài xế nội bộ",
                desc: "Phân công tài xế gần nhất tự động",
                checked: autoAssignDrivers,
                setChecked: setAutoAssignDrivers,
              },
              {
                id: "cod",
                icon: "payments",
                title: "Chấp nhận thanh toán COD",
                desc: "Cho phép thanh toán khi nhận hàng",
                checked: acceptCod,
                setChecked: setAcceptCod,
              },
              {
                id: "notif",
                icon: "notifications_active",
                title: "Thông báo hệ thống",
                desc: "Cảnh báo admin khi đơn hàng trễ",
                checked: systemNotifications,
                setChecked: setSystemNotifications,
              },
            ].map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-muted-foreground">
                    {item.icon}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.setChecked(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:border-white" />
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* Store Hours - Full Width */}
        <section className="xl:col-span-2 bg-card p-8 rounded-xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">
                schedule
              </span>
              <h2 className="text-xl font-semibold text-foreground">
                Giờ hoạt động
              </h2>
            </div>
            <button
              type="button"
              className="text-sm text-primary font-medium hover:underline"
            >
              Áp dụng cho tất cả ngày làm việc
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4 px-4 text-sm font-semibold text-muted-foreground border-b border-border pb-2">
              <div className="col-span-3">Ngày trong tuần</div>
              <div className="col-span-2 text-center">Trạng thái</div>
              <div className="col-span-3">Giờ mở</div>
              <div className="col-span-3">Giờ đóng</div>
              <div className="col-span-1" />
            </div>
            {hours.map((day) => (
              <div
                key={day.id}
                className={`grid grid-cols-12 gap-4 px-4 py-2 items-center rounded-lg transition-colors ${
                  !day.open ? "bg-muted/30 opacity-60" : "hover:bg-muted/30"
                }`}
              >
                <div
                  className={`col-span-3 font-medium ${
                    day.open ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {day.label}
                </div>
                <div className="col-span-2 flex justify-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      day.open
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {day.open ? "Mở" : "Đóng"}
                  </span>
                </div>
                <div className="col-span-3">
                  <input
                    type="time"
                    value={day.start}
                    disabled={!day.open}
                    onChange={(e) =>
                      setHours((prev) =>
                        prev.map((d) =>
                          d.id === day.id ? { ...d, start: e.target.value } : d
                        )
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:border-primary disabled:opacity-50"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="time"
                    value={day.end}
                    disabled={!day.open}
                    onChange={(e) =>
                      setHours((prev) =>
                        prev.map((d) =>
                          d.id === day.id ? { ...d, end: e.target.value } : d
                        )
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:border-primary disabled:opacity-50"
                  />
                </div>
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`material-symbols-outlined transition-colors ${
                      day.open ? "text-muted-foreground hover:text-red-500" : "text-primary"
                    }`}
                  >
                    power_settings_new
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Delivery Configuration */}
        <section className="bg-card p-8 rounded-xl shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary">
              delivery_dining
            </span>
            <h2 className="text-xl font-semibold text-foreground">
              Cấu hình giao hàng
            </h2>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Phí giao hàng cơ bản (đ)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    đ
                  </span>
                  <input
                    type="number"
                    value={baseDeliveryFee}
                    onChange={(e) => setBaseDeliveryFee(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Phí mỗi km (đ)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    đ
                  </span>
                  <input
                    type="number"
                    value={feePerKm}
                    onChange={(e) => setFeePerKm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground focus:border-primary"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    card_giftcard
                  </span>
                  <span className="font-semibold text-foreground">
                    Ngưỡng miễn phí giao hàng
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={freeDeliveryEnabled}
                    onChange={(e) => setFreeDeliveryEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    đ
                  </span>
                  <input
                    type="number"
                    value={freeDeliveryThreshold}
                    onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground focus:border-primary"
                  />
                </div>
                <p className="text-xs text-muted-foreground max-w-[150px]">
                  Đơn hàng trên mức này được miễn phí giao hàng.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Khoảng cách giao hàng tối đa (km)
              </label>
              <input
                type="range"
                min={1}
                max={50}
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>1km</span>
                <span className="text-primary font-bold">{maxDistance}km</span>
                <span>50km</span>
              </div>
            </div>
          </div>
        </section>

        {/* Delivery Zones */}
        <section className="bg-card p-8 rounded-xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">map</span>
              <h2 className="text-xl font-semibold text-foreground">
                Khu vực giao hàng
              </h2>
            </div>
            <button
              type="button"
              className="text-xs px-3 py-1 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Chỉnh sửa khu vực
            </button>
          </div>
          <div className="relative h-64 w-full rounded-lg overflow-hidden bg-muted">
            <img
              className="w-full h-full object-cover opacity-60 grayscale"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5eVddyJvUpgIjy6qX2UwRHCmXJVfZy5yKL3N6cV-YKGZ46-MTlYlkn9jP6zywfJFZ_6of1a1QPbVRbr4LZMcqze-rWDzawK6e3M3Zd8Xb8Yv26WRsoHU9YvYruwPBYlA33NBHi9AH8HYvHHw3L1y9LhMF0O5YTBUiMGzQa7tshMjd2XfrCP6Nw8-BvK_B9h_BE8nJQYMDRMancH8Wy3mvrn17IM4MocSPc7ogv2GCeVP3MFPdXZczJ2eLgTsh2jdwl2yD3e_jQKQ"
              alt="Map"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border-4 border-primary/40 bg-primary/10 rounded-full animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Khu vực phục vụ hiện tại trong bán kính {maxDistance}km từ trung tâm.
          </p>
        </section>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-64 right-0 bg-card/80 backdrop-blur-md border-t border-border p-4 px-8 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="material-symbols-outlined text-sm">history</span>
            <span className="text-xs italic">Đã lưu lần cuối: Hôm nay 10:45</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="px-6 py-2.5 text-muted-foreground font-medium hover:bg-muted rounded-lg transition-colors"
            >
              Đặt lại
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-8 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">
                {loading ? "hourglass_empty" : "save"}
              </span>
              Lưu tất cả
            </button>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default AdminSettings;
