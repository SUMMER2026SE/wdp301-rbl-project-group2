import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import voucherService from "@/services/voucher.service";
import { userService, type MembershipInfo, type PointTransaction } from "@/services/profile.service";
import { useAuth } from "@/hooks/useAuth";
import toast from 'react-hot-toast';
import type { Voucher } from "@/types/voucher";
import { DiscountType } from "@/types/voucher";
import { ChevronDown, ChevronUp, Copy, Loader2, Share2, X } from "lucide-react";

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

const POINT_HISTORY_PAGE_SIZE = 4;

const PointsActivity = ({
    activities,
    loading,
    loadingMore,
    hasMore,
    onLoadMore,
    onCollapse,
}: {
    activities: PointTransaction[];
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    onCollapse: () => void;
}) => {
    const canCollapse = activities.length > POINT_HISTORY_PAGE_SIZE;

    return (
        <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">history</span>
                    <h4 className="text-lg font-bold">Lịch sử điểm</h4>
                </div>
                {activities.length > 0 && (canCollapse || hasMore) && (
                    <div className="flex items-center gap-1">
                        {canCollapse && (
                            <button
                                type="button"
                                onClick={onCollapse}
                                disabled={loadingMore}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <ChevronUp className="size-4" />
                                Thu lại
                            </button>
                        )}
                        {hasMore && (
                            <button
                                type="button"
                                onClick={onLoadMore}
                                disabled={loadingMore}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loadingMore ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <ChevronDown className="size-4" />
                                )}
                                {loadingMore ? "Đang tải" : "Xem thêm"}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-[74px] animate-pulse rounded-2xl border border-border bg-card" />
                    ))}
                </div>
            ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center space-y-2 rounded-[24px] border border-border bg-card p-8 text-center">
                    <span className="material-symbols-outlined text-4xl opacity-20">history</span>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">Chưa có hoạt động</p>
                </div>
            ) : (
                <div className="grid min-w-0 grid-cols-1 gap-3">
                    {activities.map((activity) => {
                        const isPositive =
                            activity.type === "earn" ||
                            activity.type === "referral" ||
                            activity.type === "bonus";

                        return (
                            <div
                                key={activity._id}
                                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30 sm:gap-4"
                            >
                                <div
                                    className={
                                        "flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110 " +
                                        (isPositive
                                            ? "bg-green-50 text-green-600 dark:bg-green-950/40"
                                            : "bg-orange-50 text-orange-600 dark:bg-orange-950/40")
                                    }
                                >
                                    <span className="material-symbols-outlined text-lg">
                                        {isPositive ? "add_circle" : "remove_circle"}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 items-start justify-between gap-3">
                                        <p className="min-w-0 break-words text-sm font-bold leading-snug transition-colors group-hover:text-primary">
                                            {activity.description}
                                        </p>
                                        <span
                                            className={
                                                "shrink-0 text-sm font-black " +
                                                (isPositive ? "text-green-600" : "text-orange-600")
                                            }
                                        >
                                            {activity.amount > 0 ? "+" : ""}
                                            {activity.amount}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-[9px] font-medium uppercase text-muted-foreground">
                                            {activity.type}
                                        </p>
                                        <p className="whitespace-nowrap text-[9px] font-bold text-muted-foreground opacity-60">
                                            {formatDate(activity.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

type InviteModalProps = {
    isOpen: boolean;
    onClose: () => void;
    code: string;
    canClaim: boolean;
    referralStatus?: MembershipInfo["referralRewardStatus"];
    rejectionReason?: string | null;
    onClaimed: () => Promise<void>;
};

const InviteModal = ({
    isOpen,
    onClose,
    code,
    canClaim,
    referralStatus,
    rejectionReason,
    onClaimed,
}: InviteModalProps) => {
    const [referralInput, setReferralInput] = useState("");
    const [claiming, setClaiming] = useState(false);

    useEffect(() => {
        if (isOpen) setReferralInput("");
    }, [isOpen]);

    if (!isOpen) return null;

    const inviteUrl =
        window.location.origin +
        "/register?referral=" +
        encodeURIComponent(code);

    const copyText = async (text: string) => {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        const copied = document.execCommand("copy");
        textArea.remove();

        if (!copied) throw new Error("Copy command failed");
    };

    const handleCopyInviteLink = async () => {
        try {
            await copyText(inviteUrl);
            toast.success("Đã sao chép link mời");
        } catch {
            toast.error("Không thể sao chép link. Vui lòng thử lại");
        }
    };
    const handleClaimReferral = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const normalizedCode = referralInput.trim().toUpperCase();

        if (!normalizedCode) {
            toast.error("Vui lòng nhập mã giới thiệu");
            return;
        }

        try {
            setClaiming(true);
            const response = await userService.claimReferral(normalizedCode);
            await onClaimed();
            toast.success(response.data.message || "Đã ghi nhận mã giới thiệu");
            setReferralInput("");
            onClose();
        } catch (error: unknown) {
            const message =
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === "string"
                    ? (error as { response: { data: { message: string } } }).response.data.message
                    : "Không thể nhập mã giới thiệu";
            toast.error(message);
        } finally {
            setClaiming(false);
        }
    };

    const statusContent = {
        pending: {
            title: "Đang chờ đơn đầu tiên",
            description: "Lời mời đã được ghi nhận. Đơn đầu tiên phải hoàn tất và có tổng thanh toán từ 100.000đ.",
            className: "border-amber-200 bg-amber-50 text-amber-900",
        },
        processing: {
            title: "Đang kiểm tra điều kiện",
            description: "Hệ thống đang xác minh đơn hàng và điều kiện chống gian lận.",
            className: "border-amber-200 bg-amber-50 text-amber-900",
        },
        rewarded: {
            title: "Đã trao thưởng giới thiệu",
            description: "Người mời đã nhận voucher 30.000đ cho đơn từ 150.000đ; người được mời đã nhận 50 điểm.",
            className: "border-emerald-200 bg-emerald-50 text-emerald-900",
        },
        rejected: {
            title: "Lời mời không đủ điều kiện",
            description:
                rejectionReason === "minimum_order_not_met"
                    ? "Đơn đầu tiên hoàn tất chưa đạt 100.000đ."
                    : "Hệ thống phát hiện điều kiện referral không hợp lệ hoặc có dấu hiệu trùng tài khoản.",
            className: "border-rose-200 bg-rose-50 text-rose-900",
        },
    } as const;

    const currentStatus =
        referralStatus && referralStatus !== "none"
            ? statusContent[referralStatus]
            : null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
        >
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-card">
                <div className="relative space-y-6 p-6 sm:p-8">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:right-6 sm:top-6"
                        aria-label="Đóng"
                    >
                        <X className="size-5" />
                    </button>

                    <div className="space-y-3 pr-10">
                        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/40">
                            <Share2 className="size-7" />
                        </div>
                        <h3 id="invite-modal-title" className="text-2xl font-black">
                            Mời bạn bè nhận thưởng
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            Gửi link bằng bất kỳ ứng dụng nào. Khi bạn bè đăng ký và hoàn tất đơn đầu tiên từ
                            <strong className="text-primary"> 100.000đ</strong>, bạn nhận voucher
                            <strong className="text-primary"> 30.000đ</strong>; họ nhận
                            <strong className="text-primary"> 50 điểm</strong>.
                        </p>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
                        <label htmlFor="invite-link" className="text-xs font-bold uppercase text-muted-foreground">
                            Link mời của bạn
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                id="invite-link"
                                value={code ? inviteUrl : "Đang tạo link..."}
                                readOnly
                                onFocus={(event) => event.currentTarget.select()}
                                className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleCopyInviteLink}
                                disabled={!code}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Copy className="size-4" />
                                Sao chép link
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Mã dự phòng: <strong className="text-foreground">{code || "Đang tạo mã..."}</strong>
                        </p>
                    </div>

                    <ol className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                        {[
                            ["1", "Gửi link", "Qua bất kỳ ứng dụng nào"],
                            ["2", "Bạn bè đặt món", "Đơn đầu tiên từ 100.000đ"],
                            ["3", "Nhận thưởng", "Voucher 30.000đ và 50 điểm"],
                        ].map(([number, title, description]) => (
                            <li key={number} className="rounded-xl border border-border p-3">
                                <span className="font-black text-primary">{number}</span>
                                <p className="mt-1 font-bold">{title}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                            </li>
                        ))}
                    </ol>

                    {currentStatus && (
                        <div className={"rounded-xl border p-4 text-sm " + currentStatus.className}>
                            <p className="font-bold">{currentStatus.title}</p>
                            <p className="mt-1 leading-relaxed">{currentStatus.description}</p>
                        </div>
                    )}

                    {canClaim && (
                        <form onSubmit={handleClaimReferral} className="space-y-3 border-t border-border pt-5">
                            <div>
                                <label htmlFor="referral-code" className="text-sm font-bold">
                                    Bạn nhận mã trực tiếp thay vì link?
                                </label>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Nhập trước khi hoàn tất đơn hàng đầu tiên.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                    id="referral-code"
                                    value={referralInput}
                                    onChange={(event) => setReferralInput(event.target.value)}
                                    placeholder="FOODIE-XXXXXXXX"
                                    autoComplete="off"
                                    className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm font-bold uppercase outline-none transition-colors focus:border-primary"
                                />
                                <button
                                    type="submit"
                                    disabled={claiming || !referralInput.trim()}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {claiming && <Loader2 className="size-4 animate-spin" />}
                                    {claiming ? "Đang ghi nhận" : "Ghi nhận mã"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
// Main content (exported for reuse)
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
    const [activitiesLoading, setActivitiesLoading] = useState(true);
    const [loadingMoreActivities, setLoadingMoreActivities] = useState(false);
    const [hasMoreActivities, setHasMoreActivities] = useState(false);
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
            setActivitiesLoading(true);
            const [mRes, pRes] = await Promise.all([
                userService.getMembership(),
                userService.getPointTransactions(0, POINT_HISTORY_PAGE_SIZE + 1)
            ]);
            setMembership(mRes.data.data);
            const pointHistory = pRes.data.data ?? [];
            setActivities(pointHistory.slice(0, POINT_HISTORY_PAGE_SIZE));
            setHasMoreActivities(pointHistory.length > POINT_HISTORY_PAGE_SIZE);
        } catch (err) {
            console.error("Failed to fetch membership info:", err);
        } finally {
            setActivitiesLoading(false);
        }
    }, []);

    const loadMoreActivities = useCallback(async () => {
        if (loadingMoreActivities || !hasMoreActivities) return;

        try {
            setLoadingMoreActivities(true);
            const response = await userService.getPointTransactions(
                activities.length,
                POINT_HISTORY_PAGE_SIZE + 1,
            );
            const nextPage = response.data.data ?? [];
            setActivities((current) => [
                ...current,
                ...nextPage.slice(0, POINT_HISTORY_PAGE_SIZE),
            ]);
            setHasMoreActivities(nextPage.length > POINT_HISTORY_PAGE_SIZE);
        } catch (err) {
            console.error("Failed to load more point history:", err);
            toast.error("Không thể tải thêm lịch sử điểm");
        } finally {
            setLoadingMoreActivities(false);
        }
    }, [activities.length, hasMoreActivities, loadingMoreActivities]);

    const collapseActivities = useCallback(() => {
        setActivities((current) => current.slice(0, POINT_HISTORY_PAGE_SIZE));
        setHasMoreActivities(true);
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
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-10">
                            <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 w-full sm:w-auto">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Điểm có thể đổi</p>
                                    <h2 className="text-4xl font-black text-primary tabular-nums">
                                        {membership?.collectedPoints?.toLocaleString() ?? 0} <span className="text-sm font-medium text-muted-foreground">pts</span>
                                    </h2>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Dùng để đổi lấy voucher ưu đãi</p>
                                </div>
                                <div className="hidden sm:block w-px bg-border h-12 self-center" />
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Tổng điểm tích lũy</p>
                                    <h2 className="text-4xl font-black text-foreground tabular-nums">
                                        {(membership?.accumulatedPoints ?? membership?.collectedPoints ?? 0).toLocaleString()} <span className="text-sm font-medium text-muted-foreground">pts</span>
                                    </h2>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Dùng để xét thăng hạng thành viên</p>
                                </div>
                            </div>
                            <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-full flex items-center gap-2 shrink-0 self-start sm:self-center">
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
                                const accPoints = membership?.accumulatedPoints ?? membership?.collectedPoints ?? 0;

                                if (nextTier) {
                                    const range = nextTier.pts - currentTier.pts;
                                    const earnedInRange = accPoints - currentTier.pts;
                                    progress = Math.min(Math.max((earnedInRange / range) * 100, 5), 100);
                                    needed = Math.max(0, nextTier.pts - accPoints);
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
                            Gửi link mời cho bạn bè. Nhận{" "}
                            <span className="font-bold text-white underline decoration-2 underline-offset-4">voucher 30.000đ</span>{" "}
                            khi họ hoàn tất đơn đầu tiên từ 100.000đ.
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
                code={membership?.referralCode || ""}
                canClaim={!membership?.referredBy && (!membership?.referralRewardStatus || membership.referralRewardStatus === "none")}
                referralStatus={membership?.referralRewardStatus}
                rejectionReason={membership?.referralRejectionReason}
                onClaimed={fetchMembershipData}
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
                        points={membership?.accumulatedPoints ?? membership?.collectedPoints ?? 0}
                        tier={membership?.tier || "Bronze"}
                    />
                    <MembershipPerks tier={membership?.tier || "Bronze"} />
                    <PointsActivity
                        activities={activities}
                        loading={activitiesLoading}
                        loadingMore={loadingMoreActivities}
                        hasMore={hasMoreActivities}
                        onLoadMore={loadMoreActivities}
                        onCollapse={collapseActivities}
                    />
                </div>
                <div className="space-y-8">
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
