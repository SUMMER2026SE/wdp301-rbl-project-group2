import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Flame,
  ArrowLeft,
  Clock,
  Loader2,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";
import campaignAPI from "@/services/campaign.service";
import type { Campaign } from "@/services/campaign.service";
import { useSafeCart } from "@/hooks/useSafeCart";
import { FoodCard } from "@/components/shared/FoodCard";
import { showAddToCartFeedback } from "@/utils/flyToCart";
import type { Product } from "@/types/product";

const CampaignProductsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { safeAddItem } = useSafeCart();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState<{
    hours: string;
    minutes: string;
    seconds: string;
  }>({
    hours: "00",
    minutes: "00",
    seconds: "00",
  });
  // Fetch all active campaigns and the current campaign details
  useEffect(() => {
    const fetchCampaignData = async () => {
      try {
        if (activeCampaigns.length === 0) {
          setLoading(true);
        }
        setError(null);

        const response = await campaignAPI.getCampaigns();
        const now = Date.now();
        const active = (response.data || []).filter((c) => {
          const start = new Date(c.startTime).getTime();
          const end = new Date(c.endTime).getTime();
          return (
            c.status === "approved" &&
            now >= start &&
            now <= end &&
            c.products.length > 0
          );
        });
        setActiveCampaigns(active);

        const campaignId = id || (active.length > 0 ? active[0]._id : null);
        if (campaignId) {
          const matched = active.find((c) => c._id === campaignId);
          if (matched) {
            setCampaign(matched);
            campaignAPI.trackActivity(matched._id, "view").catch(() => {});
          } else {
            const detailRes = await campaignAPI.getCampaignById(campaignId);
            if (detailRes.success) {
              setCampaign(detailRes.data);
              campaignAPI
                .trackActivity(detailRes.data._id, "view")
                .catch(() => {});
            } else {
              setError("Không thể tải thông tin chiến dịch");
            }
          }
        }
      } catch (err: any) {
        console.error("Error fetching campaign details:", err);
        setError(
          err.response?.data?.message || "Đã xảy ra lỗi khi tải chiến dịch.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignData();
  }, [id]);

  const isUpcoming = useMemo(() => {
    if (!campaign) return false;
    return Date.now() < new Date(campaign.startTime).getTime();
  }, [campaign]);

  // Countdown timer
  useEffect(() => {
    if (!campaign) return;
    const startTime = new Date(campaign.startTime).getTime();
    const endTime = new Date(campaign.endTime).getTime();

    const timer = setInterval(() => {
      const now = Date.now();
      const targetTime = now < startTime ? startTime : endTime;
      const diff = targetTime - now;

      if (diff <= 0) {
        clearInterval(timer);
        setTimeLeft({ hours: "00", minutes: "00", seconds: "00" });
        // Tự động tải lại trang để chuyển trạng thái sắp diễn ra -> đang diễn ra
        window.location.reload();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({
        hours: hours.toString().padStart(2, "0"),
        minutes: minutes.toString().padStart(2, "0"),
        seconds: seconds.toString().padStart(2, "0"),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [campaign]);

  // Map campaign products
  const productsList = useMemo(() => {
    if (!campaign) return [];

    return campaign.products
      .map((item) => {
        const prod = item.productId;
        if (typeof prod === "string") return null;

        const basePrice = prod.price;
        let salePrice: number;

        if (
          !isUpcoming &&
          campaign.type === "fixed_price" &&
          item.fixedPrice != null
        ) {
          salePrice = item.fixedPrice;
        } else if (
          !isUpcoming &&
          campaign.type === "discount" &&
          item.discount != null
        ) {
          salePrice = Math.round(basePrice * (1 - item.discount / 100));
        } else {
          salePrice = basePrice;
        }

        const imageUrl =
          typeof prod.image === "string"
            ? prod.image
            : (prod.image?.secureUrl ?? "");

        return {
          product: prod,
          _id: prod._id,
          name: prod.name,
          image: imageUrl,
          price: salePrice,
          originalPrice:
            !isUpcoming && salePrice !== basePrice ? basePrice : undefined,
          soldCount: Math.floor(Math.random() * 40) + 12,
        };
      })
      .filter((p): p is any => p !== null);
  }, [campaign, isUpcoming]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50 px-4">
        <div className="text-center bg-white p-8 rounded-3xl shadow-lg max-w-md w-full border border-slate-100">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Không tìm thấy chiến dịch
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {error || "Chiến dịch này có thể đã kết thúc hoặc không tồn tại."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl transition-all shadow-md shadow-orange-500/25 cursor-pointer"
          >
            Quay lại Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 pb-20">
      {/* Header Navigation */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-orange-600 font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại</span>
          </button>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${isUpcoming ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`}
            />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isUpcoming ? "Chiến dịch sắp diễn ra" : "Chiến dịch đang chạy"}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        {/* Campaign Tabs */}
        {activeCampaigns.length > 1 && (
          <div className="flex flex-wrap gap-2.5 mb-8 bg-white p-2 rounded-2xl border border-slate-200/60 max-w-max shadow-sm">
            {activeCampaigns.map((c) => (
              <button
                key={c._id}
                onClick={() => {
                  navigate(`/products-campaign/${c._id}`);
                }}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  campaign._id === c._id
                    ? "bg-orange-600 text-white shadow-md shadow-orange-600/10"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Campaign Banner Header */}
        <div className="bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 rounded-3xl p-8 md:p-12 text-white shadow-xl mb-12 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-10 translate-y-10">
            <ShoppingBag className="w-96 h-96" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                <Flame className="w-4 h-4 fill-white text-white animate-bounce" />
                <span>
                  {isUpcoming ? "Sắp diễn ra" : "Giá siêu rẻ chớp nhoáng"}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none mb-3">
                {campaign.name}
              </h1>
              <p className="text-white/80 font-medium max-w-lg text-sm md:text-base">
                {isUpcoming
                  ? "Chương trình ưu đãi chưa bắt đầu. Vui lòng đón xem các sản phẩm sẽ được giảm giá đặc biệt khi chương trình chính thức mở bán!"
                  : "Nhận ngay ưu đãi giá hời cho các món ngon bán chạy nhất từ hôm nay! Chương trình tự động áp dụng khi thanh toán."}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/25 p-5 rounded-2xl flex flex-col items-center shrink-0">
              <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-3">
                {isUpcoming ? "Thời gian đến khi mở bán" : "Thời gian còn lại"}
              </span>
              <div className="flex items-center gap-2">
                {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map(
                  (unit, idx) => (
                    <React.Fragment key={idx}>
                      <div className="w-12 h-14 bg-white text-orange-600 rounded-xl flex flex-col items-center justify-center shadow-lg border-b-4 border-orange-100/30">
                        <span className="text-lg md:text-xl font-black tabular-nums leading-none">
                          {unit}
                        </span>
                        <span className="text-[7px] text-slate-400 font-bold uppercase mt-1">
                          {idx === 0 ? "Hrs" : idx === 1 ? "Min" : "Sec"}
                        </span>
                      </div>
                      {idx < 2 && (
                        <span className="text-white font-black text-xl animate-pulse">
                          :
                        </span>
                      )}
                    </React.Fragment>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <span>Danh sách món ăn khuyến mãi</span>
            <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
              {productsList.length} món
            </span>
          </h2>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {productsList.map((p) => (
            <FoodCard
              key={p._id}
              id={p._id}
              name={p.name}
              image={p.image}
              price={p.price}
              originalPrice={p.originalPrice}
              rating={p.product.rating ?? 0}
              progress={{
                value: (p.soldCount / 100) * 100,
                label: `Đã bán ${p.soldCount}`,
              }}
              onAddToCart={
                isUpcoming
                  ? undefined
                  : (_, trigger) => {
                      campaignAPI
                        .trackActivity(campaign._id, "click")
                        .catch(() => {});
                      safeAddItem(p.product, {
                        productId: p._id,
                        name: p.name,
                        image: p.image,
                        price: p.price,
                        quantity: 1,
                      });
                    }
              }
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default CampaignProductsPage;
