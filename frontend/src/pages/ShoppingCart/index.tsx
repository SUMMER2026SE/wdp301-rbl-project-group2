import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { MOCK_UPSELL_ITEMS } from "@/constants/mockOrders";
import { useEffect } from "react";
import { itemKey } from "@/store/cartStore";
import { buildVariantChips } from "@/utils/cartVariants";
import { TicketVoucher } from "@/components/shared/TicketVoucher";
import voucherAPI from "@/services/voucher.service";
import type { Voucher } from "@/types/voucher";
import { useState, useMemo } from "react";
import { Ticket, X, Plus, ShoppingCart as CartIcon, Loader2 } from "lucide-react";
import productAPI from "@/services/product.service";
import type { Product } from "@/types/product";
import { useToast } from "@/hooks/useToast";

const ShoppingCartPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["customer", "common"]);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // ─── Real state from Zustand Store ───

  const {
    items: cartItems,
    totalPrice,
    updateQuantity,
    removeItem,
    addItem,
    orderNote,
    setOrderNote,
    toggleSelectItem,
    toggleSelectAll,
    clearCart,
  } = useCart();

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [upsellProducts, setUpsellProducts] = useState<Product[]>([]);
  const [loadingUpsell, setLoadingUpsell] = useState(true);

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const res = await voucherAPI.getVouchers({ isActive: true });
        setVouchers(res.data);
      } catch (err) {
        console.error("Error fetching vouchers:", err);
      } finally {
        setLoadingVouchers(false);
      }
    };
    fetchVouchers();
  }, []);

  useEffect(() => {
    const fetchUpsellProducts = async () => {
      try {
        const res = await productAPI.getProducts({
          category: "Gọi Thêm Ăn Kèm",
          limit: 4,
          isAvailable: true
        });
        setUpsellProducts(res.data);
      } catch (err) {
        console.error("Error fetching upsell products:", err);
      } finally {
        setLoadingUpsell(false);
      }
    };
    fetchUpsellProducts();
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplying(true);
    setCouponError("");
    try {
      const res = await voucherAPI.getVoucherByCode(couponCode.trim());
      if (res.data) {
        if (!res.data.isActive) {
            setCouponError("Mã giảm giá này đã hết hiệu lực");
            return;
        }
        if (totalPrice < res.data.minOrderValue) {
            setCouponError(`Đơn hàng chưa đạt mức tối thiểu ${res.data.minOrderValue.toLocaleString()}đ`);
            return;
        }
        setAppliedVoucher(res.data);
        setCouponCode("");
      } else {
        setCouponError("Mã giảm giá không chính xác");
      }
    } catch (err) {
      setCouponError("Mã giảm giá không tồn tại hoặc đã hết hạn");
    } finally {
      setIsApplying(false);
    }
  };

  const subtotal = totalPrice;
  
  const discountAmount = useMemo(() => {
    if (!appliedVoucher) return 0;
    
    if (appliedVoucher.discountType === 'fixed_amount') {
        return appliedVoucher.discountValue;
    }
    if (appliedVoucher.discountType === 'percentage') {
        const amount = (subtotal * appliedVoucher.discountValue) / 100;
        return appliedVoucher.maxDiscount 
            ? Math.min(amount, appliedVoucher.maxDiscount)
            : amount;
    }
    return 0;
  }, [appliedVoucher, subtotal]);

  const deliveryFee = subtotal > 300000 || subtotal === 0 ? 0 : 50000;
  const total = Math.max(0, subtotal + deliveryFee - discountAmount);

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
                        <p className="text-lg font-bold text-text-main dark:text-white">
                          {(item.price * item.quantity).toLocaleString("vi-VN")}
                          đ
                        </p>
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

                {/* Voucher Selection Section */}
                <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-100 dark:border-white/10 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                            <Ticket className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ưu đãi của bạn</h3>
                            <p className="text-xs text-slate-500">Chọn hoặc nhập mã giảm giá</p>
                        </div>
                    </div>

                    {appliedVoucher ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-xs uppercase">
                                    OK
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-emerald-900">{appliedVoucher.code}</p>
                                    <p className="text-[10px] text-emerald-700">Đã áp dụng giảm {appliedVoucher.discountValue.toLocaleString()}đ</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setAppliedVoucher(null)}
                                className="text-emerald-900 hover:bg-emerald-100 p-1 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {loadingVouchers ? (
                                <div className="flex items-center justify-center py-4">
                                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : vouchers.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {vouchers.slice(0, 2).map((v) => (
                                        <TicketVoucher
                                            key={v._id}
                                            code={v.code}
                                            title={v.title}
                                            discountValue={v.discountType === 'fixed_amount' ? `${v.discountValue / 1000}k` : `${v.discountValue}%`}
                                            minOrder={`từ ${v.minOrderValue?.toLocaleString() || '0'}đ`}
                                            expiryDate={v.endAt ? new Date(v.endAt).toLocaleDateString() : 'Không thời hạn'}
                                            onUse={() => {
                                                if (totalPrice < v.minOrderValue) {
                                                    setCouponError(`Mã này yêu cầu đơn hàng từ ${v.minOrderValue.toLocaleString()}đ. Bạn cần mua thêm ${(v.minOrderValue - totalPrice).toLocaleString()}đ nữa.`);
                                                    return;
                                                }
                                                setAppliedVoucher(v);
                                                setCouponCode(v.code);
                                                setCouponError(""); 
                                            }}
                                            className="h-full"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-center text-slate-400 py-4 italic">Không có mã giảm giá khả dụng</p>
                            )}
                        </div>
                    )}
                </div>

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
                {/* Manual Coupon Input Box */}
                <div className="bg-white dark:bg-white/5 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                        <Ticket className="w-4 h-4 text-[#9a734c]" />
                        <span className="text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">Mã giảm giá</span>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Nhập mã ưu đãi..."
                            className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all dark:text-white"
                        />
                        <button 
                            onClick={handleApplyCoupon}
                            disabled={!couponCode.trim() || isApplying}
                            className="bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-orange-700 shadow-md shadow-orange-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Áp dụng"}
                        </button>
                    </div>
                    {couponError && <p className="text-[10px] text-red-500 mt-2 font-medium">{couponError}</p>}
                </div>

                {/* Price Breakdown */}
                <div className="bg-white dark:bg-white/5 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/10">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center text-[#9a734c]">
                      <span className="text-sm">{t("customer:cart.subtotal")}</span>
                      <span className="text-sm font-medium">
                        {subtotal.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[#9a734c]">
                      <span className="text-sm">{t("customer:cart.deliveryFee")}</span>
                      <span className="text-sm font-medium text-green-600">
                        {deliveryFee === 0
                          ? t("common:status.free", "Miễn phí")
                          : `${deliveryFee.toLocaleString("vi-VN")}đ`}
                      </span>
                    </div>
                    {discountAmount > 0 && (
                        <div className="flex justify-between items-center text-emerald-600">
                            <span className="text-sm">Giảm giá voucher</span>
                            <span className="text-sm font-medium">
                                -{discountAmount.toLocaleString("vi-VN")}đ
                            </span>
                        </div>
                    )}
                    <hr className="border-gray-100 dark:border-white/10 my-2" />
                    <div className="flex justify-between items-center text-text-main dark:text-white">
                      <span className="text-lg font-bold">
                        {t("customer:cart.grandTotal")}
                      </span>
                      <span className="text-2xl font-black text-primary">
                        {total.toLocaleString("vi-VN")}đ
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
                    className="bg-white dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10 group hover:border-orange-500 transition-all shadow-sm hover:shadow-md"
                  >
                    <div
                      className="bg-center bg-no-repeat aspect-video bg-cover rounded-lg mb-3"
                      style={{ backgroundImage: `url("${imageUrl}")` }}
                    ></div>
                    <p className="font-bold text-sm truncate text-text-main dark:text-white">
                      {item.name}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-orange-600 font-bold text-sm">
                        {item.price.toLocaleString("vi-VN")}đ
                      </span>
                      <button
                        onClick={() => {
                          addItem({
                            productId: item._id,
                            name: item.name,
                            image: imageUrl,
                            price: item.price,
                            quantity: 1,
                          });
                          toast(t('customer:foodCard.addToCart', 'Đã thêm vào giỏ hàng!'), 'success');
                        }}
                        className="bg-orange-50 dark:bg-white/5 p-1.5 rounded-lg text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-sm active:scale-90"
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
