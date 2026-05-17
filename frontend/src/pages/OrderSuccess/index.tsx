import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCart } from "@/hooks/useCart";
import { Check, Truck, ReceiptText, ArrowRight, Home } from "lucide-react";

interface OrderSuccessState {
  orderCode?: string;
  orderId?: string;
  totalPrice?: number;
}

const OrderSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(["customer", "common"]);
  const { clearCart } = useCart();

  // Read the order info passed via navigation state or URL query params
  const state = location.state as OrderSuccessState | null;
  const searchParams = new URLSearchParams(location.search);

  // Try 'code' (our ORD-XXX) first, then 'orderCode' (numeric from PayOS)
  const orderCode =
    state?.orderCode ||
    searchParams.get("code") ||
    searchParams.get("orderCode");
  const totalPrice = state?.totalPrice;

  // Security guard: if someone navigates here directly without placing an order,
  // redirect to home after a brief delay
  useEffect(() => {
    if (!orderCode) {
      const timer = setTimeout(() => navigate("/", { replace: true }), 100);
      return () => clearTimeout(timer);
    }
  }, [orderCode, navigate]);

  // Clear cart when we have a valid order code (COD or PayOS returnUrl)
  useEffect(() => {
    if (orderCode) clearCart();
  }, [orderCode, clearCart]);

  // Handle PayOS cancellation redirect
  useEffect(() => {
    const isCancelled =
      searchParams.get("status") === "CANCELLED" ||
      searchParams.get("cancel") === "true";

    if (isCancelled && orderCode) {
      navigate(
        `/failed?reason=cancel&orderCode=${orderCode}${state?.orderId ? `&orderId=${state.orderId}` : ""}`,
        {
          replace: true,
        },
      );
    }
  }, [searchParams, orderCode, navigate]);

  if (!orderCode) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">

      {/* Background Decorative Elements (Nhuộm Cam) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-400/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-400/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Success Card */}
      <div className="w-full max-w-[480px] bg-white rounded-[2.5rem] p-8 sm:p-10 flex flex-col items-center shadow-2xl shadow-orange-900/5 border border-slate-100 relative z-10 animate-in zoom-in-95 slide-in-from-bottom-10 fade-in duration-500 ease-out">

        {/* Animated Check Icon (Nhuộm Cam) */}
        <div className="relative mb-8 mt-2">
          <div className="absolute inset-0 bg-orange-400 rounded-full animate-ping opacity-20" />
          <div className="absolute inset-0 bg-orange-100 rounded-full scale-150" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white shadow-xl shadow-orange-500/30 ring-8 ring-white">
            <Check className="w-12 h-12 stroke-[3px]" />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center mb-3">
          {t("customer:orderSuccess.title", "Đặt hàng thành công!")}
        </h1>

        <p className="text-slate-500 text-center text-sm font-medium mb-8 px-4">
          Cảm ơn bạn đã lựa chọn FoodieDash. Bếp đang chuẩn bị món ngon cho bạn rồi nhé!
        </p>

        {/* Order Details Ticket */}
        <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-5 mb-8 relative">
          {/* Cutouts for ticket effect */}
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full border-r-2 border-slate-200" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full border-l-2 border-slate-200" />

          <div className="flex flex-col items-center gap-1 border-b border-dashed border-slate-200 pb-4 mb-4">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Mã đơn hàng của bạn
            </span>
            <span className="font-mono text-2xl font-bold text-orange-600 tracking-wider">
              #{orderCode.slice(-6)}
            </span>
          </div>

          {totalPrice && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500">Tổng thanh toán:</span>
              <span className="text-xl font-black text-orange-600">
                {totalPrice.toLocaleString("vi-VN")}đ
              </span>
            </div>
          )}
        </div>

        {/* Delivery Estimate */}
        <div className="w-full bg-orange-50/50 border border-orange-100 rounded-2xl p-4 mb-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-orange-600/70 mb-0.5">
              Dự kiến giao hàng
            </p>
            <p className="text-sm font-bold text-slate-800">
              Hôm nay • 30 - 45 phút tới
            </p>
          </div>
        </div>

        {/* Action Buttons (Nút chính chuyển sang Cam) */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => {
              const targetId = state?.orderId || orderCode;
              if (targetId) {
                navigate(`/orders/${targetId}`);
              } else {
                navigate("/profile/history");
              }
            }}
            className="group flex items-center justify-center gap-2 rounded-xl h-14 bg-orange-500 text-white text-base font-bold w-full shadow-lg shadow-orange-500/25 hover:bg-orange-600 transition-all active:scale-[0.98]"
          >
            <ReceiptText className="w-5 h-5" />
            <span>{t("customer:orderSuccess.trackOrder", "Theo dõi đơn hàng")}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <Link to="/" replace className="w-full">
            <button className="flex items-center justify-center gap-2 rounded-xl h-14 bg-white border-2 border-slate-100 text-slate-600 text-base font-bold w-full hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all active:scale-[0.98]">
              <Home className="w-5 h-5" />
              <span>{t("customer:orderSuccess.backToHome", "Về trang chủ")}</span>
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default OrderSuccessPage;