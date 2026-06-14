import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Inbox,
  UserPlus,
  UserMinus,
  Calendar,
  User,
  Mail,
  Phone,
  Briefcase,
  CornerDownRight,
  MessageSquare,
} from "lucide-react";
import staffRequestService from "@/services/staff-request.service";
import type { StaffRequest, StaffRequestStatus } from "@/services/staff-request.service";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

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

const ManagerStaffRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | StaffRequestStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "CREATE_STAFF" | "DEACTIVATE_STAFF">("all");

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [desiredPosition, setDesiredPosition] = useState("");
  const [createNote, setCreateNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await staffRequestService.getManagerStaffRequests();
      setRequests(res.data ?? []);
    } catch {
      toast.error("Không thể tải danh sách đề xuất");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesStatus = statusFilter === "all" || req.status === statusFilter;
      const matchesType = typeFilter === "all" || req.type === typeFilter;
      return matchesStatus && matchesType;
    });
  }, [requests, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [requests]);

  const handleCreateStaff = async () => {
    if (!fullName || !email || !phone) {
      toast.error("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
      return;
    }
    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Định dạng email không hợp lệ");
      return;
    }

    setSaving(true);
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
      setSaving(false);
    }
  };

  const handleCancel = async (id: string) => {
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
            Quản lý đề xuất nhân sự
          </span>
          <h1 className="mt-2 text-3xl font-black text-slate-950 tracking-tight">
            Đề xuất Nhân sự
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Gửi yêu cầu cấp tài khoản nhân viên mới hoặc ngưng kích hoạt tài khoản của nhân sự vi phạm/nghỉ việc.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 hover:bg-orange-600 px-5 py-3.5 text-sm font-black text-white shadow-sm transition-all hover:scale-105 active:scale-95 duration-200"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          Đề xuất thêm nhân viên
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-28 group">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Tổng số đề xuất</p>
          <p className="text-3xl font-black text-slate-950 mt-1">{loading ? "—" : stats.total}</p>
        </div>
        <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-28 group">
          <p className="text-xs font-black text-amber-500 uppercase tracking-wider">Chờ duyệt</p>
          <p className="text-3xl font-black text-amber-500 mt-1">{loading ? "—" : stats.pending}</p>
        </div>
        <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-28 group">
          <p className="text-xs font-black text-emerald-500 uppercase tracking-wider">Đã phê duyệt</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{loading ? "—" : stats.approved}</p>
        </div>
        <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-28 group">
          <p className="text-xs font-black text-rose-400 uppercase tracking-wider">Từ chối</p>
          <p className="text-3xl font-black text-rose-500 mt-1">{loading ? "—" : stats.rejected}</p>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white border border-orange-100 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === "all" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === "pending" ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
          >
            Chờ duyệt ({stats.pending})
          </button>
          <button
            onClick={() => setStatusFilter("approved")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === "approved" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
          >
            Đã duyệt
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === "rejected" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
          >
            Từ chối
          </button>
          <button
            onClick={() => setStatusFilter("cancelled")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === "cancelled" ? "bg-white text-slate-500 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
          >
            Đã hủy
          </button>
        </div>

        {/* Type Filter */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 self-start md:self-auto">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${typeFilter === "all" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
          >
            Tất cả loại
          </button>
          <button
            onClick={() => setTypeFilter("CREATE_STAFF")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${typeFilter === "CREATE_STAFF" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-orange-600"
              }`}
          >
            Thêm nhân viên
          </button>
          <button
            onClick={() => setTypeFilter("DEACTIVATE_STAFF")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${typeFilter === "DEACTIVATE_STAFF" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-rose-600"
              }`}
          >
            Xử lý nhân sự
          </button>
        </div>
      </div>

      {/* Request List */}
      {loading ? (
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
          {(statusFilter !== "all" || typeFilter !== "all") && (
            <button
              onClick={() => {
                setStatusFilter("all");
                setTypeFilter("all");
              }}
              className="mt-5 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-2xl transition-all shadow-sm"
            >
              Xoá bộ lọc
            </button>
          )}
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
                {/* Visual Accent bar depending on request type */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${isDeactivate ? "bg-rose-500" : "bg-orange-500"
                    }`}
                />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left Column: Type, Subject details */}
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${type.bg} ${type.text}`}
                      >
                        {type.icon}
                        {type.label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateTime(req.createdAt)}
                      </span>
                    </div>

                    {/* Candidate or Staff Subject Info */}
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

                      {/* Request creator metadata */}
                      <div className="text-xs font-semibold text-slate-400 md:text-right md:border-l md:border-slate-100 md:pl-4">
                        <p>Đề xuất bởi</p>
                        <p className="font-black text-slate-700 mt-0.5">{getRequestedByName(req)}</p>
                      </div>
                    </div>

                    {/* Manager's Optional Note */}
                    {req.note && (
                      <div className="text-xs font-semibold text-slate-500 flex items-start gap-1.5 pl-1">
                        <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <p>
                          <span className="font-bold">Ghi chú của manager:</span> {req.note}
                        </p>
                      </div>
                    )}

                    {/* Admin Review Result */}
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

                  {/* Right Column: Status and Actions */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-3 self-stretch sm:self-auto sm:min-w-28">
                    <span
                      className={`inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-xs font-black shadow-inner ${status.bg} ${status.text} ${status.border}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>

                    {req.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => void handleCancel(req._id)}
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
            {/* Modal Header */}
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

            {/* Modal Form Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
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

              {/* Position */}
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

              {/* Email */}
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

              {/* Phone */}
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

            {/* Note Textarea */}
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

            {/* Actions */}
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
                disabled={saving || !fullName || !email || !phone}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3.5 text-sm font-black text-white hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Đang gửi..." : "Gửi đề xuất"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerStaffRequests;
