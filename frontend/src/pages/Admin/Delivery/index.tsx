import { useState } from "react";
import {
    Map,
    Truck,
    Users,
    Clock,
    Star,
    Phone,
    Eye,
    X,
    Package,
    Navigation,
    MoreVertical
} from "lucide-react";

// --- MOCK DATA ---
const SHIPPERS_MOCK = [
    { id: "1", name: "Nguyễn Văn A", phone: "0901234567", status: "active", currentOrders: 2, totalDeliveries: 156, rating: 4.8, avgTime: "28 phút", zone: "Quận 1" },
    { id: "2", name: "Trần Văn B", phone: "0912345678", status: "active", currentOrders: 1, totalDeliveries: 203, rating: 4.9, avgTime: "25 phút", zone: "Quận 3" },
    { id: "3", name: "Lê Thị C", phone: "0923456789", status: "offline", currentOrders: 0, totalDeliveries: 98, rating: 4.7, avgTime: "30 phút", zone: "Quận 2" },
    { id: "4", name: "Phạm Văn D", phone: "0934567890", status: "busy", currentOrders: 3, totalDeliveries: 187, rating: 4.6, avgTime: "32 phút", zone: "Quận 1" },
    { id: "5", name: "Hoàng Văn E", phone: "0945678901", status: "active", currentOrders: 1, totalDeliveries: 142, rating: 4.8, avgTime: "27 phút", zone: "Quận 5" },
];

const ACTIVE_DELIVERIES = [
    { id: "ORD-7721", shipper: "Nguyễn Văn A", customer: "Trần Thị B", address: "123 Nguyễn Huệ, Q1", status: "picking_up", estimatedTime: "15 phút", progress: 30 },
    { id: "ORD-7722", shipper: "Trần Văn B", customer: "Lê Văn C", address: "456 Lê Lợi, Q3", status: "delivering", estimatedTime: "8 phút", progress: 75 },
    { id: "ORD-7723", shipper: "Nguyễn Văn A", customer: "Phạm Thị D", address: "789 Hai Bà Trưng, Q1", status: "pending", estimatedTime: "25 phút", progress: 10 },
    { id: "ORD-7724", shipper: "Phạm Văn D", customer: "Hoàng Văn E", address: "321 Pasteur, Q1", status: "delivering", estimatedTime: "5 phút", progress: 90 },
    { id: "ORD-7725", shipper: "Phạm Văn D", customer: "Đặng Thị F", address: "654 Võ Văn Tần, Q3", status: "pending", estimatedTime: "30 phút", progress: 5 },
];

const STATUS_TABS = [
    { id: "all", label: "Tất cả", count: 5 },
    { id: "pending", label: "Chờ lấy hàng", count: 2 },
    { id: "picking_up", label: "Đang lấy", count: 1 },
    { id: "delivering", label: "Đang giao", count: 2 },
];

