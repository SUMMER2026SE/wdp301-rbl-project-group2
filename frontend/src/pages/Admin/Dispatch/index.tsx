import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// ---- Mock Data ----

interface PendingOrder {
    id: string;
    orderNumber: string;
    customer: string;
    address: string;
    items: number;
    total: number;
    time: string;
}

interface Shipper {
    id: string;
    name: string;
    phone: string;
    status: 'available' | 'busy';
    currentOrders: number;
}

const MOCK_PENDING: PendingOrder[] = [
    { id: '1', orderNumber: 'FD-1042', customer: 'Nguyễn Văn A', address: '123 Nguyễn Huệ, Q1', items: 3, total: 185000, time: '5 phút trước' },
    { id: '2', orderNumber: 'FD-1043', customer: 'Trần Thị B', address: '456 Lê Lợi, Q3', items: 2, total: 120000, time: '3 phút trước' },
    { id: '3', orderNumber: 'FD-1044', customer: 'Phạm Minh C', address: '789 Hai Bà Trưng, Q1', items: 5, total: 340000, time: '1 phút trước' },
];

const MOCK_SHIPPERS: Shipper[] = [
    { id: 's1', name: 'Lê Văn Tài', phone: '0901234567', status: 'available', currentOrders: 0 },
    { id: 's2', name: 'Hoàng Minh', phone: '0912345678', status: 'busy', currentOrders: 2 },
    { id: 's3', name: 'Đào Thanh', phone: '0923456789', status: 'available', currentOrders: 1 },
];

// ---- Component ----

const AdminDispatch = () => {
    const { t } = useTranslation(['admin', 'common']);
    const [assigningOrder, setAssigningOrder] = useState<string | null>(null);

    const handleAssign = (orderId: string, shipperId: string) => {
        // TODO: call API to assign shipper
        console.log(`Assign order ${orderId} to shipper ${shipperId}`);
        setAssigningOrder(null);
    };

    const formatPrice = (p: number) => p.toLocaleString('vi-VN') + 'đ';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black text-[#1b140d] dark:text-white">
                    🛵 {t('admin:dispatch.title', 'Trạm Điều phối')}
                </h1>
                <p className="text-sm text-[#9a734c] mt-1">
                    {t('admin:dispatch.subtitle', 'Gán đơn hàng cho shipper nội bộ. Kéo thả hoặc bấm nút để gán nhanh.')}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Orders */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#e7dbcf] dark:border-gray-800 overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#e7dbcf] dark:border-gray-800 flex items-center justify-between">
                        <h2 className="font-bold text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-500 text-[20px]">pending_actions</span>
                            {t('admin:dispatch.pendingOrders', 'Đơn chờ giao')}
                        </h2>
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            {MOCK_PENDING.length}
                        </span>
                    </div>
                    <div className="divide-y divide-[#e7dbcf]/50 dark:divide-gray-800">
                        {MOCK_PENDING.map((order) => (
                            <div key={order.id} className="p-4 hover:bg-[#f3ede7]/50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="font-bold text-sm">#{order.orderNumber}</p>
                                        <p className="text-xs text-[#9a734c] mt-0.5">{order.customer}</p>
                                    </div>
                                    <span className="text-xs text-[#9a734c]">{order.time}</span>
                                </div>
                                <p className="text-xs text-[#9a734c] flex items-center gap-1 mb-2">
                                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                                    {order.address}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-orange-600">{formatPrice(order.total)}</span>
                                    {assigningOrder === order.id ? (
                                        <button
                                            onClick={() => setAssigningOrder(null)}
                                            className="text-xs text-red-500 font-semibold"
                                        >
                                            Hủy
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setAssigningOrder(order.id)}
                                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-colors"
                                        >
                                            Gán shipper
                                        </button>
                                    )}
                                </div>

                                {/* Shipper picker */}
                                {assigningOrder === order.id && (
                                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 space-y-2">
                                        <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Chọn shipper:</p>
                                        {MOCK_SHIPPERS.filter(s => s.status === 'available').map((shipper) => (
                                            <button
                                                key={shipper.id}
                                                onClick={() => handleAssign(order.id, shipper.id)}
                                                className="w-full flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-gray-700 hover:border-blue-400 transition-colors text-left"
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold">{shipper.name}</p>
                                                    <p className="text-[10px] text-[#9a734c]">{shipper.phone} · {shipper.currentOrders} đơn</p>
                                                </div>
                                                <span className="material-symbols-outlined text-blue-500 text-[20px]">arrow_forward</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Shipper List */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#e7dbcf] dark:border-gray-800 overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#e7dbcf] dark:border-gray-800 flex items-center justify-between">
                        <h2 className="font-bold text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-500 text-[20px]">delivery_dining</span>
                            {t('admin:dispatch.shippers', 'Đội ngũ shipper')}
                        </h2>
                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            {MOCK_SHIPPERS.filter(s => s.status === 'available').length} rảnh
                        </span>
                    </div>
                    <div className="divide-y divide-[#e7dbcf]/50 dark:divide-gray-800">
                        {MOCK_SHIPPERS.map((shipper) => (
                            <div key={shipper.id} className="p-4 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${shipper.status === 'available'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {shipper.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold">{shipper.name}</p>
                                    <p className="text-xs text-[#9a734c]">{shipper.phone}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${shipper.status === 'available'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${shipper.status === 'available' ? 'bg-emerald-500' : 'bg-gray-400'
                                            }`} />
                                        {shipper.status === 'available' ? 'Rảnh' : `${shipper.currentOrders} đơn`}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDispatch;
