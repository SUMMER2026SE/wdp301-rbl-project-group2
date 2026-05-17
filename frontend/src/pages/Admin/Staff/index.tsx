
import { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { apiClient } from "@/lib/api-client";

// Staff interface
interface StaffMember {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: "staff" | "admin"; // Keeping admin just in case but targeting staff for management
    status: "active" | "inactive" | "on-leave";
    joinDate: string;
    lastActive: string;
    ordersHandled?: number;
    performance?: number;
}

interface StaffAPI {
    _id: string;
    fullName?: string;
    name?: string;
    email: string;
    phone?: string;
    phoneNumber?: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    totalOrders?: number;
}

interface ApiResponse {
    success?: boolean;
    data?: StaffAPI[] | { staff?: StaffAPI[]; users?: StaffAPI[]; customers?: StaffAPI[] };
    staff?: StaffAPI[];
    users?: StaffAPI[];
    customers?: StaffAPI[];
}

const ROLE_FILTERS = [
    { id: "all", label: "Tất cả" },
    { id: "staff", label: "Nhân viên" },
];

const AdminStaff = () => {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeRoleFilter, setActiveRoleFilter] = useState("all");
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
    });

    const fetchStaff = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get<ApiResponse>("/admin/staff", {
                params: {
                    page: 1,
                    limit: 100 // Fetch a large enough initial batch
                },
            });
            const payload = res.data;

            let raw: StaffAPI[] = [];
            if (Array.isArray(payload.data)) {
                raw = payload.data;
            } else if (payload.data && typeof payload.data === 'object') {
                const dataObj = payload.data as { staff?: StaffAPI[]; users?: StaffAPI[]; customers?: StaffAPI[] };
                raw = dataObj.staff || dataObj.users || dataObj.customers || [];
            } else {
                raw = payload.staff || payload.users || payload.customers || [];
            }

            setStaff(raw.map(normalizeStaff));
        } catch (err) {
            console.error("Lỗi tải danh sách nhân viên:", err);
            setError("Không thể tải danh sách nhân viên.");
        } finally {
            setLoading(false);
        }
    }, []);

    const normalizeStaff = (s: StaffAPI): StaffMember => ({
        id: s._id,
        name: s.fullName ?? s.name ?? "—",
        email: s.email ?? "—",
        phone: s.phone ?? s.phoneNumber ?? "—",
        role: s.role.toLowerCase() as StaffMember["role"],
        status: s.isActive ? "active" : "inactive",
        joinDate: s.createdAt,
        lastActive: s.updatedAt,
        ordersHandled: s.totalOrders ?? 0,
        performance: 92, // Placeholder performance
    });

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const handleDeactivate = async (id: string, currentStatus: string) => {
        if (!window.confirm(`Bạn có chắc muốn ${currentStatus === 'active' ? 'ngưng kích hoạt' : 'kích hoạt lại'} nhân viên này?`)) return;

        try {
            await apiClient.patch(`/admin/staff/${id}`, { isActive: currentStatus !== 'active' });
            fetchStaff(); // Refresh list
        } catch (err) {
            console.error("Lỗi cập nhật trạng thái nhân viên:", err);
            alert("Không thể cập nhật trạng thái nhân viên.");
        }
    };

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.post("/admin/staff", formData);
            setIsAddModalOpen(false);
            setFormData({ name: "", email: "", phone: "" });
            fetchStaff();
        } catch (err) {
            console.error("Lỗi thêm nhân viên:", err);
            alert("Không thể thêm nhân viên. Vui lòng kiểm tra lại thông tin.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate stats
    const totalStaff = staff.length;
    const activeStaff = staff.filter((s) => s.status === "active").length;
    const onLeaveStaff = staff.filter((s) => s.status === "on-leave").length;
    const avgPerformance = totalStaff > 0
        ? staff.reduce((sum, s) => sum + (s.performance || 0), 0) / totalStaff
        : 0;

    // Filter staff
    const filteredStaff = staff.filter((member) => {
        const matchesSearch =
            searchQuery === "" ||
            member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole =
            activeRoleFilter === "all" || member.role === activeRoleFilter;
        return matchesSearch && matchesRole;
    });

    const getRoleBadge = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'admin':
                return "bg-purple-100 text-purple-700 border-purple-200";
            case 'staff':
                return "bg-blue-100 text-blue-700 border-blue-200";
            default:
                return "bg-orange-100 text-orange-700 border-orange-200";
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'admin': return "Quản trị viên";
            case 'staff': return "Nhân viên";
            default: return "Nhân viên";
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'admin': return "shield_person";
            case 'staff': return "person";
            default: return "person";
        }
    };

    const getStatusBadge = (status: StaffMember["status"]) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-700";
            case "inactive":
                return "bg-gray-100 text-gray-600";
            case "on-leave":
                return "bg-amber-100 text-amber-700";
            default:
                return "bg-gray-100 text-gray-600";
        }
    };

    const getStatusLabel = (status: StaffMember["status"]) => {
        switch (status) {
            case "active":
                return "Đang làm";
            case "inactive":
                return "Nghỉ việc";
            case "on-leave":
                return "Nghỉ phép";
            default:
                return "N/A";
        }
    };

    const getTimeAgo = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (minutes < 60) return `${minutes} phút trước`;
            if (hours < 24) return `${hours} giờ trước`;
            return `${days} ngày trước`;
        } catch {
            return "N/A";
        }
    };

    return (
        <div className="max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-[#1b140d]">
                        Quản lý nhân viên
                    </h2>
                    <p className="text-[#9a734c] mt-1">
                        Theo dõi hiệu suất và quản lý nhân sự hệ thống.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#ee8c2b] text-white rounded-lg text-sm font-bold shadow-sm hover:bg-[#d87c24]"
                >
                    <span className="material-symbols-outlined text-xl">person_add</span>
                    Thêm nhân viên
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <span className="material-symbols-outlined text-blue-600">
                                groups
                            </span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-[#9a734c] mb-1">
                        Tổng nhân viên
                    </p>
                    <h3 className="text-3xl font-bold text-[#1b140d]">{loading ? "—" : totalStaff}</h3>
                </div>

                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <span className="material-symbols-outlined text-green-600">
                                check_circle
                            </span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-[#9a734c] mb-1">
                        Đang làm việc
                    </p>
                    <h3 className="text-3xl font-bold text-green-600">{loading ? "—" : activeStaff}</h3>
                </div>

                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <span className="material-symbols-outlined text-amber-600">
                                event_busy
                            </span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-[#9a734c] mb-1">Nghỉ phép</p>
                    <h3 className="text-3xl font-bold text-amber-600">{loading ? "—" : onLeaveStaff}</h3>
                </div>

                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-[#ee8c2b]/10 rounded-lg">
                            <span className="material-symbols-outlined text-[#ee8c2b]">
                                trending_up
                            </span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-[#9a734c] mb-1">Hiệu suất TB</p>
                    <h3 className="text-3xl font-bold text-[#1b140d]">
                        {loading ? "—" : `${avgPerformance.toFixed(0)}%`}
                    </h3>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-white border border-[#e7dbcf] rounded-xl p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9a734c]">
                            search
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm theo tên hoặc email..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#f3ede7] border-none focus:ring-2 focus:ring-[#ee8c2b]/50 text-sm"
                        />
                    </div>

                    {/* Role filters */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {ROLE_FILTERS.map((filter) => (
                            <button
                                key={filter.id}
                                type="button"
                                onClick={() => setActiveRoleFilter(filter.id)}
                                className={clsx(
                                    "shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                                    activeRoleFilter === filter.id
                                        ? "bg-[#ee8c2b] text-white"
                                        : "bg-[#f3ede7] text-[#1b140d] hover:bg-[#e7dbcf]"
                                )}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Staff Table */}
            <div className="bg-white border border-[#e7dbcf] rounded-xl overflow-hidden shadow-sm">
                {/* Loading skeleton */}
                {loading && (
                    <div className="p-8 flex flex-col gap-4 animate-pulse">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#f3ede7]" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-[#f3ede7] rounded w-1/4" />
                                    <div className="h-3 bg-[#f3ede7] rounded w-1/3" />
                                </div>
                                <div className="h-3 bg-[#f3ede7] rounded w-20" />
                                <div className="h-3 bg-[#f3ede7] rounded w-16" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Error state */}
                {!loading && error && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-4xl text-red-400">error</span>
                        </div>
                        <h3 className="text-lg font-bold text-[#1b140d] mb-2">Lỗi tải dữ liệu</h3>
                        <p className="text-sm text-[#9a734c] mb-4">{error}</p>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-[#ee8c2b] text-white text-sm font-bold rounded-lg hover:bg-[#d87c24] transition-colors"
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#fcfaf8] border-b border-[#e7dbcf]">
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                                            Nhân viên
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                                            Liên hệ
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                                            Vai trò
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                                            Trạng thái
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">
                                            Hiệu suất
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">
                                            Đơn xử lý
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e7dbcf]">
                                    {filteredStaff.map((member) => (
                                        <tr
                                            key={member.id}
                                            className="hover:bg-[#fcfaf8] transition-colors group cursor-pointer"
                                            onClick={() => setSelectedStaff(member)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[#ee8c2b]/20 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-[#ee8c2b]">
                                                            {getRoleIcon(member.role)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-[#1b140d]">
                                                            {member.name}
                                                        </p>
                                                        <p className="text-xs text-[#9a734c]">
                                                            {getTimeAgo(member.lastActive)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-[#1b140d]">{member.email}</p>
                                                <p className="text-xs text-[#9a734c]">{member.phone}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={clsx(
                                                        "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border",
                                                        getRoleBadge(member.role)
                                                    )}
                                                >
                                                    {getRoleLabel(member.role)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={clsx(
                                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                                                        getStatusBadge(member.status)
                                                    )}
                                                >
                                                    <span
                                                        className={clsx(
                                                            "w-2 h-2 rounded-full",
                                                            member.status === "active"
                                                                ? "bg-green-600"
                                                                : member.status === "on-leave"
                                                                    ? "bg-amber-600"
                                                                    : "bg-gray-600"
                                                        )}
                                                    />
                                                    {getStatusLabel(member.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-24 h-2 bg-[#f3ede7] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-[#ee8c2b] rounded-full"
                                                            style={{ width: `${member.performance || 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-bold text-[#1b140d] w-10">
                                                        {member.performance || 0}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-bold text-[#1b140d]">
                                                    {member.ordersHandled || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        type="button"
                                                        className="p-1.5 text-[#9a734c] hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Chỉnh sửa"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <span className="material-symbols-outlined text-xl">
                                                            edit
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={clsx(
                                                            "p-1.5 rounded transition-colors",
                                                            member.status === 'active'
                                                                ? "text-[#9a734c] hover:text-red-600 hover:bg-red-50"
                                                                : "text-green-600 hover:bg-green-50"
                                                        )}
                                                        title={member.status === 'active' ? "Ngưng kích hoạt" : "Kích hoạt lại"}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeactivate(member.id, member.status);
                                                        }}
                                                    >
                                                        <span className="material-symbols-outlined text-xl">
                                                            {member.status === 'active' ? 'person_off' : 'person_check'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Empty state */}
                        {filteredStaff.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="w-24 h-24 rounded-full bg-[#f3ede7] flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-5xl text-[#9a734c]">
                                        person_off
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-[#1b140d] mb-2">
                                    Không tìm thấy nhân viên
                                </h3>
                                <p className="text-sm text-[#9a734c]">
                                    Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Staff Detail Modal */}
            {selectedStaff && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedStaff(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-[#e7dbcf] px-8 py-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-[#ee8c2b]/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#ee8c2b] text-3xl">
                                        {getRoleIcon(selectedStaff.role)}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-[#1b140d]">
                                        {selectedStaff.name}
                                    </h3>
                                    <p className="text-sm text-[#9a734c]">ID: {selectedStaff.id}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedStaff(null)}
                                className="p-2 hover:bg-[#f3ede7] rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 space-y-6">
                            {/* Contact Info */}
                            <div>
                                <h4 className="text-lg font-bold text-[#1b140d] mb-4">
                                    Thông tin liên hệ
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-medium text-[#9a734c] mb-1">
                                            Email
                                        </p>
                                        <p className="text-sm text-[#1b140d]">
                                            {selectedStaff.email}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-[#9a734c] mb-1">
                                            Điện thoại
                                        </p>
                                        <p className="text-sm text-[#1b140d]">
                                            {selectedStaff.phone}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-[#9a734c] mb-1">
                                            Vai trò
                                        </p>
                                        <span
                                            className={clsx(
                                                "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border",
                                                getRoleBadge(selectedStaff.role)
                                            )}
                                        >
                                            {getRoleLabel(selectedStaff.role)}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-[#9a734c] mb-1">
                                            Ngày tham gia
                                        </p>
                                        <p className="text-sm text-[#1b140d]">
                                            {new Date(selectedStaff.joinDate).toLocaleDateString(
                                                "vi-VN"
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div>
                                <h4 className="text-lg font-bold text-[#1b140d] mb-4">
                                    Hiệu suất
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-[#f3ede7] rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-[#1b140d]">
                                            {selectedStaff.ordersHandled || 0}
                                        </p>
                                        <p className="text-xs text-[#9a734c] mt-1">
                                            Đơn đã xử lý
                                        </p>
                                    </div>
                                    <div className="bg-[#ee8c2b]/10 rounded-lg p-4 text-center border border-[#ee8c2b]/20">
                                        <p className="text-2xl font-bold text-[#ee8c2b]">
                                            {selectedStaff.performance || 0}%
                                        </p>
                                        <p className="text-xs text-[#9a734c] mt-1">Hiệu suất</p>
                                    </div>
                                    <div className="bg-[#f3ede7] rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-[#1b140d]">
                                            {Math.floor(
                                                (new Date().getTime() -
                                                    new Date(selectedStaff.joinDate).getTime()) /
                                                (1000 * 60 * 60 * 24 * 30)
                                            )}
                                        </p>
                                        <p className="text-xs text-[#9a734c] mt-1">Tháng làm việc</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-[#e7dbcf]">
                                <button
                                    type="button"
                                    className="flex-1 px-4 py-3 bg-[#ee8c2b] text-white rounded-lg font-bold hover:bg-[#d87c24]"
                                >
                                    Chỉnh sửa thông tin
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Add Staff Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-[#1b140d]">Thêm nhân viên mới</h3>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 hover:bg-[#f3ede7] rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleAddStaff} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-[#1b140d] mb-1">Họ và tên</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="VD: Nguyễn Văn A"
                                    className="w-full px-4 py-2.5 rounded-lg bg-[#f3ede7] border-none focus:ring-2 focus:ring-[#ee8c2b]/50 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-[#1b140d] mb-1">Email</label>
                                    <input
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="email@example.com"
                                        className="w-full px-4 py-2.5 rounded-lg bg-[#f3ede7] border-none focus:ring-2 focus:ring-[#ee8c2b]/50 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#1b140d] mb-1">Số điện thoại</label>
                                    <input
                                        required
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="0123456789"
                                        className="w-full px-4 py-2.5 rounded-lg bg-[#f3ede7] border-none focus:ring-2 focus:ring-[#ee8c2b]/50 text-sm"
                                    />
                                </div>
                            </div>





                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-[#e7dbcf] rounded-lg font-bold text-[#1b140d] hover:bg-[#f3ede7] transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-3 bg-[#ee8c2b] text-white rounded-lg font-bold hover:bg-[#d87c24] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting && <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                                    Lưu nhân viên
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminStaff;
