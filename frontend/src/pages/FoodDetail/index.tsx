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
import reviewService, {
  type Review,
  type ReviewReactionType,
} from "@/services/review.service";
import recommendationService from "@/services/recommendation.service";
import type { Product, VariantGroup } from "@/types/product";
import { FoodCard } from "@/components/shared/FoodCard";
import VariantModal from "@/components/modal/VariantModal";
import {
  User, ThumbsUp, Heart, Laugh, Sparkles, Frown, Angry, MessageSquare, Star, Loader2, Plus, Minus,
  Check, ChevronLeft, ShieldCheck, Flame, ShoppingCart, Zap,
  SearchX, AlertTriangle, Info, FileText, Quote, MessageCircle, X
} from "lucide-react";
import { useAllergyCheck } from "@/hooks/useAllergyCheck";
import { getProductAllergenInfo, getProductHealthStatus } from "@/utils/productHealthRisk";
import { getAllergenLabel } from "@/constants/allergenCatalog";

const getImageUrl = (image: any): string => {
  if (!image) return "";
  if (typeof image === "object" && image.secureUrl) return image.secureUrl;
  if (typeof image === "string") return image;
  return "";
};

const TOPPING_GROUP_NAME = "Topping ăn kèm";

const REVIEW_REACTIONS: Array<{
  type: ReviewReactionType;
  label: string;
  icon: typeof ThumbsUp;
  colorClass: string;
  bubbleClass: string;
}> = [
  {
    type: "like",
    label: "Thích",
    icon: ThumbsUp,
    colorClass: "text-blue-600",
    bubbleClass: "bg-blue-500 text-white",
  },
  {
    type: "love",
    label: "Yêu thích",
    icon: Heart,
    colorClass: "text-rose-600",
    bubbleClass: "bg-rose-500 text-white",
  },
  {
    type: "haha",
    label: "Haha",
    icon: Laugh,
    colorClass: "text-amber-600",
    bubbleClass: "bg-amber-400 text-white",
  },
  {
    type: "wow",
    label: "Wow",
    icon: Sparkles,
    colorClass: "text-violet-600",
    bubbleClass: "bg-violet-500 text-white",
  },
  {
    type: "sad",
    label: "Buồn",
    icon: Frown,
    colorClass: "text-sky-600",
    bubbleClass: "bg-sky-500 text-white",
  },
  {
    type: "angry",
    label: "Phẫn nộ",
    icon: Angry,
    colorClass: "text-red-600",
    bubbleClass: "bg-red-500 text-white",
  },
];

const normalizeLabel = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

const isToppingGroup = (group: VariantGroup) =>
  normalizeLabel(group.name) === normalizeLabel(TOPPING_GROUP_NAME) ||
  normalizeLabel(group.name).includes("topping");

