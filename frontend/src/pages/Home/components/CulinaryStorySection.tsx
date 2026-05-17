import { BookOpen, Clock, ArrowRight, ChefHat, Sparkles } from "lucide-react";
import { Link } from "react-router-dom"; // Giả định em đang dùng react-router-dom

// Tách data ra để dễ quản lý, sau này có thể fetch từ API
const stories = [
    {
        id: "story-1",
        title: "Bí quyết nước dùng thanh ngọt từ xương hầm 24h",
        excerpt: "Nước dùng phở được ninh từ xương ống bò tươi ngon trong suốt 24 giờ cùng các loại gia vị thảo mộc tự nhiên, mang lại vị ngọt thanh hoàn hảo không cần mì chính...",
        image: "https://photo-baomoi.bmcdn.me/w700_r1/2025_05_19_83_52269560/e4d2432fec61053f5c70.jpg", // Đã thay ảnh Unsplash chất lượng cao
        category: "Bí quyết Bếp trưởng",
        readTime: "3 phút đọc",
        icon: ChefHat
    },
    {
        id: "story-2",
        title: "Hành trình Eat-Clean: Khi AI làm phụ bếp cho bạn",
        excerpt: "Khám phá cách hệ thống trí tuệ nhân tạo của chúng tôi tính toán lượng calo, phân tích thành phần và loại bỏ hoàn toàn rủi ro dị ứng cho từng bữa ăn của bạn...",
        image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",
        category: "Sức khỏe & AI",
        readTime: "5 phút đọc",
        icon: Sparkles
    }
];

const CulinaryStorySection = () => {
    return (
        <section className="w-full">
            {/* Header Section */}
            <div className="flex items-end justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-100/80 p-2.5 rounded-xl border border-orange-200/50">
                        <BookOpen className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Góc Bếp & Chuyện Nghề
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            Khám phá câu chuyện đằng sau từng món ăn ngon
                        </p>
                    </div>
                </div>
                <Link
                    to="/blog"
                    className="hidden sm:flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-orange-600 transition-colors group"
                >
                    Xem tất cả
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            {/* Stories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {stories.map((story) => {
                    const Icon = story.icon;
                    return (
                        <Link
                            key={story.id}
                            to={`/blog/${story.id}`} // Đường dẫn tới trang chi tiết bài viết
                            className="group flex flex-col gap-5 bg-transparent"
                        >
                            {/* Image Container */}
                            <div className="rounded-[2rem] overflow-hidden aspect-[16/9] relative shadow-sm border border-slate-100/50">
                                <img
                                    src={story.image}
                                    alt={story.title}
                                    loading="lazy"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[800ms] ease-out"
                                />
                                {/* Overlay Gradient cho ảnh thêm sâu */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                {/* Floating Category Badge */}
                                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-[11px] font-bold text-slate-700 flex items-center gap-1.5 shadow-lg border border-white/20">
                                    <Icon className="w-3.5 h-3.5 text-orange-500" />
                                    {story.category}
                                </div>
                            </div>

                            {/* Text Content */}
                            <div className="flex flex-col flex-1 px-2">
                                <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-400 mb-2.5">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {story.readTime}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 leading-snug mb-2.5 group-hover:text-orange-600 transition-colors tracking-tight line-clamp-2">
                                    {story.title}
                                </h3>

                                <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed mb-4 font-medium">
                                    {story.excerpt}
                                </p>

                                {/* Read More Link */}
                                <div className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 group-hover:text-orange-700 transition-colors">
                                    Đọc tiếp
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Nút Xem tất cả cho Mobile */}
            <Link
                to="/blog"
                className="mt-6 flex sm:hidden items-center justify-center w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
                Xem tất cả bài viết
            </Link>
        </section>
    );
};

export default CulinaryStorySection;