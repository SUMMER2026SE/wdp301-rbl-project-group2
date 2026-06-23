import type { Order } from "@/services/order.service";
import type { CampaignSuggestionKind } from "@/types/campaignDraft";
import { isCompletedOrder } from "@/utils/adminDboard";

export type StorePerformanceStatus = "good" | "stable" | "warning";
export type StoreReadiness = "ready" | "watch" | "not_ready";

export type StoreOption = {
  _id: string;
  name?: string;
  storeName?: string;
  address?: string;
  district?: string;
  isActive?: boolean;
};

type StoreIdentity = {
  id: string;
  name: string;
};

type ProductIdentity = {
  id: string;
  name: string;
};

type ProductAccumulator = {
  productId: string;
  productName: string;
  quantitySold: number;
  orderIds: Set<string>;
  revenue: number;
};

type StoreAccumulator = {
  storeId: string;
  storeName: string;
  orderIds: Set<string>;
  revenue: number;
  products: Map<string, ProductAccumulator>;
};

export type StorePerformanceItem = {
  storeId: string;
  storeName: string;
  revenue: number;
  orderCount: number;
  previousRevenue: number;
  growthPercent: number | null;
  topProductName: string;
  status: StorePerformanceStatus;
  statusLabel: string;
};

export type ProductStoreBreakdown = {
  storeId: string;
  storeName: string;
  quantitySold: number;
  orderCount: number;
  revenue: number;
  previousQuantitySold: number;
  growthPercent: number | null;
  readiness: StoreReadiness;
  reason: string;
};

export type ProductPerformanceItem = {
  productId: string;
  productName: string;
  quantitySold: number;
  orderCount: number;
  revenue: number;
  previousQuantitySold: number;
  growthPercent: number | null;
  eligibleStoreCount: number;
  totalStoreCount: number;
  coveragePercent: number;
  averageGrowthPercent: number | null;
  isSystemEligible: boolean;
  suggestion: CampaignSuggestionKind;
  suggestionLabel: string;
  suggestionReason: string;
  storeBreakdown: ProductStoreBreakdown[];
};

export type ProductPerformanceAnalysis = {
  periodDays: number;
  storePerformance: StorePerformanceItem[];
  productPerformance: ProductPerformanceItem[];
};

export type ProductPerformanceOptions = {
  stores?: StoreOption[];
  storeId?: string;
  now?: Date;
};

const ALL_STORES_ID = "all";
const SYSTEM_ELIGIBLE_COVERAGE_PERCENT = 60;
const STRONG_GROWTH_PERCENT = 20;

const getStoreIdentity = (order: Order): StoreIdentity => {
  const store = order.storeId;

  if (typeof store === "object" && store) {
    return {
      id: store._id,
      name:
        store.storeName ||
        store.name ||
        `Cửa hàng ${store._id.slice(-4).toUpperCase()}`,
    };
  }

  if (typeof store === "string" && store.length > 0) {
    return {
      id: store,
      name: `Cửa hàng ${store.slice(-4).toUpperCase()}`,
    };
  }

  return {
    id: "unknown-store",
    name: "Cửa hàng chưa xác định",
  };
};

const getProductIdentity = (item: Order["items"][number]): ProductIdentity => {
  if (typeof item.productId === "object" && item.productId) {
    return {
      id: item.productId._id,
      name: item.name || item.productId.name || "Món không xác định",
    };
  }

  return {
    id: String(item.productId || item.name || "unknown-product"),
    name: item.name || "Món không xác định",
  };
};

const getGrowthPercent = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
};

