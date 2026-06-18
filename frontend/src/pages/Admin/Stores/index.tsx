import { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { Store, Plus, Pencil, Ban, CheckCircle, Loader2, MapPin, Navigation } from "lucide-react";
import { AdminDrawer } from "@/components/shared/AdminDrawer";
import toast from "react-hot-toast";
import {
  getAdminStores,
  createAdminStore,
  updateAdminStore,
  deactivateStore,
  activateStore,
  type IStore,
  type AdminStoresParams,
  type CreateStorePayload,
  type UpdateStorePayload,
} from "@/services/store.service";
import { DELIVERABLE_CITY, DELIVERABLE_WARDS } from "@/utils/shipping";
import ConfirmModal from "@/components/modal/ConfirmModal";

const OTHER_CITY = "Khác";
const CITY_OPTIONS = [DELIVERABLE_CITY, OTHER_CITY];

const normalizeStoreStatus = (isActive: boolean): "active" | "inactive" =>
  isActive ? "active" : "inactive";

const getStatusBadge = (status: "active" | "inactive") => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700 border-green-200";
    case "inactive":
      return "bg-gray-100 text-gray-500 border-gray-200";
  }
};

const getStatusLabel = (status: "active" | "inactive") => {
  switch (status) {
    case "active":
      return "Hoạt động";
    case "inactive":
      return "Không HĐ";
  }
};

const EMPTY_FORM: CreateStorePayload = {
  name: "",
  location: { type: "Point", coordinates: [106.6297, 10.8231] },
  address: "",
  district: "",
};

