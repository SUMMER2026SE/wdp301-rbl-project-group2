// Staff Customer Profile Page - Optimized Version
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    User, Mail, Phone, MapPin, ShieldAlert, HeartPulse, Sparkles,
    Search, Loader2, ShoppingBag, CheckCircle, DollarSign, Heart,
    FileText, AlertCircle, Calendar, RefreshCw, Award, ChevronLeft, ChevronRight
} from "lucide-react";
import customerService, { type Customer } from "@/services/customer.service";
import type { Order } from "@/services/order.service";
import { generateCustomerInsights } from "@/services/aiService";

// Custom hook để debounce search query tránh spam API
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function StaffCustomerProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isMounted = useRef(true);

    // State quản lý danh sách & phân trang
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 400); // Tránh spam API khi gõ
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalDocs, setTotalDocs] = useState(0);

    // State chi tiết khách hàng được chọn
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
    const [incidents, setIncidents] = useState<Order[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Quản lý Clean-up khi unmount component
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // 1. Fetch danh sách khách hàng (Hỗ trợ phân trang và tìm kiếm từ API)
    const fetchCustomers = useCallback(async (page: number, search: string) => {
        setLoading(true);
        try {
            const res = await customerService.getCustomers(page, 12, search); // Mỗi trang 12 item là tỷ lệ vàng cho Grid
            if (!isMounted.current) return;

            const fetchedUsers = res.data?.users || [];
            setCustomers(fetchedUsers);
            setTotalPages(res.data?.totalPages || 1);
            setTotalDocs(res.data?.total || fetchedUsers.length);
        } catch (err) {
            console.error("Failed to fetch customers", err);
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, []);

    // Trình theo dõi danh sách phụ thuộc vào Trang và Nội dung tìm kiếm
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers(currentPage, debouncedSearch);
        }, 0);
        return () => clearTimeout(timer);
    }, [currentPage, debouncedSearch, fetchCustomers]);

    // Tự động chọn khách hàng đầu tiên nếu URL không có ID và danh sách đã tải xong
    useEffect(() => {
        if (!id && customers.length > 0) {
            navigate(`/staff/customers/${customers[0]._id}`, { replace: true });
        }
    }, [id, customers, navigate]);

    // 2. Đồng bộ hóa khi URL ID thay đổi (Staff bấm nút Back/Forward hoặc click từ trang khác sang)
    useEffect(() => {
        if (!id) return;
        if (selectedCustomer?._id === id) return;

        // Nếu khách hàng đã nằm trong danh sách hiện tại thì dùng luôn
        const found = customers.find(c => c._id === id);
        if (found) {
            setTimeout(() => {
                if (isMounted.current) setSelectedCustomer(found);
            }, 0);
        } else {
            // Nếu không tìm thấy (ví dụ staff truy cập trực tiếp bằng URL), gọi API lấy chi tiết cá nhân đó
            const fetchSingleCustomer = async () => {
                try {
                    const res = await customerService.getCustomerById(id);
                    if (res?.data && isMounted.current) {
                        setSelectedCustomer(res.data);
                    }
                } catch (err) {
                    console.error("Failed to fetch detail customer from URL ID", err);
                }
            };
            fetchSingleCustomer();
        }
    }, [id, customers, selectedCustomer?._id]);

    // 3. Fetch dữ liệu chi tiết đơn hàng & sự cố khi Khách hàng được chọn thay đổi
    useEffect(() => {
        if (!selectedCustomer?._id) return;

        const loadCustomerDetails = async () => {
            setLoadingDetails(true);
            try {
                const [ordersRes, incidentsRes] = await Promise.all([
                    customerService.getCustomerOrders(selectedCustomer._id),
                    customerService.getCustomerIncidents(selectedCustomer._id)
                ]);

                if (!isMounted.current) return;
                setCustomerOrders(ordersRes.data || []);
                setIncidents(incidentsRes.data || []);
            } catch (err) {
                console.error("Failed to load customer details", err);
            } finally {
                if (isMounted.current) setLoadingDetails(false);
            }
        };

        loadCustomerDetails();
    }, [selectedCustomer?._id]);

    const handleSelectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        navigate(`/staff/customers/${customer._id}`);
    };

    // --- LOGIC ĐỊNH DẠNG DỮ LIỆU (Tối ưu hóa hiển thị) ---
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("vi-VN", {
            year: "numeric", month: "2-digit", day: "2-digit"
        });
    };

    const getTierColor = (tier: string | undefined) => {
        switch (tier?.toLowerCase()) {
            case "diamond": return "from-cyan-500 to-blue-600 text-white";
            case "platinum": return "from-indigo-500 to-purple-600 text-white";
            case "gold": return "from-amber-400 to-amber-600 text-white";
            case "silver": return "from-slate-300 to-slate-500 text-white";
            default: return "from-orange-400 to-orange-600 text-white";
        }
    };

    const activeTier = useMemo(() => {
        if (!selectedCustomer) return "Bronze";
        if (selectedCustomer.tier) return selectedCustomer.tier;
        const pts = selectedCustomer.collectedPoints || 0;
        if (pts >= 1000) return "Diamond";
        if (pts >= 500) return "Platinum";
        if (pts >= 200) return "Gold";
        if (pts >= 100) return "Silver";
        return "Bronze";
    }, [selectedCustomer]);

    // Hợp nhất mảng dị ứng từ preferences và dữ liệu sức khỏe
    const allergiesList = useMemo(() => {
        const set = new Set<string>();
        selectedCustomer?.preferences?.allergies?.forEach(a => set.add(a));
        selectedCustomer?.health?.allergies?.forEach(a => set.add(a));
        return Array.from(set);
    }, [selectedCustomer]);

    // Thống kê món được order nhiều nhất
    const favoriteDishes = useMemo(() => {
        const counts: Record<string, { name: string; count: number }> = {};
        customerOrders.forEach(order => {
            order.items?.forEach(item => {
                const name = (item.productId as { name?: string })?.name || "Sản phẩm";
                if (!counts[name]) counts[name] = { name, count: 0 };
                counts[name].count += item.quantity;
            });
        });
        return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 3);
    }, [customerOrders]);

    const defaultAddress = useMemo(() => {
        if (!selectedCustomer?.addresses) return null;
        return selectedCustomer.addresses.find(a => a.isDefault) || selectedCustomer.addresses[0] || null;
    }, [selectedCustomer]);

    const recentNotes = useMemo(() => {
        return customerOrders
            .map(o => o.note)
            .filter((note): note is string => !!note && note.trim().length > 0)
            .slice(0, 3);
    }, [customerOrders]);

    // Các chỉ số phục vụ Mapping cho AI Insights
    const totalOrdersCount = selectedCustomer?.totalOrders ?? customerOrders.length;
    const cancelledOrdersCount = selectedCustomer?.cancelledOrders ?? incidents.length;
    const completedOrders = useMemo(() => customerOrders.filter(o => o.status === "completed"), [customerOrders]);
    const totalSpent = useMemo(() => completedOrders.reduce((sum, o) => sum + o.totalPrice, 0), [completedOrders]);

    const mappedCustomerProfile = useMemo(() => {
        if (!selectedCustomer) return null;

        const notes = customerOrders.map(o => o.note).filter((note): note is string => !!note && note.trim().length > 0);
        const noteCounts: Record<string, number> = {};
        notes.forEach(n => { noteCounts[n] = (noteCounts[n] || 0) + 1; });
        const commonRequests = Object.entries(noteCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

        const lastIncidentOrder = incidents[0];
        const lastIncident = lastIncidentOrder
            ? `Huỷ đơn #${lastIncidentOrder.code} - ${formatDate(lastIncidentOrder.createdAt)} (Lý do: ${lastIncidentOrder.cancellation?.reason || "Không rõ"})`
            : undefined;

        return {
            id: selectedCustomer._id,
            name: selectedCustomer.fullName || selectedCustomer.username,
            email: selectedCustomer.email,
            phone: selectedCustomer.phone || "Không có SĐT",
            avatar: selectedCustomer.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedCustomer.username}`,
            allergies: allergiesList,
            healthConditions: selectedCustomer.health?.allergies || [],
            dietaryPreferences: selectedCustomer.preferences?.dietary || [],
            specialNotes: selectedCustomer.preferences?.healthGoals || [],
            orderHistory: {
                totalOrders: totalOrdersCount,
                commonRequests: commonRequests.length > 0 ? commonRequests : ["Không có yêu cầu đặc biệt"],
                lastIncident,
                lastOrderDate: customerOrders[0] ? formatDate(customerOrders[0].createdAt) : "Chưa có đơn hàng",
            }
        };
    }, [selectedCustomer, customerOrders, incidents, allergiesList, totalOrdersCount]);

    const insights = useMemo(() => {
        if (!mappedCustomerProfile) return [];
        return generateCustomerInsights(mappedCustomerProfile);
    }, [mappedCustomerProfile]);

    // Giao diện Loading danh sách gốc
    if (loading && customers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
                <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100">
                    <Loader2 className="w-7 h-7 text-orange-600 animate-spin" />
                </div>
                <p className="text-xs text-slate-500 font-bold animate-pulse">Đang tải danh sách khách hàng...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-0 pb-16 animate-in fade-in duration-300">
            {/* Page Header */}
            <div className="flex flex-col gap-5 mb-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                            <User className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hồ Sơ Khách Hàng</h1>
                            <p className="text-sm font-medium text-slate-500 mt-0.5">Tra cứu chi tiết thông tin, dị ứng & lịch sử giao dịch</p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchCustomers(currentPage, debouncedSearch)}
                        className="flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-orange-50 hover:text-orange-600 transition-all active:scale-95 border border-transparent hover:border-orange-200"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Làm mới danh sách
                    </button>
                </div>
            </div>

            {/* Khung chính: Thông tin khách hàng đang được chọn */}
            {selectedCustomer ? (
                <>
                    {/* Customer Info Card */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm mb-6">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
                            <div className="relative">
                                <img
                                    src={mappedCustomerProfile?.avatar}
                                    alt={mappedCustomerProfile?.name}
                                    className="w-28 h-28 rounded-3xl object-cover border border-slate-100 shadow-sm bg-slate-50"
                                />
                                {totalOrdersCount > 10 && (
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-500 border-4 border-white rounded-full flex items-center justify-center shadow-sm">
                                        <span className="text-white text-[11px] font-black">★</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                                    <h2 className="text-2xl font-black text-slate-900">{mappedCustomerProfile?.name}</h2>
                                    <div className="flex gap-1.5">
                                        {totalOrdersCount > 50 && <span className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-wider">⭐ VIP</span>}
                                        {totalOrdersCount > 20 && <span className="px-2 py-0.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10px] font-black uppercase tracking-wider">🔥 Thân thiết</span>}
                                        {allergiesList.length > 0 && <span className="px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black uppercase tracking-wider">⚠️ Dị ứng</span>}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2 mb-6 text-slate-500 text-sm font-semibold">
                                    <div className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" />{mappedCustomerProfile?.email}</div>
                                    <div className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" />{mappedCustomerProfile?.phone}</div>
                                    <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" />Tham gia: {formatDate(selectedCustomer.createdAt)}</div>
                                </div>

                                {/* Order Stats Metrics Grid */}
                                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm">
                                        <div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><ShoppingBag className="w-4 h-4" /></div>
                                        <div>
                                            <div className="text-lg font-black text-slate-900 leading-none mb-0.5">{totalOrdersCount}</div>
                                            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Tổng đơn</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><CheckCircle className="w-4 h-4" /></div>
                                        <div>
                                            <div className="text-lg font-black text-slate-900 leading-none mb-0.5">{completedOrders.length}</div>
                                            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Thành công</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><DollarSign className="w-4 h-4" /></div>
                                        <div>
                                            <div className="text-lg font-black text-slate-900 leading-none mb-0.5">{formatCurrency(totalSpent)}</div>
                                            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Chi tiêu</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Layout thông tin chi tiết */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Cột Trái + Giữa: Sức khỏe & Đơn hàng */}
                        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-6 border-b border-slate-100 pb-4">
                                <HeartPulse className="w-5 h-5 text-red-500 animate-pulse" />
                                <h3 className="text-lg font-bold text-slate-900">Dị ứng & Hồ sơ sức khỏe</h3>
                            </div>

                            {loadingDetails ? (
                                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Chất dị ứng */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> Chất dị ứng</h4>
                                            {allergiesList.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {allergiesList.map((a, i) => (
                                                        <span key={i} className="px-3 py-1 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold">{a}</span>
                                                    ))}
                                                </div>
                                            ) : <p className="text-xs text-slate-400 italic">Không có báo cáo dị ứng</p>}
                                        </div>

                                        {/* Món ăn yêu thích */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5"><Heart className="w-4 h-4" /> Đồ ăn yêu thích nhất</h4>
                                            {favoriteDishes.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {favoriteDishes.map((dish, i) => (
                                                        <span key={i} className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-bold">{dish.name} (x{dish.count})</span>
                                                    ))}
                                                </div>
                                            ) : <p className="text-xs text-slate-400 italic">Chưa có lịch sử món ăn</p>}
                                        </div>

                                        {/* Địa chỉ giao hàng */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Địa chỉ chính</h4>
                                            {defaultAddress ? (
                                                <div className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-2xl p-3">
                                                    <p className="text-slate-900 font-bold">{defaultAddress.receiverName} - {defaultAddress.phone}</p>
                                                    <p className="text-slate-500 mt-1">{[defaultAddress.detail, defaultAddress.ward, defaultAddress.district, defaultAddress.city].filter(Boolean).join(", ")}</p>
                                                </div>
                                            ) : <p className="text-xs text-slate-400 italic">Chưa có địa chỉ</p>}
                                        </div>

                                        {/* Tỷ lệ hủy đơn */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Tín nhiệm đơn hàng</h4>
                                            <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-2xl text-xs font-bold text-amber-800 inline-block">
                                                {cancelledOrdersCount} đơn hủy ({selectedCustomer.cancellationRate ? Math.round(selectedCustomer.cancellationRate) : 0}%)
                                            </div>
                                        </div>

                                        {/* Ghi chú đơn hàng gần đây */}
                                        <div className="space-y-3 md:col-span-2">
                                            <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-4 h-4" /> Ghi chú đơn gần đây</h4>
                                            {recentNotes.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    {recentNotes.map((note, i) => (
                                                        <div key={i} className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-2xl p-3 italic">
                                                            "{note}"
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <p className="text-xs text-slate-400 italic">Không có ghi chú nào gần đây</p>}
                                        </div>
                                    </div>

                                    {/* Danh sách hủy đơn gần đây */}
                                    {incidents.length > 0 && (
                                        <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                                            <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest">Chi tiết đơn hủy gần đây</h4>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {incidents.slice(0, 3).map((item) => (
                                                    <div key={item._id} className="p-3 bg-rose-50/40 border border-rose-100/60 rounded-2xl text-xs text-slate-700">
                                                        <div className="flex justify-between items-center mb-1 font-bold">
                                                            <span className="text-slate-900">Đơn #{item.code}</span>
                                                            <span className="text-slate-400">{formatDate(item.createdAt)}</span>
                                                        </div>
                                                        <p className="italic text-rose-800">"Lý do: {item.cancellation?.reason || "Không rõ lý do"}"</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Cột Phải: AI Insights & Thành viên */}
                        <div className="space-y-6">
                            {/* AI Insights Card */}
                            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                                        <Sparkles className="w-5 h-5 text-orange-400" />
                                        <h3 className="text-lg font-bold">AI Insights</h3>
                                    </div>

                                    {loadingDetails ? (
                                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>
                                    ) : insights.length > 0 ? (
                                        <div className="space-y-3">
                                            {insights.map((insight, i) => (
                                                <div key={i} className="p-3.5 bg-white/5 border border-white/5 rounded-2xl">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${insight.type === 'warning' ? 'bg-red-500/20 text-red-300' :
                                                                insight.type === 'pattern' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
                                                            }`}>{insight.type === 'warning' ? 'Cảnh báo' : insight.type === 'pattern' ? 'Thói quen' : 'Sở thích'}</span>
                                                        <span className="text-[9px] text-white/40 font-bold">Tin cậy {insight.confidence}%</span>
                                                    </div>
                                                    <p className="text-xs text-white/80 leading-relaxed font-semibold">{insight.message}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-white/40 italic">Chưa đủ dữ liệu để phân tích thông thái AI.</p>}
                                </div>
                            </div>

                            {/* Cấp bậc VIP */}
                            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                                    <Award className="w-5 h-5 text-orange-500" />
                                    <h3 className="text-base font-bold text-slate-800">Thành viên & Điểm thưởng</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl"><Award className="w-5 h-5" /></div>
                                            <div>
                                                <div className="text-sm font-black text-slate-800">Hạng hiện tại</div>
                                                <div className="text-xs text-slate-400 mt-0.5">Hệ thống cấp bậc</div>
                                            </div>
                                        </div>
                                        <span className={`px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r ${getTierColor(activeTier)}`}>{activeTier}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl"><Award className="w-5 h-5" /></div>
                                            <div>
                                                <div className="text-sm font-black text-slate-800">Ví điểm tích lũy</div>
                                                <div className="text-xs text-slate-400 mt-0.5">Dùng để áp dụng giảm giá</div>
                                            </div>
                                        </div>
                                        <span className="text-base font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-xl">{selectedCustomer.collectedPoints || 0} xu</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-16 bg-white border rounded-3xl mb-8">
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-bold">Vui lòng chọn một khách hàng hợp lệ</p>
                </div>
            )}

            {/* --- DANH SÁCH KHÁCH HÀNG (PHÂN TRANG & TÌM KIẾM SERVER-SIDE) --- */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Danh sách khách hàng</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase mt-0.5">Tổng số hệ thống ghi nhận: {totalDocs} thành viên</p>
                    </div>
                    {/* Ô Tìm kiếm đầu vào */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm họ tên, email, SĐT..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} // Reset về trang 1 khi gõ
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-500 bg-slate-50"
                        />
                    </div>
                </div>

                {/* Grid Hiển Thị Người Dùng */}
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
                ) : customers.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                            {customers.map(customer => {
                                const isCurrentSelected = selectedCustomer?._id === customer._id;
                                const hasAllergy = (customer.preferences?.allergies?.length || 0) > 0 || (customer.health?.allergies?.length || 0) > 0;
                                return (
                                    <div
                                        key={customer._id}
                                        className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${isCurrentSelected
                                                ? 'bg-slate-50 border-orange-500 shadow-sm ring-1 ring-orange-500'
                                                : 'bg-slate-50/50 border-transparent hover:border-slate-200 hover:bg-slate-50'
                                            }`}
                                        onClick={() => handleSelectCustomer(customer)}
                                    >
                                        <img
                                            src={customer.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${customer.username}`}
                                            alt={customer.fullName || customer.username}
                                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-slate-900 truncate">{customer.fullName || customer.username}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase mt-0.5">{customer.totalOrders || 0} đơn hàng</div>
                                        </div>
                                        {hasAllergy && <span className="text-red-500 font-bold animate-pulse" title="Có ghi chú dị ứng đặc biệt">⚠️</span>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Thanh điều khiển phân trang */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-8 border-t border-slate-100 pt-4">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-xl bg-slate-50 border text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-bold text-slate-600 px-3">Trang {currentPage} / {totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-xl bg-slate-50 border text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-12 text-slate-400 italic text-xs">Không tìm thấy khách hàng phù hợp với điều kiện tìm kiếm.</div>
                )}
            </div>
        </div>
    );
}