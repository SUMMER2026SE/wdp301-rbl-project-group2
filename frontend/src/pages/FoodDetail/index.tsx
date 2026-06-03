import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSafeCart } from "@/hooks/useSafeCart";
import { useAuth } from "@/hooks/useAuth";
import { useSupportChatStore } from "@/store/supportChatStore";
import toast from "react-hot-toast";
import type { MouseEvent } from "react";
import { showAddToCartFeedback } from "@/utils/flyToCart";
import productAPI from "@/services/product.service";
import reviewService from "@/services/review.service";
import recommendationService from "@/services/recommendation.service";
import type { Product, VariantGroup } from "@/types/product";
import { FoodCard } from "@/components/shared/FoodCard";
import VariantModal from "@/components/model/VariantModel";
import {
  User, ThumbsUp, MessageSquare, Star, Loader2, Plus, Minus,
  Check, ChevronLeft, ShieldCheck, Flame, ShoppingCart, Zap,
  SearchX, AlertTriangle, Info, FileText, Quote, MessageCircle, X
} from "lucide-react";
import { useAllergyCheck } from "@/hooks/useAllergyCheck";

const getImageUrl = (image: any): string => {
  if (!image) return "";
  if (typeof image === "object" && image.secureUrl) return image.secureUrl;
  if (typeof image === "string") return image;
  return "";
};

const FoodDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["customer", "common"]);
  const { safeAddItem } = useSafeCart(); // Chỉ dùng safeAddItem để kích hoạt FSS-40
  const { isAuthenticated } = useAuth();
  const { openChat } = useSupportChatStore();

  // --- States ---
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [suggestedFoods, setSuggestedFoods] = useState<Product[]>([]);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [openVariantModal, setOpenVariantModal] = useState(false);
  const [allergyBannerDismissed, setAllergyBannerDismissed] = useState(false);

  // FSS-40: Check allergy status
  const allergyResult = useAllergyCheck(product);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string[]>>({});

  // --- Logic ---
  const extraPrice = useMemo(() => {
    if (!product || !product.variants) return 0;
    let extra = 0;
    product.variants.forEach((group) => {
      const selected = selectedVariants[group.name] || [];
      selected.forEach((choice) => {
        const option = group.options.find((opt) => opt.choice === choice);
        if (option) extra += option.extraPrice;
      });
    });
    return extra;
  }, [product, selectedVariants]);

  const currentPrice = (product?.price || 0) + extraPrice;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const fetchProductAndSuggestions = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await productAPI.getProductById(id);
        setProduct(res.data);

        setLoadingReviews(true);
        const reviewRes = await reviewService.getProductReviews(id);
        setReviews(reviewRes.data || []);
        setLoadingReviews(false);

        setLoadingSuggested(true);
        if (isAuthenticated) {
          const safeRes = await recommendationService.getSafeFoods();
          const filtered = safeRes.data.data.filter((p: Product) => p._id !== id).slice(0, 4);
          setSuggestedFoods(filtered);
        } else {
          const allRes = await productAPI.getProducts({ limit: 4 });
          const filtered = allRes.data.filter((p: Product) => p._id !== id).slice(0, 4);
          setSuggestedFoods(filtered);
        }
      } catch (err) {
        console.error("Failed to fetch product:", err);
        toast.error("Không tìm thấy sản phẩm");
      } finally {
        setLoading(false);
        setLoadingSuggested(false);
      }
    };
    fetchProductAndSuggestions();
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (product?.variants) {
      const init: Record<string, string[]> = {};
      product.variants.forEach((g) => {
        if (g.required && !g.multiple && g.options?.length) {
          init[g.name] = [g.options[0].choice];
        } else {
          init[g.name] = [];
        }
      });
      setSelectedVariants(init);
    }
  }, [product]);

  const toggleVariant = (group: VariantGroup, choice: string) => {
    setSelectedVariants((prev) => {
      const current = prev[group.name] ?? [];
      if (!group.multiple) return { ...prev, [group.name]: [choice] };

      const exists = current.includes(choice);
      let next = exists ? current.filter((c) => c !== choice) : [...current, choice];
      if (group.maxChoices && next.length > group.maxChoices) return prev;
      return { ...prev, [group.name]: next };
    });
  };

  const handleIncrease = () => setQuantity((prev) => prev + 1);
  const handleDecrease = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  // --- [FIXED] Sửa lỗi logic bypass FSS-40 ---
  const handleAddToCart = (e?: MouseEvent<HTMLButtonElement>) => {
    if (!product) return;

    // Validate Variants
    if (product.variants) {
      for (const g of product.variants) {
        if (g.required && (!selectedVariants[g.name] || selectedVariants[g.name].length === 0)) {
          toast.error(`Vui lòng chọn ${g.name}`);
          return;
        }
      }
    }

    const variations = product.variants ? product.variants.flatMap((g) => {
      const picked = selectedVariants[g.name] ?? [];
      return picked.map((choice) => ({ name: g.name, choice }));
    }) : [];

    const itemData = {
      productId: product._id,
      name: product.name,
      image: getImageUrl(product.image),
      price: currentPrice,
      quantity,
      variations,
    };

    // Phải dùng safeAddItem để kích hoạt luồng cảnh báo dị ứng
    safeAddItem(product, itemData, () => {
      showAddToCartFeedback(
        e?.currentTarget,
        getImageUrl(product.image),
        t("customer:foodCard.addedToCart", "Đã thêm sản phẩm vào giỏ hàng!"),
      );
    });
  };

  const handleBuyNow = () => {
    if (!product) return;

    if (product.variants) {
      for (const g of product.variants) {
        if (g.required && (!selectedVariants[g.name] || selectedVariants[g.name].length === 0)) {
          toast.error(`Vui lòng chọn ${g.name}`);
          return;
        }
      }
    }

    const variations = product.variants ? product.variants.flatMap((g) => {
      const picked = selectedVariants[g.name] ?? [];
      return picked.map((choice) => ({ name: g.name, choice }));
    }) : [];

    const buyNowItem = {
      productId: product._id,
      name: product.name,
      image: getImageUrl(product.image),
      price: currentPrice,
      quantity,
      variations,
    };

    navigate('/checkout', { state: { buyNowItem } });
  };

  return (
    <div className="bg-slate-50 font-sans min-h-screen pb-32 relative">
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6">

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
            <p className="font-medium text-slate-500 animate-pulse">Đang chuẩn bị món ăn...</p>
          </div>
        ) : !product ? (
          <div className="text-center py-24 bg-white rounded-[2rem] mt-10 shadow-sm border border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <SearchX className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-black text-slate-800">Không tìm thấy món ăn</h2>
            <button onClick={() => navigate("/menu")} className="mt-4 px-6 py-2.5 bg-orange-100 text-orange-600 rounded-xl font-bold hover:bg-orange-200 transition-colors">
              Quay lại thực đơn
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {/* --- BREADCRUMB --- */}
            <nav className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-sm">
                <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-orange-600 transition-colors p-1 -ml-1 rounded-full hover:bg-orange-50">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <Link className="text-slate-500 hover:text-orange-600 font-medium" to="/menu">
                  Thực đơn
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900 font-bold truncate max-w-[150px] sm:max-w-[300px]">{product.name}</span>
              </div>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

              {/* --- LEFT COLUMN: IMAGE --- */}
              <div className="lg:col-span-5 relative lg:sticky lg:top-24">
                <div className="relative w-full aspect-square md:aspect-[4/3] lg:aspect-square rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200 bg-white">
                  <img
                    src={getImageUrl(product.image)}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider text-orange-600 shadow-md">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      Món bán chạy
                    </span>
                  </div>
                </div>
              </div>

              {/* --- RIGHT COLUMN: DETAILS & ACTIONS --- */}
              <div className="lg:col-span-7 flex flex-col h-full pt-2">

                {/* [FIXED] FSS-40: Allergy Warning Banner */}
                {allergyResult.level !== "safe" && !allergyBannerDismissed && (
                  <div
                    className={`mb-6 rounded-[1.5rem] p-4 flex gap-4 items-start border shadow-sm relative overflow-hidden ${allergyResult.level === "danger" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                      }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${allergyResult.level === "danger" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                      {allergyResult.level === "danger" ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className={`font-black text-sm mb-1 uppercase tracking-wide ${allergyResult.level === "danger" ? "text-red-800" : "text-amber-800"}`}>
                        {allergyResult.level === "danger" ? "Cảnh báo dị ứng!" : "Lưu ý sức khỏe"}
                      </p>
                      <p className={`text-sm font-medium leading-relaxed ${allergyResult.level === "danger" ? "text-red-700/90" : "text-amber-700/90"}`}>
                        {allergyResult.warningMessage}
                      </p>
                      {allergyResult.conflictIngredients.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {allergyResult.conflictIngredients.map((ing: string, i: number) => (
                            <span key={i} className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${allergyResult.level === "danger" ? "bg-white border-red-200 text-red-600" : "bg-white border-amber-200 text-amber-600"
                              }`}>
                              {ing}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setAllergyBannerDismissed(true)}
                      className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/50 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
                      {product.name}
                    </h1>
                    {/* [FIXED] Nút Chat dời lên đây cho sang trọng */}
                    <button
                      onClick={() => openChat()}
                      className="hidden sm:flex shrink-0 items-center justify-center w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors shadow-sm"
                      title="Liên hệ tư vấn món ăn"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <span className="text-3xl font-black text-orange-600">
                      {currentPrice.toLocaleString("vi-VN")}đ
                    </span>
                    <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                    <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-100">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-bold text-slate-800">
                        {Number(product?.rating ?? 0).toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium ml-1">
                        ({product?.reviewCount || 0}+ đánh giá)
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Healthy Badge */}
                {product.healthTags && product.healthTags.length > 0 && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-[1.5rem] p-5 mb-8 flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-emerald-900 mb-1">
                        NutriAI™ Khuyên dùng
                      </h3>
                      <p className="text-sm text-emerald-700/80 mb-3 font-medium leading-relaxed">
                        Món ăn được trí tuệ nhân tạo phân tích thành phần, đảm bảo an toàn cho hồ sơ sức khỏe của bạn.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {product.healthTags.map((tag) => (
                          <span key={tag} className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* [FIXED] Đoạn Description Icon Lucide */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-500" />
                    {t("customer:foodDetail.description", "Mô tả món ăn")}
                  </h3>
                  <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 relative overflow-hidden">
                    <Quote className="absolute -top-2 -left-2 w-16 h-16 text-slate-200/50 -rotate-12" />
                    <p className="text-base text-slate-600 leading-relaxed font-medium relative z-10 pl-4 border-l-[3px] border-orange-400 rounded-sm">
                      {product.description || "Hương vị tuyệt hảo đang chờ bạn khám phá."}
                    </p>
                  </div>
                </div>

                {/* VARIANTS SECTION */}
                {product.variants && product.variants.length > 0 && (
                  <div className="space-y-6 mb-8">
                    {product.variants.map((group) => (
                      <div key={group.name} className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-lg">{group.name}</span>
                            {group.required && (
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-rose-100 text-rose-600">
                                Bắt buộc
                              </span>
                            )}
                            {group.multiple && (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-600">
                                Chọn nhiều {group.maxChoices ? `(Max: ${group.maxChoices})` : ""}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                            Đã chọn: {selectedVariants[group.name]?.length || 0}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {group.options.map((option) => {
                            const isSelected = selectedVariants[group.name]?.includes(option.choice);
                            return (
                              <button
                                key={option.choice}
                                onClick={() => toggleVariant(group, option.choice)}
                                className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all text-left ${isSelected ? "border-orange-500 bg-orange-50 shadow-sm" : "border-slate-100 bg-white hover:border-orange-300"
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${isSelected ? "border-orange-500 bg-orange-500" : "border-slate-300"
                                    }`}>
                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                  </div>
                                  <span className={`text-sm font-bold ${isSelected ? "text-orange-900" : "text-slate-700"}`}>
                                    {option.choice}
                                  </span>
                                </div>
                                {option.extraPrice > 0 && (
                                  <span className={`text-[13px] font-black ${isSelected ? "text-orange-600" : "text-slate-500"}`}>
                                    +{option.extraPrice.toLocaleString("vi-VN")}đ
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* --- [FIXED] STICKY ACTION BAR --- */}
                <div className="fixed bottom-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
                  <div className="flex items-center gap-3 max-w-6xl mx-auto">

                    {/* Nút Chat hiển thị trên Mobile */}
                    <button
                      onClick={() => openChat()}
                      className="flex sm:hidden shrink-0 items-center justify-center w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors shadow-sm border border-orange-100"
                    >
                      <MessageCircle className="w-6 h-6" />
                    </button>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded-2xl px-1.5 h-14 min-w-[100px] sm:min-w-[120px] shrink-0">
                      <button onClick={handleDecrease} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-600 hover:text-orange-600 active:scale-95 transition-all">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-black text-lg text-slate-900 w-6 sm:w-8 text-center">
                        {quantity}
                      </span>
                      <button onClick={handleIncrease} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-600 hover:text-orange-600 active:scale-95 transition-all">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Buttons */}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="flex-1 h-14 bg-orange-100 text-orange-700 font-black text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-200 active:scale-95 transition-all cursor-pointer"
                    >
                      <ShoppingCart className="w-5 h-5 hidden sm:block" />
                      Thêm
                    </button>

                    <button
                      onClick={handleBuyNow}
                      className="flex-1 h-14 bg-orange-600 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 hover:bg-orange-700 active:scale-95 transition-all"
                    >
                      <Zap className="w-5 h-5 fill-current hidden sm:block" />
                      Mua ngay
                    </button>

                  </div>
                </div>

              </div>
            </div>

            {/* --- REVIEWS SECTION --- */}
            <section className="mt-16 border-t border-slate-200 pt-16">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-orange-500" />
                Đánh giá từ khách hàng
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">

                {/* 1. KHUNG TỔNG QUAN (BÊN TRÁI) */}
                <div className="lg:col-span-4">
                  <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 text-center shadow-sm sticky top-24">
                    <div className="text-6xl md:text-7xl font-black text-slate-900 mb-4 tracking-tighter">
                      {Number(product?.rating ?? 0).toFixed(1)}
                    </div>
                    <div className="flex justify-center gap-1.5 mb-5 scale-110">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-5 h-5 ${Number(product?.rating ?? 0) >= s ? "fill-yellow-400 text-yellow-400" : "fill-slate-100 text-slate-200"}`}
                        />
                      ))}
                    </div>
                    <p className="text-sm font-bold text-slate-500 bg-slate-50 py-2 rounded-xl inline-block px-4">
                      Dựa trên {product?.reviewCount || reviews.length} lượt đánh giá
                    </p>
                  </div>
                </div>

                {/* 2. KHUNG DANH SÁCH COMMENT (BÊN PHẢI) */}
                <div className="lg:col-span-8 space-y-6">
                  {loadingReviews ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                      <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                      <p className="text-slate-500 font-bold animate-pulse">Đang tải nhận xét...</p>
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm border border-slate-100">
                        <MessageCircle className="w-10 h-10 text-slate-300" />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mb-2">Chưa có đánh giá nào</h3>
                      <p className="text-slate-500 font-medium">Bạn sẽ là người đầu tiên trải nghiệm và chia sẻ cảm nhận chứ?</p>
                    </div>
                  ) : (
                    reviews.map((review, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300 relative overflow-hidden group"
                      >
                        {/* Ngoặc kép trang trí chìm ở góc phải */}
                        <Quote className="absolute -top-4 -right-4 w-24 h-24 text-slate-50 group-hover:text-orange-50 transition-colors -rotate-12 pointer-events-none" />

                        {/* Info User */}
                        <div className="flex items-start justify-between mb-4 relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden border border-slate-200">
                              {review.user?.avatar || review.userId?.avatar ? (
                                <img
                                  src={review.user?.avatar || review.userId?.avatar}
                                  alt="Avatar"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-base leading-tight mb-1">
                                {review.isAnonymous ? "Khách hàng ẩn danh" : (review.user?.name || review.userId?.username || "Khách hàng")}
                              </h4>
                              <div className="flex items-center gap-2">
                                <div className="flex gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-3.5 h-3.5 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-slate-200 fill-slate-100"}`}
                                    />
                                  ))}
                                </div>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Nội dung Comment */}
                        <p className="text-slate-600 leading-relaxed font-medium relative z-10">
                          {review.comment}
                        </p>

                        {/* Hình ảnh đính kèm */}
                        {review.images && review.images.length > 0 && (
                          <div className="flex gap-3 mt-5 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {review.images.map((img: string | any, i: number) => {
                              const imgSrc = typeof img === 'string' ? img : img?.url || img?.secureUrl;
                              return (
                                <div key={i} className="w-20 h-20 shrink-0 rounded-[1rem] overflow-hidden border border-slate-200 cursor-zoom-in relative group/img">
                                  <img
                                    src={imgSrc}
                                    alt="Review"
                                    className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors" />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Tương tác */}
                        <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-end relative z-10">
                          <button className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-orange-600 transition-colors">
                            <ThumbsUp className="w-4 h-4" />
                            Hữu ích
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* --- SUGGESTED FOODS --- */}
            {suggestedFoods.length > 0 && (
              <section className="mt-16 pt-16 border-t border-slate-200">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-orange-100 rounded-2xl">
                    <Flame className="w-6 h-6 text-orange-600 fill-orange-600/20" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {isAuthenticated ? "Gợi ý an toàn cho bạn" : "Có thể bạn sẽ thích"}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">
                      {isAuthenticated
                        ? "Được AI chọn lọc dựa trên hồ sơ sức khỏe cá nhân."
                        : "Khám phá thêm các hương vị hấp dẫn khác."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {suggestedFoods.map((suggestedItem) => (
                    <FoodCard
                      key={suggestedItem._id}
                      id={suggestedItem._id}
                      name={suggestedItem.name}
                      image={getImageUrl(suggestedItem.image)}
                      price={suggestedItem.price}
                      rating={suggestedItem.rating}
                      restaurant={suggestedItem.restaurant}
                      time={suggestedItem.time}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Component Modal Variant (Nếu cần cho thẻ gợi ý) */}
      <VariantModal
        open={openVariantModal}
        onClose={() => setOpenVariantModal(false)}
        productName={product?.name ?? ""}
        basePrice={Number(product?.price ?? 0)}
        variants={(product as any)?.variants ?? []}
        quantity={quantity}
        toastError={(msg) => toast.error(msg)}
        onConfirm={({ variations, unitPrice }) => {
          if (!product) return;
          safeAddItem(
            product,
            {
              productId: product._id,
              name: product.name,
              image: typeof product.image === "object" ? product.image.secureUrl : product.image,
              price: unitPrice,
              quantity,
              variations,
            },
            () => {
              showAddToCartFeedback(
                null,
                getImageUrl(product.image),
                t("customer:foodCard.addedToCart", "Đã thêm sản phẩm vào giỏ hàng!"),
              );
            }
          );
        }}
      />
    </div>
  );
};

export default FoodDetailPage;
