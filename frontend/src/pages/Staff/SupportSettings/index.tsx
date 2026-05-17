import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Save,
    MessageSquare,
    Moon,
    Zap,
    Plus,
    Clock,
    ChevronRight,
    MessageCircle,
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import staffSupportChatService from '@/services/support-chat-staff.service';

export default function StaffSupportSettingsPage() {
    const navigate = useNavigate();
    const [welcomeEnabled, setWelcomeEnabled] = useState(true);
    const [welcomeMsg, setWelcomeMsg] = useState('');

    const [outOfOfficeEnabled, setOutOfOfficeEnabled] = useState(false);
    const [outOfOfficeMsg, setOutOfOfficeMsg] = useState('');
    const [activeDays, setActiveDays] = useState<string[]>([]);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('22:00');

    const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await staffSupportChatService.getSettings();
                const settings = res.data.settings;
                if (settings) {
                    setWelcomeEnabled(settings.welcomeMessage?.enabled ?? false);
                    setWelcomeMsg(settings.welcomeMessage?.content ?? '');
                    setOutOfOfficeEnabled(settings.outOfOffice?.enabled ?? false);
                    setOutOfOfficeMsg(settings.outOfOffice?.message ?? '');
                    setActiveDays(settings.outOfOffice?.schedule?.days ?? []);
                    setStartTime(settings.outOfOffice?.schedule?.startTime ?? '08:00');
                    setEndTime(settings.outOfOffice?.schedule?.endTime ?? '22:00');
                }
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Không thể tải cài đặt');
            } finally {
                setLoading(false);
            }
        };
        void loadSettings();
    }, []);

    const toggleDay = (day: string) => {
        setActiveDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await staffSupportChatService.updateSettings({
                welcomeMessage: { enabled: welcomeEnabled, content: welcomeMsg },
                outOfOffice: {
                    enabled: outOfOfficeEnabled,
                    message: outOfOfficeMsg,
                    schedule: { days: activeDays, startTime, endTime }
                },
                quickReplies: [] // Placeholder for quick replies feature
            });
            toast.success('Đã lưu thiết lập tin nhắn tự động');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-950 min-h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 dark:bg-gray-950 -m-6 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium mb-6">
                    <button onClick={() => navigate('/staff/support')} className="hover:text-primary transition-colors flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" /> Tin nhắn
                    </button>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-gray-900 dark:text-white">Cài đặt tự động</span>
                </div>

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Quản lý phản hồi tự động</h1>
                        <p className="text-sm text-gray-500 mt-1">Tối ưu hóa trải nghiệm khách hàng với các tin nhắn được thiết lập sẵn.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>

                {/* Section 1: Welcome Message */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-primary">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Tin nhắn chào mừng</h3>
                                <p className="text-sm text-gray-500">Tự động gửi lời chào khi khách hàng bắt đầu cuộc trò chuyện mới với shop.</p>
                            </div>
                        </div>
                        {/* Toggle */}
                        <button
                            onClick={() => setWelcomeEnabled(!welcomeEnabled)}
                            className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${welcomeEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white absolute transition-all ${welcomeEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="mt-6">
                        <textarea
                            value={welcomeMsg}
                            onChange={(e) => setWelcomeMsg(e.target.value)}
                            disabled={!welcomeEnabled}
                            placeholder="Nhập nội dung tin nhắn chào mừng..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 resize-none"
                        />
                        <div className="flex justify-end mt-2">
                            <span className="text-xs text-gray-400 font-medium">{welcomeMsg.length}/500 ký tự</span>
                        </div>
                    </div>
                </div>

                {/* Section 2: Out of Office Message */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                                <Moon className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Tin nhắn ngoài giờ làm việc</h3>
                        </div>
                        <button
                            onClick={() => setOutOfOfficeEnabled(!outOfOfficeEnabled)}
                            className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${outOfOfficeEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white absolute transition-all ${outOfOfficeEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${!outOfOfficeEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* Schedule */}
                        <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">Lịch làm việc của shop</p>
                            <div className="flex items-center gap-2 mb-6">
                                {DAYS.map(day => (
                                    <button
                                        key={day}
                                        onClick={() => toggleDay(day)}
                                        className={`w-10 h-10 rounded-full text-xs font-bold transition-colors border ${activeDays.includes(day)
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-white border-gray-200 text-gray-400 dark:bg-gray-800 dark:border-gray-700'
                                            }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col xl:flex-row gap-4">
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Bắt đầu</p>
                                    <div className="relative">
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 outline-none focus:border-primary"
                                        />
                                        <Clock className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-center pt-5">
                                    <div className="w-4 h-0.5 bg-gray-300" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Kết thúc</p>
                                    <div className="relative">
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 outline-none focus:border-primary"
                                        />
                                        <Clock className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Message */}
                        <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">Nội dung tin nhắn</p>
                            <textarea
                                value={outOfOfficeMsg}
                                onChange={(e) => setOutOfOfficeMsg(e.target.value)}
                                placeholder="Cảm ơn bạn, chúng mình hiện đang nghỉ ngơi..."
                                rows={5}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 3: Quick Replies */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                                <Zap className="w-5 h-5 fill-current" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Tin nhắn trả lời nhanh</h3>
                        </div>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                            <Plus className="w-4 h-4" /> Thêm tin nhắn mẫu
                        </button>
                    </div>

                    <div className="space-y-3">
                        {/* Sample item 1 */}
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors cursor-pointer group">
                            <span className="px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold leading-none shrink-0 border border-green-200/50 dark:border-green-800/50">
                                /ship
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                Phí vận chuyển nội thành là 25k, miễn phí cho đơn hàng trên 500k.
                            </span>
                        </div>
                        {/* Sample item 2 */}
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors cursor-pointer group">
                            <span className="px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold leading-none shrink-0 border border-green-200/50 dark:border-green-800/50">
                                /chao
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                Dạ chào bạn, chúc bạn một ngày vui vẻ!
                            </span>
                        </div>
                        {/* Sample item 3 */}
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors cursor-pointer group">
                            <span className="px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold leading-none shrink-0 border border-green-200/50 dark:border-green-800/50">
                                /size
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                Quán có 2 size M và L (thêm 10k), bạn chọn size nào ạ?
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