const AdminDelivery = () => {
    const [activeTab, setActiveTab] = useState("all");
    const [selectedShipper, setSelectedShipper] = useState<string | null>(null);

    // --- Helper Functions ---
    const getShipperStatus = (status: string) => {
        switch (status) {
            case "active": return { label: "Sẵn sàng", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
            case "busy": return { label: "Đang giao", color: "bg-orange-100 text-orange-700 border-orange-200" };
            case "offline": return { label: "Nghỉ ngơi", color: "bg-slate-100 text-slate-600 border-slate-200" };
            default: return { label: status, color: "bg-slate-100 text-slate-600" };
        }
    };

    const getDeliveryStatus = (status: string) => {
        switch (status) {
            case "pending": return { label: "Chờ lấy", color: "bg-slate-100 text-slate-700", bar: "bg-slate-300" };
            case "picking_up": return { label: "Đang lấy", color: "bg-blue-100 text-blue-700", bar: "bg-blue-500" };
            case "delivering": return { label: "Đang giao", color: "bg-orange-100 text-orange-700", bar: "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" };
            case "delivered": return { label: "Đã giao", color: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" };
            default: return { label: status, color: "bg-slate-100 text-slate-600", bar: "bg-slate-300" };
        }
    };

    // Filter logic
    const filteredDeliveries = activeTab === "all"
        ? ACTIVE_DELIVERIES
        : ACTIVE_DELIVERIES.filter(d => d.status === activeTab);

    return (
        <div className="max-w-7xl mx-auto w-full animate-in fade-in duration-500">

            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                        Giám sát giao hàng
                    </h2>
                    <p className="text-slate-500 mt-1 font-medium">
                        Theo dõi vị trí Shipper và tiến độ đơn hàng theo thời gian thực.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95"
                    >
                        <Map className="w-4 h-4" />
                        Mở bản đồ tổng
                    </button>
                </div>
            </div>

            {/* --- STATS CARDS --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-100 rounded-2xl">
                            <Truck className="w-6 h-6 text-emerald-600" />
                        </div>
                        <span className="text-3xl font-black text-emerald-600 tracking-tight">3</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">Đang đi giao</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">5 đơn đang trên đường</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-2xl">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-3xl font-black text-blue-600 tracking-tight">3/5</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">Shipper Online</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">60% nhân sự khả dụng</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-100 rounded-2xl">
                            <Clock className="w-6 h-6 text-orange-600" />
                        </div>
                        <span className="text-3xl font-black text-slate-900 tracking-tight">28'</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">Thời gian TB</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">phút / đơn hàng</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-yellow-100 rounded-2xl">
                            <Star className="w-6 h-6 text-yellow-600 fill-yellow-600" />
                        </div>
                        <span className="text-3xl font-black text-slate-900 tracking-tight">4.8</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">Đánh giá Shipper</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Tuần hiện tại</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* --- LEFT: ACTIVE DELIVERIES (2 Cột) --- */}
                <div className="xl:col-span-2 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-black text-slate-900">Tiến trình giao hàng</h3>
                    </div>

                    {/* Tabs Pill Style */}
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {STATUS_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all border ${activeTab === tab.id
                                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600"
                                    }`}
                            >
                                {tab.label} <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100'}`}>{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {filteredDeliveries.map((delivery) => {
                            const statusInfo = getDeliveryStatus(delivery.status);

                            return (
                                <div
                                    key={delivery.id}
                                    className="bg-white border border-slate-200 rounded-[1.5rem] p-5 hover:shadow-lg hover:border-orange-200 transition-all group"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-orange-50 group-hover:border-orange-100 transition-colors">
                                                <Package className="w-6 h-6 text-slate-400 group-hover:text-orange-500" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-base font-black text-slate-900">{delivery.id}</span>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusInfo.color}`}>
                                                        {statusInfo.label}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                                                    Shipper: <span className="font-bold text-slate-700">{delivery.shipper}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Dự kiến đến</p>
                                            <p className="text-lg font-black text-orange-600">{delivery.estimatedTime}</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-100 flex items-start gap-3">
                                        <Navigation className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 mb-0.5">Khách: {delivery.customer}</p>
                                            <p className="text-xs font-medium text-slate-600">{delivery.address}</p>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-2">
                                            <span className="text-slate-500 uppercase tracking-wider text-[10px]">Tiến trình giao hàng</span>
                                            <span className="text-slate-900">{delivery.progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50 relative">
                                            <div
                                                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${statusInfo.bar}`}
                                                style={{ width: `${delivery.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* --- RIGHT: SHIPPER LIST (1 Cột) --- */}
                <div className="xl:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-black text-slate-900">Đội ngũ Shipper</h3>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
                        <div className="divide-y divide-slate-100">
                            {SHIPPERS_MOCK.map((shipper) => {
                                const shipStatus = getShipperStatus(shipper.status);
                                return (
                                    <div key={shipper.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-sm border border-orange-200">
                                                    {shipper.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900">{shipper.name}</h4>
                                                    <p className="text-xs font-medium text-slate-500">{shipper.phone}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${shipStatus.color}`}>
                                                {shipStatus.label}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 mt-3">
                                            <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Đơn nhận</p>
                                                <p className="text-sm font-black text-slate-900">{shipper.currentOrders}</p>
                                            </div>
                                            <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Khu vực</p>
                                                <p className="text-sm font-bold text-slate-900">{shipper.zone}</p>
                                            </div>
                                            <div className="bg-slate-50 rounded-lg p-2 flex flex-col items-center justify-center border border-slate-100">
                                                <div className="flex items-center gap-1">
                                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                                    <span className="text-sm font-black text-slate-900">{shipper.rating}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminDelivery;