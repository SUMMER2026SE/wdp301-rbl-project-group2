import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Calendar, MapPin, User, FileText, CreditCard, ShieldAlert, Clock, Bike } from 'lucide-react';
import orderService, { type Order } from '@/services/order.service';
import staffRequestService from '@/services/staff-request.service';
import toast from 'react-hot-toast';

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ xác nhận', color: '#d97706', bg: 'bg-amber-50 text-amber-700 border-amber-100' },
  confirmed: { label: 'Đã xác nhận', color: '#2563eb', bg: 'bg-blue-50 text-blue-700 border-blue-100' },
  processing: { label: 'Đang nấu', color: '#0284c7', bg: 'bg-sky-50 text-sky-700 border-sky-100' },
  preparing: { label: 'Đang chuẩn bị', color: '#0284c7', bg: 'bg-sky-50 text-sky-700 border-sky-100' },
  ready_for_delivery: { label: 'Chờ giao', color: '#4f46e5', bg: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  shipping: { label: 'Đang giao', color: '#7c3aed', bg: 'bg-purple-50 text-purple-700 border-purple-100' },
  delivering: { label: 'Đang giao', color: '#7c3aed', bg: 'bg-purple-50 text-purple-700 border-purple-100' },
  delivered: { label: 'Đã giao', color: '#0d9488', bg: 'bg-teal-50 text-teal-700 border-teal-100' },
  completed: { label: 'Hoàn tất', color: '#059669', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  cancelled: { label: 'Đã hủy', color: '#dc2626', bg: 'bg-rose-50 text-rose-700 border-rose-100' },
};

const nextStatuses: { value: Order['status']; label: string }[] = [
  { value: 'confirmed', label: 'Xác nhận đơn' },
  { value: 'processing', label: 'Bắt đầu nấu' },
  { value: 'ready_for_delivery', label: 'Sẵn sàng giao' },
  { value: 'shipping', label: 'Đi giao đơn' },
  { value: 'delivered', label: 'Đã giao tới khách' },
  { value: 'completed', label: 'Hoàn tất đơn hàng' },
  { value: 'cancelled', label: 'Hủy đơn hàng' },
];

const actorRoleLabels: Record<string, string> = {
  manager: 'Quản lý',
  staff: 'Nhân viên',
  admin: 'Quản trị viên',
  customer: 'Khách hàng',
  system: 'Hệ thống',
};

const ManagerOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Order['status']>('confirmed');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Delivery staff states
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchOrder = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await orderService.getManagerOrderById(id);
      setOrder(res.data);
      setSelectedStatus(res.data.status);

      // Pre-select current driver if assigned
      const driverObj = res.data.deliveryInfo?.driverId;
      const currentDriverId = driverObj && typeof driverObj === 'object'
        ? (driverObj as any)._id
        : (driverObj || '');
      setSelectedDriverId(currentDriverId);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await staffRequestService.getManagerStaff({ status: 'active' });
      setStaffList(res.data || []);
    } catch (err) {
      console.error('Không thể tải danh sách nhân viên:', err);
    }
  };

  useEffect(() => {
    void fetchOrder();
    void fetchStaff();
  }, [id]);

  // Check if status change is a sensitive override action (e.g. cancel, complete, or moving backward)
  const isSensitive = useMemo(() => {
    if (!order) return false;

    // Status orders array (matching backend values)
    const statuses: Order['status'][] = [
      'pending',
      'confirmed',
      'processing',
      'preparing',
      'ready_for_delivery',
      'shipping',
      'delivering',
      'delivered',
      'completed',
      'cancelled'
    ];

    const fromIndex = statuses.indexOf(order.status);
    const toIndex = statuses.indexOf(selectedStatus);

    // Cancel or manual complete is always sensitive
    if (selectedStatus === 'cancelled' || selectedStatus === 'completed') {
      return true;
    }

    // Moving backward in state machine is sensitive
    if (fromIndex !== -1 && toIndex !== -1 && toIndex < fromIndex) {
      return true;
    }

    return false;
  }, [order, selectedStatus]);

  const handleOverride = async () => {
    if (!id || !order) return;

    // Validation
    if (isSensitive) {
      if (!reason.trim()) {
        toast.error('Vui lòng nhập lý do cho thao tác ghi đè nhạy cảm này.');
        return;
      }

      let confirmMsg = 'CẢNH BÁO: Đây là thao tác ghi đè trạng thái nhạy cảm. Bạn có chắc chắn muốn tiếp tục?';
      if (selectedStatus === 'cancelled') {
        confirmMsg = '⚠️ CẢNH BÁO HỦY ĐƠN: Bạn đang thực hiện HỦY đơn hàng này. Thao tác này sẽ dừng toàn bộ quy trình xử lý đơn và không thể hoàn tác. Bạn có chắc chắn muốn HỦY đơn hàng?';
      } else if (selectedStatus === 'completed') {
        confirmMsg = '⚠️ CẢNH BÁO HOÀN TẤT: Bạn đang HOÀN TẤT thủ công đơn hàng. Vui lòng đảm bảo đơn đã giao thành công và thu tiền đầy đủ. Bạn có chắc chắn muốn HOÀN TẤT đơn hàng?';
      } else {
        confirmMsg = '⚠️ CẢNH BÁO LÙI TRẠNG THÁI: Bạn đang chuyển đơn hàng về trạng thái trước đó. Thao tác này có thể gây sai lệch dòng dữ liệu vận hành. Bạn có chắc chắn muốn tiếp tục?';
      }

      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      const res = await orderService.managerOverrideOrderStatus(id, {
        status: selectedStatus,
        reason: reason.trim() || undefined,
        note: note.trim() || undefined,
      });
      setOrder(res.data);
      setReason('');
      setNote('');
      toast.success('Cập nhật trạng thái đơn hàng thành công!');
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Không thể cập nhật trạng thái đơn hàng';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignDelivery = async () => {
    if (!id || !order) return;
    if (!selectedDriverId) {
      toast.error('Vui lòng chọn nhân viên giao hàng.');
      return;
    }

    const isReassign = order.status === 'shipping' || order.status === 'delivering' || order.status === 'delivered';
    if (isReassign) {
      if (!assignReason.trim()) {
        toast.error('Vui lòng nhập lý do điều phối lại (reassign).');
        return;
      }

      const confirmMsg = '⚠️ CẢNH BÁO ĐIỀU PHỐI LẠI: Đơn hàng này đang hoặc đã được giao bởi một shipper khác. Việc đổi shipper có thể gây nhầm lẫn trong quá trình giao hàng hoặc thất thoát COD. Bạn có chắc chắn muốn ĐỔI SHIPPER cho đơn hàng này không?';
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    setAssigning(true);
    try {
      const res = await orderService.managerAssignDelivery(id, {
        driverId: selectedDriverId,
        reason: assignReason.trim() || undefined,
        note: assignNote.trim() || undefined,
      });
      setOrder(res.data);
      setAssignReason('');
      setAssignNote('');
      toast.success('Gán nhân viên giao hàng thành công!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể gán nhân viên giao hàng');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="p-4 bg-orange-100 rounded-2xl">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
        </div>
        <p className="text-slate-500 font-bold animate-pulse">Đang tải chi tiết đơn hàng...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-bold text-red-600">
          {error || 'Không tìm thấy đơn hàng'}
        </div>
        <button
          onClick={() => navigate('/manager/orders')}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const currentStatusInfo = statusLabels[order.status] || { label: order.status, color: '#475569', bg: 'bg-slate-50 text-slate-700' };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      {/* ── Breadcrumb Back Button ────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => navigate('/manager/orders')}
        className="inline-flex items-center gap-2 text-sm font-black text-orange-600 hover:text-orange-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách đơn hàng
      </button>

      {/* ── Header Title Card ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-orange-100 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">Mã đơn hàng: #{order.code}</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">Chi tiết & Điều phối đơn</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-slate-400 font-bold">Trạng thái:</span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${currentStatusInfo.bg}`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentStatusInfo.color }} />
            {currentStatusInfo.label}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px] items-start">
        {/* Left Side: Order Items and Timeline */}
        <div className="space-y-6">
          {/* Order Details & Customer Info */}
          <div className="bg-white rounded-3xl border border-orange-100 p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-slate-950">Thông tin khách hàng & Giao nhận</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Khách hàng</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {typeof order.cusId === 'object' ? order.cusId.fullName || order.cusId.username : 'Khách vãng lai'}
                    </p>
                    {typeof order.cusId === 'object' && (
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">{order.cusId.phone} · {order.cusId.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Địa chỉ giao hàng</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5 leading-snug">
                      {order.deliveryAddress.receiverName} ({order.deliveryAddress.phone})
                    </p>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {order.deliveryAddress.detail}, {order.deliveryAddress.ward}, {order.deliveryAddress.district ? `${order.deliveryAddress.district}, ` : ''}{order.deliveryAddress.city}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Thanh toán</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {order.payment?.method === 'cash' ? 'Tiền mặt' : order.payment?.method === 'cash_on_delivery' ? 'Tiền mặt khi nhận hàng (COD)' : 'Chuyển khoản trực tuyến'}
                    </p>
                    <p className={`text-xs font-black mt-0.5 ${order.payment?.paidAt ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {order.payment?.paidAt ? `Đã thanh toán (Lúc ${new Date(order.payment.paidAt).toLocaleTimeString('vi-VN')})` : 'Chờ thanh toán'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Bike className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nhân viên giao hàng</p>
                    {order.deliveryInfo?.driverId ? (
                      <div>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">
                          {typeof order.deliveryInfo.driverId === 'object'
                            ? (order.deliveryInfo.driverId as any).fullName || (order.deliveryInfo.driverId as any).username
                            : (staffList.find(s => s._id === order.deliveryInfo?.driverId)?.fullName || 'Nhân viên')}
                        </p>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                          SĐT: {typeof order.deliveryInfo.driverId === 'object'
                            ? (order.deliveryInfo.driverId as any).phone || 'Không có'
                            : (staffList.find(s => s._id === order.deliveryInfo?.driverId)?.phone || 'Không có')}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-slate-400 mt-1">Chưa gán nhân viên giao hàng</p>
                    )}
                  </div>
                </div>

                {order.note && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ghi chú từ khách hàng</p>
                      <p className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 p-2.5 rounded-xl mt-1 leading-relaxed">
                        "{order.note}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dish items in order */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-950 mb-4">Các món đã đặt</h2>
            <div className="divide-y divide-slate-100">
              {order.items.map((item, index) => {
                const dishName = typeof item.productId === 'object' ? item.productId.name : 'Món ăn';
                const dishPrice = typeof item.productId === 'object' ? item.productId.price : 0;
                const imageSrc = typeof item.productId === 'object' && item.productId.image
                  ? (typeof item.productId.image === 'string' ? item.productId.image : item.productId.image.secureUrl)
                  : null;

                return (
                  <div key={index} className="flex gap-4 py-4 first:pt-0 last:pb-0 items-center justify-between">
                    <div className="flex items-center gap-3">
                      {imageSrc && (
                        <img src={imageSrc} alt={dishName} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-950">{dishName}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                          Số lượng: {item.quantity} · Đơn giá: {dishPrice.toLocaleString('vi-VN')}₫
                        </p>
                        {item.variations && item.variations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.variations.map((v, i) => (
                              <span key={i} className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                {v.name}: {v.choice} {v.extraPrice ? `(+${v.extraPrice}₫)` : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-black text-slate-950 text-right">
                      {item.subTotal.toLocaleString('vi-VN')}₫
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total pricing details */}
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs font-semibold text-slate-500 max-w-xs ml-auto">
              <div className="flex justify-between">
                <span>Tạm tính:</span>
                <span className="font-bold text-slate-800">{order.subTotal.toLocaleString('vi-VN')}₫</span>
              </div>
              <div className="flex justify-between">
                <span>Phí giao hàng:</span>
                <span className="font-bold text-slate-800">{order.shippingFee.toLocaleString('vi-VN')}₫</span>
              </div>
              {order.discountAmount !== undefined && order.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Khuyến mãi:</span>
                  <span className="font-black">-{order.discountAmount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-dashed border-slate-200">
                <span>Tổng tiền:</span>
                <span className="text-orange-600 text-base">{order.totalPrice.toLocaleString('vi-VN')}₫</span>
              </div>
            </div>
          </div>

          {/* Timeline status history audit log */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-950 mb-6">Lịch sử vận hành & Giao dịch</h2>

            <div className="relative pl-6 border-l-2 border-orange-100 space-y-6">
              {order.statusHistory && order.statusHistory.length > 0 ? (
                order.statusHistory.map((step: any, index: number) => {
                  const statusInfo = statusLabels[step.status] || { label: step.status, color: '#64748b', bg: 'bg-slate-50' };
                  const actorName = typeof step.changedBy === 'object'
                    ? step.changedBy.fullName || step.changedBy.username
                    : 'Nhân viên';

                  return (
                    <div key={index} className="relative">
                      {/* Circle marker on timeline */}
                      <span
                        className="absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full border-4 border-white flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: statusInfo.color }}
                      />

                      <div className="space-y-1 bg-slate-50/70 border border-slate-100 p-4 rounded-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-white"
                              style={{ backgroundColor: statusInfo.color }}
                            >
                              {statusInfo.label}
                            </span>
                            <span className="text-xs font-black text-slate-800">
                              Bởi {actorName} ({actorRoleLabels[step.actorRole] || step.actorRole})
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(step.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>

                        {step.action && (
                          <p className="text-xs font-semibold text-slate-600">Thao tác: {step.action === 'move_status_backward' ? 'Lùi trạng thái đơn' : step.action === 'override_status' ? 'Ghi đè trạng thái' : step.action}</p>
                        )}
                        {step.reason && (
                          <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 p-2.5 rounded-xl mt-1.5">
                            <span className="font-black block text-[10px] uppercase tracking-wider text-rose-500 mb-0.5">Lý do điều phối</span>
                            "{step.reason}"
                          </div>
                        )}
                        {step.note && (
                          <p className="text-xs font-medium text-slate-500 mt-1">Ghi chú nội bộ: {step.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="relative">
                  <span className="absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full border-4 border-white bg-slate-400" />
                  <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-400 font-bold">
                    Khởi tạo đơn hàng lúc {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Manager Override Panel */}
        <div className="space-y-6">
          {/* Driver Assignment Card */}
          {order.status !== 'cancelled' && order.status !== 'completed' && (
            <div className="bg-white rounded-3xl border border-orange-100 p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-orange-600">
                <Bike className="w-5 h-5" />
                <h2 className="text-base font-black text-slate-950">Điều phối Giao hàng</h2>
              </div>

              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Gán nhân viên vận chuyển (shipper) cho đơn hàng. Đơn hàng sẽ tự động chuyển sang trạng thái <strong>Đang giao (shipping)</strong>.
              </p>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                {/* Select Driver */}
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chọn nhân viên giao hàng</span>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-orange-400 cursor-pointer"
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {staffList.map((staff) => (
                      <option key={staff._id} value={staff._id}>
                        {staff.fullName || staff.username} ({staff.phone || 'Không có SĐT'})
                      </option>
                    ))}
                  </select>
                </label>

                {/* Re-assign warning and reason (mandatory if already shipping) */}
                {(order.status === 'shipping' || order.status === 'delivering' || order.status === 'delivered') && (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-rose-50 border border-rose-200/50 rounded-2xl text-rose-800 text-[11px] font-semibold leading-normal space-y-1">
                      <p className="font-black uppercase tracking-wider text-rose-600 flex items-center gap-1">
                        ⚠️ Điều phối lại (Reassign)
                      </p>
                      <p>Đơn hàng đã được giao hoặc đang đi giao trước đó. Thao tác điều phối lại shipper mới yêu cầu nhập lý do bắt buộc.</p>
                    </div>

                    <label className="block">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Lý do điều phối lại <span className="text-rose-600 font-black">* (Bắt buộc)</span>
                      </span>
                      <textarea
                        value={assignReason}
                        onChange={(e) => setAssignReason(e.target.value)}
                        rows={2}
                        className={`mt-2 w-full rounded-2xl border px-4 py-3 text-xs font-semibold outline-none text-slate-800 placeholder:text-slate-400 transition-colors ${
                          !assignReason.trim()
                            ? "border-rose-300 focus:border-rose-500 bg-rose-50/10"
                            : "border-slate-200 focus:border-orange-400"
                        }`}
                        placeholder="Giải trình lý do đổi shipper..."
                      />
                      {!assignReason.trim() && (
                        <p className="mt-1.5 text-[11px] font-bold text-rose-600">
                          * Vui lòng nhập lý do điều phối lại (Bắt buộc)
                        </p>
                      )}
                    </label>
                  </div>
                )}

                {/* Note for shipper */}
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ghi chú cho shipper</span>
                  <textarea
                    value={assignNote}
                    onChange={(e) => setAssignNote(e.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-semibold outline-none focus:border-orange-400 text-slate-800 placeholder:text-slate-400"
                    placeholder="Địa chỉ khó tìm, số điện thoại phụ, hoặc lưu ý giao..."
                  />
                </label>

                {/* Submit button */}
                <button
                  type="button"
                  onClick={() => void handleAssignDelivery()}
                  disabled={assigning || !selectedDriverId || ((order.status === 'shipping' || order.status === 'delivering' || order.status === 'delivered') && !assignReason.trim())}
                  className="w-full rounded-2xl bg-orange-500 px-4 py-3.5 text-xs font-black text-white hover:bg-orange-600 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-md shadow-orange-500/10 shrink-0 cursor-pointer"
                >
                  {assigning ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang điều phối...
                    </div>
                  ) : (
                    'Xác nhận gán giao hàng'
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-orange-100 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 text-orange-600">
              <ShieldAlert className="w-5 h-5" />
              <h2 className="text-base font-black text-slate-950">Ghi đè Vận hành (Override)</h2>
            </div>

            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Dành riêng cho Manager để can thiệp khẩn cấp vào quy trình xử lý đơn (Hủy, hoàn tất thủ công hoặc sửa lỗi trạng thái).
            </p>

            <div className="border-t border-slate-100 pt-4 space-y-4">
              {/* Select status */}
              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái ghi đè mới</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as Order['status'])}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-orange-400 cursor-pointer"
                >
                  {nextStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label} ({status.value})
                    </option>
                  ))}
                </select>
              </label>

              {/* Sensitive override alert */}
              {isSensitive && (
                <div className="p-3.5 bg-rose-50 border border-rose-200/50 rounded-2xl text-rose-800 text-[11px] font-semibold leading-normal space-y-1 animate-in fade-in duration-200">
                  <p className="font-black uppercase tracking-wider text-rose-600 flex items-center gap-1">
                    ⚠️ Thao tác Nhạy cảm
                  </p>
                  <p>Hành động này bắt buộc phải nhập lý do giải trình để ghi nhận vào lịch sử vận hành.</p>
                </div>
              )}

              {/* Reason input */}
              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Lý do ghi đè {isSensitive && <span className="text-rose-600 font-black">* (Bắt buộc)</span>}
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-xs font-semibold outline-none text-slate-800 placeholder:text-slate-400 transition-colors ${
                    isSensitive && !reason.trim()
                      ? "border-rose-300 focus:border-rose-500 bg-rose-50/10"
                      : "border-slate-200 focus:border-orange-400"
                  }`}
                  placeholder="Giải trình tại sao can thiệp ghi đè..."
                />
                {isSensitive && !reason.trim() && (
                  <p className="mt-1.5 text-[11px] font-bold text-rose-600">
                    * Vui lòng nhập lý do can thiệp ghi đè (Bắt buộc)
                  </p>
                )}
              </label>

              {/* Internal note input */}
              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ghi chú nội bộ</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-semibold outline-none focus:border-orange-400 text-slate-800 placeholder:text-slate-400"
                  placeholder="Ghi chú thêm cho nhân viên bếp/giao hàng..."
                />
              </label>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600">
                  {error}
                </div>
              )}

              {/* Submit Override button */}
              <button
                type="button"
                onClick={() => void handleOverride()}
                disabled={saving || (isSensitive && !reason.trim())}
                className="w-full rounded-2xl bg-orange-500 px-4 py-3.5 text-xs font-black text-white hover:bg-orange-600 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-md shadow-orange-500/10 shrink-0 cursor-pointer"
              >
                {saving ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang đồng bộ...
                  </div>
                ) : (
                  'Xác nhận ghi đè trạng thái'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerOrderDetail;
