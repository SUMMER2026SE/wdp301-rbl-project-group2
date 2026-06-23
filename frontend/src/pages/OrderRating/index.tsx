import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import orderService, { type Order } from "@/services/order.service";
import reviewService, {
  type Review,
  type ReviewFeedbackTag,
  type ReviewImage,
  type RejectedReview,
} from "@/services/review.service";
import { apiClient } from "@/lib/api-client";
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  Star,
  X,
} from "lucide-react";

interface ProductImage {
  id?: string;
  url: string;
}

interface ProductRating {
  productId: string;
  name: string;
  image: string;
  stars: number;
  feedbackTags: ReviewFeedbackTag[];
  ratingError: string;
  comment: string;
  images: ProductImage[];
  isUploading: boolean;
  isSubmitted: boolean;
  isSubmitting: boolean;
}

const STAR_LABELS = ["", "Rất tệ", "Chưa hài lòng", "Bình thường", "Hài lòng", "Tuyệt vời"];

const FEEDBACK_TAGS: Array<{ value: ReviewFeedbackTag; label: string }> = [
  { value: "unhygienic", label: "Món ăn không vệ sinh" },
  { value: "wrong_flavor", label: "Không đúng vị mong đợi" },
  { value: "too_salty", label: "Quá mặn" },
  { value: "too_bland", label: "Quá nhạt" },
  { value: "too_sweet", label: "Quá ngọt" },
  { value: "not_fresh", label: "Nguyên liệu không tươi" },
  { value: "undercooked", label: "Chưa chín kỹ" },
  { value: "overcooked", label: "Nấu quá chín / khô" },
  { value: "served_cold", label: "Món bị nguội" },
  { value: "small_portion", label: "Khẩu phần ít" },
  { value: "poor_packaging", label: "Đóng gói chưa tốt" },
  { value: "different_from_photo", label: "Khác hình minh họa" },
];

const MAX_FEEDBACK_TAGS = 5;
const RATING_REQUIRED_MESSAGE = "Hãy chạm vào số sao phù hợp với trải nghiệm của bạn.";

const getApiErrorMessage = (error: unknown): string => {
  if (typeof error !== "object" || error === null) return "";

  const response = "response" in error ? error.response : undefined;
  if (typeof response !== "object" || response === null || !("data" in response)) return "";

  const data = response.data;
  if (typeof data !== "object" || data === null || !("message" in data)) return "";

  return typeof data.message === "string" ? data.message : "";
};

const OrderRatingPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  useTranslation(['customer', 'common']);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [productRatings, setProductRatings] = useState<ProductRating[]>([]);
  const [applyToAll, setApplyToAll] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // For "Rate all" state
  const [globalStars, setGlobalStars] = useState(0);
  const [globalFeedbackTags, setGlobalFeedbackTags] = useState<ReviewFeedbackTag[]>([]);
  const [globalRatingError, setGlobalRatingError] = useState("");
  const [globalComment, setGlobalComment] = useState("");
  const [globalSubmitting, setGlobalSubmitting] = useState(false);
  const [moderationBanners, setModerationBanners] = useState<RejectedReview[]>([]);
  const [globalBanned, setGlobalBanned] = useState(false);

  const normalizeReviewImage = (img: string | ReviewImage): ProductImage | null => {
    if (!img) return null;
    if (typeof img === "string") return { id: img, url: img };

    const id = img._id || img.id;
    const url = img.secureUrl || img.secure_url || img.url;
    return url ? { id, url } : null;
  };

  useEffect(() => {
    const fetchOrderAndReviews = async () => {
      if (!orderId) return;
      try {
        setLoading(true);
        const [orderRes, reviewRes] = await Promise.all([
          orderService.getOrderById(orderId),
          reviewService.getOrderReviews(orderId)
        ]);

        const orderData = orderRes.data;
        const existingReviews = reviewRes.data || [];
        setOrder(orderData);
        
        // Initialize product ratings
        const initialRatings: ProductRating[] = orderData.items.map(item => {
          const product = typeof item.productId === "string" ? null : item.productId;
          const itemDetails = item as typeof item & { name?: string; image?: string };
          const productId = typeof item.productId === "string" ? item.productId : item.productId._id;
          const productName = product?.name || itemDetails.name || "Món ăn";
          const productImage = product
            ? typeof product.image === 'string'
              ? product.image
              : product.image?.secureUrl || ""
            : itemDetails.image || "";
          const existing = existingReviews.find((r: Review) => r.productId === productId);
          
          return {
            productId,
            name: productName,
            image: productImage,
            stars: existing ? existing.rating : 0,
            feedbackTags: existing?.feedbackTags ?? [],
            ratingError: "",
            comment: existing?.comment ?? "",
            images: existing ? existing.images.map(normalizeReviewImage).filter(Boolean) as ProductImage[] : [],
            isUploading: false,
            isSubmitted: !!existing,
            isSubmitting: false
          };
        });
        setProductRatings(initialRatings);
      } catch (err) {
        console.error("Failed to fetch order or reviews:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrderAndReviews();
  }, [orderId]);

  const updateRating = (index: number, updates: Partial<ProductRating>) => {
    setProductRatings(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const selectProductStars = (index: number, stars: number) => {
    updateRating(index, {
      stars,
      ratingError: "",
      ...(stars >= 3 ? { feedbackTags: [] } : {}),
    });
  };

  const selectGlobalStars = (stars: number) => {
    setGlobalStars(stars);
    setGlobalRatingError("");
    if (stars >= 3) setGlobalFeedbackTags([]);
  };

  const toggleProductTag = (index: number, tag: ReviewFeedbackTag) => {
    const selected = productRatings[index].feedbackTags;
    if (!selected.includes(tag) && selected.length >= MAX_FEEDBACK_TAGS) return;

    updateRating(index, {
      feedbackTags: selected.includes(tag)
        ? selected.filter((item) => item !== tag)
        : [...selected, tag],
    });
  };

  const toggleGlobalTag = (tag: ReviewFeedbackTag) => {
    setGlobalFeedbackTags((selected) => {
      if (!selected.includes(tag) && selected.length >= MAX_FEEDBACK_TAGS) return selected;
      return selected.includes(tag)
        ? selected.filter((item) => item !== tag)
        : [...selected, tag];
    });
  };

  const revealRatingError = (elementId: string) => {
    requestAnimationFrame(() => {
      document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const scrollToReviewBanNotice = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const notice = document.getElementById("review-ban-notice");
        notice?.focus({ preventScroll: true });
        notice?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };

  const showReviewBanNotice = (productId: string) => {
    setGlobalBanned(true);
    setModerationBanners([{
      productId,
      category: "temporary_ban",
      reason: "Tài khoản bị khóa do vi phạm nhiều lần chính sách đánh giá.",
    }]);
    scrollToReviewBanNotice();
  };

  const handleFileUpload = async (index: number, file: File) => {
    updateRating(index, { isUploading: true });
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiClient.post("/files/upload?ownerType=review", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      const fileData = res.data?.data;
      if (fileData?._id && fileData?.secureUrl) {
        setProductRatings(prev => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            images: [...next[index].images, { id: fileData._id, url: fileData.secureUrl }]
          };
          return next;
        });
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      updateRating(index, { isUploading: false });
    }
  };

  const removeImage = (pIndex: number, imgIndex: number) => {
    setProductRatings(prev => {
      const next = [...prev];
      next[pIndex].images = next[pIndex].images.filter((_, i) => i !== imgIndex);
      return next;
    });
  };

  const handleIndividualSubmit = async (index: number) => {
    if (!orderId) return;
    const rating = productRatings[index];
    if (rating.stars < 1 || rating.stars > 5) {
      updateRating(index, { ratingError: RATING_REQUIRED_MESSAGE });
      revealRatingError(`product-rating-${rating.productId}`);
      return;
    }
    updateRating(index, { isSubmitting: true });
    // Xóa banner cũ của sản phẩm này (nếu có)
    setModerationBanners(prev => prev.filter(b => b.productId !== rating.productId));
    
    try {
      const response = await reviewService.createOrderReviews({
        orderId,
        reviews: [{
          productId: rating.productId,
          rating: rating.stars,
          feedbackTags: rating.stars < 3 ? rating.feedbackTags : [],
          comment: rating.comment,
          images: rating.images.map(img => img.id).filter((id): id is string => Boolean(id)),
          isAnonymous: false
        }]
      });

      const rejected = response.data.rejectedReviews.find((item) => item.productId === rating.productId);
      if (rejected) {
        // Hiển thị moderation banner — không đánh dấu isSubmitted
        setModerationBanners(prev => [...prev, rejected]);
        if (rejected.bannedUntil) {
          setGlobalBanned(true);
        }
        return;
      }
      
      // Đánh giá thành công
      setProductRatings(prev => {
        const next = [...prev];
        next[index] = { ...next[index], isSubmitted: true };
        if (next.every(p => p.isSubmitted)) {
          setShowSuccessModal(true);
        }
        return next;
      });
    } catch (err) {
      console.error("Failed to submit review", err);
      const message = getApiErrorMessage(err);
      if (message.includes("tam khoa quyen danh gia")) {
        showReviewBanNotice(rating.productId);
      }
    } finally {
      updateRating(index, { isSubmitting: false });
    }
  };

  const handleGlobalSubmit = async () => {
    if (!orderId) return;
    if (globalStars < 1 || globalStars > 5) {
      setGlobalRatingError(RATING_REQUIRED_MESSAGE);
      revealRatingError("global-rating-stars");
      return;
    }
    setGlobalSubmitting(true);
    setModerationBanners([]);
    try {
      const pendingReviews = productRatings.filter(p => !p.isSubmitted);
      if (pendingReviews.length === 0) return;

      const reviews = pendingReviews.map(p => ({
        productId: p.productId,
        rating: globalStars,
        feedbackTags: globalStars < 3 ? globalFeedbackTags : [],
        comment: globalComment,
        images: p.images.map(img => img.id).filter((id): id is string => Boolean(id)),
        isAnonymous: false
      }));

      const response = await reviewService.createOrderReviews({
        orderId,
        reviews
      });

      if (response.data.rejectedReviews.length > 0) {
        const rejectedIds = new Set(response.data.rejectedReviews.map((item) => item.productId));
        // Chỉ đánh dấu submitted cho những sản phẩm KHÔNG bị từ chối
        setProductRatings(prev => prev.map(p => rejectedIds.has(p.productId) ? { ...p, isSubmitted: false } : { ...p, isSubmitted: true }));
        setModerationBanners(response.data.rejectedReviews);
        const hasBan = response.data.rejectedReviews.some(r => r.bannedUntil);
        if (hasBan) {
          setGlobalBanned(true);
          scrollToReviewBanNotice();
        }
        return;
      }
      
      setProductRatings(prev => prev.map(p => ({ ...p, isSubmitted: true })));
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Failed to submit reviews", err);
      const message = getApiErrorMessage(err);
      if (message.includes("tam khoa quyen danh gia")) {
        showReviewBanNotice("all");
      }
    } finally {
      setGlobalSubmitting(false);
    }
  };

  const allSubmitted = productRatings.length > 0 && productRatings.every(p => p.isSubmitted);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
        <p className="text-[#8c7f5a] font-medium">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-[#8c7f5a] font-medium">Không tìm thấy đơn hàng</p>
        <button onClick={() => navigate("/profile/history")} className="text-orange-600 font-bold">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#191710] dark:text-gray-100 transition-colors duration-300 min-h-screen pb-20">
      <div className="max-w-[800px] mx-auto px-4 py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/profile/history")}
          className="mb-4 flex items-center gap-1 text-sm font-semibold text-[#8c7f5a] transition-colors hover:text-orange-600"
        >
          <ChevronLeft className="h-4 w-4" />
          Đơn hàng của tôi
        </button>

        <div className="mb-7 flex flex-col gap-2 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <Sparkles className="h-6 w-6 text-orange-600" />
            <h1 className="text-3xl font-black leading-tight text-[#1b140d] dark:text-white">Đánh giá món ăn</h1>
          </div>
          <p className="text-base text-[#8c7f5a]">Đơn hàng #{order.code} • {new Date(order.createdAt).toLocaleDateString("vi-VN")}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Chia sẻ thật lòng để quán phục vụ bạn tốt hơn ở lần sau.</p>
        </div>

        {/* Moderation Banners */}
        {moderationBanners.length > 0 && (
          <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            {globalBanned && (
              <div
                id="review-ban-notice"
                tabIndex={-1}
                role="alert"
                aria-live="assertive"
                className="flex scroll-mt-6 items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 shadow-sm outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-800 dark:bg-red-900/20 dark:focus:ring-offset-[#1f2122]"
              >
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800 dark:text-red-300">Tài khoản bị khóa do vi phạm chính sách đánh giá</p>
                  <p className="mt-1 text-sm leading-5 text-red-700 dark:text-red-400">
                    Do vi phạm nhiều lần, bạn bị tạm thời hạn chế gửi đánh giá trong 24 giờ.
                  </p>
                </div>
              </div>
            )}
            {moderationBanners.filter((b) => b.category !== "temporary_ban").map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">Đánh giá bị hệ thống từ chối</p>
                  <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
                    Đánh giá của bạn chứa nội dung không phù hợp ({b.category}) và đã bị xóa tự động. Vui lòng chỉnh sửa lại.
                  </p>
                </div>
                <button onClick={() => setModerationBanners(prev => prev.filter((_, idx) => idx !== i))} className="text-amber-400 hover:text-amber-600 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Global Rating (Apply to all) */}
        {!allSubmitted && productRatings.length > 1 && (
          <div className="mb-8 overflow-hidden rounded-lg border border-orange-200 bg-white shadow-sm dark:border-orange-900/60 dark:bg-[#1f2122]">
            <div className="flex items-center justify-between mb-4">
              <label className="flex w-full cursor-pointer items-center gap-3 bg-orange-50 px-5 py-4 dark:bg-orange-950/20">
                <input 
                  type="checkbox" 
                  checked={applyToAll} 
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="h-5 w-5 rounded border-orange-400 text-orange-600 focus:ring-orange-500"
                />
                <div>
                  <p className="font-bold text-[#1b140d] dark:text-white">Đánh giá nhanh nhiều món</p>
                  <p className="text-sm text-[#8c7f5a]">Áp dụng cùng số sao, tag và nhận xét cho các món chưa gửi</p>
                </div>
              </label>
            </div>
            
            {applyToAll && (
              <div className="flex animate-in flex-col gap-6 px-5 pb-5 fade-in slide-in-from-top-2 duration-300">
                <div id="global-rating-stars" className="flex flex-col items-center gap-3">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Trải nghiệm chung của bạn</p>
                  <div className="flex gap-1 sm:gap-2" role="radiogroup" aria-label="Chọn số sao cho tất cả món">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => selectGlobalStars(star)}
                        className="grid h-12 w-12 place-items-center rounded-lg transition-colors hover:bg-amber-50 active:scale-95 dark:hover:bg-amber-950/30"
                        aria-label={`${star} sao`}
                        aria-checked={globalStars === star}
                        role="radio"
                      >
                        <Star className={`h-9 w-9 ${globalStars >= star ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600"}`} />
                      </button>
                    ))}
                  </div>
                  <p className={`min-h-6 text-sm font-bold ${globalStars ? "text-amber-700 dark:text-amber-300" : "text-gray-400"}`}>
                    {STAR_LABELS[globalStars] || "Chạm để chọn số sao"}
                  </p>
                  {globalRatingError && (
                    <p className="flex items-center gap-2 text-sm font-semibold text-red-600" role="alert">
                      <AlertCircle className="h-4 w-4" />
                      {globalRatingError}
                    </p>
                  )}
                </div>

                {globalStars > 0 && globalStars < 3 && (
                  <div className="border-y border-rose-100 bg-rose-50/70 px-4 py-5 dark:border-rose-900/40 dark:bg-rose-950/20">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-rose-900 dark:text-rose-200">Điều gì chưa ổn?</p>
                        <p className="text-xs text-rose-700/80 dark:text-rose-300/80">Chọn tối đa 5 mục để quán cải thiện đúng vấn đề</p>
                      </div>
                      <span className="text-xs font-semibold text-rose-700">{globalFeedbackTags.length}/{MAX_FEEDBACK_TAGS}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {FEEDBACK_TAGS.map((tag) => {
                        const selected = globalFeedbackTags.includes(tag.value);
                        return (
                          <button
                            type="button"
                            key={tag.value}
                            onClick={() => toggleGlobalTag(tag.value)}
                            className={`flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                              selected
                                ? "border-rose-500 bg-rose-600 text-white"
                                : "border-rose-200 bg-white text-rose-800 hover:border-rose-400 dark:border-rose-800 dark:bg-[#1f2122] dark:text-rose-200"
                            }`}
                            aria-pressed={selected}
                          >
                            {selected && <Check className="h-4 w-4" />}
                            {tag.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <textarea
                  value={globalComment}
                  onChange={(e) => setGlobalComment(e.target.value)}
                  placeholder="Nhận xét chung cho các món còn lại..."
                  maxLength={1000}
                  className="min-h-[110px] w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-4 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-gray-700 dark:bg-[#171819] dark:focus:ring-orange-900"
                />
                <button
                  type="button"
                  onClick={handleGlobalSubmit}
                  disabled={globalSubmitting || globalBanned}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {globalSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Gửi tất cả nhận xét
                </button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-8">
          {productRatings.map((rating, idx) => (
            <div key={rating.productId} className={`overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all dark:border-gray-800 dark:bg-[#1f2122] ${applyToAll && !rating.isSubmitted ? "opacity-60 pointer-events-none grayscale-[0.5]" : ""}`}>
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-white/5">
                <div className="flex items-center gap-4">
                  <img src={rating.image} alt={rating.name} className="h-16 w-16 rounded-lg object-cover shadow-sm" />
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase text-orange-600">Món {idx + 1}</p>
                    <h3 className="text-lg font-bold text-text-main dark:text-white">{rating.name}</h3>
                  </div>
                </div>
                {rating.isSubmitted && (
                  <div className="flex items-center gap-2 rounded-full border border-green-100 bg-green-50 px-3 py-1.5 text-sm font-bold text-green-600 dark:border-green-800 dark:bg-green-900/20">
                    <CheckCircle2 className="w-4 h-4" />
                    Đã đánh giá
                  </div>
                )}
              </div>
              
              {(!applyToAll || rating.isSubmitted) && (
                <div className="space-y-7 p-5 sm:p-6">
                  <div id={`product-rating-${rating.productId}`} className="flex flex-col items-center gap-3">
                    <p className="font-bold text-gray-700 dark:text-gray-300">
                      {rating.isSubmitted ? "Sửa đánh giá của bạn" : "Bạn thấy món này thế nào?"}
                    </p>
                    <div className="flex gap-1 sm:gap-2" role="radiogroup" aria-label={`Chọn số sao cho ${rating.name}`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => selectProductStars(idx, star)}
                          className="grid h-12 w-12 place-items-center rounded-lg transition-colors hover:bg-amber-50 active:scale-95 dark:hover:bg-amber-950/30"
                          aria-label={`${star} sao`}
                          aria-checked={rating.stars === star}
                          role="radio"
                        >
                          <Star className={`h-9 w-9 ${rating.stars >= star ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600"}`} />
                        </button>
                      ))}
                    </div>
                    <p className={`min-h-6 text-sm font-bold ${rating.stars ? "text-amber-700 dark:text-amber-300" : "text-gray-400"}`}>
                      {STAR_LABELS[rating.stars] || "Chạm để chọn số sao"}
                    </p>
                    {rating.ratingError && (
                      <p className="flex items-center gap-2 text-center text-sm font-semibold text-red-600" role="alert">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {rating.ratingError}
                      </p>
                    )}
                  </div>

                  {rating.stars > 0 && rating.stars < 3 && (
                    <div className="border-y border-rose-100 bg-rose-50/70 px-4 py-5 dark:border-rose-900/40 dark:bg-rose-950/20">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-rose-900 dark:text-rose-200">Điều gì khiến bạn chưa hài lòng?</p>
                          <p className="text-xs text-rose-700/80 dark:text-rose-300/80">Có thể chọn nhiều mục, tối đa 5</p>
                        </div>
                        <span className="text-xs font-semibold text-rose-700">{rating.feedbackTags.length}/{MAX_FEEDBACK_TAGS}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {FEEDBACK_TAGS.map((tag) => {
                          const selected = rating.feedbackTags.includes(tag.value);
                          return (
                            <button
                              type="button"
                              key={tag.value}
                              onClick={() => toggleProductTag(idx, tag.value)}
                              className={`flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                                selected
                                  ? "border-rose-500 bg-rose-600 text-white"
                                  : "border-rose-200 bg-white text-rose-800 hover:border-rose-400 dark:border-rose-800 dark:bg-[#1f2122] dark:text-rose-200"
                              }`}
                              aria-pressed={selected}
                            >
                              {selected && <Check className="h-4 w-4" />}
                              {tag.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300">
                        <MessageSquareText className="h-5 w-5 text-orange-600" />
                        Chia sẻ cảm nhận
                      </label>
                      <span className="text-xs text-gray-400">{rating.comment.length}/1000</span>
                    </div>
                    <textarea
                      value={rating.comment}
                      onChange={(e) => updateRating(idx, { comment: e.target.value })}
                      placeholder={rating.stars > 0 && rating.stars < 3 ? "Hãy mô tả cụ thể để quán có thể cải thiện..." : "Món ăn có ngon không? Hương vị và khẩu phần thế nào?"}
                      maxLength={1000}
                      className="min-h-[130px] w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-4 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-gray-700 dark:bg-[#171819] dark:focus:ring-orange-900"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                      <Camera className="h-5 w-5 text-orange-600" />
                      Thêm hình ảnh thực tế
                    </label>
                    <div className="flex flex-wrap gap-4">
                      {rating.images.map((img, i) => (
                        <div key={i} className="group relative h-24 w-24 animate-in overflow-hidden rounded-lg border shadow-sm zoom-in-75">
                          <img src={img.url} alt="Review photo" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => removeImage(idx, i)}
                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      
                      {rating.images.length < 4 && (
                        <label className={`flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-all ${rating.isUploading ? "opacity-50 pointer-events-none" : "hover:border-orange-600 hover:bg-orange-600/5 border-gray-200 dark:border-gray-800"}`}>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(idx, e.target.files[0])}
                          />
                          {rating.isUploading ? (
                            <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                          ) : (
                            <>
                              <Camera className="w-6 h-6 text-orange-600" />
                              <span className="text-[10px] font-bold text-orange-600 uppercase">Tải lên</span>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleIndividualSubmit(idx)}
                    disabled={rating.isSubmitting || globalBanned}
                    className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 font-bold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      rating.isSubmitted 
                        ? "bg-orange-600 text-white hover:bg-orange-700"
                        : "bg-[#1b140d] text-white hover:bg-black dark:bg-white dark:text-[#1b140d] dark:hover:bg-gray-100"
                    }`}
                  >
                    {rating.isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    {rating.isSubmitted ? "Cập nhật đánh giá" : "Gửi đánh giá món này"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#1f2122] rounded-[2.5rem] p-8 max-w-md w-full text-center shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-500 mb-5">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-[#1b140d] dark:text-white mb-2 animate-bounce">
                Đánh giá thành công!
              </h2>
              <p className="text-[#8c7f5a] text-sm mb-6 leading-relaxed">
                Cảm ơn bạn đã đóng góp ý kiến chân thành để chúng tôi cải thiện dịch vụ mỗi ngày tốt hơn.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate("/profile/history")}
                  className="w-full py-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-base shadow-lg shadow-orange-600/25 transition-all active:scale-[0.98]"
                >
                  Quay lại đơn hàng
                </button>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 text-[#1b140d] dark:text-white font-semibold text-sm transition-all active:scale-[0.98]"
                >
                  Xem / Chỉnh sửa lại đánh giá
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderRatingPage;
