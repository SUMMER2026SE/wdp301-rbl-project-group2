import React, { useEffect, useMemo, useState } from "react";
import { History, Plus, Loader2 } from "lucide-react";
import orderService, { type Order } from "@/services/order.service";
import { useTranslation } from "react-i18next";
import { useSafeCart } from "@/hooks/useSafeCart";
import { showAddToCartFeedback } from "@/utils/flyToCart";
import productAPI from "@/services/product.service";

const formatRelativeTime = (isoDate: string) => {
  const created = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return created.toLocaleDateString("vi-VN");
};

const getImageUrl = (image: any): string => {
  if (!image) return "";
  if (typeof image === "string") return image;
  return image.secureUrl || image.url || "";
};

const HistorySection: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { t } = useTranslation(["customer"]);
  const { addItem, safeAddItem } = useSafeCart();

  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        setLoading(true);
        const res = await orderService.getMyOrders(1, 10);
        setOrders(res.data || []);
      } catch (error) {
        console.error("Failed to fetch recent orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentOrders();
  }, []);

  type HistoryProduct = {
    productId: string;
    name: string;
    image: string;
    price: number;
    lastOrderedAt: string;
    timesOrdered: number;
  };

  const recentProducts: HistoryProduct[] = useMemo(() => {
    const productMap = new Map<string, HistoryProduct>();

    const completedOrders = orders
      .filter((order) => order.status === "completed")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const product: any = item.productId;
        const productId =
          typeof product === "string" ? product : product?._id;
        if (!productId) return;

        const basePrice =
          typeof product?.price === "number"
            ? product.price
            : item.quantity > 0
              ? item.subTotal / item.quantity
              : item.subTotal;

        const existing = productMap.get(productId);
        if (!existing) {
          productMap.set(productId, {
            productId,
            name: product?.name || "Món đã đặt",
            image: getImageUrl(product?.image),
            price: basePrice,
            lastOrderedAt: order.createdAt,
            timesOrdered: 1,
          });
        } else {
          existing.timesOrdered += 1;
          if (
            new Date(order.createdAt).getTime() >
            new Date(existing.lastOrderedAt).getTime()
          ) {
            existing.lastOrderedAt = order.createdAt;
          }
        }
      });
    });

    return Array.from(productMap.values())
      .sort(
        (a, b) =>
          new Date(b.lastOrderedAt).getTime() -
          new Date(a.lastOrderedAt).getTime(),
      )
      .slice(0, 3);
  }, [orders]);

  return (
    <section>
      <div className="flex items-center gap-3 mb-6 opacity-80">
        <History className="w-5 h-5 text-orange-600" />
        <h3 className="font-bold text-slate-600 text-sm uppercase tracking-wider">
          Đặt lại đơn cũ
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
        </div>
      ) : recentProducts.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-6 text-center text-sm text-gray-500">
          Bạn chưa có món ăn nào trong lịch sử để gợi ý lại. Hãy thử đặt món
          ngay hôm nay!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recentProducts.map((item) => {
            const dateLabel = formatRelativeTime(item.lastOrderedAt);
            const timesLabel =
              item.timesOrdered > 1
                ? `${item.timesOrdered} lần đã gọi`
                : "Đã thử 1 lần";

            return (
              <div
                key={item.productId}
                className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-2xl hover:border-orange-200 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                      Không có ảnh
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 truncate">
                    {item.name}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {dateLabel} • {timesLabel}
                  </p>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <p className="font-bold text-orange-600">
                    {item.price.toLocaleString("vi-VN")}đ
                  </p>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const cartItem = {
                        productId: item.productId,
                        name: item.name,
                        image: item.image,
                        price: item.price,
                        quantity: 1,
                      };
                      const showFeedback = () => {
                        showAddToCartFeedback(
                        e.currentTarget,
                        item.image,
                        t("customer:foodCard.addedToCart", "Đã thêm sản phẩm vào giỏ hàng!"),
                        );
                      };

                      try {
                        const response = await productAPI.getProductById(item.productId);
                        safeAddItem(response.data, cartItem, showFeedback);
                      } catch (error) {
                        console.error("Failed to load product for allergy check:", error);
                        addItem(cartItem);
                        showFeedback();
                      }
                    }}
                    className="mt-1 w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors cursor-pointer"
                    aria-label="Đặt lại món ăn này"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default HistorySection;
