import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Inbox,
  X,
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

const statusConfig: Record<StaffRequestStatus, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  pending: {
    label: "Chờ duyệt",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200/50",
    icon: <Clock className="h-4 w-4 text-amber-500 animate-pulse" />,
  },
  approved: {
    label: "Đã duyệt",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200/50",
    icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
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
    icon: <XCircle className="h-4 w-4 text-slate-400" />,
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

const AdminStaffRequests = () => {
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | StaffRequestStatus>("pending");
  const [typeFilter, setTypeFilter] = useState<"all" | "CREATE_STAFF" | "DEACTIVATE_STAFF">("all");
  
  const [selectedRequest, setSelectedRequest] = useState<StaffRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [deactivateStatus, setDeactivateStatus] = useState<"inactive" | "blocked">("inactive");
  const [saving, setSaving] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await staffRequestService.getAdminStaffRequests();
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

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setSaving(true);
    try {
      await staffRequestService.approveAdminStaffRequest(
        selectedRequest._id,
        {
          adminNote: adminNote.trim() || undefined,
          deactivateStatus:
            selectedRequest.type === "DEACTIVATE_STAFF"
              ? deactivateStatus
              : undefined,
        },
      );
      toast.success("Đã phê duyệt đề xuất thành công");
      setSelectedRequest(null);
      setActionType(null);
      setAdminNote("");
      void fetchRequests();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Không thể duyệt đề xuất";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !adminNote.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    setSaving(true);
    try {
      await staffRequestService.rejectAdminStaffRequest(
        selectedRequest._id,
        { adminNote: adminNote.trim() },
      );
      toast.success("Đã từ chối đề xuất thành công");
      setSelectedRequest(null);
      setActionType(null);
      setAdminNote("");
      void fetchRequests();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Không thể từ chối đề xuất";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const openAction = (req: StaffRequest, action: "approve" | "reject") => {
    setSelectedRequest(req);
    setActionType(action);
    setAdminNote("");
  };

  const getRequestedByName = (req: StaffRequest) => {
    if (typeof req.requestedBy === "object" && req.requestedBy !== null) {
      return req.requestedBy.fullName || req.requestedBy.username || "Manager";
    }
    return "Manager";
  };

  const getStoreName = (req: StaffRequest) => {
    if (typeof req.storeId === "object" && req.storeId !== null) {
      return req.storeId.name || "Chi nhánh";
    }
    return "Chi nhánh";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#1b140d]">
            Duyệt đề xuất nhân sự
          </h2>
          <p className="text-[#9a734c] mt-1">
            Xem xét và phê duyệt các yêu cầu cấp tài khoản nhân sự hoặc ngưng hoạt động từ Quản lý chi nhánh.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-[#e7dbcf] rounded-xl p-5 shadow-sm flex flex-col justify-between h-28">
          <p className="text-xs font-bold text-[#9a734c] uppercase tracking-wider">Tổng số đề xuất</p>
          <p className="text-3xl font-bold text-[#1b140d] mt-1">{loading ? "—" : stats.total}</p>
        </div>
        <div className="bg-white border border-[#e7dbcf] rounded-xl p-5 shadow-sm flex flex-col justify-between h-28">
          <p className="text-xs font-bold text-[#ee8c2b] uppercase tracking-wider">Chờ duyệt</p>
          <p className="text-3xl font-bold text-[#ee8c2b] mt-1">{loading ? "—" : stats.pending}</p>
        </div>
        <div className="bg-white border border-[#e7dbcf] rounded-xl p-5 shadow-sm flex flex-col justify-between h-28">
          <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Đã phê duyệt</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{loading ? "—" : stats.approved}</p>
        </div>
        <div className="bg-white border border-[#e7dbcf] rounded-xl p-5 shadow-sm flex flex-col justify-between h-28">
          <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Từ chối</p>
          <p className="text-3xl font-bold text-rose-600 mt-1">{loading ? "—" : stats.rejected}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-[#e7dbcf] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap bg-[#f3ede7] p-1 rounded-lg border border-[#e7dbcf]/50">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              statusFilter === "all"
                ? "bg-[#ee8c2b] text-white shadow-sm"
                : "text-[#9a734c] hover:bg-[#e7dbcf] hover:text-[#1b140d]"
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              statusFilter === "pending"
                ? "bg-[#ee8c2b] text-white shadow-sm"
                : "text-[#9a734c] hover:bg-[#e7dbcf] hover:text-[#1b140d]"
            }`}
          >
            Chờ duyệt ({stats.pending})
          </button>
          <button
            onClick={() => setStatusFilter("approved")}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              statusFilter === "approved"
                ? "bg-[#ee8c2b] text-white shadow-sm"
                : "text-[#9a734c] hover:bg-[#e7dbcf] hover:text-[#1b140d]"
            }`}
          >
            Đã duyệt
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              statusFilter === "rejected"
                ? "bg-[#ee8c2b] text-white shadow-sm"
                : "text-[#9a734c] hover:bg-[#e7dbcf] hover:text-[#1b140d]"
            }`}
          >
            Từ chối
          </button>
        </div>

        {/* Type Filter */}
        <div className="flex bg-[#f3ede7] p-1 rounded-lg border border-[#e7dbcf]/50 self-start md:self-auto">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              typeFilter === "all"
                ? "bg-[#ee8c2b] text-white shadow-sm"
                : "text-[#9a734c] hover:bg-[#e7dbcf] hover:text-[#1b140d]"
            }`}
          >
            Tất cả loại
          </button>
          <button
            onClick={() => setTypeFilter("CREATE_STAFF")}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              typeFilter === "CREATE_STAFF"
                ? "bg-[#ee8c2b] text-white shadow-sm"
                : "text-[#9a734c] hover:bg-[#e7dbcf] hover:text-[#1b140d]"
            }`}
          >
            Thêm nhân viên
          </button>
          <button
            onClick={() => setTypeFilter("DEACTIVATE_STAFF")}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              typeFilter === "DEACTIVATE_STAFF"
                ? "bg-[#ee8c2b] text-white shadow-sm"
                : "text-[#9a734c] hover:bg-[#e7dbcf] hover:text-[#1b140d]"
            }`}
          >
            Xử lý nhân sự
          </button>
        </div>
      </div>

      {/* Requests Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-[#e7dbcf] rounded-xl p-6 space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#f3ede7] rounded-lg" />
                  <div className="space-y-2">
                    <div className="h-3 bg-[#f3ede7] rounded w-32" />
                    <div className="h-3 bg-[#f3ede7] rounded w-20" />
                  </div>
                </div>
                <div className="h-6 bg-[#f3ede7] rounded-full w-24" />
              </div>
              <div className="h-10 bg-[#f3ede7] rounded-lg w-full" />
            </div>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white border border-[#e7dbcf] rounded-xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-[#f3ede7] rounded-full flex items-center justify-center mx-auto text-[#ee8c2b] mb-4">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#1b140d]">Chưa có đề xuất nào</h3>
          <p className="text-sm font-medium text-[#9a734c] mt-1 max-w-sm mx-auto">
            Hiện tại chưa có đề xuất nhân sự nào cần xử lý hoặc không có đề xuất phù hợp bộ lọc đã chọn.
          </p>
          {(statusFilter !== "all" || typeFilter !== "all") && (
            <button
              onClick={() => {
                setStatusFilter("all");
                setTypeFilter("all");
              }}
              className="mt-5 px-5 py-2.5 bg-[#ee8c2b] hover:bg-[#d87c24] text-white font-bold text-xs rounded-lg transition-all shadow-sm"
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
                className="bg-white border border-[#e7dbcf] hover:border-[#ee8c2b]/50 rounded-xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-300 relative group overflow-hidden"
              >
                {/* Visual Accent bar depending on request type */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isDeactivate ? "bg-rose-500" : "bg-[#ee8c2b]"
                  }`}
                />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left Column: Type, Subject details */}
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${type.bg} ${type.text}`}
                      >
                        {type.icon}
                        {type.label}
                      </span>
                      <span className="text-[10px] font-bold text-[#9a734c] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateTime(req.createdAt)}
                      </span>
                    </div>

                    {/* Candidate or Staff Subject Info */}
                    <div className="bg-[#fcfaf8] border border-[#e7dbcf] rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {isDeactivate ? (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-[#9a734c] uppercase tracking-wider">
                            Nhân viên mục tiêu
                          </p>
                          <h4 className="font-bold text-[#1b140d]">{targetStaffName}</h4>
                          {targetStaffEmail && (
                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              {targetStaffEmail}
                            </p>
                          )}
                          <p className="text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-rose-450" />
                            Lý do đề xuất:{" "}
                            <span className="font-bold underline">
                              {reasonLabel[req.reason || ""] || req.reason || "Không xác định"}
                            </span>
                          </p>
                        </div>
                      ) : (
                        req.candidate && (
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-[#9a734c] uppercase tracking-wider">
                              Thông tin ứng viên
                            </p>
                            <h4 className="font-bold text-[#1b140d]">{req.candidate.fullName}</h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-[#9a734c] mt-1">
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
                      <div className="text-xs font-semibold text-[#9a734c] md:text-right md:border-l md:border-[#e7dbcf] md:pl-4">
                        <p>
                          Đề xuất bởi: <span className="font-bold text-[#1b140d]">{getRequestedByName(req)}</span>
                        </p>
                        <p className="mt-1">
                          Chi nhánh: <span className="font-bold text-[#ee8c2b]">{getStoreName(req)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Manager's Optional Note */}
                    {req.note && (
                      <div className="text-xs font-semibold text-[#9a734c] flex items-start gap-1.5 pl-1">
                        <MessageSquare className="w-4 h-4 text-[#9a734c] shrink-0 mt-0.5" />
                        <p>
                          <span className="font-bold text-[#1b140d]">Ghi chú của manager:</span> {req.note}
                        </p>
                      </div>
                    )}

                    {/* Admin Review Result */}
                    {(req.status === "approved" || req.status === "rejected") && (
                      <div className="bg-[#f3ede7]/50 rounded-lg p-4 border border-[#e7dbcf]/50 text-xs text-[#9a734c] font-semibold space-y-1">
                        <p className="font-bold text-[#1b140d] flex items-center gap-1">
                          <CornerDownRight className="w-3.5 h-3.5 text-[#9a734c]" />
                          Kết quả phản hồi của bạn
                        </p>
                        <p className="pl-4 mt-1">
                          Trạng thái:{" "}
                          <span
                            className={
                              req.status === "approved"
                                ? "text-green-600 font-bold"
                                : "text-rose-600 font-bold"
                            }
                          >
                            {req.status === "approved" ? "Đã phê duyệt" : "Từ chối"}
                          </span>
                          {req.reviewedAt && ` vào ngày ${formatDateTime(req.reviewedAt)}`}
                        </p>
                        {req.adminNote && (
                          <p className="pl-4 mt-1">
                            <span className="font-bold text-[#1b140d]">Ghi chú phản hồi:</span> {req.adminNote}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Status and Actions */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-3 self-stretch sm:self-auto sm:min-w-28 text-right shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-xs font-bold shadow-inner ${status.bg} ${status.text} ${status.border}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>

                    {req.status === "pending" && (
                      <div className="flex sm:flex-col gap-2 mt-auto sm:mt-4 w-full">
                        <button
                          type="button"
                          onClick={() => openAction(req, "approve")}
                          className="w-full rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:scale-105 active:scale-95 transition-all duration-200"
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          onClick={() => openAction(req, "reject")}
                          className="w-full rounded-lg border border-rose-250 bg-white hover:bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 hover:scale-105 active:scale-95 transition-all duration-200"
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Process Modal */}
      {selectedRequest && actionType && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-[#1b140d]/40 p-4 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => {
            setSelectedRequest(null);
            setActionType(null);
          }}
        >
          <div
            className="w-full max-w-md space-y-6 rounded-xl border border-[#e7dbcf] bg-white p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#ee8c2b] flex items-center gap-1">
                  Xử lý đề xuất nhân sự
                </span>
                <h3 className="mt-2 text-2xl font-black text-[#1b140d]">
                  {actionType === "approve" ? "Phê duyệt đề xuất" : "Từ chối đề xuất"}
                </h3>
                <p className="text-xs font-semibold text-[#9a734c] mt-1">
                  Đề xuất: <span className="font-bold text-[#1b140d]">{typeConfig[selectedRequest.type]?.label || selectedRequest.type}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                }}
                className="rounded-lg p-2 text-[#9a734c] hover:bg-[#f3ede7] hover:text-[#1b140d] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="space-y-4">
              {/* Target Candidate/Staff info summary */}
              <div className="bg-[#fcfaf8] border border-[#e7dbcf] rounded-lg p-4 text-xs font-semibold text-[#9a734c] space-y-1">
                {selectedRequest.candidate ? (
                  <>
                    <p className="font-bold text-[#1b140d]">Ứng viên: {selectedRequest.candidate.fullName}</p>
                    <p>Email: {selectedRequest.candidate.email}</p>
                    {selectedRequest.candidate.desiredPosition && (
                      <p>Vị trí: {selectedRequest.candidate.desiredPosition}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-bold text-[#1b140d]">
                      Nhân viên: {
                        typeof selectedRequest.targetStaffId === "object"
                          ? selectedRequest.targetStaffId.fullName || selectedRequest.targetStaffId.username
                          : "Nhân viên"
                      }
                    </p>
                    <p>
                      Lý do: <span className="font-bold text-rose-600">{reasonLabel[selectedRequest.reason || ""] || selectedRequest.reason}</span>
                    </p>
                  </>
                )}
              </div>

              {selectedRequest.type === "DEACTIVATE_STAFF" && actionType === "approve" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1b140d] block">
                    Hình thức xử lý <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={deactivateStatus}
                    onChange={(e) =>
                      setDeactivateStatus(
                        e.target.value as "inactive" | "blocked",
                      )
                    }
                    className="w-full rounded-lg border border-[#e7dbcf] bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#ee8c2b]/20"
                  >
                    <option value="inactive">Ngưng kích hoạt</option>
                    <option value="blocked">Khóa tài khoản</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1b140d] block">
                  {actionType === "reject"
                    ? "Lý do từ chối *"
                    : "Ghi chú phản hồi (tùy chọn)"}
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-[#e7dbcf] bg-[#fcfaf8] px-4 py-3.5 text-sm font-semibold outline-none transition-all duration-200 focus:border-[#ee8c2b] focus:bg-white focus:ring-2 focus:ring-[#ee8c2b]/10"
                  placeholder={
                    actionType === "reject"
                      ? "Nhập lý do từ chối đề xuất này..."
                      : "Nhập ghi chú phản hồi..."
                  }
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                }}
                className="rounded-lg border border-[#e7dbcf] px-5 py-3 text-sm font-bold text-[#1b140d] hover:bg-[#f3ede7] transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() =>
                  void (actionType === "approve"
                    ? handleApprove()
                    : handleReject())
                }
                disabled={saving || (actionType === "reject" && !adminNote.trim())}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  actionType === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving
                  ? "Đang xử lý..."
                  : actionType === "approve"
                    ? "Phê duyệt"
                    : "Từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaffRequests;
