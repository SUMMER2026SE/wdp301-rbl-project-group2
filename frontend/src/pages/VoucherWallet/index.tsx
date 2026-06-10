import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import voucherService from "@/services/voucher.service";
import productAPI from "@/services/product.service";
import { userService, type MembershipInfo, type PointTransaction } from "@/services/profile.service";
import { useAuth } from "@/hooks/useAuth";
import toast from 'react-hot-toast';
import type { Voucher } from "@/types/voucher";
import type { Product } from "@/types/product";
import { DiscountType } from "@/types/voucher";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDiscount(voucher: Voucher): string {
    if (voucher.discountType === DiscountType.PERCENTAGE) {
        return `${voucher.discountValue}%`;
    }
    if (voucher.discountType === DiscountType.FIXED_AMOUNT) {
        return `${(voucher.discountValue / 1000).toFixed(0)}k`;
    }
    return `${voucher.discountValue}`;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getDate()} Th${d.getMonth() + 1}, ${d.getFullYear()}`;
}

function getExpiryLabel(endDate: string): string {
    const now = new Date();
    const end = new Date(endDate);
    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) return "Đã hết hạn";
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffH < 24) return `Hết hạn sau ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Hết hạn sau ${diffD} ngày`;
    return `HSD: ${formatDate(endDate)}`;
}

function isExpired(v: Voucher): boolean {
    return new Date(v.endAt) < new Date();
}

// A voucher is "exhausted" only when the global pool is fully used up
function isExhausted(v: Voucher): boolean {
    return (
        v.usageLimit !== null &&
        v.usageLimit !== undefined &&
        v.usedCount >= v.usageLimit
    );
}

type FilterTab = "active" | "used" | "expired";

// ─── Color map by category ───────────────────────────────────────────────────

const COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    discount: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30", badge: "bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400" },
    freeship: { bg: "bg-green-500/10", text: "text-green-600", border: "border-green-500/30", badge: "bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400" },
    newuser: { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/30", badge: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" },
    special: { bg: "bg-purple-500/10", text: "text-purple-600", border: "border-purple-500/30", badge: "bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400" },
};
const getColor = (cat: string) => COLORS[cat] ?? COLORS.discount;

// ─── Sub-components ──────────────────────────────────────────────────────────

const VoucherCard = ({
    voucher,
    onCopy,
    copied,
}: {
    voucher: Voucher;
    onCopy: (code: string) => void;
    copied: string | null;
}) => {
    const color = getColor(voucher.category);
    const expired = isExpired(voucher);
    const isCopied = copied === voucher.code;

    return (
        <div className={`bg-card rounded-2xl border border-border overflow-hidden flex shadow-sm group hover:-translate-y-1 transition-all ${expired ? "opacity-60" : ""}`}>
            <div className={`w-24 ${color.bg} flex flex-col items-center justify-center p-2 border-r border-dashed ${color.border} relative`}>
                <div className="absolute -top-3 -right-3 size-6 bg-background rounded-full" />
                <div className="absolute -bottom-3 -right-3 size-6 bg-background rounded-full" />
                <span className={`text-2xl font-black ${color.text}`}>{formatDiscount(voucher)}</span>
                <span className={`text-[8px] font-bold ${color.text} tracking-widest uppercase`}>OFF</span>
            </div>
            <div className="flex-1 p-5 space-y-3">
                <div className="flex flex-wrap gap-2">
                    {voucher.minOrderValue > 0 && (
                        <span className="px-2 py-1 bg-muted text-[9px] font-bold rounded">
                            Tối thiểu {(voucher.minOrderValue / 1000).toFixed(0)}k
                        </span>
                    )}
                    {voucher.conditions?.slice(0, 1).map((c, i) => (
                        <span key={i} className={`px-2 py-1 ${color.badge} text-[9px] font-bold rounded`}>{c}</span>
                    ))}
                </div>
                <h5 className="text-sm font-bold line-clamp-1">{voucher.title}</h5>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-medium italic">
                        {getExpiryLabel(voucher.endAt)}
                    </span>
                    <button
                        onClick={() => onCopy(voucher.code)}
                        className="text-xs font-black text-primary hover:underline uppercase flex items-center gap-1"
                    >
                        {isCopied ? (
                            <>
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                Đã sao chép
                            </>
                        ) : "Sao chép"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const VoucherSkeleton = () => (
    <div className="bg-card rounded-2xl border border-border overflow-hidden flex shadow-sm animate-pulse">
        <div className="w-24 bg-muted border-r border-dashed border-border" />
        <div className="flex-1 p-5 space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-2/3" />
        </div>
    </div>
);

// ─── Membership Sub-components ──────────────────────────────────────────────

const TierRoadmap = ({ points, tier }: { points: number; tier: string }) => {
    const tiers = [
        { key: "Bronze", name: "Đồng", pts: 0, icon: "military_tech" },
        { key: "Silver", name: "Bạc", pts: 500, icon: "stars" },
        { key: "Gold", name: "Vàng", pts: 2000, icon: "workspace_premium" },
        { key: "Platinum", name: "Bạch kim", pts: 5000, icon: "diamond" },
        { key: "Diamond", name: "Kim cương", pts: 10000, icon: "emoji_events" },
    ];

    const currentTierIndex = tiers.findIndex(t => t.key === tier) ?? 0;

    return (
        <div className="bg-white dark:bg-card rounded-[24px] border border-border p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">route</span>
                    <h4 className="text-lg font-bold">Lộ trình thăng hạng</h4>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Điểm hiện tại</p>
                    <p className="text-xl font-black text-primary">{points.toLocaleString()} pts</p>
                </div>
            </div>
            <div className="relative flex justify-between">
                <div className="absolute top-5 left-0 w-full h-1 bg-muted -z-0" />
                {tiers.map((t, i) => {
                    const isActive = i <= currentTierIndex;
                    const isCurrent = t.key === tier;
                    return (
                        <div key={i} className="relative z-10 flex flex-col items-center gap-3">
                            <div className={`size-10 rounded-full flex items-center justify-center transition-all ${isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"} ${isCurrent ? "scale-125 shadow-lg shadow-primary/30" : ""}`}>
                                <span className="material-symbols-outlined text-xl">{t.icon}</span>
                            </div>
                            <div className="text-center">
                                <p className={`text-xs font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>{t.name}</p>
                                <p className="text-[10px] text-muted-foreground">{t.pts} pts{isCurrent && " (Hiện tại)"}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const MembershipPerks = ({ tier }: { tier: string }) => {
    const tierNames: Record<string, string> = {
        Bronze: "Hạng Đồng",
        Silver: "Hạng Bạc",
        Gold: "Hạng Vàng",
        Platinum: "Hạng Bạch kim",
        Diamond: "Hạng Kim cương",
    };
    const perks = [
        { icon: "add_task", title: "Tích điểm x1.5", desc: "Nhận nhiều điểm hơn mỗi đơn hàng", color: "bg-orange-50 dark:bg-orange-900/20 text-orange-600" },
        { icon: "local_shipping", title: "Ưu tiên giao hàng", desc: "Đơn được ưu tiên chuẩn bị sớm", color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600" },
        { icon: "cake", title: "Quà sinh nhật", desc: "Voucher 50k vào ngày sinh của bạn", color: "bg-purple-50 dark:bg-purple-900/20 text-purple-600" },
        { icon: "support_agent", title: "Hỗ trợ 24/7", desc: "Kênh hỗ trợ riêng cho thành viên", color: "bg-green-50 dark:bg-green-900/20 text-green-600" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">military_tech</span>
                    <h4 className="text-lg font-bold">Đặc quyền {tierNames[tier] || tier}</h4>
                </div>
                <button className="text-xs font-bold text-primary hover:underline">Xem tất cả</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {perks.map((p, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors">
                        <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${p.color}`}>
                            <span className="material-symbols-outlined">{p.icon}</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold">{p.title}</p>
                            <p className="text-xs text-muted-foreground">{p.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PointsActivity = ({ activities }: { activities: PointTransaction[] }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">history</span>
                    <h4 className="text-lg font-bold">Lịch sử điểm</h4>
                </div>
                <button className="text-[10px] font-black text-muted-foreground hover:text-primary uppercase tracking-widest">Xem thêm</button>
            </div>
            {activities.length === 0 ? (
                <div className="bg-card border border-border rounded-[24px] p-8 flex flex-col items-center justify-center text-center space-y-2">
                    <span className="material-symbols-outlined text-4xl opacity-20">history</span>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">Chưa có hoạt động</p>
                </div>
            ) : (
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-1 px-1">
                    {activities.map((a, i) => (
                        <div key={i} className="min-w-[260px] bg-card border border-border rounded-2xl p-4 flex gap-4 items-center shrink-0 hover:border-primary/30 transition-all group">
                            <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${a.type === "earn" || a.type === "referral" || a.type === "bonus" ? "bg-green-50 dark:bg-green-950/40 text-green-600" : "bg-orange-50 dark:bg-orange-950/40 text-orange-600"}`}>
                                <span className="material-symbols-outlined text-lg">
                                    {a.type === "earn" || a.type === "referral" || a.type === "bonus" ? "add_circle" : "remove_circle"}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                    <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{a.description}</p>
                                    <span className={`text-sm font-black shrink-0 ${a.type === "earn" || a.type === "referral" || a.type === "bonus" ? "text-green-600" : "text-orange-600"}`}>
                                        {a.amount > 0 ? "+" : ""}{a.amount}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">{a.type}</p>
                                    <p className="text-[9px] text-muted-foreground whitespace-nowrap opacity-60 font-bold">{formatDate(a.createdAt)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const Missions = () => {
    const missions = [
        { title: "Mời bạn mới", bonus: "+100 pts", progress: 0, total: 1, icon: "person_add" },
        { title: "Đặt 3 đơn hàng", bonus: "+50 pts", progress: 1, total: 3, icon: "shopping_bag" },
    ];

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Nhiệm vụ hôm nay</h4>
            {missions.map((m, i) => (
                <div key={i} className="bg-white dark:bg-card border border-border rounded-2xl p-4 flex gap-4 items-center group cursor-pointer hover:border-primary/50 transition-all">
                    <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined">{m.icon}</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1.5">
                            <p className="text-sm font-bold">{m.title}</p>
                            <span className="text-[10px] font-black text-primary">{m.bonus}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${(m.progress / m.total) * 100}%` }} />
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground font-bold">{m.progress}/{m.total} hoàn thành</p>
                    </div>
                </div>
            ))}
        </div>
    );
};


const InviteModal = ({ isOpen, onClose, code }: { isOpen: boolean; onClose: () => void; code: string }) => {
    if (!isOpen) return null;

    const handleCopyCode = () => {
        navigator.clipboard.writeText(code);
        // Could add a toast here
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-card w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="relative p-8 text-center space-y-6">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        <span className="material-symbols-outlined text-muted-foreground">close</span>
                    </button>

                    <div className="inline-flex size-20 bg-orange-100 dark:bg-orange-950/40 text-orange-600 rounded-3xl items-center justify-center mb-2">
                        <span className="material-symbols-outlined text-4xl">celebration</span>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-2xl font-black">Mời bạn bè, Nhận quà!</h3>
                        <p className="text-sm text-muted-foreground px-4">
                            Chia sẻ mã giới thiệu của bạn để cả hai cùng nhận được <span className="font-bold text-primary">Voucher 200.000đ</span>
                        </p>
                    </div>

                    <div className="bg-muted/50 p-6 rounded-2xl border-2 border-dashed border-border group">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Mã của bạn</p>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-3xl font-black tracking-tighter text-primary">{code}</span>
                            <button
                                onClick={handleCopyCode}
                                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md"
                            >
                                SAO CHÉP
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {["Facebook", "Zalo", "Messenger"].map((platform) => (
                            <button key={platform} className="flex flex-col items-center gap-2 p-3 bg-muted/30 rounded-2xl hover:bg-primary/5 transition-colors group">
                                <span className="material-symbols-outlined text-muted-foreground group-hover:text-primary">share</span>
                                <span className="text-[10px] font-bold">{platform}</span>
                            </button>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-border">
                        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
                            <span>Cách thức hoạt động</span>
                        </div>
                        <div className="flex justify-between items-start gap-2">
                            {[
                                { i: "1", t: "Gửi mã", s: "Cho bạn bè" },
                                { i: "2", t: "Bạn đặt", s: "Đơn đầu tiên" },
                                { i: "3", t: "Nhận quà", s: "Vào ví ngay" },
                            ].map((step, idx) => (
                                <div key={idx} className="flex-1 text-center space-y-1">
                                    <div className="size-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold mx-auto flex items-center justify-center">
                                        {step.i}
                                    </div>
                                    <p className="text-[10px] font-bold">{step.t}</p>
                                    <p className="text-[8px] text-muted-foreground">{step.s}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main content (exported for reuse) ───────────────────────────────────────

export const VoucherWalletContent = () => {
    const { getUser } = useAuth();
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<FilterTab>("active");
    const [copied, setCopied] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const [activities, setActivities] = useState<PointTransaction[]>([]);
    const [rewardVouchers, setRewardVouchers] = useState<Voucher[]>([]);
    const [rewardLoading, setRewardLoading] = useState(true);

    const fetchVouchers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            // Fetch user's vouchers and public vouchers
            const res = await voucherService.getVouchers({ ownerId: 'me', limit: 100 });
            setVouchers(res.data ?? []);
        } catch (err) {
            console.error("Failed to fetch vouchers:", err);
            setError("Không thể tải danh sách voucher. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchRewards = useCallback(async () => {
        try {
            setRewardLoading(true);
            // Fetch reward template vouchers
            const res = await voucherService.getVouchers({ isReward: true, limit: 100 });
            
            const tiersOrder = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
            const getTierWeight = (t?: string | null) => {
                if (!t) return 0;
                const idx = tiersOrder.indexOf(t);
                return idx === -1 ? 0 : idx;
            };

            const sorted = (res.data ?? []).sort((a, b) => {
                const wA = getTierWeight(a.minTier);
                const wB = getTierWeight(b.minTier);
                if (wA !== wB) return wA - wB;
                return (a.pointCost || 0) - (b.pointCost || 0);
            });

            setRewardVouchers(sorted);
        } catch (err) {
            console.error("Failed to fetch reward vouchers:", err);
        } finally {
            setRewardLoading(false);
        }
    }, []);

    const fetchMembershipData = useCallback(async () => {
        try {
            const [mRes, pRes] = await Promise.all([
                userService.getMembership(),
                userService.getPointTransactions()
            ]);
            setMembership(mRes.data.data);
            setActivities(pRes.data.data ?? []);
        } catch (err) {
            console.error("Failed to fetch membership info:", err);
        }
    }, []);

    useEffect(() => {
        fetchVouchers();
        fetchMembershipData();
        fetchRewards();
    }, [fetchVouchers, fetchMembershipData, fetchRewards]);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(code);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    const filtered = vouchers.filter((v) => {
        if (activeTab === "expired") return isExpired(v) || isExhausted(v);
        if (activeTab === "used") return isExhausted(v) && !isExpired(v);
        return !isExpired(v) && !isExhausted(v);
    });

    const tabs: { key: FilterTab; label: string }[] = [
        { key: "active", label: "Đang dùng" },
        { key: "used", label: "Đã hết" },
        { key: "expired", label: "Hết hạn" },
    ];

    const emptyIcon: Record<FilterTab, string> = {
        active: "confirmation_number",
        used: "receipt_long",
        expired: "event_busy",
    };

    return (
        <div className="space-y-12">
            {/* Points Balance & Invite Friends Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 relative bg-white dark:bg-card rounded-[24px] border border-border p-8 shadow-sm overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Số dư điểm</p>
                                <h2 className="text-5xl font-black text-foreground tabular-nums">
                                    {membership?.collectedPoints?.toLocaleString() ?? 0} <span className="text-xl font-medium text-muted-foreground">pts</span>
                                </h2>
                            </div>
                            <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-full flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-600 text-base font-bold">verified</span>
                                <span className="text-green-700 dark:text-green-400 font-bold text-xs uppercase">
                                    Thành viên {membership?.tier || "Bronze"}
                                </span>
                            </div>
                        </div>
                        <div className="relative pt-4">
                            {(() => {
                                const tiers = [
                                    { key: "Bronze", name: "Đồng", pts: 0 },
                                    { key: "Silver", name: "Bạc", pts: 500 },
                                    { key: "Gold", name: "Vàng", pts: 2000 },
                                    { key: "Platinum", name: "Bạch kim", pts: 5000 },
                                    { key: "Diamond", name: "Kim cương", pts: 10000 },
                                ];
                                const currentIdx = tiers.findIndex(t => t.key === (membership?.tier || "Bronze"));
                                const nextTier = tiers[currentIdx + 1];
                                const currentTier = tiers[currentIdx];

                                let progress = 100;
                                let needed = 0;

                                if (nextTier) {
                                    const range = nextTier.pts - currentTier.pts;
                                    const earnedInRange = (membership?.collectedPoints || 0) - currentTier.pts;
                                    progress = Math.min(Math.max((earnedInRange / range) * 100, 5), 100);
                                    needed = nextTier.pts - (membership?.collectedPoints || 0);
                                }

                                return (
                                    <>
                                        <div className="flex justify-between text-[10px] font-black mb-3 uppercase tracking-tighter">
                                            <span className="text-primary">{currentTier.name}</span>
                                            <span className="text-muted-foreground">{nextTier?.name || "MAX"}</span>
                                        </div>
                                        <div className="h-4 bg-muted rounded-full overflow-visible relative">
                                            <div className="h-full bg-primary rounded-full transition-all duration-1000 relative" style={{ width: `${progress}%` }}>
                                                <div className="absolute -right-2 -top-1 size-6 bg-card border-4 border-primary rounded-full shadow-lg" />
                                            </div>
                                        </div>
                                        {nextTier ? (
                                            <p className="mt-4 text-sm font-medium text-muted-foreground">
                                                Kiếm thêm <span className="text-foreground font-bold">{needed} điểm</span> để thăng hạng <b>{nextTier.name}</b>
                                            </p>
                                        ) : (
                                            <p className="mt-4 text-sm font-medium text-primary font-bold italic">
                                                Bạn đang ở hạng cao nhất! Chúc mừng!
                                            </p>
                                        )}
                                    </>
                                );
                            })()}
                            <Link to="/membership" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                                <span className="material-symbols-outlined text-base">info</span>
                                <span>Tìm hiểu quyền lợi thành viên</span>
                            </Link>
                        </div>
                    </div>
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
                </div>

                <div className="relative bg-gradient-to-br from-orange-500 to-primary p-8 rounded-[32px] text-white flex flex-col justify-between overflow-hidden shadow-2xl shadow-primary/20 group">
                    <div className="relative z-10">
                        <span className="material-symbols-outlined text-4xl mb-4 opacity-80 group-hover:scale-110 transition-transform">celebration</span>
                        <h3 className="text-2xl font-bold leading-tight mb-2">Chia sẻ niềm vui</h3>
                        <p className="text-orange-100 text-sm leading-relaxed mb-6">
                            Giới thiệu bạn bè và cả hai đều nhận{" "}
                            <span className="font-bold text-white underline decoration-2 underline-offset-4">voucher 200.000đ</span>
                        </p>
                    </div>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="relative z-10 w-full py-3 bg-white text-primary font-black rounded-xl hover:bg-orange-50 transition-colors shadow-lg uppercase text-xs tracking-widest"
                    >
                        Mời bạn bè
                    </button>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                </div>
            </div>

            <InviteModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                code={membership?.referralCode || "FOODIE"}
            />

            {/* Rewards Shop */}
            <section className="space-y-6">
                <div className="flex items-end justify-between">
                    <div>
                        <h3 className="text-2xl font-bold">Cửa hàng thưởng</h3>
                        <p className="text-muted-foreground text-sm">Đổi điểm lấy phần thưởng</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="size-10 border border-border rounded-full flex items-center justify-center hover:bg-card transition-all">
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                        </button>
                        <button className="size-10 border border-border rounded-full flex items-center justify-center hover:bg-card transition-all">
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    </div>
                </div>

                <div className="flex gap-6 overflow-x-auto no-scrollbar pb-6 -mx-1 px-1">
                    {rewardLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="w-60 h-[150px] bg-card rounded-[24px] border border-border animate-pulse shrink-0 flex-none" />
                        ))
                    ) : rewardVouchers.length > 0 ? (
                        rewardVouchers.map((v) => {
                            const pts = v.pointCost || 0;
                            const color = getColor(v.category || 'discount');
                            
                            const tiers = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
                            const userTier = membership?.tier || "Bronze";
                            const minTier = v.minTier;
                            const isAlreadyClaimed = membership?.redeemedVoucherIds?.includes(v._id);
                            const isTierQualified = !minTier || tiers.indexOf(userTier) >= tiers.indexOf(minTier);
                            const hasEnoughPoints = (membership?.collectedPoints || 0) >= pts;
                            const canRedeem = hasEnoughPoints && isTierQualified && !isAlreadyClaimed;

                            return (
                                <div key={v._id} className={`w-64 bg-card p-4 rounded-[24px] border border-border hover:shadow-lg transition-all shrink-0 flex-none flex flex-col justify-between relative overflow-hidden ${isAlreadyClaimed ? "opacity-50 grayscale" : !canRedeem ? "opacity-80" : ""}`}>
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                        <span className="material-symbols-outlined text-8xl">local_activity</span>
                                    </div>
                                    <div>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className={`p-2 rounded-xl ${color.bg} ${color.text} flex items-center justify-center shrink-0`}>
                                                <span className="material-symbols-outlined text-xl">loyalty</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-primary">{pts.toLocaleString()}</p>
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">ĐIỂM</p>
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-lg mb-1 leading-tight line-clamp-2">{v.title}</h4>
                                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{v.description}</p>
                                        
                                        {minTier && minTier !== "Bronze" && (
                                            <div className="mb-4">
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-orange-600/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded">
                                                    Hạng {minTier === 'Silver' ? 'Bạc' : minTier === 'Gold' ? 'Vàng' : minTier === 'Platinum' ? 'Bạch Kim' : minTier === 'Diamond' ? 'Kim Cương' : minTier}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            if (isAlreadyClaimed) return;
                                            try {
                                                await voucherService.redeemRewardVoucher(v._id);
                                                // Refresh data locally and globally
                                                await fetchMembershipData();
                                                await fetchVouchers();
                                                await getUser();
                                                toast.success("Đổi voucher thành công! Kiểm tra trong 'Voucher của bạn'");
                                            } catch (error) {
                                                const err = error as { response?: { data?: { message?: string } } };
                                                toast.error(err.response?.data?.message || "Đổi điểm thất bại");
                                            }
                                        }}
                                        disabled={!canRedeem}
                                        className={`w-full py-2.5 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 ${canRedeem ? "bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 hover:-translate-y-0.5" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                                    >
                                        {isAlreadyClaimed ? "ĐÃ ĐỔI" : canRedeem ? "ĐỔI NGAY" : !isTierQualified ? `HẠNG CHƯA ĐỦ` : "KHÔNG ĐỦ ĐIỂM"}
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <div className="w-full py-12 bg-muted/20 rounded-3xl flex flex-col items-center justify-center text-center">
                            <span className="material-symbols-outlined text-4xl text-muted-foreground opacity-30 mb-2">inventory_2</span>
                            <p className="text-sm font-bold text-muted-foreground">Hiện chưa có vật phẩm đổi thưởng</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Membership Details Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-12">
                    <TierRoadmap
                        points={membership?.collectedPoints || 0}
                        tier={membership?.tier || "Bronze"}
                    />
                    <MembershipPerks tier={membership?.tier || "Bronze"} />
                    <PointsActivity activities={activities} />
                </div>
                <div className="space-y-8">
                    <Missions />
                    <div className="bg-gradient-to-br from-primary/10 to-orange-500/5 p-6 rounded-3xl border border-primary/10">
                        <h4 className="text-sm font-bold mb-4">Mẹo tích điểm</h4>
                        <ul className="space-y-3">
                            {[
                                "Đặt hàng vào khung giờ vàng",
                                "Đánh giá món ăn sau khi nhận",
                                "Sử dụng ưu đãi từ đối tác"
                            ].map((tip, i) => (
                                <li key={i} className="flex gap-2 text-xs font-medium text-muted-foreground">
                                    <span className="text-primary">•</span> {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Voucher Wallet — real data */}
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
                    <h3 className="text-2xl font-bold">Voucher của bạn</h3>
                    <div className="flex bg-muted p-1 rounded-xl">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-1.5 font-bold text-xs rounded-lg transition-all ${activeTab === tab.key
                                    ? "bg-card text-primary shadow-sm"
                                    : "text-muted-foreground"
                                    }`}
                            >
                                {tab.label}
                                {tab.key === "active" && !loading && vouchers.length > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-[9px]">
                                        {vouchers.filter(v => !isExpired(v) && !isExhausted(v)).length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                        <span className="material-symbols-outlined text-5xl text-destructive opacity-80">error</span>
                        <p className="text-sm font-medium text-muted-foreground">{error}</p>
                        <button
                            onClick={fetchVouchers}
                            className="px-4 py-2 text-xs font-bold text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors"
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {/* Loading */}
                {loading && !error && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => <VoucherSkeleton key={i} />)}
                    </div>
                )}

                {/* Voucher grid */}
                {!loading && !error && filtered.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((v) => (
                            <VoucherCard key={v._id} voucher={v} onCopy={handleCopy} copied={copied} />
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                        <span className="material-symbols-outlined text-6xl text-muted-foreground/40">
                            {emptyIcon[activeTab]}
                        </span>
                        <p className="text-lg font-bold text-muted-foreground">
                            {activeTab === "expired"
                                ? "Không có voucher đã hết hạn"
                                : activeTab === "used"
                                    ? "Không có voucher đã hết lượt"
                                    : "Không có voucher nào khả dụng"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Page wrapper ─────────────────────────────────────────────────────────────

const VoucherWalletPage = () => {
    const { t } = useTranslation(["customer", "common"]);
    const { getUser } = useAuth();
    
    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#1b140d] dark:text-gray-100 transition-colors duration-200 min-h-screen">
            <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
                <div className="layout-container flex h-full grow flex-col">
                    <main className="flex flex-1 justify-center py-10 px-4">
                        <div className="layout-content-container flex flex-col max-w-[1400px] flex-1">
                            <div className="flex flex-col gap-2 p-4 mb-6">
                                <h1 className="text-[#1b140d] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                                    {t("customer:voucherWallet.title")}
                                </h1>
                                <p className="text-[#9a734c] dark:text-gray-400 text-lg font-normal">
                                    {t("customer:voucherWallet.subtitle")}
                                </p>
                            </div>
                            <VoucherWalletContent />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default VoucherWalletPage;
