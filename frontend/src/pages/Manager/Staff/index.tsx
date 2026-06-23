import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
  Briefcase,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Inbox,
  UserPlus,
  UserMinus,
  Calendar,
  User,
  CornerDownRight,
  MessageSquare,
} from "lucide-react";
import staffRequestService from "@/services/staff-request.service";
import type { StaffUser, StaffDeactivateReason, StaffRequest, StaffRequestStatus } from "@/services/staff-request.service";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

const reasonOptions: { value: StaffDeactivateReason; label: string; desc: string; icon: string }[] = [
  { value: "resignation", label: "Nghỉ việc", desc: "Nhân viên chủ động xin nghỉ việc", icon: "👋" },
  { value: "violation", label: "Vi phạm", desc: "Vi phạm quy chế, chính sách cửa hàng", icon: "⚠️" },
  { value: "transfer", label: "Chuyển chi nhánh", desc: "Điều động sang cơ sở khác", icon: "🏢" },
  { value: "other", label: "Lý do khác", desc: "Các nguyên nhân đặc biệt khác", icon: "📝" },
];

const statusConfig: Record<StaffRequestStatus, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  pending: {
    label: "Chờ duyệt",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200/50",
    icon: <Clock className="h-4 w-4 text-amber-500 animate-spin-slow" />,
  },
  approved: {
    label: "Đã duyệt",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200/50",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  },
  rejected: {
    label: "Từ chối",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200/50",
    icon: <XCircle className="h-4 w-4 text-rose-500" />,
  },
  cancelled: {
    label: "Đã hủy",
    bg: "bg-slate-50",
    text: "text-slate-500",
    border: "border-slate-200/50",
    icon: <X className="h-4 w-4 text-slate-400" />,
  },
};

const typeConfig: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  CREATE_STAFF: {
    label: "Đề xuất thêm nhân viên",
    icon: <UserPlus className="w-4 h-4" />,
    bg: "bg-orange-50",
    text: "text-orange-700",
  },
  DEACTIVATE_STAFF: {
    label: "Đề xuất xử lý nhân sự",
    icon: <UserMinus className="w-4 h-4" />,
    bg: "bg-rose-50",
    text: "text-rose-700",
  },
};

