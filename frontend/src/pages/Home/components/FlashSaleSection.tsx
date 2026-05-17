import React, { useEffect, useState, useMemo } from 'react';
import { Flame, ChevronRight, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FoodCard } from '@/components/shared/FoodCard';
import productAPI from '@/services/product.service';
import type { Product } from '@/types/product';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';

const FlashSaleSection: React.FC = () => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<{ hours: string; minutes: string; seconds: string }>({
    hours: '02',
    minutes: '00',
    seconds: '00',
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const { toast } = useToast();

  // Countdown logic
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59);

      const diff = endOfDay.getTime() - now.getTime();

      if (diff <= 0) {
        clearInterval(timer);
        return;
      }

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({
        hours: hours.toString().padStart(2, '0'),
        minutes: minutes.toString().padStart(2, '0'),
        seconds: seconds.toString().padStart(2, '0'),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch products for flash sale
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productAPI.getProducts({ limit: 4, page: 1 });
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching flash sale products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Standardize product data for the card
  const flashSaleProducts = useMemo(() => {
    return products.map(p => ({
      ...p,
      salePrice: p.price * 0.5, // 50% discount for flash sale
      originalPrice: p.price,
      soldCount: Math.floor(Math.random() * 50) + 10,
      totalStock: 100
    }));
  }, [products]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (flashSaleProducts.length === 0) return (
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
    <section className="my-12 overflow-hidden">
      {/* Header with Countdown */}
      <div className="bg-white rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between border border-orange-50 shadow-sm mb-8 transition-all hover:shadow-lg">
        <div className="flex items-center gap-5 mb-4 md:mb-0">
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/20 rotate-3">
            <Flame className="text-white w-8 h-8 fill-white animate-bounce" />
          </div>
          <div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
              Flash Sale <span className="text-red-600">Giá Sốc</span>
            </h2>
            <p className="text-slate-500 font-medium text-sm flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Nhanh tay trước khi hết hàng!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-orange-50 p-2.5 rounded-[2rem] border border-orange-100">
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] px-3 hidden sm:block">Kết thúc trong</span>
          <div className="flex items-center gap-2.5">
            {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((unit, idx) => (
              <React.Fragment key={idx}>
                <div className="w-12 h-14 bg-orange-100 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-orange-200/50 border-b-4 border-orange-200">
                  <span className="text-orange-600 text-xl font-black tabular-nums leading-none">{unit}</span>
                  <span className="text-[8px] text-orange-400 font-bold uppercase mt-1">{idx === 0 ? 'Hrs' : idx === 1 ? 'Min' : 'Sec'}</span>
                </div>
                {idx < 2 && <span className="text-red-600 font-black text-2xl animate-pulse">:</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {flashSaleProducts.map((p) => (
          <FoodCard
            key={p._id}
            id={p._id}
            name={p.name}
            image={typeof p.image === 'string' ? p.image : p.image?.secure_url || ''}
            price={p.salePrice}
            originalPrice={p.originalPrice}
            rating={p.rating}
            restaurant={p.restaurant}
            time={p.time}
            progress={{
              value: (p.soldCount / p.totalStock) * 100,
              label: `Đã bán ${p.soldCount}`
            }}
            onAddToCart={() => {
              addItem({
                productId: p._id,
                name: p.name,
                image: typeof p.image === 'string' ? p.image : p.image?.secure_url || '',
                price: p.salePrice,
                quantity: 1
              });
              toast(t('customer:foodCard.addToCart', 'Đã thêm vào giỏ hàng!'), 'success');
            }}
          />
        ))}
      </div>


    </section>
  );
};

export default FlashSaleSection;