const AdminStores = () => {
  const [stores, setStores] = useState<IStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateStorePayload>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coordsStr, setCoordsStr] = useState("106.6297, 10.8231");
  const [city, setCity] = useState(DELIVERABLE_CITY);
  const [ward, setWard] = useState("");

  // Confirm modal state for activate/deactivate
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<IStore | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: AdminStoresParams = { page: 1, limit: 100 };
      if (statusFilter !== "all") {
        params.isActive = statusFilter === "active";
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const res = await getAdminStores(params);
      setStores(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Lỗi tải danh sách cửa hàng:", err);
      setError("Không thể tải danh sách cửa hàng.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const parseCoordinates = (raw: string): [number, number] | null => {
    const parts = raw.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && parts.every((n) => !isNaN(n))) {
      return [parts[0], parts[1]] as [number, number];
    }
    return null;
  };

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setEditingStoreId(null);
    setFormData(EMPTY_FORM);
    setCoordsStr("106.6297, 10.8231");
    setCity(DELIVERABLE_CITY);
    setWard("");
    setDrawerOpen(true);
  };

  const openEditDrawer = (store: IStore) => {
    setDrawerMode("edit");
    setEditingStoreId(store._id);
    setFormData({
      name: store.name,
      location: store.location as CreateStorePayload["location"],
      address: store.address,
      district: store.district,
    });
    setCoordsStr(`${store.location.coordinates[0]}, ${store.location.coordinates[1]}`);
    // Parse district to extract city + ward (district format: "WardName, City" or just "WardName")
    const district = store.district || "";
    const knownCity = CITY_OPTIONS.find((c) => district.endsWith(c));
    if (knownCity) {
      setCity(knownCity);
      setWard(district.slice(0, district.lastIndexOf(knownCity)).replace(/,\s*$/, "").trim());
    } else {
      setCity(DELIVERABLE_CITY);
      setWard(district);
    }
    setDrawerOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên cửa hàng");
      return;
    }
    if (!formData.address.trim()) {
      toast.error("Vui lòng nhập địa chỉ");
      return;
    }
    if (!city.trim() || city === OTHER_CITY) {
      toast.error("Hiện chỉ hỗ trợ cửa hàng tại Đà Nẵng");
      return;
    }
    if (city === DELIVERABLE_CITY && !ward.trim()) {
      toast.error("Vui lòng chọn phường/xã");
      return;
    }

    const coords = parseCoordinates(coordsStr);
    if (!coords) {
      toast.error("Tọa độ không hợp lệ (định dạng: lng, lat)");
      return;
    }

    const district = ward ? `${ward}, ${city}` : city;

    const payload: CreateStorePayload = {
      ...formData,
      location: { type: "Point", coordinates: coords },
      district,
    };

    setIsSubmitting(true);
    try {
      if (drawerMode === "create") {
        await createAdminStore(payload);
        toast.success("Đã tạo cửa hàng mới");
      } else if (editingStoreId) {
        const updatePayload: UpdateStorePayload = {
          name: payload.name,
          location: payload.location,
          address: payload.address,
          district: payload.district,
        };
        await updateAdminStore(editingStoreId, updatePayload);
        toast.success("Đã cập nhật cửa hàng");
      }
      setDrawerOpen(false);
      fetchStores();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Thao tác thất bại";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestToggle = (store: IStore) => {
    setConfirmTarget(store);
    setConfirmOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!confirmTarget) return;
    const store = confirmTarget;
    setTogglingActive(true);
    try {
      if (store.isActive) {
        await deactivateStore(store._id);
        toast.success(`Đã vô hiệu hóa cửa hàng "${store.name}"`);
      } else {
        await activateStore(store._id);
        toast.success(`Đã kích hoạt cửa hàng "${store.name}"`);
      }
      setConfirmOpen(false);
      setConfirmTarget(null);
      fetchStores();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Thao tác thất bại";
      toast.error(msg);
    } finally {
      setTogglingActive(false);
    }
  };

  const handleCancelToggle = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#1b140d]">
            Quản lý cửa hàng
          </h2>
          <p className="text-[#9a734c] mt-1">
            Tạo, cập nhật và quản lý trạng thái hoạt động của các chi nhánh.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateDrawer}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#ee8c2b] text-white text-sm font-bold rounded-xl hover:bg-[#d87c24] transition-colors shadow-sm"
        >
          <Plus size={18} />
          Thêm cửa hàng
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9a734c] text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên, địa chỉ, quận..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#e7dbcf] rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
          />
        </div>
        <div className="flex border border-[#e7dbcf] rounded-xl overflow-hidden">
          {[
            { id: "all", label: "Tất cả" },
            { id: "active", label: "Hoạt động" },
            { id: "inactive", label: "Không HĐ" },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id as typeof statusFilter)}
              className={clsx(
                "px-4 py-2.5 text-sm font-semibold transition-colors",
                statusFilter === filter.id
                  ? "bg-[#ee8c2b] text-white"
                  : "bg-white text-[#9a734c] hover:bg-[#f3ede7]"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm font-bold text-rose-600">
          {error}
        </div>
      ) : stores.length === 0 ? (
        <div className="rounded-2xl border border-[#e7dbcf] bg-white p-12 text-center">
          <Store className="mx-auto h-12 w-12 text-[#9a734c]/40 mb-4" />
          <p className="text-sm font-bold text-[#9a734c]">Chưa có cửa hàng nào</p>
          <p className="text-xs text-[#9a734c]/70 mt-1">
            Nhấn "Thêm cửa hàng" để tạo chi nhánh mới.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {stores.map((store) => {
            const status = normalizeStoreStatus(store.isActive);
            return (
              <div
                key={store._id}
                className="group bg-white rounded-2xl border border-[#e7dbcf] overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Card header — status bar */}
                <div
                  className={clsx(
                    "h-1.5 w-full",
                    store.isActive ? "bg-emerald-400" : "bg-slate-300"
                  )}
                />

                <div className="p-5">
                  {/* Store name + status badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={clsx(
                          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                          store.isActive
                            ? "bg-orange-100 text-orange-600"
                            : "bg-slate-100 text-slate-400"
                        )}
                      >
                        <Store size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-[#1b140d] truncate leading-tight">
                          {store.name}
                        </h3>
                      </div>
                    </div>
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0",
                        getStatusBadge(status)
                      )}
                    >
                      <span
                        className={clsx(
                          "w-1.5 h-1.5 rounded-full",
                          store.isActive ? "bg-emerald-500" : "bg-slate-400"
                        )}
                      />
                      {getStatusLabel(status)}
                    </span>
                  </div>

                  {/* Address info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2.5">
                      <MapPin size={15} className="text-[#9a734c]/60 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[#6b5744] leading-snug">
                          {store.address}
                        </p>
                        <p className="text-xs font-medium text-[#9a734c]/80 mt-0.5">
                          {store.district}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#e7dbcf]/60">
                    <button
                      type="button"
                      onClick={() => openEditDrawer(store)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#6b5744] hover:text-[#ee8c2b] hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      <Pencil size={14} />
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestToggle(store)}
                      className={clsx(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors",
                        store.isActive
                          ? "text-red-500 hover:text-red-600 hover:bg-red-50"
                          : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      )}
                    >
                      {store.isActive ? (
                        <>
                          <Ban size={14} />
                          Vô hiệu
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} />
                          Kích hoạt
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer for Create/Edit */}
      <AdminDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerMode === "create" ? "Thêm cửa hàng mới" : "Chỉnh sửa cửa hàng"}
      >
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#9a734c] mb-2">
              Tên cửa hàng
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-xl border border-[#e7dbcf] px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              placeholder="Nhập tên cửa hàng"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#9a734c] mb-2">
              Thành phố *
            </label>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setWard("");
              }}
              className="w-full rounded-xl border border-[#e7dbcf] px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 bg-white"
            >
              <option value="">-- Chọn thành phố --</option>
              {CITY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {city && city !== DELIVERABLE_CITY && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">block</span>
                Hiện chỉ hỗ trợ cửa hàng tại khu vực Đà Nẵng
              </p>
            )}
          </div>

          {city === DELIVERABLE_CITY && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#9a734c] mb-2">
                Phường/Xã *
              </label>
              <select
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="w-full rounded-xl border border-[#e7dbcf] px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 bg-white"
              >
                <option value="">-- Chọn phường/xã --</option>
                {DELIVERABLE_WARDS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#9a734c] mb-2">
              Địa chỉ chi tiết (số nhà, tên đường) *
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full rounded-xl border border-[#e7dbcf] px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              placeholder="Số nhà, tên đường"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#9a734c] mb-2">
              Tọa độ (longitude, latitude)
            </label>
            <div className="flex items-center gap-2">
              <Navigation size={16} className="text-[#9a734c] shrink-0" />
              <input
                type="text"
                value={coordsStr}
                onChange={(e) => setCoordsStr(e.target.value)}
                className="flex-1 rounded-xl border border-[#e7dbcf] px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                placeholder="106.6297, 10.8231"
              />
            </div>
            <p className="mt-1 text-xs text-[#9a734c]/70">
              Định dạng: kinh độ, vĩ độ (VD: 106.6297, 10.8231 cho TP.HCM)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="flex-1 px-4 py-3 border border-[#e7dbcf] text-[#1b140d] font-bold rounded-xl hover:bg-[#f3ede7] transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void handleFormSubmit()}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-[#ee8c2b] text-white font-bold rounded-xl hover:bg-[#d87c24] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : drawerMode === "create" ? (
                <Plus size={18} />
              ) : (
                <Pencil size={18} />
              )}
              {isSubmitting
                ? "Đang xử lý..."
                : drawerMode === "create"
                ? "Tạo cửa hàng"
                : "Cập nhật"}
            </button>
          </div>
        </div>
      </AdminDrawer>

      <ConfirmModal
        open={confirmOpen}
        title={confirmTarget?.isActive ? "Vô hiệu hóa cửa hàng" : "Kích hoạt cửa hàng"}
        message={
          confirmTarget?.isActive
            ? `Bạn có chắc muốn vô hiệu hóa cửa hàng "${confirmTarget?.name}"? Sau khi vô hiệu hóa, cửa hàng sẽ ngừng hoạt động.`
            : `Bạn có chắc muốn kích hoạt lại cửa hàng "${confirmTarget?.name}"? Cửa hàng sẽ hoạt động trở lại.`
        }
        confirmLabel={confirmTarget?.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
        isLoading={togglingActive}
        onConfirm={handleConfirmToggle}
        onCancel={handleCancelToggle}
      />
    </div>
  );
};

export default AdminStores;
