import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight, Flame, Leaf, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSlide {
    title: string;
    highlight: string;
    description: string;
    tag: string;
    icon: any;
    image: string;
    bgGradient: string;
    highlightColor: string;
}

const HeroCarousel = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const heroSlides: HeroSlide[] = [
        {
            title: "Trứ danh",
            highlight: "Đặc Sản Phố Hội",
            description: "Thưởng thức Cao Lầu, Mì Quảng chuẩn vị miền Trung ngay tại nhà. Giảm ngay 20% cho đơn hàng đầu tiên.",
            tag: "Best Seller",
            icon: Flame,
            image: "https://images.unsplash.com/photo-1555126634-323283e090fa?w=1600&h=800&fit=crop",
            bgGradient: "from-black/90 via-black/50",
            highlightColor: "from-orange-400 to-amber-300",
        },
        {
            title: "Ăn Ngon",
            highlight: "Dáng Thon - Eo Gọn",
            description: "Thực đơn Eat-clean được thiết kế riêng. Trợ lý AI tự động cảnh báo dị ứng, an tâm tuyệt đối.",
            tag: "Healthy & AI",
            icon: Leaf,
            image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1600&h=800&fit=crop",
            bgGradient: "from-slate-900/90 via-slate-900/40",
            highlightColor: "from-emerald-400 to-teal-300",
        },
        {
            title: "Giao Hàng",
            highlight: "Thần Tốc 0đ",
            description: "Đội ngũ Shipper nội bộ giao ngay món nóng hổi trong 30 phút. Miễn phí ship bán kính 3km.",
            tag: "In-house Delivery",
            icon: Truck,
            // [CẬP NHẬT 1]: Thay URL ảnh giao hàng bị lỗi bằng ảnh mới hiển thị cực nét
            image: "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=1600&h=800&fit=crop",
            bgGradient: "from-orange-900/90 via-orange-900/40",
            highlightColor: "from-yellow-300 to-orange-300",
        },
    ];

    useEffect(() => {
        if (currentSlide === heroSlides.length) {
            timeoutRef.current = setTimeout(() => {
                setIsTransitioning(false);
                setCurrentSlide(0);
            }, 700);
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [currentSlide, heroSlides.length]);

    useEffect(() => {
        if (!isTransitioning) {
            const timer = setTimeout(() => {
                setIsTransitioning(true);
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isTransitioning]);

    const nextSlide = useCallback(() => {
        if (currentSlide < heroSlides.length) {
            if (!isTransitioning) setIsTransitioning(true);
            setCurrentSlide((prev) => prev + 1);
        }
    }, [currentSlide, heroSlides.length, isTransitioning]);

    const prevSlide = () => {
        if (!isTransitioning) setIsTransitioning(true);
        setCurrentSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));
    };

    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(() => {
            nextSlide();
        }, 5000);
        return () => clearInterval(timer);
    }, [nextSlide, isPaused]);

    // [CẬP NHẬT 4]: Hàm cuộn xuống Section bên dưới mượt mà
    const handleExploreClick = () => {
        window.scrollBy({
            top: window.innerHeight * 0.75, // Cuộn xuống 75% chiều cao màn hình hiện tại
            behavior: "smooth"
        });
    };

    return (
        <section
            className="relative w-full group select-none"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* [CẬP NHẬT 2]: Tăng chiều cao lên lg:aspect-[2/1] và min-h-[450px] để banner rộng rãi hơn */}
            <div className="relative overflow-hidden rounded-[2.5rem] aspect-[4/3] md:aspect-[21/8] shadow-2xl shadow-orange-900/10">

                {/* Khu vực Slides */}
                <div
                    className={`flex h-full ${isTransitioning ? 'transition-transform duration-700 ease-in-out' : ''}`}
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                    {heroSlides.map((slide, idx) => (
                        <SlideItem
                            key={`slide-${idx}`}
                            slide={slide}
                            onExplore={handleExploreClick}
                        />
                    ))}
                    <SlideItem
                        slide={heroSlides[0]}
                        onExplore={handleExploreClick}
                    />
                </div>

                {/* [CẬP NHẬT 3]: Vùng nhấn vô hình thay cho 2 nút Arrow */}
                {/* 25% màn hình bên trái -> Bấm lùi */}
                <div
                    className="absolute top-0 left-0 w-[25%] h-full z-20 cursor-pointer"
                    onClick={prevSlide}
                    title="Trang trước"
                />
                {/* 25% màn hình bên phải -> Bấm tới */}
                <div
                    className="absolute top-0 right-0 w-[25%] h-full z-20 cursor-pointer"
                    onClick={nextSlide}
                    title="Trang tiếp theo"
                />

                {/* Navigation Dots (Chỉ báo chấm tròn) */}
                <div className="absolute z-30 bottom-8 left-1/2 -translate-x-1/2 flex gap-2.5">
                    {heroSlides.map((_, idx) => (
                        <button
                            key={`dot-${idx}`}
                            onClick={() => {
                                setIsTransitioning(true);
                                setCurrentSlide(idx);
                            }}
                            className={`h-2 rounded-full transition-all duration-500 ${(currentSlide === idx || (currentSlide === heroSlides.length && idx === 0))
                                ? 'w-8 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                                : 'w-2 bg-white/40 hover:bg-white/80 hover:w-4'
                                }`}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

const SlideItem = ({ slide, onExplore }: { slide: HeroSlide, onExplore: () => void }) => {
    const Icon = slide.icon;
    return (
        <div className="min-w-full h-full relative flex items-center group/slide">
            <img
                src={slide.image}
                alt={slide.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[10000ms] ease-linear group-hover/slide:scale-110"
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${slide.bgGradient} to-black/10`} />

            <div className="relative z-10 w-full max-w-2xl px-6 sm:px-12 md:px-16 py-12 flex flex-col gap-5 items-start pointer-events-none">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-lg">
                    <Icon className="w-3.5 h-3.5" />
                    {slide.tag}
                </div>

                <h1 className="text-white text-4xl sm:text-5xl md:text-6xl font-black leading-[1.15] tracking-tight drop-shadow-lg">
                    {slide.title} <br />
                    <span className={`text-transparent bg-clip-text bg-gradient-to-r ${slide.highlightColor} filter drop-shadow-sm`}>
                        {slide.highlight}
                    </span>
                </h1>

                <p className="text-slate-200 text-sm sm:text-base md:text-lg font-medium max-w-[90%] md:max-w-md leading-relaxed drop-shadow-md">
                    {slide.description}
                </p>

                {/* Nút có z-index cao hơn vùng lướt để vẫn bấm được */}
                <div className="flex gap-4 mt-4 pointer-events-auto relative z-30">
                    <Button
                        onClick={onExplore}
                        className="bg-white text-slate-900 hover:bg-orange-50 hover:text-orange-600 font-bold h-12 px-8 rounded-2xl shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                    >
                        Khám phá ngay <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default HeroCarousel;