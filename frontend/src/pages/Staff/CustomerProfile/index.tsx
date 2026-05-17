// Staff Customer Profile Page

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCustomerById, MOCK_CUSTOMER_PROFILES } from "../../../constants/mockCustomers";
import { MOCK_STAFF_ORDERS } from "../../../constants/mockStaffOrders";
import { generateCustomerInsights } from "../../../services/aiService";

export default function StaffCustomerProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [selectedCustomer, setSelectedCustomer] = useState(
        id ? getCustomerById(id) : MOCK_CUSTOMER_PROFILES[0]
    );

    if (!selectedCustomer) {
        return (
            <div className="max-w-7xl mx-auto w-full">
                <div className="text-center py-24 bg-white border border-[#e7dbcf] rounded-xl shadow-sm">
                    <h2 className="text-xl font-black text-[#1b140d] mb-4">Không tìm thấy khách hàng</h2>
                    <button className="px-6 py-3 bg-[#ee8c2b] text-white rounded-lg font-bold hover:opacity-90 transition-all" onClick={() => navigate('/staff')}>Quay lại Dashboard</button>
                </div>
            </div>
        );
    }

    const customerOrders = MOCK_STAFF_ORDERS.filter(order => order.customerId === selectedCustomer.id);
    const insights = generateCustomerInsights(selectedCustomer);

    return (
        <div className="max-w-7xl mx-auto w-full">
            {/* Header / Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-[#9a734c] font-medium mb-6">
                <button onClick={() => navigate('/staff')} className="hover:text-[#ee8c2b] transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">home</span> Dashboard
                </button>
                <span className="material-symbols-outlined text-[16px] text-gray-400">chevron_right</span>
                <span className="text-[#1b140d]">Hồ sơ khách hàng</span>
            </div>

            {/* Profile Info Header Card */}
            <div className="bg-white border border-[#e7dbcf] rounded-xl p-8 shadow-sm mb-6">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="relative">
                        <img src={selectedCustomer.avatar} alt={selectedCustomer.name} className="w-32 h-32 rounded-2xl object-cover border-4 border-[#fcfaf8] shadow-md" />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 border-4 border-white rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[14px]">verified</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-2">
                            <h1 className="text-3xl font-black tracking-tight text-[#1b140d]">{selectedCustomer.name}</h1>
                            <div className="flex gap-2">
                                {selectedCustomer.orderHistory.totalOrders > 50 && <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">⭐ VIP</span>}
                                {selectedCustomer.orderHistory.totalOrders > 20 && <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">🔥 Loyal</span>}
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 mb-6 text-[#9a734c] text-sm font-medium">
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[18px]">mail</span>
                                {selectedCustomer.email}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[18px]">call</span>
                                {selectedCustomer.phone}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[18px]">location_on</span>
                                Da Nang, VN
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="flex items-center gap-3 px-4 py-3 bg-[#fcfaf8] border border-[#e7dbcf] rounded-xl">
                                <div className="p-2 bg-[#ee8c2b]/10 rounded-lg">
                                    <span className="material-symbols-outlined text-[#ee8c2b]">shopping_bag</span>
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-[#1b140d] leading-none mb-1">{selectedCustomer.orderHistory.totalOrders}</div>
                                    <div className="text-[10px] font-bold text-[#9a734c] uppercase tracking-wider">Tổng đơn</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-4 py-3 bg-[#fcfaf8] border border-[#e7dbcf] rounded-xl">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <span className="material-symbols-outlined text-blue-600">bar_chart</span>
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-[#1b140d] leading-none mb-1">{customerOrders.length}</div>
                                    <div className="text-[10px] font-bold text-[#9a734c] uppercase tracking-wider">Trong hệ thống</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <button className="px-5 py-2.5 bg-white border border-[#e7dbcf] rounded-lg text-sm font-bold text-[#1b140d] hover:border-[#ee8c2b] hover:text-[#ee8c2b] transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                        Chỉnh sửa
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Allergies & Health */}
                <div className="lg:col-span-2 bg-white border border-[#e7dbcf] rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 border-b border-[#e7dbcf] pb-4">
                        <span className="material-symbols-outlined text-red-500">health_and_safety</span>
                        <h2 className="text-lg font-bold text-[#1b140d]">Dị ứng & Sức khỏe</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedCustomer.allergies.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">warning</span> Dị ứng
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedCustomer.allergies.map((a, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-semibold border border-red-100">{a}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {selectedCustomer.healthConditions.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">medical_services</span> Tình trạng
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedCustomer.healthConditions.map((c, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold border border-blue-100">{c}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedCustomer.dietaryPreferences.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">restaurant</span> Chế độ ăn
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedCustomer.dietaryPreferences.map((p, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-semibold border border-emerald-100">{p}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedCustomer.orderHistory.lastIncident && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">report</span> Sự cố gần nhất
                                </h3>
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-sm text-amber-900 font-medium italic">
                                    "{selectedCustomer.orderHistory.lastIncident}"
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {selectedCustomer.specialNotes.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-[#e7dbcf]">
                            <h3 className="text-xs font-bold text-[#9a734c] uppercase tracking-widest mb-3">Ghi chú đặc biệt</h3>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                                {selectedCustomer.specialNotes.map((n, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-[#1b140d]">
                                        <span className="text-[#ee8c2b]">•</span>
                                        {n}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* AI Insights & Common Requests */}
                <div className="space-y-6">
                    <div className="bg-[#1b140d] rounded-xl p-6 text-white shadow-lg overflow-hidden relative">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                                <span className="material-symbols-outlined text-[#ee8c2b]">sparkle</span>
                                <h2 className="text-lg font-bold">AI Insights</h2>
                            </div>
                            
                            <div className="space-y-4">
                                {insights.map((insight, i) => (
                                    <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-xl">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                                insight.type === 'warning' ? 'text-red-400' :
                                                insight.type === 'pattern' ? 'text-blue-400' :
                                                'text-emerald-400'
                                            }`}>
                                                {insight.type}
                                            </span>
                                            <span className="text-[10px] text-white/40">{insight.confidence}% Confidence</span>
                                        </div>
                                        <p className="text-xs text-white/80 leading-relaxed font-medium">{insight.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#ee8c2b]/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    </div>

                    <div className="bg-white border border-[#e7dbcf] rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-[#ee8c2b]">replay</span>
                            <h2 className="text-lg font-bold text-[#1b140d]">Yêu cầu thường gặp</h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selectedCustomer.orderHistory.commonRequests.map((req, i) => (
                                <span key={i} className="px-3 py-1.5 bg-[#fcfaf8] border border-[#e7dbcf] rounded-lg text-xs font-bold text-[#1b140d]">{req}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer List Selection */}
            <div className="bg-white border border-[#e7dbcf] rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-[#1b140d]">Tất cả khách hàng</h2>
                    <div className="text-xs font-bold text-[#9a734c] uppercase tracking-wider">{MOCK_CUSTOMER_PROFILES.length} khách</div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {MOCK_CUSTOMER_PROFILES.map(customer => (
                        <div
                            key={customer.id}
                            className={`flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer ${selectedCustomer.id === customer.id
                                    ? 'bg-[#fcfaf8] border-[#ee8c2b] shadow-sm ring-1 ring-[#ee8c2b]'
                                    : 'bg-[#fcfaf8] border-transparent hover:border-[#e7dbcf] hover:bg-white'
                                }`}
                            onClick={() => setSelectedCustomer(customer)}
                        >
                            <img src={customer.avatar} alt={customer.name} className="w-12 h-12 rounded-lg object-cover border border-[#e7dbcf]" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-[#1b140d] truncate">{customer.name}</div>
                                <div className="text-[10px] font-bold text-[#9a734c] uppercase">{customer.orderHistory.totalOrders} đơn hàng</div>
                            </div>
                            {(customer.allergies.length > 0 || customer.healthConditions.length > 0) && (
                                <span className="material-symbols-outlined text-red-500 text-[18px]">warning</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
