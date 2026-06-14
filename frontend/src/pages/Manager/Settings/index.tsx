import { useEffect, useState } from "react";
import { Clock, Loader2, Save, Store, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";
import managerDashboardService, { type ManagerStoreSettings } from "@/services/manager-dashboard.service";

const ManagerSettings = () => {
  const [settings, setSettings] = useState<ManagerStoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await managerDashboardService.getManagerSettings();
        setSettings(response.data);
      } catch (error) {
        console.error("Failed to load manager settings:", error);
        toast.error("Không tải được cài đặt chi nhánh");
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const updateField = (field: "open" | "close", value: string) => {
    setSettings((current) =>
      current
        ? { ...current, openHours: { ...current.openHours, [field]: value } }
        : current,
    );
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const toastId = toast.loading("Đang lưu cài đặt chi nhánh...");
    try {
      const response = await managerDashboardService.updateManagerSettings({
        openHours: settings.openHours,
        isOpen: settings.isOpen,
      });
      setSettings(response.data);
      toast.success("Đã lưu cài đặt chi nhánh", { id: toastId });
    } catch (error) {
      console.error("Failed to save manager settings:", error);
      toast.error("Không lưu được cài đặt chi nhánh", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!settings) {
    return <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-sm font-bold text-rose-600">Không tìm thấy cài đặt chi nhánh.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">Manager Space</p>
            <h1 className="text-2xl font-black text-slate-950">Cài đặt chi nhánh</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">Thiết lập giờ vận hành và giờ chốt COD cuối ngày.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-slate-950">
            <Clock className="h-5 w-5 text-orange-500" />
            Giờ vận hành
          </h2>
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Giờ mở cửa</span>
              <input type="time" value={settings.openHours.open} onChange={(e) => updateField("open", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-orange-400" />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Giờ đóng cửa / chốt COD</span>
              <input type="time" value={settings.openHours.close} onChange={(e) => updateField("close", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-orange-400" />
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-black text-slate-950">Trạng thái nhận đơn</h2>
          <button type="button" onClick={() => setSettings((current) => current ? { ...current, isOpen: !current.isOpen } : current)} className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left transition-all ${settings.isOpen ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"}`}>
            <div>
              <p className="text-sm font-black">{settings.isOpen ? "Chi nhánh đang nhận đơn" : "Chi nhánh đang tạm đóng"}</p>
              <p className="mt-1 text-xs font-semibold opacity-80">Tùy chọn này dùng cho vận hành nội bộ của chi nhánh.</p>
            </div>
            {settings.isOpen ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
          </button>
        </section>
      </div>

      <div className="flex justify-end">
        <button disabled={saving} onClick={() => void saveSettings()} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 text-xs font-black text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Đang lưu..." : "Lưu cài đặt"}
        </button>
      </div>
    </div>
  );
};

export default ManagerSettings;