const summarizeByStore = (orders: Order[]): Map<string, StoreAccumulator> => {
  const stores = new Map<string, StoreAccumulator>();

  orders.forEach((order) => {
    const store = getStoreIdentity(order);

    if (store.id === "unknown-store") return;

    const currentStore = stores.get(store.id) ?? {
      storeId: store.id,
      storeName: store.name,
      orderIds: new Set<string>(),
      revenue: 0,
      products: new Map<string, ProductAccumulator>(),
    };

    currentStore.orderIds.add(order._id);
    currentStore.revenue += Number(order.totalPrice || order.subTotal || 0);

    order.items.forEach((item) => {
      const product = getProductIdentity(item);

      const currentProduct = currentStore.products.get(product.id) ?? {
        productId: product.id,
        productName: product.name,
        quantitySold: 0,
        orderIds: new Set<string>(),
        revenue: 0,
      };

      currentProduct.quantitySold += Number(item.quantity || 0);
      currentProduct.revenue += Number(item.subTotal || 0);
      currentProduct.orderIds.add(order._id);

      currentStore.products.set(product.id, currentProduct);
    });

    stores.set(store.id, currentStore);
  });

  return stores;
};

const flattenProducts = (
  stores: Map<string, StoreAccumulator>,
): Map<string, ProductAccumulator> => {
  const products = new Map<string, ProductAccumulator>();

  stores.forEach((store) => {
    store.products.forEach((storeProduct) => {
      const current = products.get(storeProduct.productId) ?? {
        productId: storeProduct.productId,
        productName: storeProduct.productName,
        quantitySold: 0,
        orderIds: new Set<string>(),
        revenue: 0,
      };

      current.quantitySold += storeProduct.quantitySold;
      current.revenue += storeProduct.revenue;
      storeProduct.orderIds.forEach((id) => current.orderIds.add(id));

      products.set(storeProduct.productId, current);
    });
  });

  return products;
};

const getTopProductName = (store: StoreAccumulator | undefined): string => {
  if (!store || store.products.size === 0) return "Chưa có dữ liệu";

  return [...store.products.values()].sort(
    (a, b) =>
      b.quantitySold - a.quantitySold ||
      b.revenue - a.revenue ||
      a.productName.localeCompare(b.productName, "vi"),
  )[0].productName;
};

const getStoreStatus = (
  revenue: number,
  growthPercent: number | null,
): Pick<StorePerformanceItem, "status" | "statusLabel"> => {
  if (revenue <= 0) {
    return {
      status: "warning",
      statusLabel: "Chưa có doanh thu",
    };
  }

  if (growthPercent === null || growthPercent >= STRONG_GROWTH_PERCENT) {
    return {
      status: "good",
      statusLabel: "Tốt",
    };
  }

  if (growthPercent >= -10) {
    return {
      status: "stable",
      statusLabel: "Ổn định",
    };
  }

  return {
    status: "warning",
    statusLabel: "Cần theo dõi",
  };
};

const getReadiness = (
  quantitySold: number,
  growthPercent: number | null,
): Pick<ProductStoreBreakdown, "readiness" | "reason"> => {
  if (quantitySold <= 0) {
    return {
      readiness: "not_ready",
      reason: "Chưa có doanh số trong kỳ này",
    };
  }

  if (growthPercent === null) {
    return {
      readiness: "ready",
      reason: "Món mới phát sinh doanh số trong kỳ này",
    };
  }

  if (growthPercent >= 0) {
    return {
      readiness: "ready",
      reason: `Sức bán tăng ${growthPercent.toFixed(1)}%`,
    };
  }

  return {
    readiness: "watch",
    reason: `Sức bán giảm ${Math.abs(growthPercent).toFixed(
      1,
    )}%; phù hợp chạy phục hồi`,
  };
};

