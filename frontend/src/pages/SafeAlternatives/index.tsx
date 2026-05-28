import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// Removed useTranslation
import { Shield, ShieldCheck, ShieldAlert, Star, Plus, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import recommendationService from "@/services/recommendation.service";
import type { Product } from "@/types/product";

// ── Helpers ──────────────────────────────────────────────
const getImageUrl = (image: Product["image"]): string => {
  if (!image) return "";
  if (typeof image === "object" && image.secureUrl) return image.secureUrl;
  if (typeof image === "string") return image;
  return "";
};

// ── Types ────────────────────────────────────────────────
interface SafeFoodsData {
  products: Product[];
  filters: {
    allergies: string[];
    dietary: string[];
    healthGoals: string[];
  };
  stats: {
    total: number;
    safe: number;
    excluded: number;
  };
}

// ── Skeleton Loading ─────────────────────────────────────
const SafeFoodSkeleton = () => (
  <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-emerald-50 animate-pulse">
    <div className="w-full aspect-[4/3] bg-gray-200" />
    <div className="p-5 space-y-3">
      <div className="h-5 bg-gray-200 rounded w-2/3" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="h-10 bg-gray-100 rounded w-full mt-4" />
    </div>
  </div>
);

// ── Main Component ───────────────────────────────────────
const SafeAlternativesPage = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<SafeFoodsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSafeFoods = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await recommendationService.getSafeFoods();
        if (!cancelled) {
          setData({
            products: res.data.data,
            filters: res.data.filters,
            stats: res.data.stats,
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Không thể tải dữ liệu");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSafeFoods();
    return () => {
      cancelled = true;
    };
  }, []);

  const allFilters = [
    ...(data?.filters.allergies || []).map((a) => ({ label: `Không ${a}`, type: "allergy" as const })),
    ...(data?.filters.dietary || []).map((d) => ({ label: d, type: "dietary" as const })),
    ...(data?.filters.healthGoals || []).map((g) => ({ label: g, type: "goal" as const })),
  ];

  return (
    <div className="bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 text-foreground font-sans min-h-screen">
      <main className="flex-1 flex flex-col items-center py-10 px-4 md:px-8 lg:px-12">
        <div className="max-w-[1200px] w-full flex flex-col gap-8">

          {/* ── Back Button ── */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </button>

          {/* ── Page Heading ── */}
          <div className="flex flex-col gap-4 border-l-4 border-emerald-500 pl-6 py-2">
            <div className="flex items-center gap-3">
              <Shield className="w-9 h-9 text-emerald-600 fill-emerald-100" />
              <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-slate-900">
                Món Ăn An Toàn Cho Bạn
              </h1>
            </div>
            <p className="text-slate-500 text-lg max-w-2xl leading-normal">
              {data ? (
                <>
                  AI đã phân tích <strong className="text-emerald-600">{data.stats.total}</strong> món trong thực đơn
                  và tìm ra <strong className="text-emerald-600">{data.stats.safe}</strong> món an toàn cho bạn
                  {data.stats.excluded > 0 && (
                    <span className="text-orange-500">
                      {" "}(đã loại bỏ {data.stats.excluded} món chứa chất gây dị ứng)
                    </span>
                  )}.
                </>
              ) : (
                "Dựa trên dị ứng và hồ sơ sức khỏe, hệ thống lọc ra những món an toàn nhất cho bạn."
              )}
            </p>
          </div>

          {/* ── Active Health Filters ── */}
          {allFilters.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Bộ Lọc Sức Khỏe Đang Bật
              </p>
              <div className="flex gap-3 flex-wrap">
                {allFilters.map((f, idx) => (
                  <div
                    key={`${f.type}-${idx}`}
                    className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full pl-3 pr-4 border text-sm font-bold
                      ${f.type === "allergy"
                        ? "bg-red-50 border-red-200 text-red-600"
                        : f.type === "dietary"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                          : "bg-blue-50 border-blue-200 text-blue-600"
                      }`}
                  >
                    {f.type === "allergy" ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Stats Bar ── */}
          {data && (
            <div className="flex items-center gap-6 bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-600">{data.stats.safe}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Món an toàn</p>
                </div>
              </div>
              <div className="w-px h-10 bg-slate-100" />
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-black text-orange-500">{data.stats.excluded}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Món đã loại</p>
                </div>
              </div>
              <div className="w-px h-10 bg-slate-100" />
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-700">{data.stats.total}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Tổng thực đơn</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Loading State ── */}
          {loading && (
            <div className="flex flex-col items-center py-16 gap-4">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-emerald-600 font-medium animate-pulse">
                Đang phân tích thực đơn an toàn cho bạn...
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SafeFoodSkeleton key={i} />
                ))}
              </div>
            </div>
          )}

          {/* ── Error State ── */}
          {error && !loading && (
            <div className="flex flex-col items-center py-16 gap-4 bg-white rounded-2xl border border-red-200 shadow-sm">
              <ShieldAlert className="w-12 h-12 text-red-400" />
              <p className="text-red-500 font-bold text-lg">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-colors"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* ── Food Grid ── */}
          {!loading && !error && data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.products.map((product) => {
                const imageUrl = getImageUrl(product.image);

                return (
                  <div
                    key={product._id}
                    onClick={() => navigate(`/food/${product._id}`)}
                    className="flex flex-col bg-white rounded-2xl overflow-hidden border border-emerald-50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all cursor-pointer group"
                  >
                    {/* Image */}
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-emerald-50">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-emerald-200 text-5xl">
                            restaurant
                          </span>
                        </div>
                      )}
                      {/* Safe Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold shadow-lg">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>AN TOÀN</span>
                      </div>
                      {/* Rating */}
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
                        <Star className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                        <span className="text-xs font-bold text-slate-700">{product.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col gap-3 flex-1">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800 leading-tight mb-1 group-hover:text-emerald-600 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-400">{product.restaurant}</p>
                      </div>

                      {/* Base Description */}
                      <p className="text-sm text-slate-500 line-clamp-2">{product.description}</p>

                      {/* AI Personalized Insight */}
                      {product.aiReason && (
                        <div className="bg-emerald-50/80 rounded-lg p-3 border border-emerald-100/50 mt-1">
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-medium text-emerald-800 leading-snug">
                              {product.aiReason}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Ingredients preview */}
                      {product.recipe && product.recipe.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {product.recipe.slice(0, 4).map((r, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium border border-emerald-100"
                            >
                              {r.name}
                            </span>
                          ))}
                          {product.recipe.length > 4 && (
                            <span className="text-[10px] px-2 py-0.5 bg-slate-50 text-slate-400 rounded-full font-medium">
                              +{product.recipe.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-end justify-between mt-auto pt-3 border-t border-emerald-50">
                        <div>
                          <span className="font-black text-xl text-emerald-600">
                            {product.price.toLocaleString("vi-VN")}đ
                          </span>
                          <div className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                            {product.time}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/food/${product._id}`);
                          }}
                          className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shrink-0"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Empty State ── */}
          {!loading && !error && data && data.products.length === 0 && (
            <div className="flex flex-col items-center py-16 gap-4 bg-white rounded-2xl border border-dashed border-emerald-200">
              <Shield className="w-12 h-12 text-emerald-300" />
              <p className="text-slate-500 text-center max-w-md">
                {allFilters.length === 0
                  ? "Bạn chưa cập nhật hồ sơ dị ứng. Hãy vào cài đặt để thêm thông tin sức khỏe nhé!"
                  : "Không tìm thấy món ăn phù hợp với hồ sơ dị ứng hiện tại."}
              </p>
              <button
                onClick={() => navigate("/profile-settings")}
                className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors"
              >
                Cập nhật hồ sơ sức khỏe
              </button>
            </div>
          )}

          {/* ── Footer Note ── */}
          {data && data.products.length > 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-slate-400 italic">
                Các món đã được lọc dựa trên hồ sơ dị ứng: <strong>{data.filters.allergies.join(", ") || "Chưa có"}</strong>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SafeAlternativesPage;
