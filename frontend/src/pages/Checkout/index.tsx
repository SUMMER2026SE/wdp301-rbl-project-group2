import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCheckout } from "@/hooks/useCheckout";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/hooks/useToast";
import {
  calculateShippingFee,
  calculateDistance,
  formatDistance,
  getAddressCoordinates,
  WARD_CENTROIDS,
} from "@/utils/shipping";
import { AddressModal } from "@/components/shared/AddressModal";
import { userService } from "@/services/profile.service";
import { useAuthStore } from "@/store/authStore";
import type { AuthAddress } from "@/store/authStore";
import { sanitizeAddressesForApi } from "@/utils/address";
import { TicketVoucher } from "@/components/shared/TicketVoucher";
import paymentService from "@/services/payment.service";
import { DiscountType, VoucherCategory } from "@/types/voucher";
import type { Voucher } from "@/types/voucher";
import productAPI from "@/services/product.service";
import type { Product } from "@/types/product";
import { useStoreStore, type IStore } from "@/store/storeStore";
import { useCartStore } from "@/store/cartStore";

const UNAVAILABLE_ITEM_MESSAGE =
  "Sản phẩm này đã hết, vui lòng chọn sản phẩm khác";

const productAvailabilityKey = (product: {
  category?: string;
  name?: string;
}) =>
  `${String(product.category ?? "")
    .trim()
    .toLowerCase()}::${String(product.name ?? "")
    .trim()
    .toLowerCase()}`;

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["customer", "common"]);

  const {
    cartItems,
    selectedCartItems,
    availableCartItems,
    hasUnavailableCartItems,
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
    stores,
    selectedStore,
    selectedStoreDistance,
    nearestStoreSuggestion,
    isSubmitting,
    handlePlaceOrder,
    vouchers,
    orderPlacedRef,
    isHydrating,
  } = useCheckout();

  const [isVouchersOpen, setIsVouchersOpen] = useState(false);
  const [isNearestStoreModalOpen, setIsNearestStoreModalOpen] = useState(false);
  const [switchingStoreId, setSwitchingStoreId] = useState<string | null>(null);
  const [isCompatibleStoresModalOpen, setIsCompatibleStoresModalOpen] =
    useState(false);
  const [compatibleStores, setCompatibleStores] = useState<IStore[]>([]);
  const [isLoadingCompatibleStores, setIsLoadingCompatibleStores] =
    useState(false);
  const [compatibleStoresError, setCompatibleStoresError] = useState<
    string | null
  >(null);
  const [dismissedNearestStoreKey, setDismissedNearestStoreKey] = useState<
    string | null
  >(null);

  const { toasts, dismiss, toast } = useToast();
  const selectStore = useStoreStore((s) => s.selectStore);
  const updateCartAvailability = useCartStore((s) => s.updateAvailability);

  const nearestStoreSuggestionKey =
    selectedStore && nearestStoreSuggestion
      ? [
          selectedStore._id,
          nearestStoreSuggestion.store._id,
          effectiveAddress?.detail ?? "",
          effectiveAddress?.ward ?? "",
          effectiveAddress?.city ?? "",
        ].join("|")
      : null;

  const hasCloserStoreSuggestion = Boolean(
    selectedStore &&
    nearestStoreSuggestion &&
    selectedStore._id !== nearestStoreSuggestion.store._id,
  );
  useEffect(() => {
    if (
      hasCloserStoreSuggestion &&
      nearestStoreSuggestionKey &&
      dismissedNearestStoreKey !== nearestStoreSuggestionKey
    ) {
      setIsNearestStoreModalOpen(true);
      return;
    }

    setIsNearestStoreModalOpen(false);
  }, [
    dismissedNearestStoreKey,
    hasCloserStoreSuggestion,
    nearestStoreSuggestionKey,
  ]);

  const keepCurrentStore = () => {
    setDismissedNearestStoreKey(nearestStoreSuggestionKey);
    setIsNearestStoreModalOpen(false);
  };

  const getStoreDistance = (store: IStore) => {
    const addressCoordinates = getAddressCoordinates(effectiveAddress);
    const coordinates = store.location?.coordinates;

    if (!addressCoordinates || !coordinates || coordinates.length !== 2) {
      return null;
    }

    const [storeLng, storeLat] = coordinates;
    if (!Number.isFinite(storeLng) || !Number.isFinite(storeLat)) {
      return null;
    }

    return calculateDistance(
      addressCoordinates.lat,
      addressCoordinates.lng,
      storeLat,
      storeLng,
    );
  };

  const storesSortedByDistance = stores
    .filter((store) => store.isActive !== false)
    .map((store) => ({
      store,
      distance: getStoreDistance(store),
    }))
    .sort((a, b) => {
      if (selectedStore?._id) {
        if (a.store._id === selectedStore._id) return -1;
        if (b.store._id === selectedStore._id) return 1;
      }

      const distanceA = a.distance ?? Number.MAX_SAFE_INTEGER;
      const distanceB = b.distance ?? Number.MAX_SAFE_INTEGER;
      return distanceA - distanceB;
    });

  const resolveAvailabilityForStore = async (storeId: string) => {
    const productDetails = await Promise.all(
      selectedCartItems.map((item) =>
        productAPI.getProductById(item.productId).catch(() => null),
      ),
    );
    const visibleProductsRes = await productAPI.getProducts({
      storeId,
      limit: 1000,
      isAvailable: true,
    });
    const visibleProductById = new Map(
      (visibleProductsRes.data ?? []).map((product) => [product._id, product]),
    );
    const visibleProductByKey = new Map(
      (visibleProductsRes.data ?? []).map((product) => [
        productAvailabilityKey(product),
        product,
      ]),
    );
    const availabilityMap: Record<
      string,
      { unavailable: boolean; reason?: string }
    > = {};
    const unavailableNames = new Set<string>();

    selectedCartItems.forEach((item, index) => {
      const product = productDetails[index]?.success
        ? productDetails[index]!.data
        : null;
      const isUnavailable = product
        ? !(
            visibleProductById.has(item.productId) ||
            visibleProductByKey.has(productAvailabilityKey(product))
          )
        : true;

      availabilityMap[item.productId] = {
        unavailable: isUnavailable,
        reason: isUnavailable ? UNAVAILABLE_ITEM_MESSAGE : undefined,
      };

      if (isUnavailable) {
        unavailableNames.add(item.name);
      }
    });

    return {
      availabilityMap,
      unavailableNames: Array.from(unavailableNames),
    };
  };

  const openCompatibleStoresModal = async () => {
    setIsCompatibleStoresModalOpen(true);
    setIsLoadingCompatibleStores(true);
    setCompatibleStoresError(null);
    setCompatibleStores([]);

    try {
      const productDetails = await Promise.all(
        selectedCartItems.map((item) =>
          productAPI.getProductById(item.productId).catch(() => null),
        ),
      );
      const requiredKeys = productDetails
        .map((result) =>
          result?.success ? productAvailabilityKey(result.data) : null,
        )
        .filter((key): key is string => Boolean(key));

      if (requiredKeys.length !== selectedCartItems.length) {
        setCompatibleStoresError(
          "Không thể kiểm tra đầy đủ món trong đơn hiện tại.",
        );
        return;
      }

      const storeResults = await Promise.all(
        stores
          .filter((store) => store.isActive !== false)
          .map(async (store) => {
            const res = await productAPI
              .getProducts({
                storeId: store._id,
                limit: 1000,
                isAvailable: true,
              })
              .catch(() => null);
            const availableKeys = new Set(
              (res?.data ?? []).map((product: Product) =>
                productAvailabilityKey(product),
              ),
            );
            return requiredKeys.every((key) => availableKeys.has(key))
              ? store
              : null;
          }),
      );

      const matchedStores = storeResults
        .filter((store): store is IStore => Boolean(store))
        .sort((a, b) => {
          const distanceA = getStoreDistance(a) ?? Number.MAX_SAFE_INTEGER;
          const distanceB = getStoreDistance(b) ?? Number.MAX_SAFE_INTEGER;
          return distanceA - distanceB;
        });

      setCompatibleStores(matchedStores);
    } catch {
      setCompatibleStoresError(
        "Không thể tải danh sách chi nhánh phù hợp. Vui lòng thử lại.",
      );
    } finally {
      setIsLoadingCompatibleStores(false);
    }
  };

  const chooseCompatibleStore = (store: IStore) => {
    const availabilityMap = Object.fromEntries(
      selectedCartItems.map((item) => [
        item.productId,
        { unavailable: false, reason: undefined },
      ]),
    );
    updateCartAvailability(availabilityMap);
    selectStore(store);
    setIsCompatibleStoresModalOpen(false);
  };

  const switchToStoreCandidate = async (store: IStore) => {
    setSwitchingStoreId(store._id);

    try {
      const { availabilityMap, unavailableNames } =
        await resolveAvailabilityForStore(store._id);
      updateCartAvailability(availabilityMap);
      selectStore(store);
      setDismissedNearestStoreKey(nearestStoreSuggestionKey);
      setIsNearestStoreModalOpen(false);

      if (unavailableNames.length > 0) return;
    } catch {
      toast(
        "Không thể kiểm tra tình trạng món ở chi nhánh này. Vui lòng thử lại.",
        "warning",
      );
    } finally {
      setSwitchingStoreId(null);
    }
  };

  // PayOS limit check: If total drops below 2,000 VND and paymentMethod is "bank_transfer", fallback to "cash"
  useEffect(() => {
    if (total < 2000 && paymentMethod === "bank_transfer") {
      setPaymentMethod("cash");
      toast(
        "Chuyển khoản PayOS yêu cầu giao dịch từ 2.000đ trở lên. Đã chuyển sang COD.",
        "info",
      );
    }
  }, [total, paymentMethod, setPaymentMethod, toast]);

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const normalizeTier = (value?: string | null) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const tierRankMap: Record<string, number> = {
    bronze: 1,
    dong: 1,
    silver: 2,
    bac: 2,
    gold: 3,
    vang: 3,
    platinum: 4,
    "bach kim": 4,
    diamond: 5,
    "kim cuong": 5,
  };

  const tierLabelMap: Record<string, string> = {
    bronze: "Đồng",
    dong: "Đồng",
    silver: "Bạc",
    bac: "Bạc",
    gold: "Vàng",
    vang: "Vàng",
    platinum: "Bạch kim",
    "bach kim": "Bạch kim",
    diamond: "Kim cương",
    "kim cuong": "Kim cương",
  };

  const getUserTier = () =>
    (user as any)?.tier ||
    (user as any)?.userTier ||
    (user as any)?.rank ||
    (user as any)?.memberTier ||
    null;

  const getTierRank = (tier?: string | null) =>
    tierRankMap[normalizeTier(tier)] || 0;

  const getTierLabel = (tier?: string | null) =>
    tierLabelMap[normalizeTier(tier)] || tier || "hạng yêu cầu";

  const getVoucherUnavailableReason = (voucher: Voucher) => {
    const now = Date.now();
    const startAt = new Date(voucher.startAt).getTime();
    const endAt = new Date(voucher.endAt).getTime();

    if (!voucher.isActive) {
      return "Voucher đã bị vô hiệu hóa";
    }

    if (Number.isFinite(startAt) && startAt > now) {
      return "Voucher chưa đến thời gian sử dụng";
    }

    if (Number.isFinite(endAt) && endAt < now) {
      return "Voucher đã hết hạn";
    }

    if (
      voucher.usageLimit !== null &&
      voucher.usageLimit > 0 &&
      voucher.usedCount >= voucher.usageLimit
    ) {
      return "Voucher đã hết lượt sử dụng";
    }

    if (voucher.minOrderValue && subtotal < voucher.minOrderValue) {
      return `Cần đơn tối thiểu ${voucher.minOrderValue.toLocaleString("vi-VN")}đ`;
    }

    if (voucher.minTier) {
      const userTierRank = getTierRank(getUserTier());
      const requiredTierRank = getTierRank(voucher.minTier);

      if (!userTierRank || userTierRank < requiredTierRank) {
        return `Chỉ áp dụng từ hạng ${getTierLabel(voucher.minTier)}`;
      }
    }

    if (voucher.category === VoucherCategory.FREESHIP) {
      if (!effectiveAddress) {
        return "Vui lòng chọn địa chỉ giao hàng trước";
      }

      if (deliveryFee <= 0) {
        return "Đơn hàng đã được miễn phí vận chuyển";
      }
    }

    return "";
  };

  const getVoucherDiscountLabel = (voucher: Voucher) => {
    if (voucher.category === VoucherCategory.FREESHIP) {
      if (voucher.discountType === DiscountType.PERCENTAGE) {
        return voucher.discountValue >= 100
          ? "Freeship"
          : `Giảm ${voucher.discountValue}% phí ship`;
      }

      return `Giảm ${voucher.discountValue.toLocaleString("vi-VN")}đ phí ship`;
    }

    return voucher.discountType === DiscountType.PERCENTAGE
      ? `${voucher.discountValue}%`
      : `${voucher.discountValue.toLocaleString("vi-VN")}đ`;
  };

  const handleApplyVoucherCode = (code: string) => {
    const selectedVoucher = vouchers.find(
      (voucher) => voucher.code.toUpperCase() === code.toUpperCase(),
    );
    const unavailableReason = selectedVoucher
      ? getVoucherUnavailableReason(selectedVoucher)
      : "";

    if (unavailableReason) {
      toast(unavailableReason, "warning");
      return;
    }

    setVoucherCode(code);
    applyVoucher(code);
  };
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editAddressIndex, setEditAddressIndex] = useState<number | null>(null);
  const [suggestedAddress, setSuggestedAddress] = useState<AuthAddress | null>(
    null,
  );
  const [isLocating, setIsLocating] = useState(false);

  // Helper to find nearest ward centroid
  const findNearestWard = (lat: number, lng: number): string => {
    let nearest = "Hải Châu";
    let minDist = Infinity;
    for (const [ward, coords] of Object.entries(WARD_CENTROIDS)) {
      const dist = calculateDistance(lat, lng, coords[1], coords[0]);
      if (dist < minDist) {
        minDist = dist;
        nearest = ward;
      }
    }
    return nearest;
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      toast("Trình duyệt của bạn không hỗ trợ định vị GPS", "error");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearestWard = findNearestWard(latitude, longitude);
        const suggAddr: AuthAddress = {
          label: "Vị trí hiện tại",
          receiverName: user?.fullName || "Người nhận",
          phone: user?.phone || "",
          detail: "Định vị GPS",
          ward: nearestWard,
          city: "Đà Nẵng",
          isDefault: false,
          latitude,
          longitude,
        };
        setSuggestedAddress(suggAddr);

        // Auto-select by default
        setSelectedAddress(suggAddr as any);

        // Call Photon API for reverse geocoding to resolve detailed address (house number and street name)
        fetch(
          `https://photon.komoot.io/reverse?lon=${longitude}&lat=${latitude}`,
        )
          .then((res) => res.json())
          .then((data) => {
            if (data && data.features && data.features.length > 0) {
              const props = data.features[0].properties;
              const houseNumber = props.housenumber || "";
              const street = props.street || "";
              const placeName = props.name || "";

              let resolvedDetail = "";
              if (houseNumber && street) {
                resolvedDetail = `${houseNumber} ${street}`;
              } else if (street) {
                if (placeName && placeName !== street) {
                  resolvedDetail = `${placeName}, ${street}`;
                } else {
                  resolvedDetail = street;
                }
              } else {
                resolvedDetail = placeName || "Vị trí GPS";
              }

              // Match ward against our whitelist
              let resolvedWard = nearestWard;
              const photonWard = props.locality || props.district || "";
              if (photonWard) {
                const normalizedWard = photonWard
                  .replace(/^(phường|xã)\s+/i, "")
                  .trim()
                  .toLowerCase();
                for (const ward of Object.keys(WARD_CENTROIDS)) {
                  const normalizedKnown = ward
                    .replace(/^(phường|xã)\s+/i, "")
                    .trim()
                    .toLowerCase();
                  if (
                    normalizedKnown === normalizedWard ||
                    normalizedKnown.includes(normalizedWard) ||
                    normalizedWard.includes(normalizedKnown)
                  ) {
                    resolvedWard = ward;
                    break;
                  }
                }
              }

              const updatedSugg: AuthAddress = {
                label: "Vị trí hiện tại",
                receiverName: user?.fullName || "Người nhận",
                phone: user?.phone || "",
                detail: resolvedDetail || "Vị trí GPS",
                ward: resolvedWard,
                city: "Đà Nẵng",
                isDefault: false,
                latitude,
                longitude,
              };
              setSuggestedAddress(updatedSugg);

              setSelectedAddress((prev) => {
                if (prev && prev.label === "Vị trí hiện tại") {
                  return updatedSugg as any;
                }
                if (addresses.length === 0) {
                  return updatedSugg as any;
                }
                return prev;
              });
            }
          })
          .catch((err) => {
            console.error("Photon reverse geocoding failed", err);
          })
          .finally(() => {
            setIsLocating(false);
          });
      },
      () => {
        setIsLocating(false);
        toast(
          "Không thể lấy vị trí hiện tại. Vui lòng cho phép quyền truy cập vị trí.",
          "error",
        );
      },
      { timeout: 8000 },
    );
  };

  // Geolocation trigger on mount
  useEffect(() => {
    // Only auto-locate if user has NO saved addresses
    if (addresses.length === 0 && !effectiveAddress) {
      handleLocateUser();
    }
  }, [addresses.length, effectiveAddress]);

  const handleCheckoutSubmit = async () => {
    if (!effectiveAddress) {
      toast("Vui lòng chọn hoặc thêm địa chỉ nhận hàng", "warning");
      return;
    }

    if (effectiveAddress.detail === "Định vị GPS") {
      toast(
        "Vui lòng nhập cụ thể số nhà, tên đường cho vị trí định vị hiện tại.",
        "warning",
      );
      return;
    }

    if (!effectiveAddress.detail?.trim()) {
      toast(
        "Vui lòng nhập cụ thể số nhà, tên đường của địa chỉ nhận hàng.",
        "warning",
      );
      return;
    }

    if (!effectiveAddress.receiverName?.trim()) {
      toast("Vui lòng nhập tên người nhận hàng.", "warning");
      return;
    }

    if (!effectiveAddress.phone?.trim()) {
      toast("Vui lòng nhập số điện thoại nhận hàng.", "warning");
      return;
    }

    handlePlaceOrder();
  };

  const handleSaveAddress = async (newAddr: AuthAddress) => {
    if (!user) return;
    const existing = user.addresses || [];
    let updated: AuthAddress[];

    if (editAddressIndex !== null) {
      // Edit existing
      updated = existing.map((a, i) => (i === editAddressIndex ? newAddr : a));
    } else {
      // Add new
      updated = [...existing, newAddr];
    }

    // Normalize default
    if (newAddr.isDefault) {
      updated = updated.map((a, i) => ({
        ...a,
        isDefault:
          editAddressIndex !== null
            ? i === editAddressIndex
            : i === updated.length - 1,
      }));
    } else if (!updated.some((a) => a.isDefault) && updated.length > 0) {
      updated[0] = { ...updated[0], isDefault: true };
    }

    const res = await userService.updateMe({
      addresses: sanitizeAddressesForApi(updated),
    });
    const updatedUser = res.data?.data;
    if (updatedUser) {
      setUser({
        ...user,
        addresses: (updatedUser as any).addresses ?? updated,
      });
    }

    setIsAddressModalOpen(false);
    setEditAddressIndex(null);
    // Auto-select the newly saved address
    setSelectedAddress(newAddr as any);
  };

  const handleDeleteAddress = async (idx: number) => {
    if (!user) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa địa chỉ này?")) return;

    const existing = user.addresses || [];
    const updated = existing.filter((_, i) => i !== idx);

    // If we deleted the default and there are remaining addresses, assign first as default
    if (existing[idx]?.isDefault && updated.length > 0) {
      updated[0] = { ...updated[0], isDefault: true };
    }

    try {
      const res = await userService.updateMe({
        addresses: sanitizeAddressesForApi(updated),
      });
      const updatedUser = res.data?.data;
      if (updatedUser) {
        setUser({
          ...user,
          addresses: (updatedUser as any).addresses ?? updated,
        });
      }

      // If we deleted the currently selected address, switch selection to new default
      const deletedWasSelected =
        effectiveAddress?.detail === existing[idx]?.detail &&
        effectiveAddress?.receiverName === existing[idx]?.receiverName;
      if (deletedWasSelected) {
        const newDefault =
          updated.find((a) => a.isDefault) ?? updated[0] ?? null;
        setSelectedAddress(newDefault as any);
      }
      toast("Xóa địa chỉ thành công", "success");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        "Xóa địa chỉ thất bại. Vui lòng thử lại.";
      toast(msg, "error");
    }
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
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleLocateUser}
                      disabled={isLocating}
                      className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-9 px-4 bg-emerald-600/10 text-emerald-600 text-sm font-semibold hover:bg-emerald-600/20 transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px] mr-1">
                        {isLocating ? "sync" : "my_location"}
                      </span>
                      <span>
                        {isLocating ? "Đang định vị..." : "Lấy vị trí GPS"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditAddressIndex(null);
                        setIsAddressModalOpen(true);
                      }}
                      className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-9 px-4 bg-orange-600/10 text-orange-600 text-sm font-semibold hover:bg-orange-600/20 transition-all"
                    >
                      <span>{t("customer:checkout.addAddress")}</span>
                    </button>
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-4">
                  {addresses.length === 0 && !suggestedAddress ? (
                    <div className="text-center py-6">
                      <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">
                        location_off
                      </span>
                      <p className="text-gray-500 text-sm mb-3">
                        Bạn chưa có địa chỉ giao hàng.
                      </p>
                      <button
                        onClick={() => {
                          setEditAddressIndex(null);
                          setIsAddressModalOpen(true);
                        }}
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
                      {/* Geolocation Suggested Address Card */}
                      {suggestedAddress &&
                        (() => {
                          const config = settings
                            ? {
                                baseDeliveryFee:
                                  parseFloat(settings.baseDeliveryFee) || 15000,
                                feePerKm: parseFloat(settings.feePerKm) || 5000,
                                freeDeliveryEnabled:
                                  settings.freeDeliveryEnabled,
                                freeDeliveryThreshold:
                                  parseFloat(settings.freeDeliveryThreshold) ||
                                  300000,
                              }
                            : undefined;
                          const suggAddrFee = calculateShippingFee(
                            suggestedAddress.ward ?? "",
                            suggestedAddress.city ?? "",
                            subtotal,
                            selectedStore?.location?.coordinates,
                            config,
                          );
                          const isSuggSelected =
                            effectiveAddress?.detail ===
                              suggestedAddress.detail &&
                            effectiveAddress?.ward === suggestedAddress.ward;
                          return (
                            <label
                              className={`flex items-start gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                                suggAddrFee.blocked
                                  ? "border-red-300 dark:border-red-800 opacity-80"
                                  : isSuggSelected
                                    ? "border-emerald-600 bg-emerald-600/5"
                                    : "border-gray-200 dark:border-gray-800 hover:border-emerald-600/50"
                              }`}
                              onClick={() =>
                                !suggAddrFee.blocked &&
                                setSelectedAddress(suggestedAddress as any)
                              }
                            >
                              <input
                                readOnly
                                className="h-5 w-5 mt-0.5 border-2 border-gray-300 text-emerald-600 focus:ring-emerald-600 focus:ring-offset-0 accent-emerald-600"
                                name="address"
                                type="radio"
                                checked={isSuggSelected && !suggAddrFee.blocked}
                                disabled={suggAddrFee.blocked}
                              />
                              <div className="flex grow flex-col gap-1">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                      <span className="material-symbols-outlined text-[18px]">
                                        my_location
                                      </span>
                                      Vị trí hiện tại (Đề xuất)
                                    </p>
                                  </div>
                                  {/* Fee badge */}
                                  {suggAddrFee.blocked ? (
                                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[14px]">
                                        block
                                      </span>
                                      Không giao được
                                    </span>
                                  ) : suggAddrFee.zone === "free" ? (
                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                      🎁 MIỄN PHÍ
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-600/10 px-2 py-0.5 rounded-full">
                                      Phí:{" "}
                                      {suggAddrFee.fee.toLocaleString("vi-VN")}đ{" "}
                                      {suggAddrFee.distance !== undefined &&
                                        `(${suggAddrFee.distance} km)`}
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                  {suggestedAddress.receiverName} •{" "}
                                  {suggestedAddress.phone || "Chưa có SĐT"}
                                </p>
                                <p className="text-gray-500 dark:text-gray-500 text-xs mt-0.5">
                                  {suggestedAddress.detail},{" "}
                                  {suggestedAddress.ward},{" "}
                                  {suggestedAddress.city}
                                </p>
                                {isSuggSelected && (
                                  <div
                                    className="mt-3 flex flex-col gap-3"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex flex-col gap-1">
                                      <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                        Tên người nhận:
                                      </label>
                                      <input
                                        type="text"
                                        value={suggestedAddress.receiverName}
                                        placeholder="Ví dụ: Nguyễn Văn A"
                                        onChange={(e) => {
                                          const updatedAddr = {
                                            ...suggestedAddress,
                                            receiverName: e.target.value,
                                          };
                                          setSuggestedAddress(updatedAddr);
                                          setSelectedAddress(
                                            updatedAddr as any,
                                          );
                                        }}
                                        className="w-full text-sm rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                      />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                      <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                        Số điện thoại:
                                      </label>
                                      <input
                                        type="text"
                                        value={suggestedAddress.phone}
                                        placeholder="Ví dụ: 0912345678"
                                        onChange={(e) => {
                                          const updatedAddr = {
                                            ...suggestedAddress,
                                            phone: e.target.value,
                                          };
                                          setSuggestedAddress(updatedAddr);
                                          setSelectedAddress(
                                            updatedAddr as any,
                                          );
                                        }}
                                        className="w-full text-sm rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                      />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                      <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                        Số nhà, tên đường cụ thể:
                                      </label>
                                      <input
                                        type="text"
                                        value={
                                          suggestedAddress.detail ===
                                          "Định vị GPS"
                                            ? ""
                                            : suggestedAddress.detail
                                        }
                                        placeholder="Ví dụ: 123 Nguyễn Văn Thoại"
                                        onChange={(e) => {
                                          const updatedVal = e.target.value;
                                          const updatedAddr = {
                                            ...suggestedAddress,
                                            detail: updatedVal || "Định vị GPS",
                                          };
                                          setSuggestedAddress(updatedAddr);
                                          setSelectedAddress(
                                            updatedAddr as any,
                                          );
                                        }}
                                        className="w-full text-sm rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </label>
                          );
                        })()}
                      {addresses.map((addr: any, idx: number) => {
                        const isSelected =
                          effectiveAddress?.detail === addr.detail &&
                          effectiveAddress?.receiverName === addr.receiverName;
                        // Compute fee badge for this address
                        const config = settings
                          ? {
                              baseDeliveryFee:
                                parseFloat(settings.baseDeliveryFee) || 15000,
                              feePerKm: parseFloat(settings.feePerKm) || 5000,
                              freeDeliveryEnabled: settings.freeDeliveryEnabled,
                              freeDeliveryThreshold:
                                parseFloat(settings.freeDeliveryThreshold) ||
                                300000,
                            }
                          : undefined;
                        const addrFee = calculateShippingFee(
                          addr.ward ?? "",
                          addr.city ?? "",
                          subtotal,
                          selectedStore?.location?.coordinates,
                          config,
                        );
                        const isAddrBlocked = addrFee.blocked;
                        return (
                          <label
                            key={idx}
                            className={`flex items-start gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                              isAddrBlocked
                                ? "border-red-300 dark:border-red-800 opacity-80"
                                : isSelected
                                  ? "border-orange-600 bg-orange-600/5"
                                  : "border-gray-200 dark:border-gray-800 hover:border-orange-600/50"
                            }`}
                            onClick={() =>
                              !isAddrBlocked && setSelectedAddress(addr)
                            }
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
                                <div className="flex items-center gap-3">
                                  {isAddrBlocked ? (
                                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[14px]">
                                        block
                                      </span>
                                      Không giao được
                                    </span>
                                  ) : addrFee.zone === "free" ? (
                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                      🎁 MIỄN PHÍ
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-semibold text-orange-600 bg-orange-600/10 px-2 py-0.5 rounded-full">
                                      Phí: {addrFee.fee.toLocaleString("vi-VN")}
                                      đ{" "}
                                      {addrFee.distance !== undefined &&
                                        `(${addrFee.distance} km)`}
                                    </span>
                                  )}

                                  {/* Edit / Delete actions */}
                                  <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-800 pl-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setEditAddressIndex(idx);
                                        setIsAddressModalOpen(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-orange-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md transition-colors flex items-center justify-center cursor-pointer"
                                      title="Sửa địa chỉ"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        edit
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeleteAddress(idx);
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md transition-colors flex items-center justify-center cursor-pointer"
                                      title="Xóa địa chỉ"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        delete
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <p className="text-gray-600 dark:text-gray-400 text-sm">
                                {addr.receiverName} • {addr.phone}
                              </p>
                              <p className="text-gray-500 dark:text-gray-500 text-xs mt-0.5">
                                {addr.detail}, {addr.ward}, {addr.city}
                              </p>
                              {isAddrBlocked && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">
                                    info
                                  </span>
                                  Hiện chỉ giao trong khu vực Đà Nẵng (7 phường
                                  nội thành)
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                      {/* Out-of-zone warning banner */}
                      {effectiveAddress && !isDeliverable && (
                        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
                          <span className="material-symbols-outlined text-red-500 text-xl shrink-0">
                            location_off
                          </span>
                          <div>
                            <p className="text-sm font-bold text-red-700 dark:text-red-400">
                              Địa chỉ nằm ngoài vùng giao hàng
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                              {shippingResult.reason ??
                                "Hiện tại chỉ giao hàng trong khu vực Đà Nẵng"}
                            </p>
                          </div>
                        </div>
                      )}
                      {hasUnavailableCartItems && (
                        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
                          <span className="material-symbols-outlined text-red-500 text-xl shrink-0">
                            info
                          </span>
                          <p className="text-sm font-bold text-red-700 dark:text-red-400">
                            Một số món ở chi nhánh này đã hết. Nhấn vào sản phẩm
                            để biết cửa hàng nào còn.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>

              {selectedStore &&
                nearestStoreSuggestion &&
                hasCloserStoreSuggestion && (
                  <section
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setIsNearestStoreModalOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setIsNearestStoreModalOpen(true);
                      }
                    }}
                    className={`rounded-xl border p-4 ${
                      hasCloserStoreSuggestion
                        ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 cursor-pointer transition-all hover:border-amber-300 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:hover:border-amber-700 dark:hover:bg-amber-900/20"
                        : "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className={`material-symbols-outlined text-xl shrink-0 ${
                            hasCloserStoreSuggestion
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {hasCloserStoreSuggestion ? "near_me" : "store"}
                        </span>
                        <div>
                          <p
                            className={`text-sm font-bold ${
                              hasCloserStoreSuggestion
                                ? "text-amber-800 dark:text-amber-300"
                                : "text-emerald-800 dark:text-emerald-300"
                            }`}
                          >
                            Có chi nhánh gần địa chỉ này hơn
                          </p>
                          <p className="text-sm font-semibold text-[#1b140d] dark:text-white mt-0.5">
                            {nearestStoreSuggestion.store.name}
                          </p>
                          <p
                            className={`text-xs mt-0.5 ${
                              hasCloserStoreSuggestion
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-emerald-700 dark:text-emerald-400"
                            }`}
                          >
                            {nearestStoreSuggestion.store.address}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                        {selectedStoreDistance !== null && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-zinc-900 px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700">
                            <span className="material-symbols-outlined text-[14px]">
                              store
                            </span>
                            Đang chọn: {formatDistance(selectedStoreDistance)}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full bg-white dark:bg-zinc-900 px-3 py-1 text-xs font-bold border ${
                            hasCloserStoreSuggestion
                              ? "text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                              : "text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            near_me
                          </span>
                          {formatDistance(nearestStoreSuggestion.distance)}
                        </span>
                        {hasCloserStoreSuggestion && (
                          <button
                            type="button"
                            onClick={() => setIsNearestStoreModalOpen(true)}
                            className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700 transition-colors"
                          >
                            Xem gợi ý
                          </button>
                        )}
                      </div>
                    </div>
                  </section>
                )}

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
                      className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl gap-2 transition-all ${
                        paymentMethod === "cash"
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
                        className={`w-full flex flex-col items-center justify-center p-4 rounded-xl gap-2 transition-all ${
                          total < 2000
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
                  <div className="flex flex-col gap-3 mb-6 max-h-52 overflow-y-auto overflow-x-hidden pr-1">
                    {selectedCartItems.map((item) => {
                      const isUnavailable = Boolean(item.unavailable);

                      return (
                        <div
                          key={item.productId}
                          aria-disabled={isUnavailable}
                          role={isUnavailable ? "button" : undefined}
                          tabIndex={isUnavailable ? 0 : undefined}
                          onClick={
                            isUnavailable
                              ? openCompatibleStoresModal
                              : undefined
                          }
                          onKeyDown={
                            isUnavailable
                              ? (event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    openCompatibleStoresModal();
                                  }
                                }
                              : undefined
                          }
                          className={`flex w-full justify-between items-center gap-3 rounded-lg ${
                            isUnavailable
                              ? "cursor-pointer p-2 grayscale opacity-70 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 dark:hover:bg-red-950/20"
                              : ""
                          }`}
                        >
                          <div className="flex flex-1 gap-3 items-center min-w-0">
                            {item.image && (
                              <div
                                className="size-10 rounded-lg bg-gray-100 bg-cover bg-center shrink-0"
                                style={{
                                  backgroundImage: `url('${item.image}')`,
                                }}
                              />
                            )}
                            <div className="min-w-0 flex-1">
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
                          <div className="w-[86px] shrink-0 text-right">
                            <p
                              className={`text-sm font-bold ${
                                isUnavailable ? "line-through" : ""
                              }`}
                            >
                              {(item.price * item.quantity).toLocaleString(
                                "vi-VN",
                              )}
                              đ
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Voucher Input */}
                  <div className="mb-5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      {t("customer:cart.voucherCode")}
                    </label>

                    {voucherState.appliedVoucher ? (
                      /* Applied voucher badge */
                      <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-xl px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-green-600">
                            local_offer
                          </span>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-green-700 dark:text-green-400">
                              {voucherState.appliedVoucher.title}
                            </span>
                            <span className="text-[10px] font-bold text-green-600">
                              Đã giảm: {discount.toLocaleString("vi-VN")}đ
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setIsVouchersOpen(true)}
                            className="text-xs font-bold text-orange-600 hover:underline"
                          >
                            Thay đổi
                          </button>
                          <button
                            type="button"
                            onClick={removeVoucher}
                            className="text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center cursor-pointer"
                            title="Bỏ áp dụng"
                          >
                            <span className="material-symbols-outlined text-lg">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Button to open popup */
                      <button
                        type="button"
                        onClick={() => setIsVouchersOpen(true)}
                        className="w-full flex items-center justify-between border-2 border-dashed border-gray-200 dark:border-zinc-800 hover:border-orange-500 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 transition-all bg-slate-50/50 dark:bg-zinc-800/20 hover:bg-orange-500/[0.02]"
                      >
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">
                            confirmation_number
                          </span>
                          Chọn khuyến mãi / Voucher
                        </span>
                        <span className="material-symbols-outlined text-lg">
                          chevron_right
                        </span>
                      </button>
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
                      availableCartItems.length === 0 ||
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

                  {hasUnavailableCartItems &&
                    availableCartItems.length === 0 && (
                      <p className="text-xs text-center text-red-600 mt-2 flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-sm">
                          block
                        </span>
                        Không có sản phẩm khả dụng để thanh toán
                      </p>
                    )}

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
                      <span className="material-symbols-outlined text-sm">
                        block
                      </span>
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

      {isNearestStoreModalOpen &&
        hasCloserStoreSuggestion &&
        selectedStore &&
        nearestStoreSuggestion && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-zinc-800">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-2xl text-orange-600">
                    near_me
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    Chọn chi nhánh giao hàng
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={keepCurrentStore}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-slate-200"
                  aria-label="Đóng gợi ý chi nhánh"
                >
                  <span className="material-symbols-outlined text-lg">
                    close
                  </span>
                </button>
              </div>

              <div className="max-h-[60vh] space-y-3 overflow-y-auto p-6">
                {storesSortedByDistance.map(({ store, distance }, index) => {
                  const isCurrentStore = selectedStore._id === store._id;
                  const isNearestCandidate = !isCurrentStore && index <= 1;

                  return (
                    <button
                      key={store._id}
                      type="button"
                      onClick={() =>
                        isCurrentStore
                          ? keepCurrentStore()
                          : switchToStoreCandidate(store)
                      }
                      disabled={Boolean(switchingStoreId)}
                      className={`w-full rounded-xl p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-wait disabled:opacity-70 ${
                        isCurrentStore
                          ? "border-2 border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-900/10 dark:hover:border-emerald-800 dark:hover:bg-emerald-900/20"
                          : isNearestCandidate
                            ? "border-2 border-orange-200 bg-orange-50 hover:border-orange-300 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-900/10 dark:hover:border-orange-800 dark:hover:bg-orange-900/20"
                            : "border border-gray-200 hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p
                          className={`text-xs font-bold uppercase ${
                            isCurrentStore
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isNearestCandidate
                                ? "text-orange-600"
                                : "text-slate-400"
                          }`}
                        >
                          {isCurrentStore
                            ? "Đang chọn"
                            : isNearestCandidate
                              ? "Gần nhất"
                              : "Chi nhánh"}
                        </p>
                        {distance !== null && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold dark:bg-zinc-900 ${
                              isCurrentStore
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-orange-700 dark:text-orange-300"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              near_me
                            </span>
                            {formatDistance(distance)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                        {store.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {store.address}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      {isCompatibleStoresModalOpen && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-zinc-800">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-2xl text-orange-600">
                  store
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    Chi nhánh phù hợp
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Các chi nhánh dưới đây còn đủ món trong khối tổng cộng.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCompatibleStoresModalOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-slate-200"
                aria-label="Đóng danh sách chi nhánh phù hợp"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto p-6">
              {isLoadingCompatibleStores ? (
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm font-bold text-orange-700 dark:border-orange-900/60 dark:bg-orange-900/10 dark:text-orange-300">
                  Đang kiểm tra chi nhánh phù hợp...
                </div>
              ) : compatibleStoresError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                  {compatibleStoresError}
                </div>
              ) : compatibleStores.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-slate-300">
                  Chưa có chi nhánh nào còn đủ các món trong đơn hiện tại.
                </div>
              ) : (
                compatibleStores.map((store) => {
                  const distance = getStoreDistance(store);
                  const isCurrentStore = selectedStore?._id === store._id;

                  return (
                    <button
                      key={store._id}
                      type="button"
                      onClick={() => chooseCompatibleStore(store)}
                      className="w-full rounded-xl border border-gray-200 p-4 text-left transition-all hover:border-orange-300 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:hover:border-orange-900/70 dark:hover:bg-orange-900/10"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                          Còn đủ món
                        </p>
                        <div className="flex items-center gap-2">
                          {isCurrentStore && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                              Đang chọn
                            </span>
                          )}
                          {distance !== null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                              <span className="material-symbols-outlined text-[13px]">
                                near_me
                              </span>
                              {formatDistance(distance)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                        {store.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {store.address}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => {
          setIsAddressModalOpen(false);
          setEditAddressIndex(null);
        }}
        onSave={handleSaveAddress}
        initialData={
          editAddressIndex !== null ? addresses[editAddressIndex] : null
        }
        isFirstAddress={addresses.length === 0}
      />

      {/* Voucher Selection Modal (Popup) */}
      {isVouchersOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-600 text-xl font-bold">
                  local_offer
                </span>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                  Chọn Khuyến Mãi / Voucher
                </h3>
              </div>
              <button
                onClick={() => setIsVouchersOpen(false)}
                className="p-2 bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6 scrollbar-thin">
              {/* Manual Input Section */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Nhập mã khuyến mãi thủ công
                </label>
                <div className="flex gap-2">
                  <input
                    value={voucherState.code}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      handleApplyVoucherCode(voucherState.code)
                    }
                    className="flex-1 rounded-xl border border-gray-200 dark:border-zinc-800 dark:bg-zinc-800 focus:border-orange-600 focus:ring-orange-500 text-sm uppercase font-bold px-4 py-2.5 outline-none text-slate-800 dark:text-slate-100"
                    placeholder="MÃ GIẢM GIÁ"
                    type="text"
                    maxLength={20}
                    disabled={voucherState.isValidating}
                  />
                  <button
                    onClick={() => {
                      handleApplyVoucherCode(voucherState.code);
                    }}
                    disabled={
                      !voucherState.code.trim() || voucherState.isValidating
                    }
                    className="bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                  >
                    {voucherState.isValidating ? (
                      <span className="material-symbols-outlined animate-spin text-sm">
                        progress_activity
                      </span>
                    ) : (
                      "Áp dụng"
                    )}
                  </button>
                </div>
                {voucherState.error && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">
                      error
                    </span>
                    {voucherState.error}
                  </p>
                )}
              </div>

              {/* List of Vouchers */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Voucher sẵn có
                </p>
                {(() => {
                  if (vouchers.length === 0) {
                    return (
                      <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl">
                        Hiện chưa có voucher nào khả dụng
                      </p>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-4 max-h-[40vh] overflow-y-auto pr-1">
                      {vouchers.map((v) => {
                        const unavailableReason =
                          getVoucherUnavailableReason(v);
                        const isUnavailable = Boolean(unavailableReason);
                        const isApplied =
                          voucherState.appliedVoucher?._id === v._id;

                        return (
                          <div
                            key={v._id}
                            onClick={
                              isUnavailable
                                ? undefined
                                : () => {
                                    handleApplyVoucherCode(v.code);
                                    setIsVouchersOpen(false);
                                  }
                            }
                            aria-disabled={isUnavailable}
                            title={unavailableReason || undefined}
                            className={`relative rounded-xl transition-all ${
                              isUnavailable
                                ? "cursor-not-allowed opacity-50 grayscale"
                                : "cursor-pointer hover:scale-[1.01]"
                            }`}
                          >
                            <TicketVoucher
                              code={v.code}
                              title={v.title}
                              discountValue={getVoucherDiscountLabel(v)}
                              minOrder={
                                v.minOrderValue
                                  ? `${v.minOrderValue.toLocaleString("vi-VN")}đ`
                                  : "0đ"
                              }
                              className={`${
                                isApplied ? "ring-2 ring-orange-600" : ""
                              } shadow-sm transition-all pointer-events-none`}
                            />

                            {isUnavailable ? (
                              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-rose-600 px-1">
                                <span className="material-symbols-outlined text-sm">
                                  lock
                                </span>
                                {unavailableReason}
                              </p>
                            ) : (
                              v.minTier && (
                                <p className="mt-1.5 text-[11px] font-bold text-orange-600 px-1">
                                  Áp dụng từ hạng {getTierLabel(v.minTier)}
                                </p>
                              )
                            )}

                            {isApplied && (
                              <span className="absolute top-3 right-3 bg-orange-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase shadow-sm flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">
                                  check
                                </span>
                                Đang dùng
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 border-t border-gray-100 dark:border-zinc-800 flex gap-3">
              <button
                onClick={() => setIsVouchersOpen(false)}
                className="flex-1 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
