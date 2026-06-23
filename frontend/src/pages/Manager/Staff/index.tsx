import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Loader2,
  X,
  AlertTriangle,
  Users,
  UserCheck,
  UserX,
  LayoutGrid,
  List,
  Mail,
  Phone,
  ShieldAlert,
  Trash2,
  Briefcase
} from "lucide-react";
import staffRequestService from "@/services/staff-request.service";
import type { StaffUser, StaffDeactivateReason } from "@/services/staff-request.service";
import toast from "react-hot-toast";

const reasonOptions: { value: StaffDeactivateReason; label: string; desc: string; icon: string }[] = [
  { value: "resignation", label: "Nghỉ việc", desc: "Nhân viên chủ động xin nghỉ việc", icon: "👋" },
  { value: "violation", label: "Vi phạm", desc: "Vi phạm quy chế, chính sách cửa hàng", icon: "⚠️" },
  { value: "transfer", label: "Chuyển chi nhánh", desc: "Điều động sang cơ sở khác", icon: "🏢" },
  { value: "other", label: "Lý do khác", desc: "Các nguyên nhân đặc biệt khác", icon: "📝" },
];

const ManagerStaff = () => {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [deactivateReason, setDeactivateReason] = useState<StaffDeactivateReason | "">("");
  const [deactivateNote, setDeactivateNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await staffRequestService.getManagerStaff();
      setStaff(res.data ?? []);
    } catch (err: unknown) {
      toast.error("Không thể tải danh sách nhân viên");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStaff();
  }, []);

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      const matchesSearch =
        !search ||
        s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.phone?.includes(search) ||
        s.username.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.status === "active") ||
        (statusFilter === "inactive" && s.status !== "active");

      return matchesSearch && matchesStatus;
    });
  }, [staff, search, statusFilter]);

  const stats = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((s) => s.status === "active").length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [staff]);

  const handleDeactivate = async () => {
    if (!selectedStaff || !deactivateReason) return;
    setSaving(true);
    try {
      await staffRequestService.createManagerDeactivateStaffRequest({
        targetStaffId: selectedStaff._id,
        reason: deactivateReason,
        note: deactivateNote || undefined,
      });
      toast.success(`Đã tạm khóa tài khoản và gửi đề xuất xử lý nhân viên ${selectedStaff.fullName || selectedStaff.username}`);
      setSelectedStaff(null);
      setDeactivateReason("");
      setDeactivateNote("");
      void fetchStaff();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Không thể tạo đề xuất";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white border border-orange-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.2em] text-orange-500 flex items-center gap-1.5">
            Nhân sự chi nhánh
          </span>
          <h1 className="mt-2 text-3xl font-black text-slate-950 tracking-tight">
            Quản lý Nhân viên
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Xem danh sách nhân viên đang hoạt động tại chi nhánh và gửi đề xuất xử lý nhân sự lên hệ thống.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng nhân sự</p>
            <p className="text-3xl font-black text-slate-950 mt-0.5">{loading ? "—" : stats.total}</p>
          </div>
        </div>

        <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang hoạt động</p>
            <p className="text-3xl font-black text-emerald-600 mt-0.5">{loading ? "—" : stats.active}</p>
          </div>
        </div>

        <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tạm khóa / Ngưng</p>
            <p className="text-3xl font-black text-rose-600 mt-0.5">{loading ? "—" : stats.inactive}</p>
          </div>
        </div>
      </div>

      {/* Filter & Controls */}
      <div className="bg-white border border-orange-100 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-10 text-sm font-semibold outline-none transition-all duration-200 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/50"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Tab Filters */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === "all"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
                }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === "active"
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
                }`}
            >
              Hoạt động
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === "inactive"
                ? "bg-white text-rose-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
                }`}
            >
              Đã tạm dừng
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-xl transition-all ${viewMode === "grid"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
                }`}
              title="Xem dạng thẻ"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-xl transition-all ${viewMode === "table"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
                }`}
              title="Xem dạng bảng"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main List Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-3xl p-5 space-y-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-50">
                <div className="h-3 bg-slate-200 rounded w-5/6" />
                <div className="h-3 bg-slate-200 rounded w-4/6" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="h-6 bg-slate-200 rounded-full w-20" />
                <div className="h-8 bg-slate-200 rounded-xl w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-orange-100 rounded-3xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto text-orange-500 mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-950">Không tìm thấy nhân viên</h3>
          <p className="text-sm font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
            Không tìm thấy nhân viên nào khớp với điều kiện tìm kiếm hoặc bộ lọc của bạn.
          </p>
          {(search || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="mt-5 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-2xl transition-all shadow-sm"
            >
              Xoá bộ lọc
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <div
              key={member._id}
              className="bg-white border border-orange-100/70 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 border border-orange-100/50 text-base font-black text-orange-600 shadow-inner group-hover:scale-105 transition-all">
                    {member.fullName?.charAt(0) || member.username.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-950 truncate group-hover:text-orange-600 transition-colors">
                      {member.fullName || member.username}
                    </h4>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                      @{member.username}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5 text-slate-600 text-xs font-semibold border-t border-slate-50 pt-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span className="capitalize">{member.role?.toLowerCase() || "Staff"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-50">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${member.status === "active"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-rose-100 bg-rose-50 text-rose-700"
                    }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${member.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                  {member.status === "active" ? "Hoạt động" : "Tạm ngưng"}
                </span>

                {member.status === "active" && (
                  <button
                    type="button"
                    onClick={() => setSelectedStaff(member)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 transition-all hover:scale-105 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Tạm khóa tài khoản
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-orange-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-black uppercase tracking-wider text-slate-400">
                  <th className="p-4 pl-6">Nhân viên</th>
                  <th className="p-4">Email / Số điện thoại</th>
                  <th className="p-4">Vai trò</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((member) => (
                  <tr key={member._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 border border-orange-100/50 text-sm font-black text-orange-600">
                          {member.fullName?.charAt(0) || member.username.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-950 group-hover:text-orange-600 transition-colors">
                            {member.fullName || member.username}
                          </p>
                          <p className="text-xs font-semibold text-slate-400">@{member.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold text-slate-600">{member.email}</div>
                      {member.phone && <div className="text-xs font-semibold text-slate-400">{member.phone}</div>}
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-500 capitalize">
                      {member.role?.toLowerCase() || "Staff"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${member.status === "active"
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : "border-rose-100 bg-rose-50 text-rose-700"
                          }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${member.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {member.status === "active" ? "Hoạt động" : "Tạm ngưng"}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      {member.status === "active" && (
                        <button
                          type="button"
                          onClick={() => setSelectedStaff(member)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-black text-rose-600 hover:bg-rose-50 transition-all hover:scale-105 active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Tạm khóa tài khoản
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deactivate Request Modal */}
      {selectedStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSelectedStaff(null)}
        >
          <div
            className="w-full max-w-lg space-y-6 rounded-[2.5rem] border border-orange-100 bg-white p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-rose-500 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Đề xuất ngưng hoạt động
                </span>
                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  {selectedStaff.fullName || selectedStaff.username}
                </h3>
                <p className="text-xs font-semibold text-slate-400 mt-1">@{selectedStaff.username} · {selectedStaff.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Custom Reason Cards Selector */}
            <div className="space-y-3">
              <span className="text-sm font-black text-slate-950 block">
                Lý do đề xuất <span className="text-rose-500">*</span>
              </span>
              <div className="grid grid-cols-2 gap-3">
                {reasonOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDeactivateReason(opt.value)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${deactivateReason === opt.value
                      ? "border-orange-500 bg-orange-50/50 shadow-sm"
                      : "border-slate-100 hover:border-orange-200 bg-white"
                      }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <div>
                      <p className="text-xs font-black text-slate-950">{opt.label}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5 line-clamp-1">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-950 block" htmlFor="deactivate-note">
                Ghi chú bổ sung
              </label>
              <textarea
                id="deactivate-note"
                value={deactivateNote}
                onChange={(e) => setDeactivateNote(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-4 py-3 text-sm font-semibold outline-none transition-all duration-200 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                placeholder="Cung cấp thêm chi tiết hoặc lý do cụ thể..."
              />
            </div>

            {/* Caution Banner */}
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100/50 p-4">
              <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600 animate-bounce" />
              <p className="text-xs font-bold leading-5 text-amber-800">
                Lưu ý: Tài khoản nhân viên sẽ bị tạm ngưng hoạt động/khóa ngay lập tức. Đề xuất xử lý chính thức sẽ được tự động gửi lên Admin để phê duyệt.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => void handleDeactivate()}
                disabled={saving || !deactivateReason || !selectedStaff}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-6 py-3 text-sm font-black text-white hover:bg-rose-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Đang xử lý..." : "Khóa & Đề xuất"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerStaff;
