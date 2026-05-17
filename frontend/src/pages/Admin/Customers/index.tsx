import { useState, useEffect } from "react";
import { clsx } from "clsx";
import apiClient from "@/lib/api-client";
import { AdminDrawer } from "@/components/shared/AdminDrawer";
import { AlertTriangle } from "lucide-react";

// ============================================================
// TYPES – map the shape returned by GET /api/admin/customers
// ============================================================
interface CustomerAPI {
    _id: string;
    fullName?: string;
    name?: string;
    email: string;
    phone?: string;
    avatar?: string;
    createdAt?: string;
    joinDate?: string;
    totalOrders?: number;
    totalSpent?: number;
    loyaltyPoints?: number;
    status?: string;
    isActive?: boolean;
    lastOrderDate?: string;
    role?: string;
    cancellation_rate?: number;
}

interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar?: string;
    joinDate: string;
    totalOrders: number;
    totalSpent: number;
    loyaltyPoints: number;
    status: "active" | "inactive" | "vip";
    lastOrderDate: string;
    role?: string;
    cancellationRate: number;
}

interface ApiResponse {
    success?: boolean;
    data?: CustomerAPI[] | { customers?: CustomerAPI[]; users?: CustomerAPI[] };
    customers?: CustomerAPI[];
    users?: CustomerAPI[];
    total?: number;
    totalPages?: number;
    page?: number;
}

// ============================================================
// HELPERS
// ============================================================
const normalizeStatus = (raw?: string | boolean): Customer["status"] => {
    if (raw === "vip") return "vip";
    if (raw === false || raw === "inactive" || raw === "blocked") return "inactive";
    return "active";
};

const normalizeCustomer = (c: CustomerAPI): Customer => ({
    id: c._id,
    name: c.fullName ?? c.name ?? "—",
    email: c.email ?? "—",
    phone: c.phone ?? "—",
    avatar: c.avatar,
    joinDate: c.createdAt ?? c.joinDate ?? new Date().toISOString(),
    totalOrders: c.totalOrders ?? 0,
    totalSpent: c.totalSpent ?? 0,
    loyaltyPoints: c.loyaltyPoints ?? 0,
    status: normalizeStatus(c.status ?? c.isActive),
    lastOrderDate: c.lastOrderDate ?? c.createdAt ?? new Date().toISOString(),
    role: c.role,
    cancellationRate: c.cancellation_rate ?? 0,
});

const getStatusBadge = (status: Customer["status"]) => {
    switch (status) {
        case "vip":
            return "bg-purple-100 text-purple-700 border-purple-200";
        case "active":
            return "bg-green-100 text-green-700 border-green-200";
        case "inactive":
            return "bg-gray-100 text-gray-500 border-gray-200";
    }
};

const getStatusLabel = (status: Customer["status"]) => {
    switch (status) {
        case "vip":
            return "VIP";
        case "active":
            return "Hoạt động";
        case "inactive":
            return "Không HĐ";
    }
};

const SEGMENT_CHIPS = [
    { id: "all", label: "Tất cả" },
    { id: "vip", label: "VIP" },
    { id: "active", label: "Hoạt động" },
    { id: "inactive", label: "Không HĐ" },
];

