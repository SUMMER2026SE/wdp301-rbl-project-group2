import { useState, useEffect } from "react";
import { clsx } from "clsx";
import VoucherAPI from '@/services/voucher.service';
import type { Voucher } from '@/types/voucher';

const AdminVouchers = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    active: 0,
    used: 0,
    expiring: 0
  });
  const LIMIT = 10;

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await VoucherAPI.getVouchers({
        page,
        limit: LIMIT
      });

      if (res.success) {
        setVouchers(res.data);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);

        // Calculate simple stats for the current view or small dataset
        // For accurate total stats, BE should ideally provide a summary endpoint
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        const active = res.data.filter(v => v.is_active && new Date(v.end_date) > now).length;
        const used = res.data.reduce((acc, v) => acc + v.current_usage_count, 0);
        const expiring = res.data.filter(v => {
          const end = new Date(v.end_date);
          return end > now && end < nextWeek;
        }).length;

        setStats({ active, used, expiring });
      }
    } catch (err) {
      console.error("Error fetching vouchers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [page]);

  const filteredVouchers = vouchers.filter(v =>
    v.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusInfo = (v: Voucher) => {
    const now = new Date();
    const end = new Date(v.end_date);

    if (end < now) {
      return { label: "Hết hạn", color: "bg-[#e71008]", textColor: "text-[#e71008]", status: "expired" };
    }
    if (!v.is_active) {
      return { label: "Tắt", color: "bg-[#9a734c]", textColor: "text-[#9a734c]", status: "disabled" };
    }
    return { label: "Đang dùng", color: "bg-[#07880e]", textColor: "text-[#07880e]", status: "active" };
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await VoucherAPI.updateVoucher(id, { is_active: !current });
      fetchVouchers();
    } catch (err) {
      console.error("Error toggling voucher status:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa voucher này?")) {
      try {
        await VoucherAPI.deleteVoucher(id);
        fetchVouchers();
      } catch (err) {
        console.error("Error deleting voucher:", err);
      }
    }
  };

  const STAT_CARDS = [
    { label: "Voucher đang hoạt động", value: stats.active.toString(), trend: "", icon: "confirmation_number" },
    { label: "Lượt đã sử dụng", value: stats.used.toLocaleString("vi-VN"), trend: "", icon: "local_mall" },
    { label: "Sắp hết hạn", value: stats.expiring.toString(), sub: "Trong 7 ngày", icon: "event_busy" },
  ];

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="flex flex-wrap justify-between items-end gap-3 mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#1b140d]">
            Quản lý voucher
          </h2>
          <p className="text-[#9a734c] mt-1">
            Tạo, theo dõi và quản lý chiến dịch khuyến mãi.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center justify-center gap-2 h-12 px-6 bg-[#ee8c2b] hover:bg-[#d87c24] text-white text-sm font-bold rounded-lg shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          Tạo voucher
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {STAT_CARDS.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-2 rounded-xl p-6 border border-[#e7dbcf] bg-white shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-[#9a734c] text-sm font-medium uppercase tracking-wider">{stat.label}</p>
              <span className="material-symbols-outlined text-[#ee8c2b] bg-[#ee8c2b]/10 p-2 rounded-lg">
                {stat.icon}
              </span>
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-[#1b140d] text-3xl font-bold leading-tight">{loading ? "..." : stat.value}</p>
              {stat.sub && (
                <p className="text-[#ee8c2b] text-sm font-bold">{stat.sub}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-[#e7dbcf] rounded-xl overflow-hidden shadow-sm mb-4">
        <div className="flex flex-wrap justify-between items-center gap-4 p-4 border-b border-[#e7dbcf]">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative min-w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9a734c] text-xl">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm mã voucher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#f3ede7] border-none focus:ring-2 focus:ring-[#ee8c2b]/50 text-sm text-[#1b140d] placeholder:text-[#9a734c]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="p-2 text-[#1b140d] hover:bg-[#f3ede7] rounded-lg transition-colors"
              title="Tải xuống"
            >
              <span className="material-symbols-outlined">download</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fcfaf8] border-b border-[#e7dbcf]">
                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">Mã voucher</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">Lượt dùng</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">Giá trị giảm</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">Hết hạn</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7dbcf]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-[#9a734c]">Đang tải dữ liệu...</td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-[#9a734c]">Không có voucher nào</td>
                </tr>
              ) : filteredVouchers.map((v) => {
                const statusInfo = getStatusInfo(v);
                const limit = v.total_usage_limit || 0;
                const pct = limit ? Math.round((v.current_usage_count / limit) * 100) : 0;
                const discountLabel = v.discount_type === 'percentage' ? `${v.discount_value}%` : `${v.discount_value.toLocaleString("vi-VN")}₫`;

                return (
                  <tr key={v._id} className="hover:bg-[#ee8c2b]/5 transition-colors">
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-[#f3ede7] rounded text-sm font-mono font-bold text-[#1b140d] border border-[#e7dbcf]">
                        {v.code}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className={clsx("size-2 rounded-full", statusInfo.color)} />
                        <span className={clsx("text-sm font-semibold", statusInfo.textColor)}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1 min-w-[120px]">
                        <div className="flex justify-between text-xs font-medium text-[#1b140d]">
                          <span>{v.current_usage_count} / {limit || "∞"}</span>
                          {limit > 0 && <span>{pct}%</span>}
                        </div>
                        {limit > 0 && (
                          <div className="h-1.5 w-full bg-[#f3ede7] rounded-full overflow-hidden">
                            <div
                              className={clsx("h-full rounded-full", statusInfo.status === "expired" ? "bg-red-500" : "bg-[#ee8c2b]")}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 font-semibold text-sm text-[#1b140d]">{discountLabel}</td>
                    <td className="px-6 py-5 text-sm text-[#9a734c]">
                      {new Date(v.end_date).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-3">
                        <div className="flex items-center gap-2 pr-4 border-r border-[#e7dbcf]">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={v.is_active}
                              disabled={statusInfo.status === "expired"}
                              onChange={() => handleToggleActive(v._id, v.is_active)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-[#e7dbcf] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ee8c2b] peer-disabled:opacity-50" />
                          </label>
                        </div>
                        <button type="button" className="p-1 hover:text-[#ee8c2b] transition-colors" title="Sửa">
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(v._id)}
                          className="p-1 hover:text-[#e71008] transition-colors"
                          title="Xóa"
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 flex items-center justify-between border-t border-[#e7dbcf] bg-[#fcfaf8]">
          <p className="text-sm text-[#9a734c]">
            Hiển thị {(page - 1) * LIMIT + 1} đến {Math.min(page * LIMIT, total)} trong {total} kết quả
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-[#e7dbcf] text-sm font-medium text-[#1b140d] hover:bg-white transition-colors disabled:opacity-50"
            >
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={clsx(
                  "px-3 py-1 rounded-lg text-sm font-bold shadow-sm transition-all",
                  page === p ? "bg-[#ee8c2b] text-white" : "border border-[#e7dbcf] text-[#1b140d] hover:bg-white"
                )}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg border border-[#e7dbcf] text-sm font-medium text-[#1b140d] hover:bg-white transition-colors disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminVouchers;
