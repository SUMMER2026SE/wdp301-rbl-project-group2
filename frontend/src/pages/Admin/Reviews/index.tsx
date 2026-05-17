import { useState } from "react";
import { clsx } from "clsx";

const REVIEWS_MOCK = [
    { id: "1", customerName: "Nguyễn Văn A", avatar: null, dishName: "Burger Gà Cay", rating: 5, comment: "Ngon tuyệt vời! Burger rất juicy và sốt cay vừa phải. Sẽ order lại.", date: "2024-01-28", time: "14:30", status: "published", hasResponse: false },
    { id: "2", customerName: "Trần Thị B", avatar: null, dishName: "Pizza Margherita", rating: 4, comment: "Pizza khá ổn, phô mai thơm. Tuy nhiên phần crust hơi mỏng.", date: "2024-01-28", time: "12:15", status: "published", hasResponse: true },
    { id: "3", customerName: "Lê Văn C", avatar: null, dishName: "Salad Caesar", rating: 3, comment: "Rau tươi nhưng nước sốt hơi nhạt. Giá hơi cao so với chất lượng.", date: "2024-01-27", time: "18:45", status: "published", hasResponse: false },
    { id: "4", customerName: "Phạm Thị D", avatar: null, dishName: "Burger Nấm Truffle", rating: 5, comment: "Tuyệt vời! Nấm truffle rất thơm, burger chế biến chuẩn. Highly recommended!", date: "2024-01-27", time: "20:10", status: "published", hasResponse: true },
    { id: "5", customerName: "Hoàng Văn E", avatar: null, dishName: "Trà sữa trân châu", rating: 2, comment: "Trân châu không được tươi lắm, hơi cứng. Trà sữa quá ngọt.", date: "2024-01-26", time: "16:20", status: "flagged", hasResponse: false },
    { id: "6", customerName: "Đặng Thị F", avatar: null, dishName: "Pasta Carbonara", rating: 4, comment: "Vị ổn, phần ăn vừa đủ. Giao hàng nhanh.", date: "2024-01-26", time: "19:30", status: "published", hasResponse: false },
];

const RATING_FILTERS = [
    { id: "all", label: "Tất cả", count: 156 },
    { id: "5", label: "5 sao", count: 89, color: "text-green-600" },
    { id: "4", label: "4 sao", count: 42, color: "text-blue-600" },
    { id: "3", label: "3 sao", count: 15, color: "text-amber-600" },
    { id: "2", label: "2 sao", count: 7, color: "text-orange-600" },
    { id: "1", label: "1 sao", count: 3, color: "text-red-600" },
];

