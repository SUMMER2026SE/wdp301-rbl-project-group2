import { useRef } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Danh mục khớp 100% với giá trị trong DB (product.category) từ file products_seed.json.
 * Link đến /menu?category=<id> để MenuPage filter đúng.
 */
const CATEGORIES = [
  {
    id: "Đặc Sản & Bán Chạy",
    name: "Đặc Sản Phố Hội",
    image: "https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&h=500&fit=crop",
  },
  {
    id: "Trứ Danh Món Nước",
    name: "Trứ Danh Món Nước",
    image: "https://tse1.mm.bing.net/th/id/OIP.F22QiBk-4Fw8UhdC-DDYbgHaJQ?pid=Api&P=0&h=220", // Ảnh Phở/Bún
  },
  {
    id: "Cơm Đĩa Truyền Thống",
    name: "Cơm Truyền Thống",
    image: "https://i.pinimg.com/originals/3e/0d/a2/3e0da25beef0e26c69f886c8dfc3e0c4.jpg", // Ảnh Cơm/Thịt nướng
  },
  {
    id: "Góc Healthy & Ăn Kiêng",
    name: "Góc Healthy (AI)",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=500&fit=crop", // Ảnh Salad/Eat clean
  },
  {
    id: "Gọi Thêm Ăn Kèm",
    name: "Topping Ăn Kèm",
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=500&fit=crop", // Ảnh món ăn kèm/snack
  },
  {
    id: "Giải Khát & Tráng Miệng",
    name: "Đồ Uống & Tráng Miệng",
    image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=500&fit=crop", // Ảnh Đồ uống
  },
];

const CategorySection = () => {
  const { t } = useTranslation("customer");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300; // Tăng khoảng cách cuộn cho mượt
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="relative w-full py-4">
      <div className="w-full">
        {/* Header Section */}
        <div className="flex items-end justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100/80 p-2.5 rounded-xl border border-orange-200/50">
              <LayoutGrid className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {t("home.featuredCategories", "Danh mục món ăn")}
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Khám phá thực đơn đa dạng của chúng tôi</p>
            </div>
          </div>

          {/* Scroll Buttons (Ẩn trên mobile, hiện trên Desktop) */}
          <div className="hidden md:flex gap-2">
            <button
              type="button"
              onClick={() => scroll("left")}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-all shadow-sm active:scale-95"
              aria-label="Cuộn trái"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-all shadow-sm active:scale-95"
              aria-label="Cuộn phải"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 snap-x snap-mandatory no-scrollbar mask-fade-edges-right"
        >
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/menu?category=${encodeURIComponent(cat.id)}`}
              className="snap-start shrink-0 group cursor-pointer w-[150px] sm:w-[180px] md:w-[200px]"
            >
              <div className="relative w-full aspect-[4/5] min-h-[180px] rounded-[1.5rem] overflow-hidden bg-slate-100 border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-orange-500/20 hover:border-orange-200 transition-all duration-300 hover:-translate-y-1.5">
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-[800ms] ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-start">
                  <span className="font-bold text-base sm:text-lg text-white drop-shadow-md leading-tight group-hover:text-orange-300 transition-colors">
                    {cat.name}
                  </span>
                  <div className="overflow-hidden h-0 group-hover:h-5 transition-all duration-300 mt-1">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-orange-400 uppercase tracking-widest">
                      Xem menu <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;