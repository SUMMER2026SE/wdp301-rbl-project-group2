import { useEffect, useState } from "react";
import { CheckCircle2, MessageSquareText, Quote, RefreshCw, Star, User } from "lucide-react";
import { Link } from "react-router-dom";
import reviewService, { type FeaturedReview } from "@/services/review.service";

const REVIEW_LIMIT = 3;

const ReviewSkeleton = () => (
  <div className="min-h-[310px] animate-pulse rounded-lg border border-gray-100 bg-white p-7">
    <div className="mb-6 h-5 w-28 rounded bg-gray-200" />
    <div className="space-y-3">
      <div className="h-4 rounded bg-gray-100" />
      <div className="h-4 rounded bg-gray-100" />
      <div className="h-4 w-3/4 rounded bg-gray-100" />
    </div>
    <div className="mt-10 flex items-center gap-3 border-t border-gray-100 pt-5">
      <div className="h-11 w-11 rounded-full bg-gray-200" />
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-gray-200" />
        <div className="h-3 w-32 rounded bg-gray-100" />
      </div>
    </div>
  </div>
);

const ReviewSection = () => {
  const [reviews, setReviews] = useState<FeaturedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    reviewService
      .getFeaturedReviews(REVIEW_LIMIT)
      .then((response) => {
        if (!active) return;
        setReviews(response.data ?? []);
        setHasError(false);
      })
      .catch((error) => {
        console.error("Failed to load featured reviews:", error);
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retryKey]);

  const retry = () => {
    setLoading(true);
    setHasError(false);
    setRetryKey((current) => current + 1);
  };

  return (
    <section className="border-y border-orange-100 bg-orange-50/40 py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-12 flex flex-col items-center text-center">
          <span className="mb-3 text-xs font-bold uppercase text-orange-600">Đánh giá gần đây</span>
          <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">Khách hàng nói gì về món ăn?</h2>
          <p className="mt-4 max-w-xl text-base text-slate-500">
            Những chia sẻ mới nhất từ các đơn hàng đã hoàn thành.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {Array.from({ length: REVIEW_LIMIT }).map((_, index) => (
              <ReviewSkeleton key={index} />
            ))}
          </div>
        ) : hasError ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
            <MessageSquareText className="h-10 w-10 text-orange-300" />
            <p className="font-semibold text-slate-700">Chưa thể tải đánh giá lúc này.</p>
            <button
              type="button"
              onClick={retry}
              className="flex min-h-10 items-center gap-2 rounded-lg border border-orange-300 bg-white px-4 text-sm font-bold text-orange-700 transition-colors hover:bg-orange-50"
            >
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
            <MessageSquareText className="h-10 w-10 text-orange-300" />
            <p className="font-bold text-slate-800">Chưa có chia sẻ nổi bật</p>
            <p className="text-sm text-slate-500">Các đánh giá thật từ khách hàng sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {reviews.map((review) => {
              const customerName = review.isAnonymous
                ? "Khách hàng ẩn danh"
                : review.user?.name || review.userId?.username || "Khách hàng";
              const avatar = review.isAnonymous
                ? null
                : review.user?.avatar || review.userId?.avatar;

              return (
                <article
                  key={review._id}
                  className="relative flex min-h-[310px] flex-col overflow-hidden rounded-lg border border-gray-100 bg-white p-7 shadow-sm transition-shadow hover:shadow-lg"
                >
                  <Quote className="absolute right-5 top-5 h-11 w-11 fill-orange-50 text-orange-100" />

                  <div className="relative z-10 mb-5 flex items-center gap-1" aria-label={`${review.rating} trên 5 sao`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-gray-100 text-gray-200"
                        }`}
                      />
                    ))}
                  </div>

                  <p className="relative z-10 line-clamp-5 flex-1 text-base font-medium leading-7 text-slate-700">
                    “{review.comment}”
                  </p>

                  <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-5">
                    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-slate-400">
                      {avatar ? (
                        <img src={avatar} alt={customerName} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-sm font-bold text-slate-900">{customerName}</h3>
                        {!review.isAnonymous && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                      </div>
                      <Link
                        to={`/food/${review.productId._id}`}
                        className="mt-1 block truncate text-xs font-semibold text-orange-600 hover:underline"
                      >
                        Đã dùng: {review.productId.name}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ReviewSection;