const AdminReviews = () => {
    const [activeFilter, setActiveFilter] = useState("all");
    const [showResponseModal, setShowResponseModal] = useState(false);
    const [selectedReview, setSelectedReview] = useState<string | null>(null);

    // Calculate average rating
    const avgRating = 4.6;
    const totalReviews = 156;

    const getRatingColor = (rating: number) => {
        if (rating >= 4.5) return "text-green-600";
        if (rating >= 3.5) return "text-blue-600";
        if (rating >= 2.5) return "text-amber-600";
        if (rating >= 1.5) return "text-orange-600";
        return "text-red-600";
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span
                        key={star}
                        className={clsx(
                            "material-symbols-outlined text-base",
                            star <= rating ? "text-[#ee8c2b]" : "text-gray-300"
                        )}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        star
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-[#1b140d]">
                        Quản lý đánh giá
                    </h2>
                    <p className="text-[#9a734c] mt-1">
                        Theo dõi phản hồi khách hàng và cải thiện chất lượng.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e7dbcf] rounded-lg text-sm font-semibold text-[#1b140d] hover:bg-[#f3ede7]"
                    >
                        <span className="material-symbols-outlined text-base">download</span>
                        Xuất báo cáo
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-[#ee8c2b]/10 rounded-lg">
                            <span className="material-symbols-outlined text-[#ee8c2b]">star</span>
                        </div>
                        <span className={clsx("text-2xl font-black", getRatingColor(avgRating))}>
                            {avgRating}
                        </span>
                    </div>
                    <p className="text-xs font-medium text-[#9a734c]">Điểm trung bình</p>
                    <p className="text-sm text-[#9a734c] mt-1">{totalReviews} đánh giá</p>
                </div>

                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <span className="material-symbols-outlined text-blue-600">chat</span>
                        </div>
                        <span className="text-2xl font-black text-[#1b140d]">12</span>
                    </div>
                    <p className="text-xs font-medium text-[#9a734c]">Chưa phản hồi</p>
                    <p className="text-sm text-[#9a734c] mt-1">Cần xử lý</p>
                </div>

                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <span className="material-symbols-outlined text-green-600">trending_up</span>
                        </div>
                        <span className="text-2xl font-black text-green-600">+8%</span>
                    </div>
                    <p className="text-xs font-medium text-[#9a734c]">Tăng trưởng</p>
                    <p className="text-sm text-[#9a734c] mt-1">So với tuần trước</p>
                </div>

                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <span className="material-symbols-outlined text-red-600">flag</span>
                        </div>
                        <span className="text-2xl font-black text-red-600">3</span>
                    </div>
                    <p className="text-xs font-medium text-[#9a734c]">Đã báo cáo</p>
                    <p className="text-sm text-[#9a734c] mt-1">Cần kiểm duyệt</p>
                </div>
            </div>

            {/* Rating Distribution */}
            <div className="bg-white border border-[#e7dbcf] rounded-xl p-6 mb-6">
                <h3 className="text-lg font-bold text-[#1b140d] mb-4">Phân bổ đánh giá</h3>
                <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map((rating) => {
                        const count = RATING_FILTERS.find((f) => f.id === rating.toString())?.count || 0;
                        const percentage = (count / totalReviews) * 100;
                        return (
                            <div key={rating} className="flex items-center gap-4">
                                <div className="flex items-center gap-1 w-16">
                                    <span className="text-sm font-bold text-[#1b140d]">{rating}</span>
                                    <span className="material-symbols-outlined text-[#ee8c2b] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                </div>
                                <div className="flex-1 bg-[#f3ede7] h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-[#ee8c2b] h-full rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className="text-sm font-bold text-[#9a734c] w-12 text-right">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Filters */}
            <div className="border-b border-[#e7dbcf] mb-6">
                <div className="flex gap-6 overflow-x-auto">
                    {RATING_FILTERS.map((filter) => (
                        <button
                            key={filter.id}
                            type="button"
                            onClick={() => setActiveFilter(filter.id)}
                            className={clsx(
                                "pb-4 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors",
                                activeFilter === filter.id
                                    ? "border-[#ee8c2b] text-[#ee8c2b] font-bold"
                                    : "border-transparent text-[#9a734c] hover:text-[#1b140d]"
                            )}
                        >
                            {filter.label} ({filter.count})
                        </button>
                    ))}
                </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                {REVIEWS_MOCK.map((review) => (
                    <div
                        key={review.id}
                        className={clsx(
                            "bg-white border rounded-xl p-6 transition-all",
                            review.status === "flagged"
                                ? "border-red-200 bg-red-50/50"
                                : "border-[#e7dbcf] hover:shadow-md"
                        )}
                    >
                        <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-full bg-[#ee8c2b]/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-[#ee8c2b] font-bold text-lg">
                                    {review.customerName.charAt(0)}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-base font-bold text-[#1b140d]">
                                                {review.customerName}
                                            </h4>
                                            {review.status === "flagged" && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded">
                                                    Đã báo cáo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-[#9a734c]">
                                            Đánh giá <span className="font-semibold">{review.dishName}</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        {renderStars(review.rating)}
                                        <p className="text-xs text-[#9a734c] mt-1">
                                            {review.date} • {review.time}
                                        </p>
                                    </div>
                                </div>

                                <p className="text-sm text-[#1b140d] leading-relaxed mb-4">
                                    {review.comment}
                                </p>

                                {/* Response Section */}
                                {review.hasResponse && (
                                    <div className="bg-[#f3ede7] rounded-lg p-4 mb-4">
                                        <div className="flex items-start gap-3">
                                            <span className="material-symbols-outlined text-[#ee8c2b] text-lg">
                                                chat_bubble
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-[#9a734c] mb-1">
                                                    Phản hồi của nhà hàng
                                                </p>
                                                <p className="text-sm text-[#1b140d]">
                                                    Cảm ơn bạn đã đánh giá! Chúng tôi rất vui khi bạn hài lòng với món ăn.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {!review.hasResponse && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedReview(review.id);
                                                setShowResponseModal(true);
                                            }}
                                            className="px-4 py-2 bg-[#ee8c2b] text-white text-sm font-bold rounded-lg hover:bg-[#d87c24] transition-colors"
                                        >
                                            Phản hồi
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="px-4 py-2 border border-[#e7dbcf] text-[#1b140d] text-sm font-bold rounded-lg hover:bg-[#f3ede7] transition-colors"
                                    >
                                        Xem chi tiết
                                    </button>
                                    {review.status !== "flagged" && (
                                        <button
                                            type="button"
                                            className="px-4 py-2 text-red-600 text-sm font-bold hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            Báo cáo
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Response Modal */}
            {showResponseModal && selectedReview && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-[#1b140d]">
                                Phản hồi đánh giá #{selectedReview}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowResponseModal(false)}
                                className="p-2 hover:bg-[#f3ede7] rounded-lg"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <textarea
                            className="w-full h-32 p-4 border border-[#e7dbcf] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#ee8c2b] text-sm"
                            placeholder="Nhập phản hồi của bạn..."
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                type="button"
                                onClick={() => setShowResponseModal(false)}
                                className="flex-1 px-4 py-2.5 bg-[#ee8c2b] text-white font-bold rounded-lg hover:bg-[#d87c24]"
                            >
                                Gửi phản hồi
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowResponseModal(false)}
                                className="px-4 py-2.5 border border-[#e7dbcf] text-[#1b140d] font-bold rounded-lg hover:bg-[#f3ede7]"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReviews;
