import { useState, useEffect } from 'react';
import { Wallet, CheckCircle2, AlertCircle, Search, ArrowRight, History } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface StaffDebt {
    _id: string;
    driver_name: string;
    driver_email: string;
    total_amount: number;
    order_count: number;
    order_ids: string[];
}

const AdminCashControl = () => {
    const [debts, setDebts] = useState<StaffDebt[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [collectingId, setCollectingId] = useState<string | null>(null);

    const fetchDebts = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/admin/cash-control');
            setDebts(res.data.data);
        } catch (error) {
            toast.error('Không thể tải dữ liệu công nợ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDebts();
    }, []);

    const handleCollectCash = async (driverId: string, driverName: string) => {
        if (!window.confirm(`Xác nhận đã thu đủ tiền từ nhân viên ${driverName}?`)) return;

        try {
            setCollectingId(driverId);
            await apiClient.post('/admin/collect-cash', { driver_id: driverId });
            toast.success(`Đã tất toán công nợ cho ${driverName}`);
            fetchDebts();
        } catch (error) {
            toast.error('Gặp lỗi khi xử lý tất toán');
        } finally {
            setCollectingId(null);
        }
    };

    const filteredDebts = debts.filter(d =>
        d.driver_name.toLowerCase().includes(search.toLowerCase()) ||
        d.driver_email.toLowerCase().includes(search.toLowerCase())
    );

    const totalUncollected = debts.reduce((acc, curr) => acc + curr.total_amount, 0);

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-600">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[#9a734c] uppercase tracking-wider">Tổng tiền COD ngoài thị trường</p>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                                {totalUncollected.toLocaleString('vi-VN')}₫
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[#9a734c] uppercase tracking-wider">Nhân viên đang cầm nợ</p>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                                {debts.length} người
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-500/10 rounded-xl flex items-center justify-center text-green-600">
                            <History size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[#9a734c] uppercase tracking-wider">Chốt tiền gần nhất</p>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                Hôm nay, 14:05
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Control Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm theo tên nhân viên..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    />
                </div>

                <button
                    onClick={fetchDebts}
                    className="w-full md:w-auto px-4 py-2.5 text-sm font-bold text-[#9a734c] hover:text-gray-900 dark:hover:text-white flex items-center justify-center gap-2 transition-colors"
                >
                    Làm mới dữ liệu
                </button>
            </div>

            {/* Debt Table */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-20 flex justify-center">
                        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredDebts.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={32} className="text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium">Hiện không có công nợ nhân viên nào cần xử lý.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                                <th className="px-6 py-4 text-xs font-bold text-[#9a734c] uppercase tracking-wider">Nhân viên</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#9a734c] uppercase tracking-wider text-center">Số đơn COD</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#9a734c] uppercase tracking-wider">Số tiền đang giữ</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#9a734c] uppercase tracking-wider text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredDebts.map((debt) => (
                                <tr key={debt._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/10 text-orange-600 rounded-xl flex items-center justify-center font-black text-sm">
                                                {debt.driver_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white capitalize leading-none mb-1">{debt.driver_name}</p>
                                                <p className="text-[11px] text-[#9a734c]">{debt.driver_email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold">
                                            {debt.order_count} đơn
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 font-black text-orange-600 text-lg">
                                        {debt.total_amount.toLocaleString('vi-VN')}₫
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button
                                            onClick={() => handleCollectCash(debt._id, debt.driver_name)}
                                            disabled={collectingId === debt._id}
                                            className={cn(
                                                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                                collectingId === debt._id
                                                    ? "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                                    : "bg-orange-600 text-white hover:bg-orange-500 shadow-md shadow-orange-500/20 active:scale-95"
                                            )}
                                        >
                                            {collectingId === debt._id ? 'Đang xử lý...' : 'Thu tiền & Chốt nợ'}
                                            <ArrowRight size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl flex gap-3">
                <AlertCircle size={20} className="text-amber-600 shrink-0" />
                <p className="text-[13px] text-amber-700 dark:text-amber-500">
                    <strong>Lưu ý:</strong> Một khi bấm "Thu tiền & Chốt nợ", tất cả đơn hàng COD của nhân viên này sẽ được đánh dấu là đã nộp tiền vào két. Bạn không thể hoàn tác hành động này.
                </p>
            </div>
        </div>
    );
};

export default AdminCashControl;
