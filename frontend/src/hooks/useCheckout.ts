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
import { VoucherCategory, type Voucher } from "@/types/voucher";
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
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const getUserId = (user: any) => {
  return user?._id || user?.id || user?.userId || null;
};

const getUserTier = (user: any) => {
  return user?.tier || user?.userTier || user?.rank || user?.memberTier || null;
};

// ────────────────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────────────────

/**
 * useCheckout — encapsulates all business logic for the checkout flow.
 *
 * Responsibilities:
 *  - Reads cart items from cartStore
 *  - Reads user addresses from authStore
 *  - Manages selected address state
 *  - Manages voucher validation with BE
 *  - Sends deliveryFee/shippingFee so freeship voucher discounts real shipping fee
 *  - Sends userTier so BE can validate tier-based voucher
 *  - Handles order submission
 */
export const useCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    items: storeCartItems,
    totalPrice: storeTotalPrice,
    clearCart,
    orderNote,
  } = useCart();

  const { user } = useAuth();
  const { toast } = useToast();
  const { settings, fetchSettings } = useSettingsStore();
  const { selectedStore } = useStoreStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Ref to signal that order has been placed successfully.
  const orderPlacedRef = useRef(false);

  // Guard against false-positive redirect on page refresh.
  const [isHydrating, setIsHydrating] = useState(true);
  useEffect(() => {
    setIsHydrating(false);
  }, []);

  const buyNowItem = location.state?.buyNowItem as CartItem | undefined;

  const cartItems = buyNowItem ? [buyNowItem] : storeCartItems;
  const totalPrice = buyNowItem
    ? (buyNowItem.price +
        (buyNowItem.extras?.reduce(
          (sum: number, extra: { price: number }) => sum + extra.price,
          0,
        ) || 0)) *
      buyNowItem.quantity
    : storeTotalPrice;

  // ── Address ───────────────────────────────────────────────────────────────
  const addresses = useMemo(
    () => (user?.addresses ?? []) as AuthAddress[],
    [user],
  );

  const defaultAddress = useMemo(
    () =>
      addresses.find((address: any) => address.isDefault) ??
      addresses[0] ??
      null,
    [addresses],
  );

  const [selectedAddress, setSelectedAddress] =
    useState<PlaceOrderAddress | null>(null);

  const effectiveAddress =
    selectedAddress ?? (defaultAddress as PlaceOrderAddress | null);

  // ── Payment Method ────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  // ── Pricing Base ──────────────────────────────────────────────────────────

  const subtotal = totalPrice;

  const shippingResult = useMemo(() => {
    if (!effectiveAddress) {
      return {
        fee: 0,
        blocked: false,
      };
    }

    const config = settings
      ? {
          baseDeliveryFee: parseFloat(settings.baseDeliveryFee) || 15000,
          feePerKm: parseFloat(settings.feePerKm) || 5000,
          freeDeliveryEnabled: settings.freeDeliveryEnabled,
          freeDeliveryThreshold:
            parseFloat(settings.freeDeliveryThreshold) || 300000,
        }
      : undefined;

    return calculateShippingFee(
      effectiveAddress.ward ?? "",
      effectiveAddress.city ?? "",
      subtotal,
      selectedStore?.location?.coordinates,
      config,
    );
  }, [effectiveAddress, subtotal, settings, selectedStore]);

  const deliveryFee = shippingResult.fee;
  const isDeliverable = !shippingResult.blocked;

  const [voucherState, setVoucherState] = useState<VoucherState>({
    code: "",
    isValidating: false,
    appliedVoucher: null,
    discountAmount: 0,
    error: null,
  });

  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const res = await voucherService.getVouchers({
          isActive: true,
        });

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
      appliedVoucher: null,
      discountAmount: 0,
      error: null,
    }));
  }, []);

  const applyVoucher = useCallback(
    async (manualCode?: string) => {
      const code = (manualCode || voucherState.code).trim();

      if (!code) return;

      const selectedVoucher = vouchers.find(
        (voucher) => voucher.code.toUpperCase() === code.toUpperCase(),
      );

      if (selectedVoucher?.category === VoucherCategory.FREESHIP) {
        const message = !effectiveAddress
          ? "Vui lòng chọn địa chỉ giao hàng trước khi dùng voucher freeship"
          : deliveryFee <= 0
            ? "Đơn hàng này đã được miễn phí vận chuyển"
            : null;

        if (message) {
          setVoucherState((prev) => ({
            ...prev,
            code: code.toUpperCase(),
            isValidating: false,
            appliedVoucher: null,
            discountAmount: 0,
            error: message,
          }));
          toast(message, "error");
          return;
        }
      }

      setVoucherState((prev) => ({
        ...prev,
        code: code.toUpperCase(),
        isValidating: true,
        error: null,
      }));

      try {
        const res = await voucherService.validateVoucher({
          code,
          orderAmount: subtotal,
          userId: getUserId(user),
          userTier: getUserTier(user),
          deliveryFee,
          shippingFee: deliveryFee,
        });

        if (res.data) {
          setVoucherState((prev) => ({
            ...prev,
            code: code.toUpperCase(),
            isValidating: false,
            appliedVoucher: res.data!.voucher,
            discountAmount: res.data!.discountAmount,
            error: null,
          }));

          toast(
            `Áp dụng voucher thành công! Giảm ${res.data.discountAmount.toLocaleString(
              "vi-VN",
            )}đ`,
            "success",
          );
        }
      } catch (err: any) {
        const message =
          err?.response?.data?.message ??
          "Voucher không hợp lệ hoặc đã hết hạn";

        setVoucherState((prev) => ({
          ...prev,
          isValidating: false,
          appliedVoucher: null,
          discountAmount: 0,
          error: message,
        }));

        toast(message, "error");
      }
    },
    [voucherState.code, vouchers, effectiveAddress, subtotal, deliveryFee, user, toast],
  );

  const removeVoucher = useCallback(() => {
    setVoucherState({
      code: "",
      isValidating: false,
      appliedVoucher: null,
      discountAmount: 0,
      error: null,
    });
  }, []);

  useEffect(() => {
    const appliedCode = voucherState.appliedVoucher?.code;

    if (!appliedCode) return;

    let cancelled = false;

    const revalidateAppliedVoucher = async () => {
      try {
        const res = await voucherService.validateVoucher({
          code: appliedCode,
          orderAmount: subtotal,
          userId: getUserId(user),
          userTier: getUserTier(user),
          deliveryFee,
          shippingFee: deliveryFee,
        });

        if (cancelled || !res.data) return;

        setVoucherState((prev) => ({
          ...prev,
          appliedVoucher: res.data!.voucher,
          discountAmount: res.data!.discountAmount,
          error: null,
        }));
      } catch (err: any) {
        if (cancelled) return;

        const message =
          err?.response?.data?.message ??
          "Voucher không còn phù hợp với đơn hàng hiện tại";

        setVoucherState((prev) => ({
          ...prev,
          appliedVoucher: null,
          discountAmount: 0,
          error: message,
        }));

        toast(message, "warning");
      }
    };

    revalidateAppliedVoucher();

    return () => {
      cancelled = true;
    };
  }, [voucherState.appliedVoucher?.code, subtotal, deliveryFee, user, toast]);

  const discount = voucherState.discountAmount;

  const total = Math.max(0, subtotal + deliveryFee - discount);

  // ── Submission ────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceOrder = useCallback(async () => {
    if (isSubmitting) return;

    if (cartItems.length === 0) {
      toast("Giỏ hàng của bạn đang trống", "warning");
      navigate("/menu");
      return;
    }

    if (!effectiveAddress) {
      toast("Vui lòng thêm địa chỉ giao hàng trước khi đặt hàng", "warning");
      return;
    }

    if (!isDeliverable) {
      toast("Địa chỉ này hiện chưa hỗ trợ giao hàng", "warning");
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
        ...(voucherState.appliedVoucher
          ? {
              voucher: voucherState.appliedVoucher.code,
              voucherCode: voucherState.appliedVoucher.code,
              voucherId: voucherState.appliedVoucher._id,
            }
          : {}),
        deliveryAddress: effectiveAddress,
        shippingFee: deliveryFee,
        deliveryFee,
        note: orderNote?.trim() || undefined,
      };

      const response = await orderService.placeOrder(payload);
      const order = response.data;

      if (order.checkoutUrl) {
        window.location.href = order.checkoutUrl;
        return;
      }

      orderPlacedRef.current = true;

      if (!buyNowItem) {
        clearCart();
      }

      navigate("/success", {
        state: {
          orderCode: order.code,
          orderId: order._id,
          totalPrice: order.totalPrice,
        },
        replace: true,
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
    isDeliverable,
    paymentMethod,
    voucherState.appliedVoucher,
    deliveryFee,
    orderNote,
    selectedStore,
    clearCart,
    navigate,
    toast,
    buyNowItem,
  ]);

  // ──────────────────────────────────────────────────────────────────────────

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
    isSubmitting,
    handlePlaceOrder,
    orderPlacedRef,
    isHydrating,
  };
};
