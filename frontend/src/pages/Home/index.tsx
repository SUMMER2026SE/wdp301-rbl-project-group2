import React, { Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Giả định em có hook này quản lý trạng thái đăng nhập
import { useUserLocation } from "@/hooks/useUserLocation";
import LocationAlert from "@/components/LocationAlert";

// 1. TẢI NGAY (Above the fold): Component luôn nằm ở đầu trang
import HeroCarousel from "./components/HeroCarousel";

// 2. LAZY LOAD (Below the fold): Tải ngầm các component bên dưới để web load siêu nhanh
const CategorySection = React.lazy(() => import("./components/CategorySection"));
const FlashSaleSection = React.lazy(() => import("./components/FlashSaleSection"));
const RecommendedSection = React.lazy(() => import("./components/RecommendedSection"));
const BestSellerSection = React.lazy(() => import("./components/BestSellerSection"));
const VoucherSection = React.lazy(() => import("./components/VoucherSection"));
const LoyaltySection = React.lazy(() => import("./components/LoyaltySection"));
const ReviewSection = React.lazy(() => import("./components/ReviewSection"));
const CulinaryStorySection = React.lazy(() => import("./components/CulinaryStorySection"));
const HistorySection = React.lazy(() => import("./components/HistorySection"));

// Component tạo hiệu ứng khung xương (Skeleton) trong lúc chờ Lazy Load
const SectionLoader = () => (
    <div className="w-full h-64 bg-slate-100 dark:bg-slate-800/50 animate-pulse rounded-3xl flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium text-slate-400">Đang tải nội dung...</p>
    </div>
);

const HomePage = () => {
    const { loading, error, isValid } = useUserLocation();

    // Lấy trạng thái đăng nhập từ Global Store/Hook của em
    const { isAuthenticated } = useAuth();

    return (
        <>
            <LocationAlert loading={loading} error={error} isValid={isValid} />

            <div className="min-h-screen bg-slate-50">
                <main className="flex-1 flex flex-col items-center pb-24">
                    <div className="w-full max-w-7xl px-4 md:px-8 py-8 flex flex-col gap-12 sm:gap-16">

                        {/* Luôn hiển thị Hero Banner ngay lập tức để giữ chân user */}
                        <HeroCarousel />

                        {/* Khu vực xử lý luồng hiển thị bằng Suspense */}
                        <Suspense fallback={<SectionLoader />}>
                            {isAuthenticated ? (
                                /* ==========================================
                                   LUỒNG KHÁCH QUEN (LOGGED IN)
                                   Mục tiêu: Đặt lại nhanh -> AI Sức khỏe -> Khuyến mãi
                                   ========================================== */
                                <>
                                    <FlashSaleSection />
                                    <RecommendedSection />
                                    <CategorySection />

                                    {/* Các phần bổ trợ phía cuối trang */}
                                    <BestSellerSection />
                                    <VoucherSection />
                                    <LoyaltySection />
                                    <HistorySection />
                                </>
                            ) : (
                                /* ==========================================
                                   LUỒNG KHÁCH LẠ (GUEST)
                                   Mục tiêu: Khám phá Menu -> Bán chạy -> Tăng độ Trust
                                   ========================================== */
                                <>
                                    <FlashSaleSection />
                                    <CategorySection />
                                    <BestSellerSection />
                                    <ReviewSection />

                                    {/* "Hé lộ" tính năng AI Sức khỏe để kích thích họ tạo tài khoản */}
                                    <RecommendedSection />
                                    <CulinaryStorySection />
                                </>
                            )}
                        </Suspense>

                    </div>
                </main>
            </div>
        </>
    );
};

export default HomePage;