const getSystemSuggestion = (
  rank: number,
  eligibleStoreCount: number,
  totalStoreCount: number,
  coveragePercent: number,
  averageGrowthPercent: number | null,
  isSystemEligible: boolean,
) => {
  if (!isSystemEligible) {
    return {
      suggestion: "maintain" as const,
      suggestionLabel: "Chưa đủ điều kiện",
      suggestionReason: `Chỉ ${eligibleStoreCount}/${totalStoreCount} cửa hàng có tín hiệu phù hợp (${coveragePercent.toFixed(
        0,
      )}%). Chưa nên tạo campaign áp dụng toàn bộ cửa hàng.`,
    };
  }

  if (averageGrowthPercent !== null && averageGrowthPercent < 0) {
    return {
      suggestion: "recover" as const,
      suggestionLabel: "Chiến dịch phục hồi",
      suggestionReason: `Món có tín hiệu ở ${eligibleStoreCount}/${totalStoreCount} cửa hàng (${coveragePercent.toFixed(
        0,
      )}%) nhưng tăng trưởng trung bình đang giảm ${Math.abs(
        averageGrowthPercent,
      ).toFixed(
        1,
      )}%. Phù hợp chạy ưu đãi phục hồi ngắn hạn và kiểm tra nguyên nhân giảm.`,
    };
  }

  if (
    averageGrowthPercent === null ||
    averageGrowthPercent >= STRONG_GROWTH_PERCENT
  ) {
    return {
      suggestion: "scale" as const,
      suggestionLabel: "Tăng độ phủ",
      suggestionReason: `Món đạt điều kiện ở ${eligibleStoreCount}/${totalStoreCount} cửa hàng (${coveragePercent.toFixed(
        0,
      )}%). Phù hợp để tăng hiển thị hoặc giảm nhẹ trên toàn hệ thống.`,
    };
  }

  if (rank <= 3) {
    return {
      suggestion: "bundle" as const,
      suggestionLabel: "Tạo combo",
      suggestionReason: `Món nằm trong nhóm bán chạy và đủ điều kiện ở ${eligibleStoreCount}/${totalStoreCount} cửa hàng; phù hợp làm món chủ lực trong combo.`,
    };
  }

  return {
    suggestion: "maintain" as const,
    suggestionLabel: "Duy trì",
    suggestionReason: `Món đủ độ phủ ở ${eligibleStoreCount}/${totalStoreCount} cửa hàng nhưng tăng trưởng chưa mạnh; nên theo dõi hoặc tăng hiển thị nhẹ.`,
  };
};

