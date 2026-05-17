import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const MembershipBenefitsPage = () => {
    const { t } = useTranslation(['customer', 'common']);
    const tiers = [
        {
            name: "Đồng",
            icon: "emoji_events",
            color: "from-amber-600 to-amber-800",
            bgColor: "bg-amber-50 dark:bg-amber-950/20",
            borderColor: "border-amber-200 dark:border-amber-800",
            iconColor: "text-amber-600",
            requiredPoints: 0,
            benefits: [
                { icon: "star", text: "Tích điểm khi đặt món" },
                { icon: "local_offer", text: "Truy cập voucher cơ bản" },
                { icon: "celebration", text: "Quà sinh nhật đặc biệt" },
            ]
        },
        {
            name: "Bạc",
            icon: "workspace_premium",
            color: "from-gray-400 to-gray-600",
            bgColor: "bg-gray-50 dark:bg-gray-800/20",
            borderColor: "border-gray-200 dark:border-gray-700",
            iconColor: "text-gray-500",
            requiredPoints: 500,
            benefits: [
                { icon: "add_circle", text: "Tất cả quyền lợi Đồng" },
                { icon: "bolt", text: "Tích điểm x1.5" },
                { icon: "delivery_dining", text: "Miễn phí ship 1 lần/tháng" },
                { icon: "redeem", text: "Voucher đặc biệt hàng tháng" },
            ]
        },
        {
            name: "Vàng",
            icon: "verified",
            color: "from-yellow-400 to-yellow-600",
            bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
            borderColor: "border-yellow-200 dark:border-yellow-800",
            iconColor: "text-yellow-600",
            requiredPoints: 2000,
            popular: true,
            benefits: [
                { icon: "add_circle", text: "Tất cả quyền lợi Bạc" },
                { icon: "bolt", text: "Tích điểm x2" },
                { icon: "delivery_dining", text: "Miễn phí ship không giới hạn" },
                { icon: "favorite", text: "Ưu tiên 2x điểm với món lành mạnh" },
                { icon: "support_agent", text: "Hỗ trợ ưu tiên" },
                { icon: "restaurant", text: "Truy cập sớm menu mới" },
            ]
        },
        {
            name: "Bạch kim",
            icon: "diamond",
            color: "from-blue-400 to-purple-600",
            bgColor: "bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20",
            borderColor: "border-blue-200 dark:border-blue-800",
            iconColor: "text-blue-600",
            requiredPoints: 5000,
            benefits: [
                { icon: "add_circle", text: "Tất cả quyền lợi Vàng" },
                { icon: "bolt", text: "Tích điểm x3" },
                { icon: "loyalty", text: "Giảm giá 15% vĩnh viễn" },
                { icon: "card_giftcard", text: "Quà tặng độc quyền hàng quý" },
                { icon: "event", text: "Mời sự kiện VIP" },
                { icon: "person", text: "Quản lý tài khoản riêng" },
                { icon: "spa", text: "Truy cập AI Health Coach Pro" },
            ]
        }
    ];

    return (
        <div className="bg-background font-display min-h-screen">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-primary via-orange-600 to-red-600 text-white py-20">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtNi42MjcgNS4zNzMtMTIgMTItMTJzMTIgNS4zNzMgMTIgMTItNS4zNzMgMTItMTIgMTItMTItNS4zNzMtMTItMTJ6bS0xMiAwYzAtNi42MjcgNS4zNzMtMTIgMTItMTJzMTIgNS4zNzMgMTIgMTItNS4zNzMgMTItMTIgMTItMTItNS4zNzMtMTItMTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
                <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full mb-6">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        <span className="text-sm font-bold uppercase tracking-wider">Chương trình thành viên</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
                        {t('customer:membership.title')}
                    </h1>
                    <p className="text-xl md:text-2xl text-orange-100 max-w-3xl mx-auto leading-relaxed mb-8">
                        Thưởng thức những đặc quyền cao cấp và tích lũy điểm với mỗi đơn hàng. Càng đặt nhiều, càng tiết kiệm nhiều!
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link
                            to="/profile/wallet"
                            className="px-8 py-4 bg-white text-primary font-bold rounded-xl hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                        >
                            Xem ví của tôi
                        </Link>
                        <button className="px-8 py-4 bg-white/10 backdrop-blur border-2 border-white text-white font-bold rounded-xl hover:bg-white/20 transition-all">
                            Tìm hiểu thêm
                        </button>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-16 px-6 lg:px-8 bg-muted/30">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-black mb-4">{t('customer:membership.howItWorks')}</h2>
                        <p className="text-muted-foreground text-lg">Đơn giản và dễ dàng để bắt đầu</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="size-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-primary text-4xl">shopping_bag</span>
                            </div>
                            <h3 className="text-xl font-bold mb-2">1. Đặt món</h3>
                            <p className="text-muted-foreground">Mỗi đơn hàng tự động tích điểm cho bạn</p>
                        </div>
                        <div className="text-center">
                            <div className="size-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-primary text-4xl fill-1">stars</span>
                            </div>
                            <h3 className="text-xl font-bold mb-2">2. Tích điểm</h3>
                            <p className="text-muted-foreground">Điểm của bạn tăng lên theo hạng thành viên</p>
                        </div>
                        <div className="text-center">
                            <div className="size-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-primary text-4xl">redeem</span>
                            </div>
                            <h3 className="text-xl font-bold mb-2">3. Đổi thưởng</h3>
                            <p className="text-muted-foreground">Sử dụng điểm để đổi voucher và quà tặng</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Membership Tiers */}
            <section className="py-20 px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black mb-4">{t('customer:membership.membershipTiers')}</h2>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            Từ Đồng đến Bạch kim, mỗi hạng mang đến những đặc quyền độc đáo
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {tiers.map((tier) => (
                            <div
                                key={tier.name}
                                className={`relative bg-card rounded-[24px] border-2 ${tier.borderColor} p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${tier.popular ? 'ring-4 ring-primary ring-offset-4 ring-offset-background' : ''
                                    }`}
                            >
                                {tier.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-xs font-bold rounded-full uppercase tracking-wider">
                                        Phổ biến nhất
                                    </div>
                                )}

                                <div className={`${tier.bgColor} rounded-2xl p-6 mb-6`}>
                                    <div className={`size-16 mx-auto rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center mb-4 shadow-lg`}>
                                        <span className="material-symbols-outlined text-white text-3xl fill-1">{tier.icon}</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-center mb-2">{tier.name}</h3>
                                    <p className="text-center text-sm text-muted-foreground">
                                        {tier.requiredPoints === 0
                                            ? 'Bắt đầu ngay'
                                            : `Từ ${tier.requiredPoints.toLocaleString('vi-VN')} điểm`
                                        }
                                    </p>
                                </div>

                                <ul className="space-y-3">
                                    {tier.benefits.map((benefit, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <span className={`material-symbols-outlined ${tier.iconColor} text-xl shrink-0 mt-0.5`}>
                                                {benefit.icon}
                                            </span>
                                            <span className="text-sm font-medium">{benefit.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Points Earning Guide */}
            <section className="py-16 px-6 lg:px-8 bg-muted/30">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-black mb-4">{t('customer:membership.earnPoints')}</h2>
                        <p className="text-muted-foreground text-lg">Nhiều cách để tích lũy và tăng hạng</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-card rounded-2xl p-6 border border-border flex gap-4">
                            <div className="size-12 shrink-0 bg-green-100 dark:bg-green-950/30 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-green-600 text-2xl">receipt_long</span>
                            </div>
                            <div>
                                <h4 className="font-bold mb-1">Đặt món ăn</h4>
                                <p className="text-sm text-muted-foreground">100 điểm cho mỗi 100.000đ chi tiêu</p>
                            </div>
                        </div>
                        <div className="bg-card rounded-2xl p-6 border border-border flex gap-4">
                            <div className="size-12 shrink-0 bg-blue-100 dark:bg-blue-950/30 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600 text-2xl">favorite</span>
                            </div>
                            <div>
                                <h4 className="font-bold mb-1">Món lành mạnh</h4>
                                <p className="text-sm text-muted-foreground">Nhận 2x điểm với món được đánh dấu lành mạnh</p>
                            </div>
                        </div>
                        <div className="bg-card rounded-2xl p-6 border border-border flex gap-4">
                            <div className="size-12 shrink-0 bg-orange-100 dark:bg-orange-950/30 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-orange-600 text-2xl">group_add</span>
                            </div>
                            <div>
                                <h4 className="font-bold mb-1">Giới thiệu bạn bè</h4>
                                <p className="text-sm text-muted-foreground">500 điểm khi bạn bè hoàn tất đơn đầu tiên</p>
                            </div>
                        </div>
                        <div className="bg-card rounded-2xl p-6 border border-border flex gap-4">
                            <div className="size-12 shrink-0 bg-purple-100 dark:bg-purple-950/30 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-purple-600 text-2xl">star</span>
                            </div>
                            <div>
                                <h4 className="font-bold mb-1">Đánh giá món ăn</h4>
                                <p className="text-sm text-muted-foreground">50 điểm cho mỗi đánh giá có hình ảnh</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-primary to-orange-600 rounded-[32px] p-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="relative z-10">
                        <span className="material-symbols-outlined text-6xl mb-4">celebration</span>
                        <h2 className="text-3xl md:text-4xl font-black mb-4">{t('customer:membership.readyToStart')}</h2>
                        <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
                            Đăng ký ngay hôm nay và nhận 500 điểm thưởng chào mừng!
                        </p>
                        <Link
                            to="/login"
                            className="inline-block px-10 py-4 bg-white text-primary font-bold rounded-xl hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                        >
                            Đăng ký miễn phí
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default MembershipBenefitsPage;
