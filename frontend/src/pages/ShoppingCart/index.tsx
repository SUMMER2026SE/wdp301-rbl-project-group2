import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSafeCart } from "@/hooks/useSafeCart";
import { useAuth } from "@/hooks/useAuth";
import { MOCK_UPSELL_ITEMS } from "@/constants/mockOrders";
import { useEffect } from "react";
import { itemKey, useCartStore } from "@/store/cartStore";
import { buildVariantChips } from "@/utils/cartVariants";
import campaignAPI from "@/services/campaign.service";
import { useState } from "react";
import { Plus } from "lucide-react";
import productAPI from "@/services/product.service";
import type { Product } from "@/types/product";
import { useToast } from "@/hooks/useToast";
import { showAddToCartFeedback } from "@/utils/flyToCart";
import { useStoreStore } from "@/store/storeStore";

const ShoppingCartPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["customer", "common"]);
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  // ─── Real state from Zustand Store ───

  const {
    items: cartItems,
    totalPrice,
    updateQuantity,
    removeItem,
    safeAddItem,
    orderNote,
    setOrderNote,
    toggleSelectItem,
    toggleSelectAll,
    clearCart,
  } = useSafeCart();

  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [upsellProducts, setUpsellProducts] = useState<Product[]>([]);
  const [loadingUpsell, setLoadingUpsell] = useState(true);
  const selectedStore = useStoreStore((s) => s.selectedStore);
  const [originalPrices, setOriginalPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchUpsellProducts = async () => {
      try {
        const res = await productAPI.getProducts({
          category: "Gọi Thêm Ăn Kèm",
          limit: 4,
          isAvailable: true,
          ...(selectedStore?._id ? { storeId: selectedStore._id } : {}),
        });
        setUpsellProducts(res.data);
      } catch (err) {
        console.error("Error fetching upsell products:", err);
      } finally {
        setLoadingUpsell(false);
      }
    };
    fetchUpsellProducts();
  }, [selectedStore?._id]);

  // Sync cart item prices with active approved campaigns on load or change
  useEffect(() => {
    const syncPrices = async () => {
      if (cartItems.length === 0) return;
      try {
        const [productsRes, campaignsRes] = await Promise.all([
          Promise.all(
            cartItems.map((item) =>
              productAPI.getProductById(item.productId).catch(() => null)
            )
          ),
          campaignAPI.getCampaigns().catch(() => ({ data: [] })),
        ]);

        const now = new Date();
        const activeCampaigns = (campaignsRes.data || []).filter(
          (c) =>
            c.status === "approved" &&
            new Date(c.startTime) <= now &&
            new Date(c.endTime) >= now
        );

        const campaignRuleMap: Record<string, { fixedPrice?: number | null; discount?: number | null }> = {};
        for (const camp of activeCampaigns) {
          for (const prod of camp.products) {
            const pId = typeof prod.productId === "string" ? prod.productId : (prod.productId as any)._id;
            campaignRuleMap[pId] = prod;
          }
        }

        const priceMap: Record<string, number> = {};
        const origPriceMap: Record<string, number> = {};
        productsRes.forEach((res) => {
          if (!res || !res.success || !res.data) return;
          const product = res.data;
          let price = product.price;
          origPriceMap[product._id] = product.price;

          const rule = campaignRuleMap[product._id];
          if (rule) {
            if (rule.fixedPrice !== null && rule.fixedPrice !== undefined) {
              price = rule.fixedPrice;
            } else if (rule.discount !== null && rule.discount !== undefined) {
              price = product.price * (1 - rule.discount / 100);
            }
          }
          priceMap[product._id] = price;
        });

        setOriginalPrices(origPriceMap);
        useCartStore.getState().updateItemPrices(priceMap);
      } catch (err) {
        console.error("Failed to sync cart prices with active campaigns:", err);
      }
    };
    syncPrices();
  }, [cartItems.length]);

  // Mock upsell items (vẫn giữ để UI đẹp)
  const upsellItems = MOCK_UPSELL_ITEMS;

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-background-light font-display min-h-screen">
      <main className="max-w-[1440px] mx-auto px-4 md:px-10 lg:px-20 py-8">
        {/* Breadcrumbs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            to="/"
            className="text-[#9a734c] text-sm font-medium leading-normal hover:text-primary transition-colors"
          >
            {t("common:nav.home")}
          </Link>
          <span className="text-[#9a734c] text-sm font-medium leading-normal">
            /
          </span>
          <span className="text-text-main dark:text-white text-sm font-medium leading-normal">
            {t("customer:cart.title")}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column: Cart Items */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Page Heading */}
            <div className="flex flex-col gap-1 mb-2">
              <h1 className="text-3xl md:text-4xl font-extrabold text-text-main dark:text-white leading-tight">
                {t("customer:cart.title")}
              </h1>
            </div>

            {/* List Items */}
            <div className="flex flex-col gap-2 bg-white dark:bg-white/5 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/10">
              {cartItems.length > 0 && (
                <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={cartItems.every((i) => i.selected !== false)}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 accent-orange-600 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="text-sm font-bold text-text-main dark:text-white">
                      Chọn tất cả ({cartItems.length} món)
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {cartItems.some((i) => i.selected === false) && (
                      <button 
                        onClick={() => toggleSelectAll(true)}
                        className="text-xs text-orange-600 font-bold hover:underline"
                      >
                        Chọn lại tất cả
                      </button>
                    )}
                    <button 
                      onClick={() => setShowClearCartModal(true)}
                      className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">delete_sweep</span>
                      Xóa tất cả
                    </button>
                  </div>
                </div>
              )}
              {cartItems.length === 0 ? (
                <div className="text-center py-20 px-4">
                  <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
                    shopping_cart_off
                  </span>
                  <p className="text-xl font-bold text-gray-500 mb-4">
                    {t("customer:cart.empty")}
                  </p>
                  <Link
                    to="/menu"
                    className="inline-block px-8 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all active:scale-95"
                  >
                    {t("customer:cart.browsMenu")}
                  </Link>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={itemKey(item)}
                    onClick={() => toggleSelectItem(itemKey(item))}
                    className="flex flex-col sm:flex-row gap-4 px-6 py-6 border-b border-gray-100 dark:border-white/10 last:border-b-0 hover:bg-gray-50/30 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={item.selected !== false}
                        onChange={() => toggleSelectItem(itemKey(item))}
                        className="w-5 h-5 rounded border-gray-300 accent-orange-600 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                    </div>
                    <div
                      className="bg-center bg-no-repeat aspect-video bg-cover rounded-lg h-[100px] w-full sm:w-[160px] shrink-0 bg-gray-100"
                      style={{ backgroundImage: `url("${item.image}")` }}
                    />
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold text-text-main dark:text-white line-clamp-1">
                            {item.name}
                          </h3>
                          <p className="text-[#9a734c] text-sm mt-1">
                            {item.size || "Standard"}
                          </p>

                          {(() => {
                            const chips = buildVariantChips(
                              (item as any).variations,
                            );
                            if (!chips.length) return null;

                            return (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {chips.map((c) => (
                                  <span
                                    key={c.key}
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-gray-100 dark:bg-white/10 text-text-main dark:text-white text-xs font-semibold"
                                    title={
                                      c.extra > 0
                                        ? `+${c.extra.toLocaleString("vi-VN")}đ`
                                        : undefined
                                    }
                                  >
                                    {c.text}
                                    {c.extra > 0 && (
                                      <span className="text-[#9a734c] font-bold">
                                        +{c.extra.toLocaleString("vi-VN")}đ
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-text-main dark:text-white">
                            {(item.price * item.quantity).toLocaleString("vi-VN")}đ
                          </p>
                          {originalPrices[item.productId] !== undefined &&
                            originalPrices[item.productId] > item.price && (
                              <p className="text-xs text-gray-400 dark:text-slate-400/70 line-through font-medium">
                                {(originalPrices[item.productId] * item.quantity).toLocaleString("vi-VN")}đ
                              </p>
                            )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 sm:mt-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(itemKey(item));
                          }}
                          className="text-red-500 text-sm font-medium flex items-center gap-1 hover:underline"
                        >
                          <span className="material-symbols-outlined text-lg">
                            delete
                          </span>
                          {t("common:actions.delete")}
                        </button>
                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => updateQuantity(itemKey(item), item.quantity - 1)}
                            className="text-base font-bold flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-orange-500/20 transition-colors"
                          >
                            -
                          </button>
                          <span className="text-base font-bold w-8 text-center bg-transparent dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(itemKey(item), item.quantity + 1)}
                            className="text-base font-bold flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-orange-500/20 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Special Instructions & Add More */}
            {cartItems.length > 0 && (
              <div className="flex flex-col gap-6">
                <Link
                  to="/menu"
                  className="inline-flex items-center gap-2 text-orange-600 font-bold hover:gap-3 transition-all mb-2"
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  {t("customer:cart.continueShopping", "Thêm món khác")}
                </Link>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-text-main dark:text-white">
                    {t("customer:checkout.orderNote")}
                  </label>
                  <textarea
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-sm focus:ring-orange-500 focus:border-orange-500 transition-all dark:text-white"
                    placeholder={t(
                      "customer:checkout.orderNotePlaceholder",
                      "Lời nhắn cho nhà hàng...",
                    )}
                    rows={3}
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-[#9a734c]">
                      {orderNote.length}/500
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary */}
          {cartItems.length > 0 && (
            <div className="flex flex-col gap-6">
              <div className="sticky top-32 flex flex-col gap-6">
                {/* Price Breakdown */}
                <div className="bg-white dark:bg-white/5 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/10">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center text-text-main dark:text-white">
                      <span className="text-lg font-bold">
                        Tổng cộng
                      </span>
                      <span className="text-2xl font-black text-primary">
                        {totalPrice.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        toast(t("customer:cart.loginToCheckout", "Vui lòng đăng nhập để thanh toán"), "warning");
                        setTimeout(() => {
                          navigate("/login", { state: { from: { pathname: "/checkout" } } });
                        }, 2000);
                        return;
                      }
                      navigate("/checkout");
                    }}
                    disabled={totalPrice === 0}
                    className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold text-lg mt-8 hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                  >
                    {t("customer:cart.checkout", "Tiến hành thanh toán")}
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>

                  <p className="text-center text-[10px] text-[#9a734c] mt-4 uppercase tracking-widest font-bold">
                    Thanh toán bảo mật qua cổng kết nối an toàn
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upsell / People also ordered */}
        <div className="mt-16">
          <h3 className="text-text-main dark:text-white text-xl font-bold mb-6">
            {t("customer:cart.youMayLike", "Có thể bạn sẽ thích")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {loadingUpsell ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10 animate-pulse">
                  <div className="aspect-video bg-gray-200 dark:bg-white/10 rounded-lg mb-3" />
                  <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-3/4 mb-2" />
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/3" />
                    <div className="w-8 h-8 bg-gray-200 dark:bg-white/10 rounded-md" />
                  </div>
                </div>
              ))
            ) : upsellProducts.length > 0 ? (
              upsellProducts.map((item) => {
                const imageUrl = typeof item.image === 'object' && item.image?.secureUrl ? item.image.secureUrl : (typeof item.image === 'string' ? item.image : '');
                return (
                  <div
                    key={item._id}
                    onClick={() => navigate(`/food/${item._id}`)}
                    className="bg-white dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10 group hover:border-orange-500 transition-all shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <div
                      className="bg-center bg-no-repeat aspect-video bg-cover rounded-lg mb-3"
                      style={{ backgroundImage: `url("${imageUrl}")` }}
                    ></div>
                    <p className="font-bold text-sm truncate text-text-main dark:text-white">
                      {item.name}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex flex-col">
                        <span className="text-orange-600 font-bold text-sm">
                          {(item.campaignPrice ?? item.price).toLocaleString("vi-VN")}đ
                        </span>
                        {item.campaignPrice != null && (
                          <span className="text-xs text-gray-400 dark:text-slate-400/70 line-through">
                            {item.price.toLocaleString("vi-VN")}đ
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          safeAddItem(item, {
                            productId: item._id,
                            name: item.name,
                            image: imageUrl,
                            price: item.campaignPrice ?? item.price,
                            quantity: 1,
                          }, () => {
                          showAddToCartFeedback(
                            e.currentTarget,
                            imageUrl,
                            t('customer:foodCard.addedToCart', 'Đã thêm sản phẩm vào giỏ hàng!'),
                          );
                          });
                        }}
                        className="bg-orange-50 dark:bg-white/5 p-1.5 rounded-lg text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-sm active:scale-90 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 md:col-span-4 py-10 text-center text-slate-400 italic text-sm">
                Không có gợi ý món ăn thêm
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Custom Clear Cart Confirmation Modal */}
      {showClearCartModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={() => setShowClearCartModal(false)}
          />
          
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-sm w-full border border-slate-100 dark:border-slate-800 shadow-2xl relative z-10 text-center animate-in zoom-in-95 duration-200">
            {/* Warning Icon Container */}
            <div className="mx-auto size-16 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center mb-4 text-red-500 border border-red-100 dark:border-red-900/30">
              <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                warning
              </span>
            </div>
            
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">
              Xóa toàn bộ giỏ hàng?
            </h3>
            
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">
              Hành động này sẽ loại bỏ tất cả các món ăn bạn đã chọn ra khỏi giỏ hàng. Bạn không thể hoàn tác thao tác này.
            </p>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowClearCartModal(false)}
                className="flex-1 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                Hủy bỏ
              </button>
              
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  setShowClearCartModal(false);
                  toast("Đã xóa sạch giỏ hàng!", "success");
                }}
                className="flex-1 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingCartPage;
