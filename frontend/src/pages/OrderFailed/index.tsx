import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import paymentService from "@/services/payment.service";

const getMessageByReason = (reason: string | null) => {
  switch (reason) {
    case "cancel":
      return "Bạn đã hủy thanh toán. Vui lòng đặt lại đơn hàng.";
    case "failed":
      return "Thanh toán thất bại. Vui lòng thử lại hoặc chọn phương thức khác.";
    case "timeout":
      return "Phiên thanh toán đã hết hạn. Vui lòng thử lại.";
    case "error":
      return "Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.";
    default:
      return "Thanh toán không thành công. Vui lòng thử lại.";
  }
};

const OrderFailedPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState<string>(getMessageByReason(null));

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const reason = searchParams.get("reason");
  const orderCodeRaw = searchParams.get("orderCode");
  const orderCode = orderCodeRaw ? Number(orderCodeRaw) : null;

  // Update base message from reason
  useEffect(() => {
    setMessage(getMessageByReason(reason));
  }, [reason]);

  // Best-effort: cancel the created order when PayOS returns via cancelUrl
  useEffect(() => {
    if (reason !== "cancel") return;
    if (!orderCodeRaw || orderCode === null || Number.isNaN(orderCode)) return;

    setMessage("Bạn đã hủy thanh toán. Đang cập nhật trạng thái đơn hàng...");

    paymentService
      .cancelPayosOrder(orderCode)
      .then(() => {
        setMessage("Bạn đã hủy thanh toán. Vui lòng đặt lại đơn hàng.");
      })
      .catch(() => {
        setMessage("Bạn đã hủy thanh toán. Vui lòng đặt lại đơn hàng.");
      });
  }, [reason, orderCodeRaw, orderCode]);

  // Auto redirect back to checkout
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/checkout", { replace: true });
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#1b140d] antialiased min-h-screen relative">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
            <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
              <div className="py-10 px-4 md:px-10 opacity-30 grayscale pointer-events-none">
                <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl mb-6" />
                <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
                <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded mb-2" />
                <div className="h-4 w-5/6 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-white/60 dark:bg-black/60">
        <div className="relative w-full max-w-[460px] bg-white dark:bg-[#181a1b] rounded-2xl p-8 flex flex-col items-center shadow-2xl border border-[#f3ede7] dark:border-gray-700 animate-in zoom-in-95 fade-in duration-300">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-red-500/15 rounded-full scale-150 blur-xl" />
            <div className="relative w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/25">
              <span className="material-symbols-outlined text-[44px] font-bold">
                close
              </span>
            </div>
          </div>

          <h1 className="text-[#1b140d] dark:text-white tracking-tight text-[26px] font-extrabold leading-tight text-center pb-2">
            Thanh toán thất bại
          </h1>

          <p className="text-[#9a734c] dark:text-gray-400 text-sm text-center mb-6">
            {message}
          </p>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => navigate("/checkout", { replace: true })}
              className="flex items-center justify-center rounded-lg h-14 bg-orange-600 text-white text-base font-bold leading-normal tracking-[0.015em] w-full shadow-lg shadow-orange-600/20 hover:scale-[1.02] transition-transform"
            >
              <span className="material-symbols-outlined mr-2">shopping_cart</span>
              <span>Quay lại checkout</span>
            </button>

            <Link to="/menu" replace>
              <button className="flex items-center justify-center rounded-lg h-14 bg-[#f3ede7] dark:bg-gray-700 text-[#1b140d] dark:text-white text-base font-bold leading-normal tracking-[0.015em] w-full hover:bg-[#ebe2d9] dark:hover:bg-gray-600 transition-colors">
                <span>Về menu</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderFailedPage;

