import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import orderService from "@/services/order.service";
import type { Order } from "@/services/order.service";
import { AdminDrawer } from "@/components/shared/AdminDrawer";
import { Package, Clock, MapPin, User, ReceiptText, ExternalLink } from "lucide-react";

const ORDER_TABS = [
  { id: "all", label: "Tất cả đơn" },
  { id: "pending", label: "Chờ xử lý" },
  { id: "confirmed", label: "Đã xác nhận" },
  { id: "shipping", label: "Đang giao" },
  { id: "completed", label: "Đã giao" },
  { id: "cancelled", label: "Đã hủy" },
];

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = activeTab === "all" ? {} : { status: activeTab };
      const res = await orderService.getAllOrders(params);
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  useEffect(() => {
    if (selectedOrderId) {
      const fetchDetails = async () => {
        setLoadingDetails(true);
        try {
          const res = await orderService.getOrderById(selectedOrderId);
          setOrderDetails(res.data);
        } catch (err) {
          console.error("Failed to fetch order details:", err);
        } finally {
          setLoadingDetails(false);
        }
      };
      fetchDetails();
    } else {
      setOrderDetails(null);
    }
  }, [selectedOrderId]);

  const handleUpdateStatus = async (
    orderId: string,
    status: Order["status"],
  ) => {
    try {
      await orderService.updateOrderStatus(orderId, status);
      fetchOrders();
    } catch (err) {
      alert("Không thể cập nhật trạng thái");
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "Chờ xử lý", class: "bg-amber-100 text-amber-700" };
      case "confirmed":
        return { label: "Đã xác nhận", class: "bg-blue-100 text-blue-700" };
      case "shipping":
        return { label: "Đang giao", class: "bg-indigo-100 text-indigo-700" };
      case "completed":
        return { label: "Đã giao", class: "bg-green-100 text-green-700" };
      case "cancelled":
        return { label: "Đã hủy", class: "bg-red-100 text-red-700" };
      default:
        return { label: status, class: "bg-gray-100 text-gray-700" };
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#1b140d]">
            Quản lý đơn hàng
          </h2>
          <p className="text-[#9a734c] mt-1">
            Kiểm soát luồng đơn hàng theo thời gian thực.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white rounded-lg border border-[#e7dbcf] p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={clsx(
                "p-2 rounded-md transition-colors",
                viewMode === "table"
                  ? "bg-[#ee8c2b]/10 text-[#ee8c2b]"
                  : "text-[#9a734c] hover:bg-[#f3ede7]",
              )}
              title="Xem bảng"
            >
              <span className="material-symbols-outlined text-[20px]">
                table_chart
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={clsx(
                "p-2 rounded-md transition-colors",
                viewMode === "kanban"
                  ? "bg-[#ee8c2b]/10 text-[#ee8c2b]"
                  : "text-[#9a734c] hover:bg-[#f3ede7]",
              )}
              title="Xem bảng kanban"
            >
              <span className="material-symbols-outlined text-[20px]">
                view_kanban
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className="border-b border-[#e7dbcf] mb-6">
        <div className="flex gap-8 overflow-x-auto scrollbar-hide">
          {ORDER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "pb-4 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "border-[#ee8c2b] text-[#ee8c2b] font-bold"
                  : "border-transparent text-[#9a734c] hover:text-[#1b140d]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#e7dbcf] rounded-xl">
          <p className="text-[#9a734c]">Không có đơn hàng nào trong mục này.</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-white border border-[#e7dbcf] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfaf8] text-[#9a734c] text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Mã đơn</th>
                  <th className="px-6 py-4">Khách hàng</th>
                  <th className="px-6 py-4 text-center">Số món</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Tổng tiền</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7dbcf]">
                {orders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  return (
                    <tr
                      key={order._id}
                      className="hover:bg-[#fcfaf8] transition-colors group cursor-pointer"
                      onClick={() => setSelectedOrderId(order._id)}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-[#1b140d]">
                          #{order.code}
                        </span>
                        <p className="text-[10px] text-[#9a734c] mt-0.5">
                          {new Date(order.createdAt).toLocaleString("vi-VN")}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#ee8c2b]/20 flex items-center justify-center text-[#ee8c2b] font-bold text-xs">
                            {order.user_id?.username?.charAt(0) || "U"}
                          </div>
                          <span className="text-sm font-semibold text-[#1b140d]">
                            {order.user_id?.username || "Ẩn danh"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs bg-[#f3ede7] px-2 py-1 rounded font-bold">
                          {order.items.length} món
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={clsx(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                            statusInfo.class,
                          )}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#1b140d]">
                            {order.total_price.toLocaleString("vi-VN")}₫
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {(order.shipping_fee ?? 0) > 0
                              ? `+${order.shipping_fee.toLocaleString("vi-VN")}đ ship`
                              : "Free ship"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrderId(order._id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-[#ee8c2b] transition-colors"
                            title="Xem chi tiết"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              visibility
                            </span>
                          </button>
                          {order.status === "pending" && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(order._id, "confirmed")
                              }
                              className="px-3 py-1.5 bg-[#ee8c2b] text-white text-xs font-bold rounded shadow-sm hover:bg-[#d87c24]"
                            >
                              Xác nhận
                            </button>
                          )}
                          {order.status === "confirmed" && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(order._id, "shipping")
                              }
                              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded shadow-sm hover:bg-indigo-700"
                            >
                              Giao hàng
                            </button>
                          )}
                          {order.status === "shipping" && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(order._id, "completed")
                              }
                              className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:bg-green-700"
                            >
                              Hoàn thành
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-w-min">
            {[
              { title: "Chờ xử lý", status: "pending", color: "amber" },
              { title: "Đã xác nhận", status: "confirmed", color: "blue" },
              { title: "Đang giao", status: "shipping", color: "indigo" },
              { title: "Đã xong", status: "completed", color: "green" },
            ].map((column) => (
              <div
                key={column.title}
                className="flex flex-col bg-black/5 rounded-xl p-3 min-h-[500px]"
              >
                <h3 className="text-base font-bold text-[#1b140d] p-2 mb-3">
                  {column.title}
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 px-1 pb-2">
                  {orders
                    .filter((o) => o.status === column.status)
                    .map((card) => (
                      <div
                        key={card._id}
                        className="bg-white p-4 rounded-xl shadow-sm border border-[#e7dbcf] hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-sm">
                            #{card.code}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(card.createdAt).toLocaleTimeString(
                              "vi-VN",
                            )}
                          </span>
                        </div>
                        <p className="text-sm font-semibold mb-3">
                          {card.user_id?.username}
                        </p>
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-gray-500">Số món:</span>
                          <span className="font-semibold text-[#1b140d]">
                            {card.items.length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-gray-500">Tổng tiền:</span>
                          <span className="font-bold text-[#ee8c2b]">
                            {card.total_price.toLocaleString("vi-VN")}₫
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm mb-3">
                          <span className="text-gray-500">Phí giao hàng:</span>
                          <span className="font-semibold text-[#1b140d]">
                            {(card.shipping_fee ?? 0) === 0
                              ? "Miễn phí"
                              : `${card.shipping_fee.toLocaleString("vi-VN")}đ`}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <button
                            onClick={() => setSelectedOrderId(card._id)}
                            className="py-2 bg-gray-50 border border-gray-100 rounded text-[10px] font-bold hover:bg-gray-100 text-gray-500 flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              visibility
                            </span>
                            Chi tiết
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                card._id,
                                column.status === "pending"
                                  ? "confirmed"
                                  : column.status === "confirmed"
                                    ? "shipping"
                                    : "completed",
                              )
                            }
                            className="py-2 bg-primary/5 border border-primary/10 rounded text-[10px] font-bold hover:bg-primary/10 text-primary"
                          >
                            Tiếp theo
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Order Details Drawer */}
      <AdminDrawer
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        title="Chi tiết đơn hàng"
      >
        {loadingDetails ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-[#ee8c2b] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-[#9a734c] font-bold">Đang tải chi tiết...</p>
          </div>
        ) : orderDetails ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Order Header Info */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#1b140d]">Đơn hàng #{orderDetails.code}</h3>
                <p className="text-sm text-[#9a734c] font-medium mt-1">
                  {new Date(orderDetails.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <button
                onClick={() => navigate(`/order-detail/${orderDetails._id}`)}
                className="p-2 bg-[#f3ede7] text-[#1b140d] rounded-lg hover:bg-[#e7dbcf] transition-all flex items-center gap-2 text-xs font-bold"
              >
                Trang chi tiết
                <ExternalLink size={14} />
              </button>
            </div>

            {/* Status & Payment Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#fcfaf8] rounded-2xl border border-[#e7dbcf]">
                <p className="text-[10px] font-black text-[#9a734c] uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Clock size={12} /> Trạng thái
                </p>
                <span className={clsx(
                  "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-tight",
                  getStatusInfo(orderDetails.status).class
                )}>
                  {getStatusInfo(orderDetails.status).label}
                </span>
              </div>
              <div className="p-4 bg-[#fcfaf8] rounded-2xl border border-[#e7dbcf]">
                <p className="text-[10px] font-black text-[#9a734c] uppercase tracking-widest mb-2 flex items-center gap-1">
                  <ReceiptText size={12} /> Thanh toán
                </p>
                <p className="text-sm font-bold text-[#1b140d]">
                  {orderDetails.payment?.method === "cash_on_delivery" ? "Tiền mặt (COD)" : "Chuyển khoản"}
                </p>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-[#1b140d] uppercase tracking-widest flex items-center gap-2">
                <Package size={16} className="text-[#ee8c2b]" /> Danh sách món ({orderDetails.items.length})
              </h4>
              <div className="space-y-3">
                {orderDetails.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-4 p-3 bg-white rounded-xl border border-[#e7dbcf] hover:border-[#ee8c2b]/30 transition-all">
                    <div
                      className="w-16 h-16 rounded-lg bg-gray-100 bg-cover bg-center shrink-0"
                      style={{ backgroundImage: `url(${item.product_id?.image?.secure_url || item.product_id?.image || ''})` }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-black text-[#1b140d] line-clamp-1">{item.product_id?.name}</p>
                      <p className="text-[11px] text-[#9a734c] font-bold mt-0.5">SL: {item.quantity} x {(item.price ?? 0).toLocaleString("vi-VN")}₫</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-[#ee8c2b]">{(item.sub_total ?? 0).toLocaleString("vi-VN")}₫</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer & Delivery */}
            <div className="space-y-4 pt-4 border-t border-[#e7dbcf]">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><User size={20} /></div>
                <div>
                  <p className="text-[10px] font-black text-[#9a734c] uppercase tracking-widest">Khách hàng</p>
                  <p className="text-sm font-bold text-[#1b140d]">{orderDetails.user_id?.username || "Khách vãng lai"}</p>
                  <p className="text-xs text-[#9a734c]">{orderDetails.delivery_address?.receiver_name} • {orderDetails.delivery_address?.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg"><MapPin size={20} /></div>
                <div>
                  <p className="text-[10px] font-black text-[#9a734c] uppercase tracking-widest">Địa chỉ giao</p>
                  <p className="text-sm font-bold text-[#1b140d] line-clamp-2">{orderDetails.delivery_address?.detail}</p>
                  <p className="text-xs text-[#9a734c]">{orderDetails.delivery_address?.ward}, {orderDetails.delivery_address?.district}</p>
                </div>
              </div>
            </div>

            {/* Billing Summary */}
            <div className="p-6 bg-[#1b140d] rounded-2xl text-white space-y-3">
              <div className="flex justify-between text-xs opacity-70">
                <span>Tạm tính</span>
                <span>{(orderDetails.sub_total ?? 0).toLocaleString("vi-VN")}₫</span>
              </div>
              <div className="flex justify-between text-xs opacity-70">
                <span>Phí giao hàng</span>
                <span>{(orderDetails.shipping_fee ?? 0).toLocaleString("vi-VN")}₫</span>
              </div>
              <div className="h-px bg-white/10 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-black uppercase tracking-widest">Tổng cộng</span>
                <span className="text-2xl font-black text-[#ee8c2b]">{(orderDetails.total_price ?? 0).toLocaleString("vi-VN")}₫</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 flex gap-3">
              {orderDetails.status === "pending" && (
                <button
                  onClick={() => handleUpdateStatus(orderDetails._id, "confirmed")}
                  className="flex-1 py-4 bg-[#ee8c2b] text-white font-black rounded-xl shadow-lg shadow-[#ee8c2b]/20 hover:bg-[#d87c24] transition-all"
                >
                  Xác nhận đơn hàng
                </button>
              )}
            </div>
          </div>
        ) : null}
      </AdminDrawer>
    </div>
  );
};

export default AdminOrders;
