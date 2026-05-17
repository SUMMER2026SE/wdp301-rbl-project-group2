import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
} from "lucide-react";
import orderService from "@/services/order.service";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    { label: "Chờ xử lý", value: 0, icon: "schedule", color: "#ee8c2b", bg: "bg-[#ee8c2b]/10" },
    { label: "Đang xử lý", value: 0, icon: "trending_up", color: "#ee8c2b", bg: "bg-[#ee8c2b]/10" },
    {
      label: "Hoàn thành hôm nay",
      value: 0,
      icon: "check_circle",
      color: "#10b981",
      bg: "bg-green-50",
    },
    {
      label: "Nguy cơ cao",
      value: 0,
      icon: "warning",
      color: "#ef4444",
      bg: "bg-red-50",
    },
  ]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const res = await orderService.getAllOrders();
        const allOrders = res.data;

        // Simple stats calculation
        const pending = allOrders.filter((o: any) => o.status === "pending");
        const processing = allOrders.filter(
          (o: any) => o.status === "confirmed" || o.status === "shipping",
        );
        const completed = allOrders.filter(
          (o: any) =>
            o.status === "completed" &&
            new Date(o.createdAt).toDateString() === new Date().toDateString(),
        );

        setStats([
          {
            label: "Chờ xử lý",
            value: pending.length,
            icon: "schedule",
            color: "#ee8c2b",
            bg: "bg-[#ee8c2b]/10",
          },
          {
            label: "Đang xử lý",
            value: processing.length,
            icon: "trending_up",
            color: "#ee8c2b",
            bg: "bg-[#ee8c2b]/10",
          },
          {
            label: "Hoàn thành hôm nay",
            value: completed.length,
            icon: "check_circle",
            color: "#10b981",
            bg: "bg-green-50",
          },
          {
            label: "Nguy cơ cao",
            value: 0,
            icon: "warning",
            color: "#ef4444",
            bg: "bg-red-50",
          },
        ]);

        setRecentOrders(allOrders.slice(0, 5));
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-[#9a734c] font-medium">
          Đang tải dữ liệu hệ thống...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#1b140d]">
            Chào mừng đến Staff Portal! 👋
          </h2>
          <p className="text-base text-[#9a734c] mt-1">
            Quản lý đơn hàng với dữ liệu thời gian thực
          </p>
        </div>
        <button
          className="px-6 py-3 bg-[#ee8c2b] text-white rounded-lg font-bold text-sm shadow-sm hover:opacity-90 transition-all shrink-0"
          onClick={() => navigate("/staff/orders")}
        >
          Xem tất cả đơn hàng
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white border border-[#e7dbcf] rounded-xl p-6 flex flex-col gap-4 hover:border-[#ee8c2b] transition-colors cursor-pointer"
            onClick={() => navigate("/staff/orders")}
          >
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <span className="material-symbols-outlined" style={{ color: stat.color }}>
                  {stat.icon}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[#9a734c]">{stat.label}</p>
              <h3 className="text-3xl font-bold mt-1 text-[#1b140d]">
                {stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Grid Layout for Recent Orders and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white border border-[#e7dbcf] rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[#e7dbcf] flex items-center justify-between">
            <h4 className="text-lg font-bold text-[#1b140d]">Đơn hàng gần đây</h4>
            <button
              onClick={() => navigate("/staff/orders")}
              className="text-xs font-bold text-[#ee8c2b] hover:underline"
            >
              Xem tất cả
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfaf8] border-b border-[#e7dbcf]">
                  <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">Đơn hàng</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">Khách hàng</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7dbcf]">
                {recentOrders.map((order) => (
                  <tr
                    key={order._id}
                    onClick={() => navigate(`/order-detail/${order._id}`)}
                    className="hover:bg-[#fcfaf8] transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-[#1b140d]">#{order.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#ee8c2b]/10 flex items-center justify-center text-[#ee8c2b] font-bold text-xs">
                          {order.user_id?.username?.charAt(0) || "U"}
                        </div>
                        <span className="text-sm text-[#1b140d] font-medium truncate max-w-[150px]">
                          {order.user_id?.username || "Khách vãng lai"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${order.status === "pending" ? "bg-amber-100 text-amber-700" :
                        order.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                          order.status === "shipping" ? "bg-indigo-100 text-indigo-700" :
                            order.status === "completed" ? "bg-green-100 text-green-700" :
                              "bg-red-100 text-red-700"
                        }`}>
                        {order.status === "pending" ? "Chờ xử lý" :
                          order.status === "confirmed" ? "Đã xác nhận" :
                            order.status === "shipping" ? "Đang giao" :
                              order.status === "completed" ? "Thành công" : "Đã hủy"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs text-[#9a734c]">
                        {new Date(order.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentOrders.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-sm text-[#9a734c]">Chưa có đơn hàng nào</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Column */}
        <div className="space-y-6">
          <div className="bg-white border border-[#e7dbcf] rounded-xl p-6 shadow-sm">
            <h4 className="text-lg font-bold text-[#1b140d] mb-4">Truy cập nhanh</h4>
            <div className="grid grid-cols-1 gap-3">
              <button
                className="flex items-center gap-3 p-4 bg-[#fcfaf8] border border-[#e7dbcf] rounded-lg hover:border-[#ee8c2b] hover:bg-white transition-all text-sm font-bold text-[#1b140d]"
                onClick={() => navigate("/staff/orders")}
              >
                <div className="p-2 bg-[#ee8c2b]/10 rounded-lg">
                  <span className="material-symbols-outlined text-[#ee8c2b] text-xl">list_alt</span>
                </div>
                <span>Danh sách đơn hàng</span>
              </button>
              <button
                className="flex items-center gap-3 p-4 bg-[#fcfaf8] border border-[#e7dbcf] rounded-lg hover:border-[#ee8c2b] hover:bg-white transition-all text-sm font-bold text-[#1b140d]"
                onClick={() => navigate("/staff/customers")}
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="material-symbols-outlined text-blue-600 text-xl">groups</span>
                </div>
                <span>Quản lý khách hàng</span>
              </button>
              <button
                className="flex items-center gap-3 p-4 bg-[#fcfaf8] border border-[#e7dbcf] rounded-lg hover:border-[#ee8c2b] hover:bg-white transition-all text-sm font-bold text-[#1b140d]"
                onClick={() => navigate("/staff/menu")}
              >
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="material-symbols-outlined text-purple-600 text-xl">restaurant_menu</span>
                </div>
                <span>Quản lý thực đơn</span>
              </button>
            </div>
          </div>

          {/* AI Status Card
          <div className="bg-[#1b140d] rounded-xl p-6 text-white shadow-lg overflow-hidden relative">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[#ee8c2b]">temp_preferences_custom</span>
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">Trợ lý AI</span>
              </div>
              <h4 className="text-xl font-black mb-2 leading-tight">Hệ thống AI đang hoạt động tối ưu.</h4>
              <p className="text-sm text-white/70 mb-6">Tự động phân tích ghi chú và hỗ trợ nhân viên 24/7.</p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest">Ổn định</span>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ee8c2b]/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