export const getProductPerformance = (
  orders: Order[],
  periodDays: number,
  options: ProductPerformanceOptions = {},
): ProductPerformanceAnalysis => {
  const { stores = [], storeId = ALL_STORES_ID, now = new Date() } = options;

  const periodMs = Math.max(1, periodDays) * 24 * 60 * 60 * 1000;
  const currentStart = new Date(now.getTime() - periodMs);
  const previousStart = new Date(currentStart.getTime() - periodMs);

  const validStoreIds = new Set(stores.map((store) => store._id));

  const completedOrders = orders.filter((order) => {
    if (!isCompletedOrder(order.status)) return false;
    return !Number.isNaN(new Date(order.createdAt).getTime());
  });

  const scopedCompletedOrders = completedOrders.filter((order) => {
    const orderStoreId = getStoreIdentity(order).id;

    if (orderStoreId === "unknown-store") return false;

    if (storeId !== ALL_STORES_ID) {
      return orderStoreId === storeId;
    }

    if (validStoreIds.size > 0) {
      return validStoreIds.has(orderStoreId);
    }

    return true;
  });

  const currentOrders = scopedCompletedOrders.filter((order) => {
    const createdAt = new Date(order.createdAt);
    return createdAt >= currentStart && createdAt <= now;
  });

  const previousOrders = scopedCompletedOrders.filter((order) => {
    const createdAt = new Date(order.createdAt);
    return createdAt >= previousStart && createdAt < currentStart;
  });

  const currentStores = summarizeByStore(currentOrders);
  const previousStores = summarizeByStore(previousOrders);

  const currentProducts = flattenProducts(currentStores);
  const previousProducts = flattenProducts(previousStores);

  const storeIdentityMap = new Map<string, StoreIdentity>();

  stores
    .filter((store) => {
      if (storeId === ALL_STORES_ID) return true;
      return store._id === storeId;
    })
    .forEach((store) => {
      storeIdentityMap.set(store._id, {
        id: store._id,
        name:
          store.storeName ||
          store.name ||
          `Cửa hàng ${store._id.slice(-4).toUpperCase()}`,
      });
    });

  [...currentStores.values(), ...previousStores.values()].forEach((store) => {
    if (store.storeId === "unknown-store") return;
    if (storeId !== ALL_STORES_ID && store.storeId !== storeId) return;

    if (!storeIdentityMap.has(store.storeId)) {
      storeIdentityMap.set(store.storeId, {
        id: store.storeId,
        name: store.storeName,
      });
    }
  });

  const storePerformance = [...storeIdentityMap.values()]
    .map((store) => {
      const current = currentStores.get(store.id);
      const previous = previousStores.get(store.id);

      const revenue = current?.revenue ?? 0;
      const previousRevenue = previous?.revenue ?? 0;
      const growthPercent = getGrowthPercent(revenue, previousRevenue);
      const status = getStoreStatus(revenue, growthPercent);

      return {
        storeId: store.id,
        storeName: store.name,
        revenue,
        orderCount: current?.orderIds.size ?? 0,
        previousRevenue,
        growthPercent,
        topProductName: getTopProductName(current),
        ...status,
      };
    })
    .sort(
      (a, b) =>
        b.revenue - a.revenue ||
        b.orderCount - a.orderCount ||
        a.storeName.localeCompare(b.storeName, "vi"),
    );

  const storeList = [...storeIdentityMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "vi"),
  );

  const totalStoreCount = Math.max(storeList.length, 1);

  const productPerformance = [...currentProducts.values()]
    .sort(
      (a, b) =>
        b.quantitySold - a.quantitySold ||
        b.revenue - a.revenue ||
        a.productName.localeCompare(b.productName, "vi"),
    )
    .map((product, index) => {
      const previousQuantitySold =
        previousProducts.get(product.productId)?.quantitySold ?? 0;

      const growthPercent = getGrowthPercent(
        product.quantitySold,
        previousQuantitySold,
      );

      const storeBreakdown = storeList.map((store) => {
        const currentStoreProduct = currentStores
          .get(store.id)
          ?.products.get(product.productId);

        const previousStoreProduct = previousStores
          .get(store.id)
          ?.products.get(product.productId);

        const quantitySold = currentStoreProduct?.quantitySold ?? 0;
        const previousStoreQuantitySold =
          previousStoreProduct?.quantitySold ?? 0;

        const storeGrowthPercent = getGrowthPercent(
          quantitySold,
          previousStoreQuantitySold,
        );

        const readiness = getReadiness(quantitySold, storeGrowthPercent);

        return {
          storeId: store.id,
          storeName: store.name,
          quantitySold,
          orderCount: currentStoreProduct?.orderIds.size ?? 0,
          revenue: currentStoreProduct?.revenue ?? 0,
          previousQuantitySold: previousStoreQuantitySold,
          growthPercent: storeGrowthPercent,
          ...readiness,
        };
      });

      const eligibleStoreCount = storeBreakdown.filter(
        (item) => item.readiness === "ready" || item.readiness === "watch",
      ).length;

      const coveragePercent = (eligibleStoreCount / totalStoreCount) * 100;

      const growthValues = storeBreakdown
        .map((item) => item.growthPercent)
        .filter((value): value is number => value !== null);

      const averageGrowthPercent =
        growthValues.length === 0
          ? null
          : growthValues.reduce((sum, value) => sum + value, 0) /
            growthValues.length;

      const hasEnoughCoverage =
        coveragePercent >= SYSTEM_ELIGIBLE_COVERAGE_PERCENT;

      const hasCurrentDemand = product.quantitySold > 0;

      const isSystemEligible = hasEnoughCoverage && hasCurrentDemand;

      const suggestion = getSystemSuggestion(
        index + 1,
        eligibleStoreCount,
        totalStoreCount,
        coveragePercent,
        averageGrowthPercent,
        isSystemEligible,
      );

      return {
        productId: product.productId,
        productName: product.productName,
        quantitySold: product.quantitySold,
        orderCount: product.orderIds.size,
        revenue: product.revenue,
        previousQuantitySold,
        growthPercent,
        eligibleStoreCount,
        totalStoreCount,
        coveragePercent,
        averageGrowthPercent,
        isSystemEligible,
        storeBreakdown,
        ...suggestion,
      };
    });

  return {
    periodDays,
    storePerformance,
    productPerformance,
  };
};
