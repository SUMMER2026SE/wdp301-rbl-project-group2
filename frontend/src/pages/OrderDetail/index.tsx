import { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  User,
  Phone,
  ReceiptText,
} from "lucide-react";
import orderService from "@/services/order.service";
import type { Order } from "@/services/order.service";
import { buildVariantChips } from "@/utils/cartVariants";
import { useAuth } from "@/hooks/useAuth";
import { OrderSupportChat } from "@/components/shared/OrderSupportChat";

const OrderDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(["customer", "common"]);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isStaff, isAdmin } = useAuth();
  const isStaffView = isStaff || isAdmin;

  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await orderService.getOrderById(id);
        setOrder(res.data);
      } catch (err: any) {
        console.error("Failed to fetch order detail:", err);
        setError(
          err.response?.data?.message || "Không thể tải chi tiết đơn hàng",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [id]);

  const getImageUrl = (image: any) => {
    if (!image) return "";
    if (typeof image === "string") return image;
    return image.secure_url || image.url || "";
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "completed":
        return {
          label: "Hoàn thành",
          color: "text-green-600",
          bg: "bg-green-50 dark:bg-green-900/20",
          icon: <CheckCircle2 className="w-5 h-5" />,
        };
      case "shipping":
        return {
          label: "Đang giao",
          color: "text-blue-600",
          bg: "bg-blue-50 dark:bg-blue-900/20",
          icon: <Package className="w-5 h-5" />,
        };
      case "confirmed":
        return {
          label: "Đã xác nhận",
          color: "text-orange-600",
          bg: "bg-orange-600/5",
          icon: <ReceiptText className="w-5 h-5" />,
        };
      case "cancelled":
        return {
          label: "Đã hủy",
          color: "text-red-600",
          bg: "bg-red-50 dark:bg-red-900/20",
          icon: <CheckCircle2 className="w-5 h-5" />,
        };
      case "pending":
      default:
        return {
          label: "Chờ xử lý",
          color: "text-amber-600",
          bg: "bg-amber-50 dark:bg-amber-900/20",
          icon: <Clock className="w-5 h-5" />,
        };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
        <p className="text-gray-500 font-bold">Đang tải chi tiết đơn hàng...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-red-500">
          <ArrowLeft className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            {error || "Không tìm thấy đơn hàng"}
          </h2>
          <p className="text-gray-500">
            Vui lòng kiểm tra lại mã đơn hàng hoặc quay về trang chủ.
          </p>
        </div>
        <Link
          to="/profile/history"
          className="px-8 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20"
        >
          Quay lại lịch sử đặt hàng
        </Link>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const getStatusIdx = (status: string) => {
    switch (status) {
      case "pending":
        return 0;
      case "confirmed":
        return 1;
      case "shipping":
        return 2;
      case "completed":
        return 3;
      default:
        return 0;
    }
  };
  const statusIdx = getStatusIdx(order.status);
  const orderOwnerId =
    typeof (order as any).user_id === "string"
      ? (order as any).user_id
      : (order as any).user_id?._id;
  const canChat = !isStaffView && !!user?._id && !!orderOwnerId && user._id === orderOwnerId;

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#1c130d] dark:text-white transition-colors duration-300 min-h-screen font-display pb-20">
      <main className="max-w-5xl mx-auto w-full px-6 py-10">
        {/* Header Section */}
        <div className="mb-8">
          <button
            onClick={() => {
              if (window.location.pathname.includes("/staff/")) {
                navigate("/staff/orders");
              } else if (window.location.pathname.includes("/admin/")) {
                navigate("/admin/orders");
              } else {
                navigate("/profile/history");
              }
            }}
            className="inline-flex items-center text-sm font-bold text-[#9a734c] hover:text-orange-600 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Quay lại
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-4xl font-black text-black dark:text-white leading-tight">
                Mã đơn #{order.code}
              </h1>
              <p className="text-gray-500 font-medium">
                Đặt lúc{" "}
                {new Date(order.createdAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                , {new Date(order.createdAt).toLocaleDateString("vi-VN")}
              </p>
            </div>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${statusInfo.bg} ${statusInfo.color}`}
            >
              {statusInfo.icon}
              {statusInfo.label}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Order Items */}
            <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-lg">Món ăn đã đặt</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-white/5">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-6 flex items-center justify-between group hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-20 h-20 rounded-2xl bg-gray-100 bg-cover bg-center shrink-0 border border-gray-100 dark:border-white/10"
                        style={{
                          backgroundImage: `url("${getImageUrl((item.product_id as any)?.image)}")`,
                        }}
                      />
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">
                          {(item.product_id as any)?.name ||
                            "Sản phẩm không còn tồn tại"}
                        </h4>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-md">
                            Số lượng: {item.quantity}
                          </span>
                        </div>

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
                    </div>
                    <p className="font-black text-lg text-gray-900 dark:text-white">
                      {item.sub_total.toLocaleString("vi-VN")}đ
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Details */}
            <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-lg">Thông tin giao hàng</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-600/10 flex items-center justify-center text-orange-600 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Địa chỉ giao hàng
                      </p>
                      <p className="text-gray-900 dark:text-white font-bold leading-tight">
                        {order.delivery_address.detail}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        {order.delivery_address.ward},{" "}
                        {order.delivery_address.district},{" "}
                        {order.delivery_address.city}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-600/10 flex items-center justify-center text-orange-600 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Người nhận
                      </p>
                      <p className="text-gray-900 dark:text-white font-bold">
                        {order.delivery_address.receiver_name}
                      </p>
                      <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                        <Phone className="w-3 h-3" />
                        {order.delivery_address.phone}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {(order.note || order.staff_note_items?.length) && (
              <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ReceiptText className="w-5 h-5 text-orange-600" />
                  <h3 className="font-bold text-lg">
                    {isStaffView ? "Lưu ý từ khách hàng" : "Ghi chú đơn hàng"}
                  </h3>
                </div>

                {isStaffView ? (
                  order.staff_note_items?.length ? (
                    <ul className="space-y-2">
                      {order.staff_note_items.map((note, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200"
                        >
                          <span className="mt-1 text-orange-600 font-bold">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  ) : order.note ? (
                    <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">
                      {order.note}
                    </p>
                  ) : null
                ) : (
                  <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">
                    {order.note}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bill Sidebar */}
          <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-6 shadow-md">
              <div className="flex items-center gap-2 mb-6">
                <ReceiptText className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-lg">Hóa đơn</h3>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Tạm tính</span>
                  <span className="font-bold">
                    {order.sub_total.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">
                    Phí giao hàng
                  </span>
                  <span className="font-bold">
                    {order.shipping_fee > 0
                      ? `${order.shipping_fee.toLocaleString("vi-VN")}đ`
                      : "Miễn phí"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Giảm giá</span>
                  <span className="font-bold text-green-500">
                    -
                    {(
                      order.sub_total +
                      order.shipping_fee -
                      order.total_price
                    ).toLocaleString("vi-VN")}
                    đ
                  </span>
                </div>
                <div className="h-px bg-gray-100 dark:bg-white/10 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-black">
                    {t("customer:cart.grandTotal")}
                  </span>
                  <div className="text-right">
                    <p className="text-3xl font-black text-orange-600">
                      {order.total_price.toLocaleString("vi-VN")}đ
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">
                      Thanh toán:{" "}
                      {order.payment.method === "cash_on_delivery"
                        ? "Tiền mặt"
                        : "Chuyển khoản"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Timeline (Simple version) */}
            {/* Sidebar Tracker */}
            <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">{t("customer:tracking.title")}</h3>
                <Link
                  to={`/track-order?id=${order._id}`}
                  className="text-orange-600 text-sm font-bold hover:underline"
                >
                  Xem chi tiết
                </Link>
              </div>
              <div className="flex flex-col gap-8">
                {/* Step 1: Đã đặt hàng */}
                <div
                  className={`relative flex gap-4 ${
                    statusIdx >= 0 && order.status !== "cancelled" ? "step-active" : ""
                  }`}
                >
                  <div
                    className={`z-10 size-6 rounded-full flex items-center justify-center text-white ${
                      statusIdx > 0
                        ? "bg-green-500"
                        : "bg-orange-600 ring-4 ring-orange-600/20"
                    }`}
                  >
                    {statusIdx > 0 ? (
                      <span className="material-symbols-outlined text-[16px] font-bold">
                        check
                      </span>
                    ) : (
                      <div className="size-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-bold ${
                        statusIdx === 0
                          ? "text-orange-600"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      Đã đặt hàng
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* Step 2: Đang chuẩn bị */}
                <div
                  className={`relative flex gap-4 ${statusIdx >= 1 ? "step-active" : ""}`}
                >
                  <div
                    className={`z-10 size-6 rounded-full flex items-center justify-center ${
                      statusIdx > 1
                        ? "bg-green-500 text-white"
                        : statusIdx === 1
                          ? "bg-orange-600 text-white ring-4 ring-orange-600/20"
                          : "bg-gray-100 dark:bg-white/10 text-gray-400"
                    }`}
                  >
                    {statusIdx > 1 ? (
                      <span className="material-symbols-outlined text-[16px] font-bold">
                        check
                      </span>
                    ) : statusIdx === 1 ? (
                      <div className="size-2 bg-white rounded-full"></div>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">
                        restaurant
                      </span>
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-bold ${
                        statusIdx === 1
                          ? "text-orange-600"
                          : statusIdx < 1
                            ? "text-gray-400"
                            : "text-gray-900 dark:text-white"
                      }`}
                    >
                      Đang chuẩn bị
                    </p>
                    <p
                      className={`text-xs ${
                        statusIdx === 1 ? "text-orange-600/70" : "text-gray-400"
                      }`}
                    >
                      {statusIdx === 1
                        ? "Món ăn đang được nấu"
                        : statusIdx > 1
                          ? "Đã xong"
                          : "Chờ xác nhận"}
                    </p>
                  </div>
                </div>

                {/* Step 3: Đang giao hàng */}
                <div
                  className={`relative flex gap-4 ${statusIdx >= 2 ? "step-active" : ""}`}
                >
                  <div
                    className={`z-10 size-6 rounded-full flex items-center justify-center ${
                      statusIdx > 2
                        ? "bg-green-500 text-white"
                        : statusIdx === 2
                          ? "bg-orange-600 text-white ring-4 ring-orange-600/20"
                          : "bg-gray-100 dark:bg-white/10 text-gray-400"
                    }`}
                  >
                    {statusIdx > 2 ? (
                      <span className="material-symbols-outlined text-[16px] font-bold">
                        check
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">
                        moped
                      </span>
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-bold ${
                        statusIdx === 2
                          ? "text-orange-600"
                          : statusIdx < 2
                            ? "text-gray-400"
                            : "text-gray-900 dark:text-white"
                      }`}
                    >
                      Đang giao hàng
                    </p>
                    <p
                      className={`text-xs ${
                        statusIdx === 2 ? "text-orange-600/70" : "text-gray-400"
                      }`}
                    >
                      {statusIdx === 2
                        ? "Tài xế đang giao"
                        : statusIdx > 2
                          ? "Đã giao đến"
                          : "Chờ lấy hàng"}
                    </p>
                  </div>
                </div>

                {/* Step 4: Đã giao */}
                <div className="relative flex gap-4">
                  <div
                    className={`z-10 size-6 rounded-full flex items-center justify-center ${
                      statusIdx === 3
                        ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                        : "bg-gray-100 dark:bg-white/10 text-gray-400"
                    }`}
                  >
                    {statusIdx === 3 ? (
                      <span className="material-symbols-outlined text-[16px] font-bold">
                        check
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">
                        home
                      </span>
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-bold ${
                        statusIdx === 3 ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      Đã giao
                    </p>
                    {statusIdx === 3 && order.updatedAt && (
                      <p className="text-xs text-green-600/70">
                        {new Date(order.updatedAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Special status for Cancelled */}
              {order.status === "cancelled" && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl flex items-center gap-3 text-red-600">
                  <span className="material-symbols-outlined">cancel</span>
                  <div className="text-sm font-bold">Đơn hàng đã hủy</div>
                </div>
              )}

              <style>{`
                .step-active::before {
                    content: '';
                    position: absolute;
                    left: 11.5px;
                    top: 24px;
                    bottom: -8px;
                    width: 2px;
                    background-color: #e5e7eb;
                }
                .dark .step-active::before {
                    background-color: rgba(255,255,255,0.1);
                }
                .step-active:last-child::before {
                    display: none;
                }
              `}</style>
            </div>

            {/* Order Support Chat entry (customer owner only) */}
            {canChat && <OrderSupportChat orderId={order._id} />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderDetailPage;
