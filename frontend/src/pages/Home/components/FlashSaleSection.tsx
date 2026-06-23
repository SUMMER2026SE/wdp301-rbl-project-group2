import React, { useEffect, useState, useMemo } from 'react';
import { Flame, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FoodCard } from '@/components/shared/FoodCard';
import campaignAPI from '@/services/campaign.service';
import type { Campaign } from '@/services/campaign.service';
import { useSafeCart } from '@/hooks/useSafeCart';
import type { Product } from '@/types/product';
import { showAddToCartFeedback } from '@/utils/flyToCart';

const FlashSaleSection: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<{ hours: string; minutes: string; seconds: string }>({
    hours: '00',
    minutes: '00',
    seconds: '00',
  });

  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { safeAddItem } = useSafeCart();
  
  const sectionRef = React.useRef<HTMLElement>(null);
  const [hasTrackedView, setHasTrackedView] = useState<Record<string, boolean>>({});

  // Fetch campaigns and pick first with products
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await campaignAPI.getCampaigns();
        const now = Date.now();
        // Filter campaigns that are currently active (approved, and current time is between start and end)
        const active = (response.data || []).filter((c) => {
          const start = new Date(c.startTime).getTime();
          const end = new Date(c.endTime).getTime();
          return c.status === 'approved' && now >= start && now <= end && c.products.length > 0;
        });

        setActiveCampaigns(active);
        if (active.length > 0) {
          setSelectedCampaignId(active[0]._id);
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  const campaign = useMemo(() => {
    return activeCampaigns.find((c) => c._id === selectedCampaignId) || null;
  }, [activeCampaigns, selectedCampaignId]);

  // Track campaign view when the section intersects with viewport
  useEffect(() => {
    if (!campaign || hasTrackedView[campaign._id]) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          campaignAPI.trackActivity(campaign._id, 'view').catch(() => {});
          setHasTrackedView((prev) => ({ ...prev, [campaign._id]: true }));
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [campaign, hasTrackedView]);

  // Countdown to campaign.endTime
  useEffect(() => {
    if (!campaign) return;
    const endTime = new Date(campaign.endTime).getTime();

    const timer = setInterval(() => {
      const diff = endTime - Date.now();

      if (diff <= 0) {
        clearInterval(timer);
        setTimeLeft({ hours: '00', minutes: '00', seconds: '00' });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({
        hours: hours.toString().padStart(2, '0'),
        minutes: minutes.toString().padStart(2, '0'),
        seconds: seconds.toString().padStart(2, '0'),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [campaign]);

  // Map campaign products to displayable items
  const flashSaleProducts = useMemo(() => {
    if (!campaign) return [];

    return campaign.products
      .slice(0, 4)
      .map((item) => {
        const prod = item.productId;
        if (typeof prod === 'string') return null;

        const basePrice = prod.price;
        let salePrice: number;

        if (campaign.type === 'fixed_price' && item.fixedPrice != null) {
          salePrice = item.fixedPrice;
        } else if (campaign.type === 'discount' && item.discount != null) {
          salePrice = Math.round(basePrice * (1 - item.discount / 100));
        } else {
          salePrice = basePrice;
        }

        const imageUrl =
          typeof prod.image === 'string' ? prod.image : prod.image?.secureUrl ?? '';

        return {
          product: prod,
          _id: prod._id,
          name: prod.name,
          image: imageUrl,
          price: salePrice,
          originalPrice: basePrice,
          soldCount: Math.floor(Math.random() * 50) + 10,
          totalStock: 100,
        };
      })
      .filter(
        (
          p
        ): p is {
          _id: string;
          name: string;
          image: string;
          price: number;
          originalPrice: number;
          soldCount: number;
          totalStock: number;
          product: Product;
        } => p !== null
      );
  }, [campaign]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (activeCampaigns.length === 0 || !campaign || flashSaleProducts.length === 0)
    return (
      <section className="my-12 p-12 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
        <p className="text-slate-400 font-medium">Hiện chưa có deal chớp nhoáng nào.</p>
        <Link
          to="/menu"
          className="inline-flex items-center gap-2 mt-4 text-orange-600 hover:text-orange-700 font-bold transition-colors"
        >
          Khám phá thực đơn ngay <ChevronRight className="w-5 h-5" />
        </Link>
      </section>
    );

  return (
    <section ref={sectionRef} className="my-12 overflow-hidden">
      {/* Tabs for Multiple Campaigns */}
      {activeCampaigns.length > 1 && (
        <div className="flex flex-wrap gap-2.5 mb-6 bg-slate-50 p-2 rounded-2xl border border-slate-100 max-w-max">
          {activeCampaigns.map((c) => (
            <button
              key={c._id}
              onClick={() => {
                setSelectedCampaignId(c._id);
              }}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCampaignId === c._id
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/10'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/70'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Header with Countdown */}
      <Link
        to={`/products-campaign/${campaign._id}`}
        onClick={() => {
          campaignAPI.trackActivity(campaign._id, 'click').catch(() => {});
        }}
        className="block bg-white rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between border border-orange-50 shadow-sm mb-8 transition-all hover:shadow-lg hover:border-orange-100"
      >
        <div className="flex items-center gap-5 mb-4 md:mb-0">
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/20 rotate-3">
            <Flame className="text-white w-8 h-8 fill-white animate-bounce" />
          </div>
          <div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
              {campaign.name} <span className="text-red-600">Giá Sốc</span>
            </h2>
            <p className="text-slate-500 font-medium text-sm flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Nhanh tay trước khi hết hàng!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-orange-50 p-2.5 rounded-[2rem] border border-orange-100">
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] px-3 hidden sm:block">
            Kết thúc trong
          </span>
          <div className="flex items-center gap-2.5">
            {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((unit, idx) => (
              <React.Fragment key={idx}>
                <div className="w-12 h-14 bg-orange-100 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-orange-200/50 border-b-4 border-orange-200">
                  <span className="text-orange-600 text-xl font-black tabular-nums leading-none">
                    {unit}
                  </span>
                  <span className="text-[8px] text-orange-400 font-bold uppercase mt-1">
                    {idx === 0 ? 'Hrs' : idx === 1 ? 'Min' : 'Sec'}
                  </span>
                </div>
                {idx < 2 && (
                  <span className="text-red-600 font-black text-2xl animate-pulse">:</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Link>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {flashSaleProducts.map((p) => (
          <FoodCard
            key={p._id}
            id={p._id}
            name={p.name}
            image={p.image}
            price={p.price}
            originalPrice={p.originalPrice}
            rating={p.product.rating ?? 0}
            progress={{
              value: p.soldCount,
              label: `Đã bán ${p.soldCount}`,
            }}
            onAddToCart={(_, trigger) => {
              if (campaign) {
                campaignAPI.trackActivity(campaign._id, 'click').catch(() => {});
              }
              safeAddItem(
                p.product,
                {
                  productId: p._id,
                  name: p.name,
                  image: p.image,
                  price: p.price,
                  quantity: 1,
                },
                () => {
                  showAddToCartFeedback(trigger, p.image, 'Đã thêm sản phẩm vào giỏ hàng!');
                }
              );
            }}
          />
        ))}
      </div>
    </section>
  );
};

export default FlashSaleSection;
