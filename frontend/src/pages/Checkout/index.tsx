import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCheckout } from "@/hooks/useCheckout";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/hooks/useToast";
import { calculateShippingFee } from "@/utils/shipping";
import { AddressModal } from "@/components/shared/AddressModal";
import { userService } from "@/services/profile.service";
import { useAuthStore } from "@/store/authStore";
import type { AuthAddress } from "@/store/authStore";
import { sanitizeAddressesForApi } from "@/utils/address";
import { AllergyWarningDialog, scanCartForAllergies } from "@/components/shared/AllergyWarningDialog";
import productAPI from "@/services/product.service";
import { TicketVoucher } from "@/components/shared/TicketVoucher";
import paymentService from "@/services/payment.service";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["customer", "common"]);

  const {
    cartItems,
    addresses,
    effectiveAddress,
    setSelectedAddress,
    paymentMethod,
    setPaymentMethod,
    voucherState,
    setVoucherCode,
    applyVoucher,
    removeVoucher,
    subtotal,
    discount,
    deliveryFee,
    total,
    isDeliverable,
    shippingResult,
    settings,
    selectedStore,
    isSubmitting,
    handlePlaceOrder,
    vouchers,
    orderPlacedRef,
    isHydrating,
  } = useCheckout();

  const [isVouchersOpen, setIsVouchersOpen] = useState(false);

  const { toasts, dismiss, toast } = useToast();

  // PayOS limit check: If total drops below 2,000 VND and paymentMethod is "bank_transfer", fallback to "cash"
  useEffect(() => {
    if (total < 2000 && paymentMethod === "bank_transfer") {
      setPaymentMethod("cash");
      toast("Chuyển khoản PayOS yêu cầu giao dịch từ 2.000đ trở lên. Đã chuyển sang COD.", "info");
    }
  }, [total, paymentMethod, setPaymentMethod, toast]);

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const userAllergies = user?.preferences?.allergies ?? [];
  const userDietary = user?.preferences?.dietary ?? [];
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [allergyConflicts, setAllergyConflicts] = useState<any[]>([]);
  const [showAllergyWarning, setShowAllergyWarning] = useState(false);

  // FSS-40: Intercept order placement to check for allergies first
  const handleCheckoutSubmit = async () => {
    if (userAllergies.length === 0 && userDietary.length === 0) {
      handlePlaceOrder();
      return;
    }

    try {
      // Cart items only have basic info. Fetch full product data for health tags.
      const fullProductsPromises = cartItems.map(item => productAPI.getProductById(item.productId));
      const responses = await Promise.all(fullProductsPromises);

      const itemsToScan = responses.map((res, index) => ({
        product: res.data,
        quantity: cartItems[index].quantity
      }));

      const conflicts = scanCartForAllergies(itemsToScan, userAllergies, userDietary);
      if (conflicts.length > 0) {
        setAllergyConflicts(conflicts);
        setShowAllergyWarning(true);
      } else {
        handlePlaceOrder();
      }
    } catch (error) {
      console.error("Failed to check allergies", error);
      // Fallback: proceed with order if allergy check fails
      handlePlaceOrder();
    }
  };

  const handleConfirmAllergyWarning = () => {
    setShowAllergyWarning(false);
    handlePlaceOrder();
  };

  const handleSaveAddress = async (newAddr: AuthAddress) => {
    if (!user) return;
    const existing = user.addresses || [];
    let updated = [...existing, newAddr];

    // Normalize default
    if (newAddr.isDefault) {
      updated = updated.map((a, i) => ({
        ...a,
        isDefault: i === updated.length - 1,
      }));
    } else if (!updated.some((a) => a.isDefault) && updated.length > 0) {
      updated[0] = { ...updated[0], isDefault: true };
    }

    const res = await userService.updateMe({
      addresses: sanitizeAddressesForApi(updated),
    });
    const updatedUser = res.data?.data;
    if (updatedUser) {
      setUser({ ...user, addresses: (updatedUser as any).addresses ?? updated });
    }

    setIsAddressModalOpen(false);
    // Auto-select the newly added address
    setSelectedAddress(newAddr as any);
  };

  // PayOS cancel return: cancel created order (best-effort), then clean the URL
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const payos = sp.get("payos");
    const orderCodeRaw = sp.get("orderCode");

    if (payos !== "cancel" || !orderCodeRaw) return;

    const orderCode = Number(orderCodeRaw);
    if (Number.isNaN(orderCode)) return;

    paymentService
      .cancelPayosOrder(orderCode)
      .then(() => {
        // Don't spam toast if user refreshes; clean URL immediately
        navigate("/checkout", { replace: true });
      })
      .catch(() => {
        navigate("/checkout", { replace: true });
      });
  }, [navigate]);

  // Guard: redirect to menu if cart is empty.
  // Skip if:
  //  - still hydrating (Zustand hasn't loaded localStorage yet — avoids false redirect on F5)
  //  - submitting (order in progress)
  //  - order already placed successfully (orderPlacedRef stays true through finally-block reset)
  useEffect(() => {
    if (isHydrating) return;
    if (cartItems.length === 0 && !isSubmitting && !orderPlacedRef.current) {
      navigate("/menu", { replace: true });
    }
  }, [cartItems.length, isSubmitting, orderPlacedRef, navigate, isHydrating]);

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#1b140d] dark:text-white min-h-screen font-display">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="layout-container flex h-full grow flex-col">
        <main className="max-w-[1200px] mx-auto w-full px-6 py-8">
          {/* ── Progress ── */}
          <div className="w-full mb-8">
            <div className="flex flex-col gap-3">
              <div className="flex gap-6 justify-between items-end">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate("/cart")}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    aria-label="Quay lại giỏ hàng"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_back
                    </span>
                  </button>
                  <h1 className="text-[32px] font-bold leading-tight">
                    {t("customer:checkout.title")}
                  </h1>
                </div>
                <p className="text-sm font-normal leading-normal opacity-70">
                  Bước 2 trên 3 (66%)
                </p>
              </div>
              <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-600"
                  style={{ width: "66%" }}
                />
              </div>
            </div>
          </div>

          {/* ── Two Column Layout ── */}
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* ── LEFT COLUMN ── */}
            <div className="flex-1 flex flex-col gap-8 w-full">
              {/* Delivery Address */}
              <section className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="flex flex-wrap justify-between gap-3 p-6 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-600">
                      location_on
                    </span>
                    <p className="text-xl font-bold">
                      {t("customer:checkout.deliveryAddress")}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddressModalOpen(true)}
                    className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-9 px-4 bg-orange-600/10 text-orange-600 text-sm font-semibold hover:bg-orange-600/20 transition-all"
                  >
                    <span>{t("customer:checkout.addAddress")}</span>
                  </button>
                </div>

                <div className="p-6 flex flex-col gap-4">
                  {addresses.length === 0 ? (
                    <div className="text-center py-6">
                      <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">
                        location_off
                      </span>
                      <p className="text-gray-500 text-sm mb-3">
                        Bạn chưa có địa chỉ giao hàng.
                      </p>
                      <button
                        onClick={() => setIsAddressModalOpen(true)}
                        className="inline-flex items-center gap-1 text-sm text-orange-600 font-semibold hover:underline"
                      >
                        <span className="material-symbols-outlined text-base">
                          add
                        </span>
                        Thêm địa chỉ mới
                      </button>
                    </div>
                  ) : (
                    <>
                      {addresses.map((addr: any, idx: number) => {
                        const isSelected =
                          effectiveAddress?.detail === addr.detail &&
                          effectiveAddress?.receiverName === addr.receiverName;
                        // Compute fee badge for this address
                        const config = settings ? {
                          baseDeliveryFee: parseFloat(settings.baseDeliveryFee) || 15000,
                          feePerKm: parseFloat(settings.feePerKm) || 5000,
                          freeDeliveryEnabled: settings.freeDeliveryEnabled,
                          freeDeliveryThreshold: parseFloat(settings.freeDeliveryThreshold) || 300000,
                        } : undefined;
                        const addrFee = calculateShippingFee(addr.ward ?? "", addr.city ?? "", subtotal, selectedStore?.location?.coordinates, config);
                        const isAddrBlocked = addrFee.blocked;
                        return (
                          <label
                            key={idx}
                            className={`flex items-start gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all ${isAddrBlocked
                              ? "border-red-300 dark:border-red-800 opacity-80"
                              : isSelected
                                ? "border-orange-600 bg-orange-600/5"
                                : "border-gray-200 dark:border-gray-800 hover:border-orange-600/50"
                              }`}
                            onClick={() => !isAddrBlocked && setSelectedAddress(addr)}
                          >
                            <input
                              readOnly
                              className="h-5 w-5 mt-0.5 border-2 border-gray-300 text-orange-600 focus:ring-orange-600 focus:ring-offset-0 accent-orange-600"
                              name="address"
                              type="radio"
                              checked={isSelected && !isAddrBlocked}
                              disabled={isAddrBlocked}
                            />
                            <div className="flex grow flex-col gap-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold">
                                    {addr.label || "Địa chỉ"}
                                  </p>
                                  {addr.isDefault && (
                                    <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded-full uppercase">
                                      Mặc định
                                    </span>
                                  )}
                                </div>
                                {/* Fee badge */}
                                {isAddrBlocked ? (
                                  <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">block</span>
                                    Không giao được
                                  </span>
                                ) : addrFee.zone === "free" ? (
                                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                    🎁 MIỄN PHÍ
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold text-orange-600 bg-orange-600/10 px-2 py-0.5 rounded-full">
                                    Phí: {addrFee.fee.toLocaleString("vi-VN")}đ {addrFee.distance !== undefined && `(${addrFee.distance} km)`}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 dark:text-gray-400 text-sm">
                                {addr.receiverName} • {addr.phone}
                              </p>
                              <p className="text-gray-500 dark:text-gray-500 text-xs mt-0.5">
                                {addr.detail}, {addr.ward}, {addr.city}
                              </p>
                              {isAddrBlocked && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">info</span>
                                  Hiện chỉ giao trong khu vực Đà Nẵng (7 phường nội thành)
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                      {/* Out-of-zone warning banner */}
                      {effectiveAddress && !isDeliverable && (
                        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
                          <span className="material-symbols-outlined text-red-500 text-xl shrink-0">location_off</span>
                          <div>
                            <p className="text-sm font-bold text-red-700 dark:text-red-400">
                              Địa chỉ nằm ngoài vùng giao hàng
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                              {shippingResult.reason ?? "Hiện tại chỉ giao hàng trong khu vực Đà Nẵng"}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>

              {/* Payment Method */}
              <section className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-600">
                    payments
                  </span>
                  <p className="text-xl font-bold">
                    {t("customer:checkout.paymentMethod")}
                  </p>
                </div>

                <div className="p-6">
                  <div className="flex gap-4 mb-4">
                    {/* COD */}
                    <button
                      id="payment-cod"
                      onClick={() => setPaymentMethod("cash")}
                      className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl gap-2 transition-all ${paymentMethod === "cash"
                        ? "border-2 border-orange-600 bg-orange-600/5"
                        : "border border-gray-200 dark:border-gray-800 hover:border-orange-600/50"
                        }`}
                    >
                      <span className="material-symbols-outlined">
                        account_balance_wallet
                      </span>
                      <span className="text-sm font-bold">
                        {t("customer:checkout.cod")}
                      </span>
                    </button>

                    {/* Credit Card */}
                    <div className="flex-1 relative">
                        <button
                          id="payment-card"
                          disabled
                          className="w-full flex flex-col items-center justify-center p-4 rounded-xl gap-2 border border-gray-100 dark:border-gray-800 opacity-40 cursor-not-allowed grayscale"
                        >
                          <span className="material-symbols-outlined">
                            credit_card
                          </span>
                          <span className="text-sm font-bold">
                            {t("customer:checkout.cardPayment", "Thẻ tín dụng")}
                          </span>
                        </button>
                        <span className="absolute -top-2 -right-2 bg-slate-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm whitespace-nowrap">
                            Sắp ra mắt
                        </span>
                    </div>

                    {/* Bank Transfer (PayOS) */}
                    <div className="flex-1 relative">
                      <button
                        id="payment-bank"
                        disabled={total < 2000}
                        onClick={() => setPaymentMethod("bank_transfer")}
                        className={`w-full flex flex-col items-center justify-center p-4 rounded-xl gap-2 transition-all ${total < 2000
                          ? "border border-gray-100 dark:border-gray-800 opacity-40 cursor-not-allowed grayscale"
                          : paymentMethod === "bank_transfer"
                            ? "border-2 border-orange-600 bg-orange-600/5"
                            : "border border-gray-200 dark:border-gray-800 hover:border-orange-600/50"
                          }`}
                      >
                        <span className="material-symbols-outlined">
                          account_balance
                        </span>
                        <span className="text-sm font-bold">
                          Chuyển khoản (PayOS)
                        </span>
                      </button>
                      {total < 2000 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm whitespace-nowrap">
                          Min 2.000đ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* COD Info */}
                  {paymentMethod === "cash" && (
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">
                          info
                        </span>
                        <div>
                          <h4 className="font-bold text-amber-900 dark:text-amber-400 mb-1">
                            Thanh toán khi nhận hàng
                          </h4>
                          <p className="text-sm text-amber-800 dark:text-amber-500/80">
                            Vui lòng chuẩn bị số tiền{" "}
                            <strong>{total.toLocaleString("vi-VN")}đ</strong>{" "}
                            khi nhận hàng. Shipper sẽ thu tiền mặt và đưa hóa
                            đơn cho bạn.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PayOS Info */}
                  {paymentMethod === "bank_transfer" && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/30 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-2xl">
                          account_balance
                        </span>
                        <div>
                          <h4 className="font-bold text-indigo-900 dark:text-indigo-400 mb-1">
                            Chuyển khoản qua PayOS
                          </h4>
                          <p className="text-sm text-indigo-800 dark:text-indigo-500/80">
                            Bạn sẽ được chuyển hướng đến trang thanh toán an
                            toàn của PayOS để thực hiện chuyển khoản ngân hàng
                            hoặc quét QR.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card (placeholder — no real payment gateway) */}
                  {paymentMethod === "stripe" && (
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-blue-600 text-2xl">
                          info
                        </span>
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          Thanh toán thẻ sẽ được hỗ trợ trong phiên bản tới.
                          Hiện tại vui lòng chọn thanh toán khi nhận hàng hoặc
                          chuyển khoản.
                        </p>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "stripe" && (
                    <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 flex justify-center gap-6 opacity-60 mt-4 rounded-lg">
                      <span className="material-symbols-outlined text-2xl">
                        shield_lock
                      </span>
                      <p className="text-xs flex items-center gap-1 font-medium">
                        SECURE CHECKOUT SSL ENCRYPTED
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* ── RIGHT COLUMN — Order Summary (Sticky) ── */}
            <aside className="w-full lg:w-[380px] lg:sticky lg:top-24">
              <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-lg font-bold mb-4">
                    {t("customer:cart.grandTotal", "Tóm tắt đơn hàng")}
                  </h3>

                  {/* Item List */}
                  <div className="flex flex-col gap-3 mb-6 max-h-52 overflow-y-auto pr-1">
                    {cartItems.map((item) => (
                      <div
                        key={item.productId}
                        className="flex justify-between items-center gap-3"
                      >
                        <div className="flex gap-3 items-center min-w-0">
                          {item.image && (
                            <div
                              className="size-10 rounded-lg bg-gray-100 bg-cover bg-center shrink-0"
                              style={{
                                backgroundImage: `url('${item.image}')`,
                              }}
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">
                              {item.quantity}× {item.name}
                            </p>
                            {item.size && (
                              <p className="text-xs text-gray-500">
                                {item.size}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm font-bold shrink-0">
                          {(item.price * item.quantity).toLocaleString("vi-VN")}
                          đ
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Voucher Input */}
                  <div className="mb-5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      {t("customer:cart.voucherCode")}
                    </label>

                    {/* Vouchers Selection Section */}
                    <div className="mb-4">
                      <button
                        onClick={() => setIsVouchersOpen(!isVouchersOpen)}
                        className="flex items-center gap-2 font-bold text-text-main dark:text-white text-sm hover:text-orange-600 transition-colors mb-2"
                      >
                        Chọn khuyến mãi / Voucher
                        <span className="material-symbols-outlined transition-transform duration-200" style={{ transform: isVouchersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          expand_more
                        </span>
                      </button>

                      {isVouchersOpen && (
                        <div className="flex flex-col gap-3 mb-4 pr-1">
                          {vouchers.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">Không có voucher khả dụng</p>
                          ) : (
                            vouchers.map(v => (
                              <div key={v._id} onClick={() => {
                                if (v.minOrderValue && subtotal < v.minOrderValue) {
                                  toast(`Đơn hàng tối thiểu ${v.minOrderValue.toLocaleString("vi-VN")}đ để dùng voucher này`, "error");
                                  return;
                                }
                                setVoucherCode(v.code);
                                applyVoucher(v.code);
                              }} className="cursor-pointer">
                                <TicketVoucher
                                  code={v.code}
                                  title={v.title}
                                  discountValue={v.discountType === 'percentage' ? `${v.discountValue}%` : `${v.discountValue.toLocaleString("vi-VN")}đ`}
                                  minOrder={v.minOrderValue ? `${v.minOrderValue.toLocaleString("vi-VN")}đ` : "0đ"}
                                  // expiryDate={new Date(v.endAt).toLocaleDateString("vi-VN")}
                                  className={`${voucherState.appliedVoucher?._id === v._id ? "ring-2 ring-orange-600 scale-[1.02]" : "scale-100 opacity-90 hover:opacity-100"} shadow-sm transition-all origin-left pointer-events-none`}
                                />
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {voucherState.appliedVoucher ? (
                      /* Applied voucher badge */
                      <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-green-600 text-lg">
                            local_offer
                          </span>
                          <span className="text-sm font-bold text-green-700 dark:text-green-400">
                            {voucherState.appliedVoucher.code}
                          </span>
                        </div>
                        <button
                          onClick={removeVoucher}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">
                            close
                          </span>
                          Bỏ
                        </button>
                      </div>
                    ) : (
                      /* Voucher input */
                      <div className="flex gap-2">
                        <input
                          id="voucher-input"
                          value={voucherState.code}
                          onChange={(e) => setVoucherCode(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && applyVoucher()}
                          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-zinc-800 focus:border-orange-600 focus:ring-orange-600 text-sm uppercase font-bold px-3 py-2 outline-none"
                          placeholder={t("customer:cart.voucherCode")}
                          type="text"
                          maxLength={20}
                          disabled={voucherState.isValidating}
                        />
                        <button
                          id="apply-voucher-btn"
                          onClick={() => applyVoucher()}
                          disabled={
                            !voucherState.code.trim() ||
                            voucherState.isValidating
                          }
                          className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {voucherState.isValidating ? (
                            <span className="material-symbols-outlined animate-spin text-sm">
                              progress_activity
                            </span>
                          ) : (
                            t("customer:cart.applyVoucher")
                          )}
                        </button>
                      </div>
                    )}

                    {voucherState.error && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">
                          error
                        </span>
                        {voucherState.error}
                      </p>
                    )}
                  </div>

                  {/* Cost Breakdown */}
                  <div className="flex flex-col gap-2 border-t border-dashed border-gray-200 dark:border-gray-800 pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        {t("customer:cart.subtotal")}
                      </span>
                      <span>{subtotal.toLocaleString("vi-VN")}đ</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        {t("customer:cart.deliveryFee")}
                        {shippingResult?.distance !== undefined && (
                          <span className="text-xs text-muted-foreground font-medium">
                            ({shippingResult.distance} km)
                          </span>
                        )}
                      </span>
                      <span className="text-green-600">
                        {deliveryFee === 0
                          ? "MIỄN PHÍ"
                          : `${deliveryFee.toLocaleString("vi-VN")}đ`}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          Giảm giá (voucher)
                        </span>
                        <span className="text-red-500 font-semibold">
                          -{discount.toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold mt-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <span>{t("customer:cart.grandTotal")}</span>
                      <span className="text-orange-600">
                        {total.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="p-6">
                  <button
                    id="place-order-btn"
                    onClick={handleCheckoutSubmit}
                    disabled={
                      isSubmitting ||
                      cartItems.length === 0 ||
                      !effectiveAddress ||
                      !isDeliverable
                    }
                    className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-600/30 hover:shadow-orange-600/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-xl">
                          progress_activity
                        </span>
                        <span>{t("common:processing", "Đang xử lý...")}</span>
                      </>
                    ) : (
                      <>
                        <span>{t("customer:checkout.placeOrder")}</span>
                        <span className="material-symbols-outlined">
                          arrow_forward
                        </span>
                      </>
                    )}
                  </button>

                  {!effectiveAddress && (
                    <p className="text-xs text-center text-amber-600 mt-2 flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        warning
                      </span>
                      Vui lòng thêm địa chỉ giao hàng
                    </p>
                  )}
                  {effectiveAddress && !isDeliverable && (
                    <p className="text-xs text-center text-red-600 mt-2 flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-sm">block</span>
                      Địa chỉ đã chọn không nằm trong vùng giao hàng
                    </p>
                  )}

                  <p className="text-[10px] text-center text-gray-400 mt-4 leading-relaxed">
                    Bằng việc đặt hàng, bạn đồng ý với{" "}
                    <a className="underline" href="#">
                      Điều khoản dịch vụ
                    </a>{" "}
                    và{" "}
                    <a className="underline" href="#">
                      Chính sách quyền riêng tư
                    </a>{" "}
                    của FoodieDash
                  </p>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 flex justify-center gap-4 grayscale opacity-50">
                <img
                  alt="Visa"
                  className="h-4"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCs__c9M-2vVKGK39Py16iaIlYcqaZ_fFqPRjQ1JYdrHwDhoWoO8wgUKjop6DCVzNX2nG8cjStqfaSLG0xZi-kU1MTLT36uib2zzzXNLNECIqmr4CMLoP_GihLv8GA8gZdmjBhoDxgSh9R-Yoyc8npF0INS8mHfyhsn6cV5DcJd7CDr2Zrc_xiSvuRWaBWw6457-vDhy1O3pmSMiJr6XUIZeJXmyLKCwVODJ1j_ypvM2u9LPXTQmnnpxff-zNyZRI7vF2acFkInJiQ"
                />
                <img
                  alt="Mastercard"
                  className="h-6"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMxVr6eBwHtfIFCaw585rSGpM0YrdmPjmsspstqNGuZGT3i94uMka9pKHVmDNB_fDda9tGltqt-qW0RVN3XFLhm_3nZ0t8Gyh4CGs5DQTL-gZ8lbaMD0B5816ZdT7Xhh_-nVCT_KfnPPPVVduRzSU4olUpM8Nu2dSCBA3N2Gm2M3W03uIJBhFNMAsThxzBPxh5FsdKP5XyVyTr3FgLn51XFCeSlaDeTMBpFstLToFCAckR1GZxREjn_miKjAK0EtebgSJKHMcaqyA"
                />
              </div>
            </aside>
          </div>
        </main>
      </div>

      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={handleSaveAddress}
        isFirstAddress={addresses.length === 0}
      />

      {/* FSS-40: Allergy Warning Modal */}
      {showAllergyWarning && (
        <AllergyWarningDialog
          conflicts={allergyConflicts}
          onConfirm={handleConfirmAllergyWarning}
          onCancel={() => setShowAllergyWarning(false)}
        />
      )}
    </div>
  );
};

export default CheckoutPage;
