import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  X,
  Star,
  Loader2,
  ChevronDown,
  SearchX,
  LayoutGrid,
  Filter
} from "lucide-react";
import productAPI from "@/services/product.service";
import useDebounce from "@/hooks/useDebounce";
import type { Product } from "@/types/product";
import { CUSTOMER_CATEGORY_FILTERS } from "@/constants/product.constants";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { Plus, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { checkProductAllergies } from "@/hooks/useAllergyCheck";
import { FoodCard } from "@/components/shared/FoodCard";

const FoodCardSkeleton = () => (
  <div className="bg-white rounded-[2rem] border border-slate-100 p-3 shadow-sm animate-pulse">
    <div className="aspect-[4/3] rounded-[1.5rem] bg-slate-200 mb-4" />
    <div className="px-2 pb-2 space-y-3">
      <div className="h-5 bg-slate-200 rounded w-3/4" />
      <div className="h-4 bg-slate-100 rounded w-1/2" />
      <div className="flex justify-between items-end mt-4 pt-2">
        <div className="h-6 bg-slate-200 rounded w-1/3" />
        <div className="h-10 w-24 bg-slate-200 rounded-full" />
      </div>
    </div>
  </div>
);

// ─── Main Component ───

const MenuPage = () => {
  const { t } = useTranslation(["customer", "common"]);
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCart();

  // ── State ──
  const categoryParam = searchParams.get("category") || "all";
  const searchParam = searchParams.get("search") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [sortBy, setSortBy] = useState("popular");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const LIMIT = 9;
  const debouncedSearch = useDebounce(searchQuery, 400);

  // ── Fetch ──
  const fetchProducts = useCallback(
    async (currentPage: number, append: boolean = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const filters: Record<string, any> = {
          page: currentPage,
          limit: LIMIT,
          sort: sortBy,
          isAvailable: true,
        };

        if (activeCategory !== "all") filters.category = activeCategory;
        if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
        if (minRating) filters.minRating = minRating;

        const response = await productAPI.getProducts(filters);

        setProducts((prev) =>
          append ? [...prev, ...response.data] : response.data,
        );
        setTotalItems(response.pagination.total);
        setHasMore(currentPage < response.pagination.totalPages);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeCategory, debouncedSearch, sortBy, minRating],
  );

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await productAPI.getCategories();
        if (response.success) {
          const fetchedCats = response.data.map((cat: string) => ({ id: cat, label: cat }));
          setCategories([{ id: "all", label: t("customer:menu.allCategories", "Tất cả") }, ...fetchedCats]);
        }
      } catch (error) {
        setCategories(CUSTOMER_CATEGORY_FILTERS as any);
      }
    };
    fetchCategories();
  }, [t]);

  // Sync searchQuery from URL params (when user searches from header)
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    if (urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
      // Khi user search mới từ header, tự động reset category về "Tất cả"
      if (urlSearch && activeCategory !== "all") {
        setActiveCategory("all");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, activeCategory, searchQuery]);

  useEffect(() => {
    setPage(1);
    fetchProducts(1, false);
  }, [activeCategory, debouncedSearch, sortBy, minRating, fetchProducts]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage, true);
  };

  const clearFilters = () => {
    setActiveCategory("all");
    setSearchQuery("");
    setSortBy("popular");
    setMinRating(null);
    // Also clear URL search params
    setSearchParams({}, { replace: true });
  };

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    // Khi chọn category mới, xóa search text để không bị đè 2 bộ lọc
    if (searchQuery) {
      setSearchQuery("");
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("search");
      setSearchParams(newParams, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Sticky Category Header (Mobile only) */}
      <div className="lg:hidden sticky top-[60px] z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
        {/* Horizontal Scroll Categories for Mobile */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mask-fade-edges-right pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95 border ${activeCategory === cat.id
                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">

          {/* ── SIDEBAR (Chỉ hiện trên Desktop) ── */}
          <aside className="hidden lg:block w-72 shrink-0 space-y-6 sticky top-[100px] h-fit">


            {/* Categories */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <h3 className="font-black text-lg text-slate-900 tracking-tight">
                  Danh mục món
                </h3>
              </div>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`relative w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 overflow-hidden group
                      ${activeCategory === cat.id
                        ? "bg-orange-50 text-orange-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                  >
                    {activeCategory === cat.id && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-orange-500" />
                    )}
                    <span className={`relative block pl-2 transition-transform ${activeCategory === cat.id ? "translate-x-1" : "group-hover:translate-x-1"}`}>
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rating Filter */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
                  <Filter className="w-5 h-5" />
                </div>
                <h3 className="font-black text-lg text-slate-900 tracking-tight">Đánh giá</h3>
              </div>
              <div className="space-y-2">
                {[5, 4, 3].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setMinRating(minRating === rating ? null : rating)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-colors font-bold border
                      ${minRating === rating ? "bg-yellow-50 border-yellow-200 text-yellow-700 shadow-sm" : "bg-transparent border-transparent hover:bg-slate-50 text-slate-600"}`}
                  >
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-slate-100"}`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] uppercase tracking-wider opacity-70">Trở lên</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main className="flex-1 min-w-0">



            {/* Active filters chips (Dành cho cả Desktop & Mobile) */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {categories.find((c) => c.id === activeCategory)?.label || "Tất cả món ăn"}
                </h1>
                {!loading && (
                  <p className="text-slate-500 text-sm mt-1 font-medium">
                    {totalItems > 0 ? `Tìm thấy ${totalItems} món ngon` : "Không tìm thấy món nào"}
                  </p>
                )}
              </div>

              {(activeCategory !== "all" || searchQuery || sortBy !== "popular" || minRating !== null) && (
                <div className="flex flex-wrap items-center gap-2">
                  {activeCategory !== "all" && (
                    <span className="inline-flex items-center gap-1 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm">
                      {categories.find((c) => c.id === activeCategory)?.label}
                      <button onClick={() => setActiveCategory("all")} className="ml-1 hover:text-orange-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm">
                      "{searchQuery}"
                      <button onClick={() => setSearchQuery("")} className="ml-1 hover:text-orange-900">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                  {minRating !== null && (
                    <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm">
                      <Star className="w-3 h-3 fill-yellow-600 text-yellow-600" /> {minRating}+
                    </span>
                  )}
                  <button onClick={clearFilters} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 hover:text-slate-700 hover:border-slate-300 transition-all active:scale-95 shadow-sm ml-2">
                    <X className="w-3.5 h-3.5" />
                    Xóa lọc
                  </button>
                </div>
              )}
            </div>

            {/* Loading Skeleton */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <FoodCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Food Grid */}
            {!loading && products.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((item) => (
                  <FoodCard
                    key={item._id}
                    id={item._id}
                    name={item.name}
                    image={typeof item.image === 'object' && item.image?.secureUrl ? item.image.secureUrl : (typeof item.image === 'string' ? item.image : '')}
                    price={item.price}
                    rating={item.rating}
                    restaurant={item.restaurant}
                    time={item.time}
                    onAddToCart={() => {
                      addItem({
                        productId: item._id,
                        name: item.name,
                        image: typeof item.image === 'object' && item.image?.secureUrl ? item.image.secureUrl : (typeof item.image === 'string' ? item.image : ''),
                        price: item.price,
                        quantity: 1
                      });
                    }}
                  />
                ))}
              </div>
            )}

            {/* Load More */}
            {!loading && hasMore && (
              <div className="flex justify-center mt-12">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="h-12 px-8 rounded-full bg-white border-2 border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang tải thêm...
                    </>
                  ) : (
                    <>
                      Xem thêm món ngon
                      <ChevronDown className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!loading && products.length === 0 && (
              <div className="text-center py-24 bg-white rounded-[2rem] border border-slate-200 shadow-sm mt-4">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <SearchX className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  {t("customer:menu.noResults", "Không tìm thấy món ăn")}
                </h3>
                <p className="text-slate-500 mt-2 max-w-sm mx-auto font-medium">
                  Rất tiếc, không có món ăn nào phù hợp với bộ lọc hiện tại. Thử tìm với từ khóa khác nhé!
                </p>
                <Button
                  onClick={clearFilters}
                  className="mt-6 bg-orange-600 hover:bg-orange-700 text-white rounded-xl px-8 h-11 font-bold shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
                >
                  Xóa bộ lọc ngay
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default MenuPage;
