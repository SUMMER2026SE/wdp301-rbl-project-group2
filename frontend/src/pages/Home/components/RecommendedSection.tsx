import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import recommendationService from "@/services/recommendation.service";
import productAPI from "@/services/product.service";
import type { Product } from "@/types/product";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/store/authStore";
import { FoodCard } from "@/components/shared/FoodCard";


// Nhãn gợi ý mặc định khi dùng fallback (không có AI)
const FALLBACK_TAGS = ["Healthy Choice", "Top Pick", "Best Match"];

// ── Skeleton ─────────────────────────────────────────────

const RecommendedSkeleton = () => (
  <div className="flex bg-white rounded-2xl p-4 gap-4 border border-orange-50 animate-pulse">
    <div className="w-28 h-28 rounded-xl bg-gray-200 shrink-0" />
    <div className="flex-1 space-y-2 py-1">
      <div className="h-3 bg-gray-200 rounded w-1/3" />
      <div className="h-5 bg-gray-200 rounded w-2/3" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="h-6 bg-gray-100 rounded w-1/4 mt-4" />
    </div>
  </div>
);

// ── Types (union để render chung) ─────────────────────────

type DisplayItem =
  | { type: "ai"; data: { product: Product; healthScore: number; aiReason: string } }
  | { type: "fallback"; data: Product; tag: string };

// ── Main Component ────────────────────────────────────────

const RecommendedSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["customer", "common"]);
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCart();
  const { toast } = useToast();

  const [items, setItems] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAIMode, setIsAIMode] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        if (isAuthenticated) {
          // ── Thử lấy AI recommendations ──
          try {
            const res = await recommendationService.getAIRecommendations();
            const aiData = res.data.data;
            if (!cancelled && aiData && aiData.length > 0) {
              setItems(aiData.map((d: { product: Product; healthScore: number; aiReason: string }) => ({ type: "ai", data: d })));
              setIsAIMode(true);
              return;
            }
          } catch {
            // AI endpoint failed → fallback silently
          }
        }

        // ── Fallback: top rated products từ DB ──
        const res = await productAPI.getProducts({
          sort: "rating",
          limit: 3,
          page: 1,
          isAvailable: true,
        });
        if (!cancelled) {
          setItems(
            res.data.slice(0, 3).map((p, idx) => ({
              type: "fallback",
              data: p,
              tag: FALLBACK_TAGS[idx] ?? "Great Choice",
            })),
          );
          setIsAIMode(false);
        }
      } catch (err) {
        console.error("RecommendedSection fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // ── Render ────────────────────────────────────────────

  return (
    <section className="bg-linear-to-br from-orange-50 via-amber-50 to-white rounded-[2rem] p-6 md:p-8 border border-orange-100 shadow-sm transition-all hover:shadow-xl hover:shadow-orange-500/5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200/50">
              <Sparkles className="w-7 h-7 text-orange-600 fill-orange-600 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  {t("customer:home.aiSuggestion")}
                </h2>
                {isAIMode && (
                  <span className="text-[10px] font-black bg-emerald-500 text-white px-3 py-1 rounded-full shadow-lg shadow-emerald-500/20 uppercase tracking-widest">
                    AI Active
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 font-medium mt-1">
                {isAIMode
                  ? t("customer:home.aiSuggestionSub", "Dựa trên sở thích và lịch sử đặt hàng của bạn")
                  : "Những món được đánh giá cao nhất hôm nay"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/ai-suggestions">
            <Button
              variant="outline"
              className="border-primary/20 text-primary font-bold hover:bg-primary/5 rounded-xl px-6"
            >
              Gợi ý món an toàn
            </Button>
          </Link>
          <Link to="/menu">
            <Button
              variant="ghost"
              className="text-slate-600 font-bold hover:bg-slate-100 rounded-xl flex items-center gap-1"
            >
              {t("common:actions.viewAll")}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Not Logged In CTA */}
        {!loading && !isAuthenticated && (
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 mb-4">
            <div className="bg-white/60 backdrop-blur-md border border-orange-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center shrink-0">
                  <Sparkles className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Đăng nhập để nhận gợi ý AI Cá nhân hóa
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">
                    Để AI hiểu khẩu vị của bạn và đề xuất những món ăn phù hợp nhất.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/login")}
                className="bg-orange-600 text-white font-bold rounded-xl px-8 h-12 shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-all whitespace-nowrap"
              >
                Đăng nhập ngay
              </Button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <>
            {isAuthenticated ? (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center py-20 bg-white/50 rounded-3xl border border-dashed border-orange-200">
                <Sparkles className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-900 mb-2">Đang phân tích khẩu vị...</h3>
                <p className="text-slate-500 font-medium animate-pulse">
                  AI đang tìm kiếm những món ăn phù hợp với bạn nhất
                </p>
              </div>
            ) : (
              Array.from({ length: 3 }).map((_, i) => (
                <RecommendedSkeleton key={i} />
              ))
            )}
          </>
        )}

        {/* Items */}
        {!loading &&
          items.map((item, idx) => {
            const isAI = item.type === "ai";
            const product = isAI ? item.data.product : item.data;
            const customBadge = isAI
              ? {
                text: `Điểm: ${item.data.healthScore}/10`,
                className: 'bg-emerald-100 text-emerald-700',
                icon: <Sparkles className="w-3 h-3" />
              }
              : {
                text: item.tag,
                className: 'bg-orange-100 text-orange-700'
              };

            return (
              <FoodCard
                key={isAI ? product._id + idx : product._id}
                id={product._id}
                name={product.name}
                image={typeof product.image === 'object' && product.image?.secureUrl ? product.image.secureUrl : (typeof product.image === 'string' ? product.image : '')}
                price={product.price}
                rating={product.rating}
                restaurant={product.restaurant}
                time={product.time}
                description={isAI ? item.data.aiReason : product.description}
                variant="horizontal"
                customBadge={customBadge}
                onAddToCart={() => {
                  addItem({
                    productId: product._id,
                    name: product.name,
                    image: typeof product.image === 'object' && product.image?.secureUrl ? product.image.secureUrl : (typeof product.image === 'string' ? product.image : ''),
                    price: product.price,
                    quantity: 1
                  });
                  toast(t('customer:foodCard.addToCart', 'Đã thêm vào giỏ hàng!'), 'success');
                }}
              />
            );
          })}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center py-16 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-orange-200">
            <Sparkles className="w-12 h-12 text-orange-300 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-900 mb-2">Chưa có gợi ý nào</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-6">
              Bạn chưa có đủ dữ liệu để AI phân tích. Hãy cập nhật hồ sơ sức khỏe hoặc đặt hàng để AI hiểu bạn hơn nhé!
            </p>
            <Button
              className="bg-orange-100 text-orange-600 font-bold rounded-xl px-8 py-6 hover:bg-orange-600 hover:text-white transition-all shadow-lg shadow-orange-200/50"
              onClick={() => navigate("/profile")}
            >
              Cập nhật hồ sơ
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendedSection;
