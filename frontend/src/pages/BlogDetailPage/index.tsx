import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Clock, ArrowRight, ChefHat, Sparkles, Flame, LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";

// --- MOCK DATA (Thay bằng API thật sau này) ---
const BLOG_POSTS = [
    {
        id: "story-1",
        title: "Bí quyết nước dùng thanh ngọt từ xương hầm 24h không cần bột ngọt",
        excerpt: "Khám phá hành trình nấu nước dùng phở chuẩn vị truyền thống. Nước dùng được ninh từ xương ống bò tươi ngon trong suốt 24 giờ cùng các loại gia vị thảo mộc tự nhiên...",
        image: "https://suckhoedoisong.qltns.mediacdn.vn/324455921873985536/2022/4/12/nuoc-xuong-ham-co-tot-cho-suc-khoe-5-1649776460368773812695.jpg",
        category: "Bí quyết Bếp trưởng",
        readTime: "3 phút đọc",
        date: "14/03/2026",
        isFeatured: true, // Đánh dấu bài nổi bật
        icon: ChefHat
    },
    {
        id: "story-2",
        title: "Hành trình Eat-Clean: Khi AI làm phụ bếp cho bạn",
        excerpt: "Làm thế nào để ăn ngon mà không lo tăng cân? Khám phá cách hệ thống trí tuệ nhân tạo (NutriAI) của chúng tôi tính toán lượng calo và loại bỏ rủi ro dị ứng...",
        image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",
        category: "Sức khỏe & AI",
        readTime: "5 phút đọc",
        date: "10/03/2026",
        isFeatured: false,
        icon: Sparkles
    },
    {
        id: "story-3",
        title: "Bún Bò Huế & Câu chuyện về mắm ruốc truyền thống",
        excerpt: "Để có một tô bún bò Huế đúng điệu, mắm ruốc là linh hồn không thể thiếu. Cùng tìm hiểu nguồn gốc loại gia vị đặc biệt này từ cố đô...",
        image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80",
        category: "Chuyện Quán Xá",
        readTime: "4 phút đọc",
        date: "05/03/2026",
        isFeatured: false,
        icon: Flame
    }
];

const CATEGORIES = ["Tất cả", "Bí quyết Bếp trưởng", "Sức khỏe & AI", "Chuyện Quán Xá"];

const BlogPage = () => {
    const { t } = useTranslation();
    const [activeCategory, setActiveCategory] = useState("Tất cả");

    // Lọc bài viết
    const filteredPosts = BLOG_POSTS.filter(post =>
        activeCategory === "Tất cả" || post.category === activeCategory
    );

    // Tách bài nổi bật (chỉ lấy bài nổi bật nếu đang ở tab "Tất cả")
    const featuredPost = activeCategory === "Tất cả" ? filteredPosts.find(p => p.isFeatured) : null;
    const regularPosts = filteredPosts.filter(p => p.id !== featuredPost?.id);

    // Kéo thanh cuộn lên đầu khi vào trang
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24">

            {/* --- HERO BANNER --- */}
            <div className="bg-slate-900 text-white pt-20 pb-16 px-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-rose-600/20 opacity-50" />
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-500 rounded-full blur-[100px] opacity-30" />

                <div className="max-w-6xl mx-auto relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest text-orange-400 mb-6">
                        <BookOpen className="w-4 h-4" /> FoodieDash Blog
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight leading-tight">
                        Chuyện Nghề & <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                            Cảm Hứng Ẩm Thực
                        </span>
                    </h1>
                    <p className="text-slate-300 text-lg max-w-2xl mx-auto font-medium leading-relaxed">
                        Nơi chúng tôi chia sẻ những câu chuyện đằng sau căn bếp, các bí quyết ăn uống lành mạnh và công nghệ AI giúp bạn chọn món an toàn.
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-8 relative z-20">

                {/* --- FILTER TABS --- */}
                <div className="bg-white p-2 rounded-2xl shadow-lg shadow-slate-200/50 mb-12 flex gap-2 overflow-x-auto no-scrollbar mask-fade-edges-right border border-slate-100">
                    <button
                        onClick={() => setActiveCategory("Tất cả")}
                        className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${activeCategory === "Tất cả" ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 hover:text-orange-600"
                            }`}
                    >
                        <LayoutGrid className="w-4 h-4" /> Tất cả
                    </button>
                    {CATEGORIES.filter(c => c !== "Tất cả").map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`shrink-0 px-5 py-3 rounded-xl text-sm font-bold transition-all ${activeCategory === cat ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 hover:text-orange-600"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* --- FEATURED POST (Bài nổi bật - Chỉ hiện ở tab Tất cả) --- */}
                {featuredPost && (
                    <Link
                        to={`/blog/${featuredPost.id}`}
                        className="group flex flex-col lg:flex-row bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl border border-slate-200 transition-all duration-500 mb-12"
                    >
                        <div className="w-full lg:w-[60%] aspect-video lg:aspect-auto relative overflow-hidden bg-slate-100">
                            <img
                                src={featuredPost.image}
                                alt={featuredPost.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                            />
                            <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg">
                                Bài viết nổi bật
                            </div>
                        </div>
                        <div className="w-full lg:w-[40%] p-8 md:p-10 flex flex-col justify-center">
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                                <span className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md">
                                    {<featuredPost.icon className="w-3.5 h-3.5" />} {featuredPost.category}
                                </span>
                                <span>{featuredPost.date}</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight mb-4 group-hover:text-orange-600 transition-colors">
                                {featuredPost.title}
                            </h2>
                            <p className="text-slate-500 font-medium leading-relaxed mb-6 line-clamp-3">
                                {featuredPost.excerpt}
                            </p>
                            <div className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                                Đọc chi tiết <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                            </div>
                        </div>
                    </Link>
                )}

                {/* --- REGULAR POSTS GRID --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {regularPosts.map((post) => {
                        const Icon = post.icon;
                        return (
                            <Link
                                key={post.id}
                                to={`/blog/${post.id}`}
                                className="group flex flex-col bg-white rounded-[2rem] shadow-sm hover:shadow-xl border border-slate-200 transition-all duration-300 overflow-hidden"
                            >
                                {/* Image Container */}
                                <div className="aspect-[4/3] relative overflow-hidden bg-slate-100 shrink-0">
                                    <img
                                        src={post.image}
                                        alt={post.title}
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 shadow-sm">
                                        <Icon className="w-3.5 h-3.5 text-orange-500" />
                                        {post.category}
                                    </div>
                                </div>

                                {/* Text Content */}
                                <div className="p-6 flex flex-col flex-1">
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" /> {post.readTime}
                                        </span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <span>{post.date}</span>
                                    </div>

                                    <h3 className="text-xl font-black text-slate-900 leading-snug mb-3 group-hover:text-orange-600 transition-colors tracking-tight line-clamp-2">
                                        {post.title}
                                    </h3>

                                    <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed mb-6 font-medium flex-1">
                                        {post.excerpt}
                                    </p>

                                    <div className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold text-slate-700 group-hover:text-orange-600 transition-colors pt-4 border-t border-slate-100 w-full">
                                        Đọc tiếp <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1.5 transition-transform duration-300" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Empty State */}
                {filteredPosts.length === 0 && (
                    <div className="text-center py-24 bg-white rounded-[2rem] border border-slate-200">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Chưa có bài viết nào</h3>
                        <p className="text-slate-500 font-medium">Chúng tôi đang cập nhật thêm nội dung cho chuyên mục này.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlogPage;