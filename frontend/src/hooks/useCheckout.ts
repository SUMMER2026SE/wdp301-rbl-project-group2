import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "./useCart";
import type { CartItem } from "./useCart";
import { useAuth } from "./useAuth";
import { useToast } from "./useToast";
import orderService from "@/services/order.service";
import type {
  PaymentMethod,
  PlaceOrderAddress,
} from "@/services/order.service";
import voucherService from "@/services/voucher.service";
import type { Voucher } from "@/types/voucher";
import type { AuthAddress } from "@/store/authStore";
import { calculateShippingFee } from "@/utils/shipping";
import { useSettingsStore } from "@/store/settingsStore";
import { useStoreStore } from "@/store/storeStore";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface VoucherState {
  code: string;
  isValidating: boolean;
  appliedVoucher: Voucher | null;
  discountAmount: number;
  error: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────────────────

/**
 * useCheckout — encapsulates all business logic for the checkout flow.
 *
 * Responsibilities:
 *  - Reads cart items from cartStore (localStorage-backed Zustand)
 *  - Reads user addresses from authStore
 *  - Manages selected address state
 *  - Manages voucher validation (live, with BE round-trip)
 *  - Manages payment method selection
 *  - Handles order submission → clear cart → navigate to success
 */
export const useCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items: storeCartItems, totalPrice: storeTotalPrice, clearCart, orderNote } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings, fetchSettings } = useSettingsStore();
  const { selectedStore } = useStoreStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Ref to signal that order has been placed successfully.
  // Using a ref (not state) so it survives the finally-block reset of isSubmitting
  // without triggering additional re-renders that could re-run the cart-empty guard.
  const orderPlacedRef = useRef(false);

  // Guard against false-positive redirect on page refresh:
  // Zustand (localStorage) needs one render cycle to hydrate cartStore.
  // isHydrating stays true until after the first render, so the cart-empty
  // guard in CheckoutPage won't fire before the cart is actually loaded.
  const [isHydrating, setIsHydrating] = useState(true);
  useEffect(() => {
    setIsHydrating(false);
  }, []);

  const buyNowItem = location.state?.buyNowItem as CartItem | undefined;

  const cartItems = buyNowItem ? [buyNowItem] : storeCartItems;
  const totalPrice = buyNowItem
    ? ((buyNowItem.price + (buyNowItem.extras?.reduce((s: number, e: { price: number }) => s + e.price, 0) || 0)) * buyNowItem.quantity)
    : storeTotalPrice;

  // ── Address ───────────────────────────────────────────────────────────────
  const addresses = useMemo(
    () => (user?.addresses ?? []) as AuthAddress[],
    [user],
  );

  // Find the default address; if none marked default, use first one
  const defaultAddress = useMemo(
    () => addresses.find((a: any) => a.isDefault) ?? addresses[0] ?? null,
    [addresses],
  );

  const [selectedAddress, setSelectedAddress] =
    useState<PlaceOrderAddress | null>(null);

  // Effective address for order submission (selectedAddress overrides default)
  const effectiveAddress =
    selectedAddress ?? (defaultAddress as PlaceOrderAddress | null);

  // ── Payment Method ────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cash");

  // ── Voucher ───────────────────────────────────────────────────────────────
  const [voucherState, setVoucherState] = useState<VoucherState>({
    code: "",
    isValidating: false,
    appliedVoucher: null,
    discountAmount: 0,
    error: null,
  });

  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  // ─── Fetch Active Vouchers ───
  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const res = await voucherService.getVouchers({ isActive: true });
        if (res.success && res.data) {
          setVouchers(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch vouchers", error);
      }
    };
    fetchVouchers();
  }, []);

  const setVoucherCode = useCallback((code: string) => {
    setVoucherState((prev) => ({
      ...prev,
      code: code.toUpperCase(),
      // Reset applied state when user changes code
      appliedVoucher: null,
      discountAmount: 0,
      error: null,
    }));
  }, []);

  const applyVoucher = useCallback(async (manualCode?: string) => {
    const code = (manualCode || voucherState.code).trim();
    if (!code) return;

    setVoucherState((prev) => ({ ...prev, isValidating: true, error: null, code: code.toUpperCase() }));

    try {
      const res = await voucherService.validateVoucher({
        code,
        orderAmount: totalPrice,
      });

      if (res.data) {
        setVoucherState((prev) => ({
          ...prev,
          isValidating: false,
          appliedVoucher: res.data!.voucher,
          discountAmount: res.data!.discountAmount,
          error: null,
          code: code.toUpperCase(),
        }));
        toast(
          `Áp dụng voucher thành công! Giảm ${res.data.discountAmount.toLocaleString("vi-VN")}đ`,
          "success",
        );
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? "Voucher không hợp lệ hoặc đã hết hạn";
      setVoucherState((prev) => ({
        ...prev,
        isValidating: false,
        appliedVoucher: null,
        discountAmount: 0,
        error: message,
      }));
      toast(message, "error");
    }
  }, [voucherState.code, totalPrice, toast]);

  const removeVoucher = useCallback(() => {
    setVoucherState({
      code: "",
      isValidating: false,
      appliedVoucher: null,
      discountAmount: 0,
      error: null,
    });
  }, []);

  // ── Pricing ───────────────────────────────────────────────────────────────
  const subtotal = totalPrice;
  const discount = voucherState.discountAmount;

  // Dynamic shipping fee based on selected address zone
  const shippingResult = useMemo(() => {
    if (!effectiveAddress) {
      return { fee: 0, blocked: false };
    }

    const config = settings ? {
      baseDeliveryFee: parseFloat(settings.baseDeliveryFee) || 15000,
      feePerKm: parseFloat(settings.feePerKm) || 5000,
      freeDeliveryEnabled: settings.freeDeliveryEnabled,
      freeDeliveryThreshold: parseFloat(settings.freeDeliveryThreshold) || 300000,
    } : undefined;

    return calculateShippingFee(
      effectiveAddress.ward ?? "",
      effectiveAddress.city ?? "",
      subtotal,
      selectedStore?.location?.coordinates,
      config
    );
  }, [effectiveAddress, subtotal, settings, selectedStore]);

  const deliveryFee = shippingResult.fee;
  const isDeliverable = !shippingResult.blocked;
  const total = Math.max(0, subtotal - discount + deliveryFee);

  // ── Submission ────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceOrder = useCallback(async () => {
    if (isSubmitting) return;

    // Guard: cart must not be empty
    if (cartItems.length === 0) {
      toast("Giỏ hàng của bạn đang trống", "warning");
      navigate("/menu");
      return;
    }

    // Guard: must have delivery address
    if (!effectiveAddress) {
      toast("Vui lòng thêm địa chỉ giao hàng trước khi đặt hàng", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        storeId: selectedStore?._id,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          variations: item.variations ?? [],
        })),
        paymentMethod,
        // Only send voucher._id if one is applied (must be 24-char ObjectId)
        ...(voucherState.appliedVoucher
          ? { voucher: voucherState.appliedVoucher._id }
          : {}),
        // Send the selected/default address so BE doesn't need to look it up
        deliveryAddress: effectiveAddress,
        shippingFee: deliveryFee,
        note: orderNote?.trim() || undefined,
      };

      const response = await orderService.placeOrder(payload);
      const order = response.data;

      // If there's a checkoutUrl (PayOS), redirect to it
      if (order.checkoutUrl) {
        window.location.href = order.checkoutUrl;
        return;
      }

      // Mark order as placed BEFORE clearing cart so the Checkout guard
      // (cartItems.length === 0) knows NOT to redirect to /menu.
      orderPlacedRef.current = true;

      // Clear FE cart (only for normal cart checkout, not buy-now)
      if (!buyNowItem) {
        clearCart();
      }

      // Navigate to success page, passing the order code via navigation state
      navigate("/success", {
        state: {
          orderCode: order.code,
          orderId: order._id,
          totalPrice: order.totalPrice,
        },
        replace: true, // Prevent back-navigation to checkout
      });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? "Đặt hàng thất bại. Vui lòng thử lại.";
      toast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    cartItems,
    effectiveAddress,
    paymentMethod,
    voucherState.appliedVoucher,
    deliveryFee,
    orderNote,
    clearCart,
    navigate,
    toast,
    buyNowItem,
  ]);

  // ────────────────────────────────────────────────────────────────────────
  return {
    // Cart
    cartItems,
    // Address
    addresses,
    defaultAddress,
    selectedAddress,
    effectiveAddress,
    setSelectedAddress,
    // Payment
    paymentMethod,
    setPaymentMethod,
    // Voucher
    voucherState,
    vouchers,
    setVoucherCode,
    applyVoucher,
    removeVoucher,
    // Pricing
    subtotal,
    discount,
    deliveryFee,
    total,
    isDeliverable,
    shippingResult,
    settings,
    selectedStore,
    // Submit
    isSubmitting,
    handlePlaceOrder,
    orderPlacedRef,
    // Hydration guard
    isHydrating,
  };
};
