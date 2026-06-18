import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TrendingUp, ArrowRight, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import productAPI from "@/services/product.service";
import type { Product } from "@/types/product";
import { FoodCard } from "@/components/shared/FoodCard";
import { useSafeCart } from "@/hooks/useSafeCart";
import { useStoreStore } from "@/store/storeStore";
import { showAddToCartFeedback } from "@/utils/flyToCart";

// ── Skeleton ─────────────────────────────────────────────
const BestSellerSkeleton = () => (
  <div className="bg-white rounded-[2rem] border border-gray-100 p-3 animate-pulse">
    <div className="aspect-4/3 rounded-[1.5rem] bg-gray-200 mb-4" />
    <div className="px-2 pb-2 space-y-2">
      <div className="h-5 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-100 rounded w-1/2" />
      <div className="h-10 bg-gray-100 rounded-xl mt-3" />
    </div>
  </div>
);

// ── Main ─────────────────────────────────────────────────
const BestSellerSection = () => {
  const { t } = useTranslation(["customer", "common"]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { safeAddItem } = useSafeCart();
  const selectedStore = useStoreStore((s) => s.selectedStore);

  useEffect(() => {
    let cancelled = false;
    const fetchBestSellers = async () => {
      try {
        const res = await productAPI.getProducts({
          sort: "rating",
          limit: 4,
          page: 1,
          isAvailable: true,
          ...(selectedStore?._id ? { storeId: selectedStore._id } : {}),
        });
        if (!cancelled) setProducts(res.data.slice(0, 4));
      } catch (err) {
        console.error("BestSellerSection fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchBestSellers();
    return () => {
      cancelled = true;
    };
  }, [selectedStore?._id]);

  return (
    <section className="my-16">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20">
             <TrendingUp className="text-white w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">
              {t("customer:home.trending")}
            </h2>
            <p className="text-slate-500 font-medium text-sm">Những món được săn đón nhất</p>
          </div>
        </div>
        <Link
          to="/menu"
          className="group flex items-center gap-2 px-6 py-2.5 bg-orange-50 text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-600 hover:text-white transition-all"
        >
          {t("common:actions.viewAll")} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <BestSellerSkeleton key={i} />
            ))
          : products.map((dish) => (
              <FoodCard
                  key={dish._id}
                  id={dish._id}
                  name={dish.name}
                  image={typeof dish.image === 'object' && dish.image?.secureUrl ? dish.image.secureUrl : (typeof dish.image === 'string' ? dish.image : '')}
                  price={dish.campaignPrice ?? dish.price}
                  originalPrice={dish.campaignPrice != null ? dish.price : undefined}
                  rating={dish.rating}
                  restaurant={dish.restaurant}
                  time={dish.time}
                  customBadge={{
                      text: 'Trending',
                      icon: <Flame className="w-3 h-3" />,
                      className: 'bg-orange-600 text-white'
                  }}
                  onAddToCart={(_, trigger) => {
                      const image = typeof dish.image === 'object' && dish.image?.secureUrl ? dish.image.secureUrl : (typeof dish.image === 'string' ? dish.image : '');
                      safeAddItem(
                          dish,
                          {
                              productId: dish._id,
                              name: dish.name,
                              image,
                              price: dish.campaignPrice ?? dish.price,
                              quantity: 1
                          },
                          () => {
                              showAddToCartFeedback(
                                  trigger,
                                  image,
                                  t('customer:foodCard.addedToCart', 'Đã thêm sản phẩm vào giỏ hàng!'),
                              );
                          }
                      );
                  }}
              />
            ))}
      </div>
    </section>
  );
};

export default BestSellerSection;