// ============================================================
// COMPONENT
// ============================================================
const AdminCustomers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSegment, setActiveSegment] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const LIMIT = 10;

    const [incidents, setIncidents] = useState<any[]>([]);
    const [loadingIncidents, setLoadingIncidents] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    // Fetch incidents when tab changes or customer changes
    useEffect(() => {
        if (selectedCustomer && activeTab === "incidents") {
            const fetchIncidents = async () => {
                setLoadingIncidents(true);
                try {
                    const res = await apiClient.get(`/admin/customers/${selectedCustomer.id}/incidents`);
                    setIncidents(res.data.data);
                } catch (err) {
                    console.error("Lỗi tải lịch sử sự cố:", err);
                } finally {
                    setLoadingIncidents(false);
                }
            };
            fetchIncidents();
        }
    }, [selectedCustomer, activeTab]);

    // ----------------------------------------------------------
    // Fetch từ API
    // ----------------------------------------------------------
    useEffect(() => {
        const fetchCustomers = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await apiClient.get<ApiResponse>("/admin/customers", {
                    params: { page, limit: LIMIT },
                });
                const payload = res.data;

                // Xử lý nhiều dạng response khác nhau
                let raw: CustomerAPI[] = [];
                if (Array.isArray(payload.data)) {
                    raw = payload.data;
                } else if (payload.data && "customers" in payload.data && Array.isArray(payload.data.customers)) {
                    raw = payload.data.customers;
                } else if (payload.data && "users" in payload.data && Array.isArray(payload.data.users)) {
                    raw = payload.data.users;
                } else if (Array.isArray(payload.customers)) {
                    raw = payload.customers;
                } else if (Array.isArray(payload.users)) {
                    raw = payload.users;
                }

                setCustomers(raw.map(normalizeCustomer));
                setTotal(payload.total ?? raw.length);
                setTotalPages((payload.totalPages ?? Math.ceil((payload.total ?? raw.length) / LIMIT)) || 1);
            } catch (err: unknown) {
                console.error("Lỗi tải danh sách khách hàng:", err);
                setError("Không thể tải danh sách khách hàng. Vui lòng thử lại.");
            } finally {
                setLoading(false);
            }
        };

        fetchCustomers();
    }, [page]);

    // ----------------------------------------------------------
    // Derived stats
    // ----------------------------------------------------------
    const vipCustomers = customers.filter((c) => c.status === "vip").length;
    const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
    const totalOrders = customers.reduce((s, c) => s + c.totalOrders, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // ----------------------------------------------------------
    // Filter (client-side trên trang hiện tại)
    // ----------------------------------------------------------
    const filtered = customers.filter((c) => {
        const matchSeg = activeSegment === "all" || c.status === activeSegment;
        const q = searchQuery.toLowerCase();
        const matchQ =
            !q ||
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.phone.includes(q);
        return matchSeg && matchQ;
    });

    const segCounts: Record<string, number> = {
        all: customers.length,
        vip: customers.filter((c) => c.status === "vip").length,
        active: customers.filter((c) => c.status === "active").length,
        inactive: customers.filter((c) => c.status === "inactive").length,
    };

    // ----------------------------------------------------------
    // Render
    // ----------------------------------------------------------
    return (
        <div className="max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-[#1b140d]">
                        Quản lý khách hàng
                    </h2>
                    <p className="text-[#9a734c] mt-1">
                        Theo dõi thông tin, lịch sử mua hàng và điểm thưởng.
                    </p>
                </div>
                <button
                    type="button"
                    className="flex items-center gap-2 px-6 py-3 bg-[#ee8c2b] text-white rounded-lg text-sm font-bold shadow-sm hover:bg-[#d87c24] transition-all"
                >
                    <span className="material-symbols-outlined text-xl">add</span>
                    Thêm khách hàng
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <span className="material-symbols-outlined text-blue-600">group</span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-[#9a734c] mb-1">Tổng khách hàng</p>
                    <h3 className="text-3xl font-bold text-[#1b140d]">{loading ? "—" : total}</h3>
                </div>

                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <span className="material-symbols-outlined text-purple-600">workspace_premium</span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-[#9a734c] mb-1">Khách hàng VIP</p>
                    <h3 className="text-3xl font-bold text-[#1b140d]">{loading ? "—" : vipCustomers}</h3>
                </div>

                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-[#ee8c2b]/10 rounded-lg">
                            <span className="material-symbols-outlined text-[#ee8c2b]">payments</span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-[#9a734c] mb-1">Tổng chi tiêu (trang này)</p>
                    <h3 className="text-2xl font-bold text-[#1b140d]">
                        {loading ? "—" : totalRevenue.toLocaleString("vi-VN") + "₫"}
                    </h3>
                </div>

                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <span className="material-symbols-outlined text-green-600">shopping_cart</span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-[#9a734c] mb-1">Giá trị TB/đơn</p>
                    <h3 className="text-2xl font-bold text-[#1b140d]">
                        {loading ? "—" : avgOrderValue.toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + "₫"}
                    </h3>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-white border border-[#e7dbcf] rounded-xl p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9a734c]">
                            search
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm theo tên, email hoặc số điện thoại..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#f3ede7] border-none focus:ring-2 focus:ring-[#ee8c2b]/50 text-sm text-[#1b140d] placeholder:text-[#9a734c]"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto">
                        {SEGMENT_CHIPS.map((chip) => (
                            <button
                                key={chip.id}
                                type="button"
                                onClick={() => setActiveSegment(chip.id)}
                                className={clsx(
                                    "shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                                    activeSegment === chip.id
                                        ? "bg-[#ee8c2b] text-white"
                                        : "bg-[#f3ede7] text-[#1b140d] hover:bg-[#e7dbcf]"
                                )}
                            >
                                {chip.label}
                                {!loading && (
                                    <span className="ml-1.5 text-xs opacity-75">({segCounts[chip.id]})</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="shrink-0 flex items-center gap-2 px-4 py-2 border border-[#e7dbcf] rounded-lg text-sm font-medium text-[#1b140d] hover:bg-[#f3ede7] transition-colors"
                    >
                        <span className="material-symbols-outlined text-base">download</span>
                        Xuất dữ liệu
                    </button>
                </div>
            </div>

            {/* Customer Table */}
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
                            onClick={() => setPage((p) => p)}
                            className="px-4 py-2 bg-[#ee8c2b] text-white text-sm font-bold rounded-lg hover:bg-[#d87c24] transition-colors"
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {/* Table */}
                {!loading && !error && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#fcfaf8] border-b border-[#e7dbcf]">
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                                            Khách hàng
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                                            Liên hệ
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                                            Ngày tham gia
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                                            Trạng thái
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">
                                            Tổng đơn
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">
                                            Tỷ lệ hủy
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">
                                            Điểm
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e7dbcf]">
                                    {filtered.map((customer) => (
                                        <tr
                                            key={customer.id}
                                            className="hover:bg-[#fcfaf8] transition-colors group cursor-pointer"
                                            onClick={() => setSelectedCustomer(customer)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {customer.avatar ? (
                                                        <img
                                                            src={customer.avatar}
                                                            alt={customer.name}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-[#ee8c2b]/20 flex items-center justify-center text-[#ee8c2b] font-bold text-sm">
                                                            {customer.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-bold text-[#1b140d]">
                                                            {customer.name}
                                                        </p>
                                                        <p className="text-xs text-[#9a734c] font-mono">
                                                            {customer.id.slice(-8).toUpperCase()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-[#1b140d]">{customer.email}</p>
                                                <p className="text-xs text-[#9a734c]">{customer.phone}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-[#1b140d]">
                                                    {new Date(customer.joinDate).toLocaleDateString("vi-VN")}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={clsx(
                                                        "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border",
                                                        getStatusBadge(customer.status)
                                                    )}
                                                >
                                                    {getStatusLabel(customer.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-bold text-[#1b140d]">
                                                    {customer.totalOrders}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={clsx(
                                                    "text-sm font-bold",
                                                    customer.cancellationRate > 20 ? "text-red-600" : "text-[#1b140d]"
                                                )}>
                                                    {customer.cancellationRate.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-flex items-center gap-1 text-sm font-bold text-[#ee8c2b]">
                                                    <span className="material-symbols-outlined text-base">stars</span>
                                                    {customer.loyaltyPoints}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        type="button"
                                                        className="p-1.5 text-[#9a734c] hover:text-[#ee8c2b] hover:bg-[#ee8c2b]/10 rounded transition-colors"
                                                        title="Xem chi tiết"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedCustomer(customer);
                                                        }}
                                                    >
                                                        <span className="material-symbols-outlined text-xl">visibility</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="p-1.5 text-[#9a734c] hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Gửi thông báo"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <span className="material-symbols-outlined text-xl">mail</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Empty state */}
                        {filtered.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-24 h-24 rounded-full bg-[#f3ede7] flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-5xl text-[#9a734c]">
                                        search_off
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-[#1b140d] mb-2">
                                    Không tìm thấy khách hàng
                                </h3>
                                <p className="text-sm text-[#9a734c]">
                                    Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                                </p>
                            </div>
                        )}

                        {/* Pagination */}
                        <div className="p-4 flex items-center justify-between border-t border-[#e7dbcf] bg-[#fcfaf8]">
                            <p className="text-sm text-[#9a734c]">
                                Trang {page} / {totalPages} · {total} khách hàng
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="px-3 py-1 rounded-lg border border-[#e7dbcf] text-sm font-medium text-[#1b140d] hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Trước
                                </button>
                                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                                    const p = i + 1;
                                    return (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPage(p)}
                                            className={clsx(
                                                "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                                                p === page
                                                    ? "bg-[#ee8c2b] text-white font-bold shadow-sm"
                                                    : "border border-[#e7dbcf] text-[#1b140d] hover:bg-white"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                                <button
                                    type="button"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    className="px-3 py-1 rounded-lg border border-[#e7dbcf] text-sm font-medium text-[#1b140d] hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Sau
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Customer Detail Drawer */}
            <AdminDrawer
                isOpen={!!selectedCustomer}
                onClose={() => setSelectedCustomer(null)}
                title="Hồ sơ khách hàng"
            >
                {selectedCustomer && (
                    <div className="space-y-8">
                        {/* Profile Header */}
                        <div className="flex items-center gap-6">
                            {selectedCustomer.avatar ? (
                                <img
                                    src={selectedCustomer.avatar}
                                    alt={selectedCustomer.name}
                                    className="w-20 h-20 rounded-2xl object-cover border border-[#e7dbcf]"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-3xl">
                                    {selectedCustomer.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h3 className="text-2xl font-black text-[#1b140d] tracking-tight">
                                    {selectedCustomer.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-sm text-[#9a734c] font-mono font-bold">
                                        ID: {selectedCustomer.id.slice(-8).toUpperCase()}
                                    </p>
                                    <span
                                        className={clsx(
                                            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border",
                                            getStatusBadge(selectedCustomer.status)
                                        )}
                                    >
                                        {getStatusLabel(selectedCustomer.status)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Customer Health Check / Risk Level */}
                        {selectedCustomer.cancellationRate > 15 && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-4">
                                <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="text-red-900 font-bold text-sm">Cảnh báo: Tỷ lệ hủy đơn cao ({selectedCustomer.cancellationRate.toFixed(1)}%)</p>
                                    <p className="text-red-700 text-xs">Khách hàng này có dấu hiệu đặt đơn không nhận hoặc thường xuyên thay đổi ý định.</p>
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="space-y-6">
                            <div className="flex border-b border-[#e7dbcf]">
                                <button
                                    onClick={() => setActiveTab("overview")}
                                    className={clsx(
                                        "px-4 py-3 text-sm font-bold transition-all relative",
                                        activeTab === "overview" ? "text-orange-600" : "text-[#9a734c]"
                                    )}
                                >
                                    Tổng quan
                                    {activeTab === "overview" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />}
                                </button>
                                <button
                                    onClick={() => setActiveTab("incidents")}
                                    className={clsx(
                                        "px-4 py-3 text-sm font-bold transition-all relative flex items-center gap-2",
                                        activeTab === "incidents" ? "text-orange-600" : "text-[#9a734c]"
                                    )}
                                >
                                    Lịch sử sự cố
                                    {selectedCustomer.cancellationRate > 0 && (
                                        <span className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-[10px]">
                                            !
                                        </span>
                                    )}
                                    {activeTab === "incidents" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />}
                                </button>
                            </div>

                            {activeTab === "overview" ? (
                                <>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="p-4 bg-[#fcfaf8] rounded-2xl border border-[#e7dbcf]/50">
                                            <p className="text-[10px] font-black text-[#9a734c] uppercase tracking-widest mb-1">Email</p>
                                            <p className="text-sm text-[#1b140d] font-bold">{selectedCustomer.email}</p>
                                        </div>
                                        <div className="p-4 bg-[#fcfaf8] rounded-2xl border border-[#e7dbcf]/50">
                                            <p className="text-[10px] font-black text-[#9a734c] uppercase tracking-widest mb-1">Số điện thoại</p>
                                            <p className="text-sm text-[#1b140d] font-bold">{selectedCustomer.phone}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 bg-white border border-[#e7dbcf] rounded-2xl text-center">
                                            <p className="text-2xl font-black text-[#1b140d]">{selectedCustomer.totalOrders}</p>
                                            <p className="text-[10px] font-bold text-[#9a734c] uppercase tracking-wider">Đơn hàng</p>
                                        </div>
                                        <div className="p-4 bg-white border border-[#e7dbcf] rounded-2xl text-center">
                                            <p className="text-xl font-black text-orange-600">{selectedCustomer.loyaltyPoints}</p>
                                            <p className="text-[10px] font-bold text-[#9a734c] uppercase tracking-wider">Điểm tích lũy</p>
                                        </div>
                                        <div className="p-4 bg-white border border-[#e7dbcf] rounded-2xl text-center">
                                            <p className="text-2xl font-black text-[#1b140d]">{selectedCustomer.cancellationRate.toFixed(0)}%</p>
                                            <p className="text-[10px] font-bold text-[#9a734c] uppercase tracking-wider">Tỷ lệ hủy</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    {loadingIncidents ? (
                                        <div className="py-10 flex justify-center">
                                            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    ) : incidents.length === 0 ? (
                                        <div className="py-10 text-center text-gray-500 text-sm italic">
                                            Không có sự cố nào được ghi nhận.
                                        </div>
                                    ) : (
                                        incidents.map((incident: any) => (
                                            <div key={incident._id} className="p-4 bg-red-50/50 border border-red-100 rounded-2xl">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-black text-red-600 uppercase tracking-tighter">Đơn hàng #{incident.code}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold">{new Date(incident.createdAt).toLocaleDateString("vi-VN")}</span>
                                                </div>
                                                <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                                    {incident.cancellation_reason || "Đơn hàng bị khách hủy hoặc từ chối nhận."}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-6 flex gap-3">
                                <button className="flex-1 bg-orange-600 text-white font-black py-3 rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-500 transition-all active:scale-95">
                                    Xem lịch sử mua hàng
                                </button>
                                <button className="px-4 py-3 border-2 border-[#e7dbcf] text-[#1b140d] font-black rounded-xl hover:bg-[#fcfaf8] transition-all">
                                    Chặn khách hàng
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </AdminDrawer>
        </div>
    );
};

export default AdminCustomers;