const reasonLabel: Record<string, string> = {
  resignation: "Nghỉ việc",
  violation: "Vi phạm kỷ luật",
  transfer: "Chuyển chi nhánh",
  other: "Lý do khác",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

interface ManagerStaffProps {
  defaultTab?: "list" | "requests";
}

const ManagerStaff = ({ defaultTab }: ManagerStaffProps) => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || defaultTab || "list";

  const setActiveTab = (tab: "list" | "requests") => {
    setSearchParams({ tab });
  };

  // ── STAFF LIST STATE ────────────────────────────────────────────────────────
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [deactivateReason, setDeactivateReason] = useState<StaffDeactivateReason | "">("");
  const [deactivateNote, setDeactivateNote] = useState("");
  const [savingDeactivate, setSavingDeactivate] = useState(false);

  // ── STAFF REQUESTS STATE ───────────────────────────────────────────────────
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [requestStatusFilter, setRequestStatusFilter] = useState<"all" | StaffRequestStatus>("all");
  const [requestTypeFilter, setRequestTypeFilter] = useState<"all" | "CREATE_STAFF" | "DEACTIVATE_STAFF">("all");

  // Form states for Create Staff Request
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [desiredPosition, setDesiredPosition] = useState("");
  const [createNote, setCreateNote] = useState("");
  const [savingCreate, setSavingCreate] = useState(false);

  // ── API CALLS ──────────────────────────────────────────────────────────────
  const fetchStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await staffRequestService.getManagerStaff();
      setStaff(res.data ?? []);
    } catch {
      toast.error("Không thể tải danh sách nhân viên");
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await staffRequestService.getManagerStaffRequests();
      setRequests(res.data ?? []);
    } catch {
      toast.error("Không thể tải danh sách đề xuất");
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "list") {
      void fetchStaff();
    } else {
      void fetchRequests();
    }
  }, [activeTab, fetchStaff, fetchRequests]);

  // ── MEMOIZED DATA ──────────────────────────────────────────────────────────
  const filteredStaff = useMemo(() => {
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

  const staffStats = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((s) => s.status === "active").length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [staff]);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesStatus = requestStatusFilter === "all" || req.status === requestStatusFilter;
      const matchesType = requestTypeFilter === "all" || req.type === requestTypeFilter;
      return matchesStatus && matchesType;
    });
  }, [requests, requestStatusFilter, requestTypeFilter]);

  const requestStats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [requests]);

  // ── HANDLERS ───────────────────────────────────────────────────────────────
  const handleDeactivate = async () => {
    if (!selectedStaff || !deactivateReason) return;
    setSavingDeactivate(true);
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
      setSavingDeactivate(false);
    }
  };

  const handleCreateStaff = async () => {
    if (!fullName || !email || !phone) {
      toast.error("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Định dạng email không hợp lệ");
      return;
    }

    setSavingCreate(true);
    try {
      await staffRequestService.createManagerCreateStaffRequest({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        desiredPosition: desiredPosition.trim() || undefined,
        note: createNote.trim() || undefined,
        confirmedStoreId: user?.storeId || "",
      });
      toast.success("Đã gửi đề xuất thêm nhân viên thành công");
      setShowCreateForm(false);
      setFullName("");
      setEmail("");
      setPhone("");
      setDesiredPosition("");
      setCreateNote("");
      void fetchRequests();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Không thể tạo đề xuất";
      toast.error(message);
    } finally {
      setSavingCreate(false);
    }
  };

  const handleCancelRequest = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đề xuất này?")) return;
    try {
      await staffRequestService.cancelManagerStaffRequest(id);
      toast.success("Đã hủy đề xuất thành công");
      void fetchRequests();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Không thể hủy đề xuất";
      toast.error(message);
    }
  };

  const getRequestedByName = (req: StaffRequest) => {
    if (typeof req.requestedBy === "object" && req.requestedBy !== null) {
      return req.requestedBy.fullName || req.requestedBy.username || "Manager";
    }
    return "Manager";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white border border-orange-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.2em] text-orange-500 flex items-center gap-1.5">
            Quản lý Nhân sự & Đề xuất
          </span>
          <h1 className="mt-2 text-3xl font-black text-slate-950 tracking-tight">
            Quản lý Nhân sự
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Quản lý danh sách nhân sự chi nhánh và theo dõi các đề xuất cấp/tạm khóa tài khoản gửi lên hệ thống.
          </p>
        </div>
        {activeTab === "requests" && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 hover:bg-orange-600 px-5 py-3.5 text-sm font-black text-white shadow-sm transition-all hover:scale-105 active:scale-95 duration-200"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            Đề xuất thêm nhân viên
          </button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("list")}
          className={`pb-4 text-sm font-bold border-b-2 transition-all relative ${
            activeTab === "list"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Danh sách nhân viên {!loadingStaff && `(${staffStats.total})`}
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`pb-4 text-sm font-bold border-b-2 transition-all relative ${
            activeTab === "requests"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Đề xuất nhân sự {!loadingRequests && `(${requestStats.pending} chờ duyệt)`}
        </button>
      </div>

      {/* ─── TAB 1: STAFF LIST ─────────────────────────────────────────────────── */}
      {activeTab === "list" && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng nhân sự</p>
                <p className="text-3xl font-black text-slate-950 mt-0.5">{loadingStaff ? "—" : staffStats.total}</p>
              </div>
            </div>

            <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang hoạt động</p>
                <p className="text-3xl font-black text-emerald-600 mt-0.5">{loadingStaff ? "—" : staffStats.active}</p>
              </div>
            </div>

            <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tạm khóa / Ngưng</p>
                <p className="text-3xl font-black text-rose-600 mt-0.5">{loadingStaff ? "—" : staffStats.inactive}</p>
              </div>
            </div>
          </div>

          {/* Filter & Controls */}
          <div className="bg-white border border-orange-100 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === "all" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === "active" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Hoạt động
                </button>
                <button
                  onClick={() => setStatusFilter("inactive")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === "inactive" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Đã tạm dừng
                </button>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-xl transition-all ${viewMode === "grid" ? "bg-white text-orange-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  title="Xem dạng thẻ"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded-xl transition-all ${viewMode === "table" ? "bg-white text-orange-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  title="Xem dạng bảng"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* List Area */}
          {loadingStaff ? (
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
          ) : filteredStaff.length === 0 ? (
            <div className="bg-white border border-orange-100 rounded-3xl p-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto text-orange-500 mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-950">Không tìm thấy nhân viên</h3>
              <p className="text-sm font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
                Không tìm thấy nhân viên nào khớp với điều kiện tìm kiếm hoặc bộ lọc của bạn.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((member) => (
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
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${
                        member.status === "active" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"
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
                    {filteredStaff.map((member) => (
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
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                              member.status === "active" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${member.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
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
        </>
      )}

      {/* ─── TAB 2: STAFF REQUESTS ────────────────────────────────────────────── */}
      {activeTab === "requests" && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-28 group">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Tổng số đề xuất</p>
              <p className="text-3xl font-black text-slate-950 mt-1">{loadingRequests ? "—" : requestStats.total}</p>
            </div>
            <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-28 group">
              <p className="text-xs font-black text-amber-500 uppercase tracking-wider">Chờ duyệt</p>
              <p className="text-3xl font-black text-amber-500 mt-1">{loadingRequests ? "—" : requestStats.pending}</p>
            </div>
            <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-28 group">
              <p className="text-xs font-black text-emerald-500 uppercase tracking-wider">Đã phê duyệt</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{loadingRequests ? "—" : requestStats.approved}</p>
            </div>
            <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-28 group">
              <p className="text-xs font-black text-rose-400 uppercase tracking-wider">Từ chối</p>
              <p className="text-3xl font-black text-rose-500 mt-1">{loadingRequests ? "—" : requestStats.rejected}</p>
            </div>
          </div>

          {/* Filter Options */}
          <div className="bg-white border border-orange-100 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
              <button
                onClick={() => setRequestStatusFilter("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${requestStatusFilter === "all" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setRequestStatusFilter("pending")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${requestStatusFilter === "pending" ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Chờ duyệt ({requestStats.pending})
              </button>
              <button
                onClick={() => setRequestStatusFilter("approved")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${requestStatusFilter === "approved" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Đã duyệt
              </button>
              <button
                onClick={() => setRequestStatusFilter("rejected")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${requestStatusFilter === "rejected" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Từ chối
              </button>
              <button
                onClick={() => setRequestStatusFilter("cancelled")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${requestStatusFilter === "cancelled" ? "bg-white text-slate-500 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Đã hủy
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 self-start md:self-auto">
              <button
                onClick={() => setRequestTypeFilter("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${requestTypeFilter === "all" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Tất cả loại
              </button>
              <button
                onClick={() => setRequestTypeFilter("CREATE_STAFF")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${requestTypeFilter === "CREATE_STAFF" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-orange-600"}`}
              >
                Thêm nhân viên
              </button>
              <button
                onClick={() => setRequestTypeFilter("DEACTIVATE_STAFF")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${requestTypeFilter === "DEACTIVATE_STAFF" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-rose-600"}`}
              >
                Xử lý nhân sự
              </button>
            </div>
          </div>

          {/* Request List */}
          {loadingRequests ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-32" />
                        <div className="h-3 bg-slate-200 rounded w-20" />
                      </div>
                    </div>
                    <div className="h-6 bg-slate-200 rounded-full w-24" />
                  </div>
                  <div className="h-10 bg-slate-100 rounded-2xl w-full" />
                </div>
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white border border-orange-100 rounded-3xl p-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto text-orange-500 mb-4">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-950">Chưa có đề xuất nào</h3>
              <p className="text-sm font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
                Hiện tại chưa có đề xuất nhân sự nào hoặc không có đề xuất phù hợp bộ lọc đã chọn.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => {
                const status = statusConfig[req.status] || {
                  label: req.status,
                  bg: "bg-slate-50",
                  text: "text-slate-700",
                  border: "border-slate-200",
                  icon: null,
                };
                const type = typeConfig[req.type] || {
                  label: req.type,
                  icon: <User className="w-4 h-4" />,
                  bg: "bg-slate-50",
                  text: "text-slate-700",
                };

                const isDeactivate = req.type === "DEACTIVATE_STAFF";
                const targetStaffName =
                  typeof req.targetStaffId === "object" && req.targetStaffId !== null
                    ? req.targetStaffId.fullName || req.targetStaffId.username
                    : "Nhân viên";
                const targetStaffEmail =
                  typeof req.targetStaffId === "object" && req.targetStaffId !== null
                    ? req.targetStaffId.email
                    : "";

                return (
                  <div
                    key={req._id}
                    className="bg-white border border-orange-100/70 hover:border-orange-200 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-300 relative group overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isDeactivate ? "bg-rose-500" : "bg-orange-500"}`} />

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-4 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${type.bg} ${type.text}`}>
                            {type.icon}
                            {type.label}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDateTime(req.createdAt)}
                          </span>
                        </div>

                        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {isDeactivate ? (
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nhân viên mục tiêu</p>
                              <h4 className="font-black text-slate-950">{targetStaffName}</h4>
                              {targetStaffEmail && (
                                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                                  {targetStaffEmail}
                                </p>
                              )}
                              <p className="text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1">
                                <Briefcase className="w-3.5 h-3.5 text-rose-400" />
                                Lý do đề xuất:{" "}
                                <span className="font-bold underline">
                                  {reasonLabel[req.reason || ""] || req.reason || "Không xác định"}
                                </span>
                              </p>
                            </div>
                          ) : (
                            req.candidate && (
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông tin ứng viên</p>
                                <h4 className="font-black text-slate-950">{req.candidate.fullName}</h4>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                    {req.candidate.email}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    {req.candidate.phone}
                                  </span>
                                  {req.candidate.desiredPosition && (
                                    <span className="flex items-center gap-1">
                                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                      Vị trí: {req.candidate.desiredPosition}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          )}

                          <div className="text-xs font-semibold text-slate-400 md:text-right md:border-l md:border-slate-100 md:pl-4">
                            <p>Đề xuất bởi</p>
                            <p className="font-black text-slate-700 mt-0.5">{getRequestedByName(req)}</p>
                          </div>
                        </div>

                        {req.note && (
                          <div className="text-xs font-semibold text-slate-500 flex items-start gap-1.5 pl-1">
                            <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <p>
                              <span className="font-bold">Ghi chú của manager:</span> {req.note}
                            </p>
                          </div>
                        )}

                        {(req.status === "approved" || req.status === "rejected") && (
                          <div className="bg-slate-100/50 rounded-2xl p-4 border border-slate-200/40 text-xs text-slate-600 font-semibold space-y-1">
                            <p className="font-black text-slate-700 flex items-center gap-1">
                              <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                              Kết quả phản hồi của Admin
                            </p>
                            <p className="pl-4 mt-1">
                              Trạng thái:{" "}
                              <span className={req.status === "approved" ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                                {req.status === "approved" ? "Chấp thuận" : "Từ chối"}
                              </span>
                              {req.reviewedAt && ` vào ngày ${formatDateTime(req.reviewedAt)}`}
                            </p>
                            {req.adminNote && (
                              <p className="pl-4 mt-1">
                                <span className="font-bold">Ghi chú từ admin:</span> {req.adminNote}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-3 self-stretch sm:self-auto sm:min-w-28">
                        <span className={`inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-xs font-black shadow-inner ${status.bg} ${status.text} ${status.border}`}>
                          {status.icon}
                          {status.label}
                        </span>

                        {req.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => void handleCancelRequest(req._id)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all active:scale-95 mt-auto sm:mt-4"
                          >
                            Hủy đề xuất
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── MODALS ────────────────────────────────────────────────────────────── */}

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
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
                      deactivateReason === opt.value ? "border-orange-500 bg-orange-50/50 shadow-sm" : "border-slate-100 hover:border-orange-200 bg-white"
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

            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100/50 p-4">
              <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600 animate-bounce" />
              <p className="text-xs font-bold leading-5 text-amber-800">
                Lưu ý: Tài khoản nhân viên sẽ bị tạm ngưng hoạt động/khóa ngay lập tức. Đề xuất xử lý chính thức sẽ được tự động gửi lên Admin để phê duyệt.
              </p>
            </div>

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
                disabled={savingDeactivate || !deactivateReason || !selectedStaff}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-6 py-3 text-sm font-black text-white hover:bg-rose-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingDeactivate && <Loader2 className="w-4 h-4 animate-spin" />}
                {savingDeactivate ? "Đang xử lý..." : "Khóa & Đề xuất"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Staff Request Modal */}
      {showCreateForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setShowCreateForm(false)}
        >
          <div
            className="w-full max-w-xl space-y-6 rounded-[2.5rem] border border-orange-100 bg-white p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-orange-500 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5" />
                  Yêu cầu nhân sự mới
                </span>
                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  Đề xuất thêm nhân viên
                </h3>
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  Tạo phiếu đề nghị cấp tài khoản nhân viên. Trình admin duyệt trước khi đưa vào hệ thống.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 block" htmlFor="staff-name">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  id="staff-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-4 py-3.5 text-sm font-semibold outline-none transition-all duration-200 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 block" htmlFor="staff-position">
                  Vị trí mong muốn
                </label>
                <input
                  id="staff-position"
                  type="text"
                  value={desiredPosition}
                  onChange={(e) => setDesiredPosition(e.target.value)}
                  placeholder="Thu ngân, Pha chế, Đầu bếp..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-4 py-3.5 text-sm font-semibold outline-none transition-all duration-200 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 block" htmlFor="staff-email">
                  Địa chỉ Email <span className="text-rose-500">*</span>
                </label>
                <input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nva@gmail.com"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-4 py-3.5 text-sm font-semibold outline-none transition-all duration-200 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 block" htmlFor="staff-phone">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  id="staff-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-4 py-3.5 text-sm font-semibold outline-none transition-all duration-200 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 block" htmlFor="staff-note">
                Kinh nghiệm / Ghi chú bổ sung
              </label>
              <textarea
                id="staff-note"
                value={createNote}
                onChange={(e) => setCreateNote(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-4 py-3.5 text-sm font-semibold outline-none transition-all duration-200 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                placeholder="Ví dụ: Đã có 1 năm kinh nghiệm làm bếp bánh, đăng ký ca làm tối..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => void handleCreateStaff()}
                disabled={savingCreate || !fullName || !email || !phone}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3.5 text-sm font-black text-white hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingCreate && <Loader2 className="w-4 h-4 animate-spin" />}
                {savingCreate ? "Đang gửi..." : "Gửi đề xuất"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerStaff;
