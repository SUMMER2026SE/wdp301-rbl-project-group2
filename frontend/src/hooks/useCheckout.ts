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
import {
  calculateShippingFee,
  calculateDistance,
  findNearestStore,
  getAddressCoordinates,
} from "@/utils/shipping";
import { useSettingsStore } from "@/store/settingsStore";
import { useStoreStore } from "@/store/storeStore";
import productAPI from "@/services/product.service";
import type { Product } from "@/types/product";

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

const toOrderAddress = (address: PlaceOrderAddress): PlaceOrderAddress => ({
  label: address.label,
  receiverName: address.receiverName,
  phone: address.phone,
  detail: address.detail,
  ward: address.ward,
  district: address.district,
  city: address.city,
});

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const getUserId = (user: any) => {
  return user?._id || user?.id || user?.userId || null;
};

const getUserTier = (user: any) => {
  return user?.tier || user?.userTier || user?.rank || user?.memberTier || null;
};

const UNAVAILABLE_ITEM_MESSAGE =
  "Sản phẩm này đã hết, vui lòng chọn sản phẩm khác";

const productAvailabilityKey = (product: { category?: string; name?: string }) =>
  `${String(product.category ?? "").trim().toLowerCase()}::${String(product.name ?? "").trim().toLowerCase()}`;

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
    clearCart,
    orderNote,
    updateAvailability,
  } = useCart();

  const { user } = useAuth();
  const { toast } = useToast();
  const { settings, fetchSettings } = useSettingsStore();
  const { selectedStore, stores, fetchStores, selectStore } = useStoreStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Ref to signal that order has been placed successfully.
  const orderPlacedRef = useRef(false);

  // Guard against false-positive redirect on page refresh.
  const [isHydrating, setIsHydrating] = useState(true);
  useEffect(() => {
    setIsHydrating(false);
  }, []);

  const buyNowItem = location.state?.buyNowItem as CartItem | undefined;

  const cartItems = useMemo(
    () => (buyNowItem ? [buyNowItem] : storeCartItems),
    [buyNowItem, storeCartItems],
  );
  const selectedCartItems = useMemo(
    () => cartItems.filter((item) => item.selected !== false),
    [cartItems],
  );
  const unavailableCartItems = useMemo(
    () => selectedCartItems.filter((item) => item.unavailable),
    [selectedCartItems],
  );
  const hasUnavailableCartItems = unavailableCartItems.length > 0;
  const availableCartItems = useMemo(
    () => selectedCartItems.filter((item) => !item.unavailable),
    [selectedCartItems],
  );
  const payableTotal = useMemo(
    () =>
      availableCartItems.reduce((sum, item) => {
        const extrasPrice =
          item.extras?.reduce(
            (extraSum: number, extra: { price: number }) =>
              extraSum + extra.price,
            0,
          ) || 0;
        return sum + (item.price + extrasPrice) * item.quantity;
      }, 0),
    [availableCartItems],
  );
  const totalPrice = payableTotal;

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

  const nearestStoreSuggestion = useMemo(() => {
    const addressCoordinates = getAddressCoordinates(effectiveAddress);
    return findNearestStore(addressCoordinates, stores);
  }, [effectiveAddress, stores]);

  const selectedStoreDistance = useMemo(() => {
    const addressCoordinates = getAddressCoordinates(effectiveAddress);
    const coordinates = selectedStore?.location?.coordinates;

    if (!addressCoordinates || !coordinates || coordinates.length !== 2) {
      return null;
    }

    const [storeLng, storeLat] = coordinates;
    if (!Number.isFinite(storeLat) || !Number.isFinite(storeLng)) {
      return null;
    }

    return calculateDistance(
      addressCoordinates.lat,
      addressCoordinates.lng,
      storeLat,
      storeLng,
    );
  }, [effectiveAddress, selectedStore]);

  const resolveCartAvailabilityForStore = useCallback(
    async (storeId: string) => {
      const removedItemNames = new Set<string>();
      const availabilityMap: Record<
        string,
        { unavailable: boolean; reason?: string }
      > = {};
      const unavailableSelectedProductIds: string[] = [];

      if (buyNowItem || cartItems.length === 0) {
        return {
          removedItemNames: [],
          availabilityMap,
          unavailableSelectedProductIds,
        };
      }

      const [visibleProductsRes, productDetailResults] = await Promise.all([
        productAPI.getProducts({
          storeId,
          limit: 1000,
          isAvailable: true,
        }),
        Promise.all(
          cartItems.map((item) =>
            productAPI.getProductById(item.productId).catch(() => null),
          ),
        ),
      ]);

      const visibleProductById = new Map<string, Product>();
      const visibleProductByKey = new Map<string, Product>();
      for (const product of visibleProductsRes.data ?? []) {
        visibleProductById.set(product._id, product);
        visibleProductByKey.set(productAvailabilityKey(product), product);
      }

      productDetailResults.forEach((result, index) => {
        const cartItem = cartItems[index];
        if (!cartItem) return;

        const product = result?.success ? result.data : null;
        const visibleProduct = product
          ? visibleProductById.get(cartItem.productId) ??
            visibleProductByKey.get(productAvailabilityKey(product))
          : undefined;
        const unavailable = !visibleProduct;

        availabilityMap[cartItem.productId] = {
          unavailable,
          reason: unavailable ? UNAVAILABLE_ITEM_MESSAGE : undefined,
        };

        if (unavailable && cartItem.selected !== false) {
          unavailableSelectedProductIds.push(cartItem.productId);
          removedItemNames.add(cartItem.name);
        }
      });

      return {
        removedItemNames: Array.from(removedItemNames),
        availabilityMap,
        unavailableSelectedProductIds,
      };
    },
    [buyNowItem, cartItems],
  );

  const selectNearestStoreSuggestion = useCallback(async () => {
    const nearestStore = nearestStoreSuggestion?.store;
    if (!nearestStore) return [];

    try {
      const result = await resolveCartAvailabilityForStore(nearestStore._id);
      if (!buyNowItem && cartItems.length > 0) {
        updateAvailability(result.availabilityMap);
      }

      selectStore(nearestStore);
      return result.removedItemNames;
    } catch (error) {
      console.error("Failed to validate cart items for suggested store", error);
      toast(
        "Không thể kiểm tra tình trạng món ở chi nhánh mới. Vui lòng thử lại.",
        "warning",
      );
      throw error;
    }
  }, [
    buyNowItem,
    cartItems,
    nearestStoreSuggestion,
    resolveCartAvailabilityForStore,
    selectStore,
    toast,
    updateAvailability,
  ]);

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

    if (availableCartItems.length === 0) {
      toast(
        cartItems.length === 0
          ? "Giỏ hàng của bạn đang trống"
          : "Không có sản phẩm khả dụng để thanh toán",
        "warning",
      );
      navigate(cartItems.length === 0 ? "/menu" : "/cart");
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

        items: availableCartItems.map((item) => ({
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
        deliveryAddress: toOrderAddress(effectiveAddress),
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
    availableCartItems,
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
    selectedCartItems,
    availableCartItems,
    unavailableCartItems,
    hasUnavailableCartItems,
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
    stores,
    selectedStore,
    selectedStoreDistance,
    nearestStoreSuggestion,
    selectNearestStoreSuggestion,
    isSubmitting,
    handlePlaceOrder,
    orderPlacedRef,
    isHydrating,
  };
};