const buildHealthNotice = (
  productName: string,
  risk: {
    level: "safe" | "warning" | "danger";
    warningMessage: string;
    conflictIngredients: string[];
    matchedAllergens?: string[];
  },
) => {
  const ingredients = risk.conflictIngredients.filter(Boolean);
  const allergenLabels = (risk.matchedAllergens ?? []).map(getAllergenLabel).filter(Boolean);
  const ingredientText = ingredients.length > 0 ? ingredients.join(", ") : "một số thành phần trong món";
  const allergenText = allergenLabels.length > 0 ? allergenLabels.join(", ") : ingredientText;

  if (risk.level === "danger") {
    return {
      title: "Thông tin dị ứng của món",
      summary: `${productName} có chứa ${ingredientText}. Thành phần này thuộc nhóm ${allergenText}, có thể gây phản ứng với người có hồ sơ dị ứng tương ứng.`,
      impact: "Người nhạy cảm có thể gặp các dấu hiệu như ngứa, nổi mẩn, khó chịu đường tiêu hóa hoặc phản ứng nghiêm trọng hơn tùy cơ địa. Thông tin này dùng để bạn cân nhắc trước khi chọn món.",
    };
  }

  return {
    title: "Lưu ý chế độ ăn",
    summary: risk.warningMessage || `${productName} có một số thành phần có thể chưa phù hợp với chế độ ăn bạn đã chọn.`,
    impact: "Món vẫn có thể đặt bình thường; phần này chỉ giúp bạn kiểm tra lại thành phần nếu đang ăn kiêng hoặc theo mục tiêu sức khỏe riêng.",
  };
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
  const [serverRisk, setServerRisk] = useState<{
    level: "safe" | "warning" | "danger";
    matchedAllergens: string[];
    matchedIngredients: string[];
    message: string;
  } | null>(null);

  // FSS-40: Check allergy status
  const allergyResult = useAllergyCheck(product);
  const serverMatchedIngredients = Array.isArray(serverRisk?.matchedIngredients)
    ? serverRisk.matchedIngredients.filter(Boolean)
    : [];
  const serverMatchedAllergens = Array.isArray(serverRisk?.matchedAllergens)
    ? serverRisk.matchedAllergens.filter(Boolean)
    : [];
  const displayAllergyResult = serverRisk
    ? {
        level: serverRisk.level,
        warningMessage: serverRisk.message ?? "",
        matchedAllergens: serverMatchedAllergens,
        conflictIngredients: serverMatchedIngredients.length
          ? serverMatchedIngredients
          : serverMatchedAllergens,
      }
    : { ...allergyResult, matchedAllergens: [] };
  const healthNotice = product && displayAllergyResult.level !== "safe"
    ? buildHealthNotice(product.name, displayAllergyResult)
    : null;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [reactingReviewId, setReactingReviewId] = useState<string | null>(null);
  const REVIEW_LIMIT = 5;
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

  const basePrice = (product?.campaignPrice ?? product?.price) || 0;
  const currentPrice = basePrice + extraPrice;
  const ingredientNames = useMemo(() => {
    if (!product?.recipe?.length) return [];

    return Array.from(
      new Set(
        product.recipe
          .map((ingredient) => {
            if (ingredient.name?.trim()) return ingredient.name.trim();
            if (typeof ingredient.ingredientId === "object") {
              return ingredient.ingredientId.name?.trim();
            }
            return "";
          })
          .filter((name): name is string => Boolean(name)),
      ),
    );
  }, [product]);

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
        setServerRisk(res.data.healthRisk ?? null);

        if (isAuthenticated && !res.data.healthRisk) {
          try {
            const riskRes = await productAPI.getProductHealthRisk(id);
            setServerRisk(riskRes.data);
          } catch {
            setServerRisk(null);
          }
        }

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

  // --- Reviews: fetch độc lập, không block product loading ---
  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      setLoadingReviews(true);
      setReviews([]);
      setReviewPage(1);
      setReviewTotal(0);
      try {
        const reviewRes = await reviewService.getProductReviews(id, 1, REVIEW_LIMIT);
        setReviews(reviewRes.data || []);
        setReviewTotal(reviewRes.pagination?.total ?? 0);
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchReviews();
  }, [id]);

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
      if (group.maxChoices && next.length > group.maxChoices) {
        toast.error(`Bạn chỉ có thể chọn tối đa ${group.maxChoices} ${isToppingGroup(group) ? "topping" : "lựa chọn"}`);
        return prev;
      }
      return { ...prev, [group.name]: next };
    });
  };

  const handleIncrease = () => setQuantity((prev) => prev + 1);
  const handleDecrease = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleLoadMoreReviews = async () => {
    if (!id || loadingMoreReviews) return;
    setLoadingMoreReviews(true);
    try {
      const nextPage = reviewPage + 1;
      const res = await reviewService.getProductReviews(id, nextPage, REVIEW_LIMIT);
      setReviews(prev => [...prev, ...(res.data || [])]);
      setReviewPage(nextPage);
      setReviewTotal(res.pagination?.total ?? reviewTotal);
    } catch (err) {
      console.error("Failed to load more reviews", err);
    } finally {
      setLoadingMoreReviews(false);
    }
  };

  const handleReviewReaction = async (reviewId: string, reaction: ReviewReactionType) => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để bày tỏ cảm xúc với đánh giá.");
      navigate("/login", { state: { from: { pathname: `/food/${id}` } } });
      return;
    }

    const currentReview = reviews.find((review) => review._id === reviewId);
    const nextReaction = currentReview?.currentUserReaction === reaction ? null : reaction;

    try {
      setReactingReviewId(reviewId);
      const response = await reviewService.setReviewReaction(reviewId, nextReaction);
      setReviews((current) =>
        current.map((review) =>
          review._id === reviewId
            ? {
                ...review,
                reactions: response.data.reactions,
                currentUserReaction: response.data.currentUserReaction,
              }
            : review
        )
      );
    } catch (error) {
      console.error("Failed to react to review:", error);
      toast.error("Chưa thể cập nhật cảm xúc. Vui lòng thử lại.");
    } finally {
      setReactingReviewId(null);
    }
  };

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
                {healthNotice && !allergyBannerDismissed && (
                  <div
                    className="mb-6 rounded-[1.5rem] p-4 flex gap-4 items-start border shadow-sm relative overflow-hidden bg-amber-50 border-amber-200"
                  >
                    <div className="p-2 rounded-xl shrink-0 bg-amber-100 text-amber-600">
                      {displayAllergyResult.level === "danger" ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="font-black text-sm mb-1 uppercase tracking-wide text-amber-800">
                        {healthNotice.title}
                      </p>
                      <p className="text-sm font-semibold leading-relaxed text-amber-800/90">
                        {healthNotice.summary}
                      </p>
                      <p className="text-xs font-medium leading-relaxed mt-2 text-amber-700/80">
                        {healthNotice.impact}
                      </p>
                      {displayAllergyResult.conflictIngredients.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {displayAllergyResult.conflictIngredients.map((ing: string, i: number) => (
                            <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-lg border bg-white border-amber-200 text-amber-600">
                              {ing}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs font-bold text-slate-500 mt-3">
                        Bạn vẫn có thể thêm vào giỏ hàng hoặc đặt món nếu đã cân nhắc.
                      </p>
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
                    <div className="flex flex-col">
                      {product.campaignPrice != null && (
                        <span className="text-base text-slate-400 line-through decoration-red-400/50">
                          {(product.price + extraPrice).toLocaleString("vi-VN")}đ
                        </span>
                      )}
                      <span className="text-3xl font-black text-orange-600">
                        {currentPrice.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                    <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-100">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-bold text-slate-800">
                        {Number(product?.rating ?? 0).toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium ml-1">
                        ({product?.reviewCount ?? reviewTotal} đánh giá)
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

                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-500" />
                    Nguyên liệu
                  </h3>
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    {ingredientNames.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {ingredientNames.map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-700"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-slate-500">
                        Chưa cập nhật nguyên liệu cho món này.
                      </p>
                    )}
                  </div>
                </div>

                {/* VARIANTS SECTION */}
                {product.variants && product.variants.length > 0 && (
                  <div className="space-y-6 mb-8">
                    {product.variants.map((group) => {
                      const selectedCount = selectedVariants[group.name]?.length || 0;
                      const toppingGroup = isToppingGroup(group);

                      return (
                      <div
                        key={group.name}
                        className={`border rounded-[1.5rem] p-5 shadow-sm ${
                          toppingGroup
                            ? "bg-orange-50/70 border-orange-100"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                          <div className="flex items-center gap-2">
                            {toppingGroup && (
                              <span className="w-9 h-9 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/20">
                                <Plus className="w-5 h-5" />
                              </span>
                            )}
                            <div>
                              <span className="font-bold text-slate-900 text-lg">{group.name}</span>
                              {toppingGroup && (
                                <p className="text-xs font-medium text-orange-700 mt-0.5">
                                  Chọn món ăn kèm để thêm vào phần ăn của bạn
                                </p>
                              )}
                            </div>
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
                            Đã chọn: {selectedCount}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {group.options.map((option) => {
                            const isSelected = selectedVariants[group.name]?.includes(option.choice);
                            return (
                              <button
                                key={option.choice}
                                onClick={() => toggleVariant(group, option.choice)}
                                className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all text-left ${isSelected ? "border-orange-500 bg-white shadow-sm" : "border-slate-100 bg-white hover:border-orange-300"
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 ${group.multiple ? "rounded-md" : "rounded-full"} border-2 flex items-center justify-center transition-colors shrink-0 ${isSelected ? "border-orange-500 bg-orange-500" : "border-slate-300"
                                    }`}>
                                    {isSelected && (
                                      group.multiple ? (
                                        <Check className="w-3.5 h-3.5 text-white" />
                                      ) : (
                                        <div className="w-2 h-2 bg-white rounded-full" />
                                      )
                                    )}
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
                      );
                    })}
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
                      Dựa trên {product?.reviewCount ?? reviewTotal} lượt đánh giá
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
                    reviews.map((review) => (
                      <div
                        key={review._id}
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
                                  src={review.user?.avatar || review.userId?.avatar || undefined}
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

                        {/* Tương tác kiểu Facebook */}
                        <div
                          className="group/reactions relative z-20 mt-5 border-t border-slate-100 pt-3"
                        >
                          <div
                            className="invisible absolute bottom-full right-0 mb-2 flex translate-y-2 items-end gap-1 rounded-full border border-slate-200 bg-white px-2 py-1.5 opacity-0 shadow-xl transition-all group-hover/reactions:visible group-hover/reactions:translate-y-0 group-hover/reactions:opacity-100 group-focus-within/reactions:visible group-focus-within/reactions:translate-y-0 group-focus-within/reactions:opacity-100"
                            role="group"
                            aria-label="Chọn cảm xúc"
                          >
                            {REVIEW_REACTIONS.map(({ type, label, icon: ReactionIcon, bubbleClass }) => (
                              <button
                                type="button"
                                key={type}
                                onClick={() => handleReviewReaction(review._id, type)}
                                disabled={reactingReviewId === review._id}
                                title={label}
                                aria-label={label}
                                aria-pressed={review.currentUserReaction === type}
                                className={`grid h-11 w-11 place-items-center rounded-full transition-transform hover:-translate-y-1 hover:scale-110 focus-visible:-translate-y-1 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-wait disabled:opacity-60 ${bubbleClass}`}
                              >
                                <ReactionIcon
                                  className={`h-5 w-5 ${
                                    type === "love" || review.currentUserReaction === type ? "fill-current" : ""
                                  }`}
                                />
                              </button>
                            ))}
                          </div>

                          <div className="flex min-h-10 items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
                              <div className="flex -space-x-1.5">
                                {REVIEW_REACTIONS.filter(({ type }) => (review.reactions?.[type] ?? 0) > 0)
                                  .slice(0, 3)
                                  .map(({ type, label, icon: ReactionIcon, bubbleClass }) => (
                                    <span
                                      key={type}
                                      title={`${label}: ${review.reactions?.[type] ?? 0}`}
                                      className={`grid h-6 w-6 place-items-center rounded-full border-2 border-white ${bubbleClass}`}
                                    >
                                      <ReactionIcon className={`h-3 w-3 ${type === "love" ? "fill-current" : ""}`} />
                                    </span>
                                  ))}
                              </div>
                              <span>
                                {Object.values(review.reactions ?? {}).reduce((total, count) => total + count, 0) || "Chưa có cảm xúc"}
                              </span>
                            </div>

                            <div className="flex items-center">
                              {(() => {
                                const selectedReaction = REVIEW_REACTIONS.find(
                                  ({ type }) => type === review.currentUserReaction
                                );
                                const SelectedIcon = selectedReaction?.icon ?? ThumbsUp;

                                return (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleReviewReaction(
                                        review._id,
                                        review.currentUserReaction ?? "like"
                                      )
                                    }
                                    disabled={reactingReviewId === review._id}
                                    aria-pressed={Boolean(review.currentUserReaction)}
                                    className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-wait disabled:opacity-60 ${
                                      selectedReaction?.colorClass ?? "text-slate-500"
                                    }`}
                                  >
                                    <SelectedIcon
                                      className={`h-5 w-5 ${
                                        review.currentUserReaction === "love" ? "fill-current" : ""
                                      }`}
                                    />
                                    {selectedReaction?.label ?? "Thích"}
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Nút Xem thêm đánh giá */}
                  {!loadingReviews && reviews.length > 0 && reviews.length < reviewTotal && (
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={handleLoadMoreReviews}
                        disabled={loadingMoreReviews}
                        className="flex items-center gap-2 px-8 py-3 rounded-2xl border-2 border-orange-200 text-orange-600 font-bold text-sm hover:bg-orange-50 hover:border-orange-400 active:scale-95 transition-all disabled:opacity-60"
                      >
                        {loadingMoreReviews ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : null}
                        {loadingMoreReviews
                          ? "Đang tải..."
                          : `Xem thêm ${Math.min(REVIEW_LIMIT, reviewTotal - reviews.length)} đánh giá (còn ${reviewTotal - reviews.length})`}
                      </button>
                    </div>
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
                      price={suggestedItem.campaignPrice ?? suggestedItem.price}
                      originalPrice={suggestedItem.campaignPrice != null ? suggestedItem.price : undefined}
                      rating={suggestedItem.rating}
                      restaurant={suggestedItem.restaurant}
                      time={suggestedItem.time}
                      healthStatus={getProductHealthStatus(suggestedItem)}
                      allergenInfo={getProductAllergenInfo(suggestedItem)}
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

