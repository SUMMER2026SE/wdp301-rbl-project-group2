import { Quote, Star, CheckCircle } from "lucide-react";

const ReviewSection = () => {
    return (
        <section className="bg-gradient-to-b from-white via-orange-50 to-white py-24">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                {/* Header Section */}
                <div className="flex flex-col items-center text-center mb-16">
                    <span className="text-orange-600 font-bold uppercase tracking-widest text-xs mb-2">Wall of Love</span>
                    <h2 className="text-4xl font-black text-slate-900 mb-4">Khách hàng nói gì về chúng tôi?</h2>
                    <div className="w-20 h-1.5 bg-orange-500 rounded-full mb-6"></div>
                    <p className="text-slate-500 max-w-xl text-lg">
                        Hương vị được kiểm chứng bởi hơn 10,000 thực khách. Sự hài lòng của bạn là niềm vui của bếp.
                    </p>
                </div>

                {/* Reviews Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            user: "Nguyễn Văn A",
                            role: "Thực khách",
                            dish: "Burger Phô Mai 2 Tầng",
                            comment: "Đồ ăn giao đến vẫn còn nóng hổi. Món Burger 2 tầng thực sự rất đẫm sốt, thịt bò mềm ngọt. Chắc chắn sẽ đặt lại!",
                            rating: 5,
                            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Annie"
                        },
                        {
                            user: "Trần Thị B",
                            role: "Văn phòng",
                            dish: "Cơm Tấm Sườn Bì",
                            comment: "Mình hay đặt cơm trưa ở đây. Thích nhất là quán dùng hộp giấy thân thiện môi trường. Nước mắm pha rất vừa miệng.",
                            rating: 5,
                            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob"
                        },
                        {
                            user: "Lê C",
                            role: "Khách quen",
                            dish: "Trà Đào Cam Sả",
                            comment: "Giao hàng siêu nhanh, shipper của quán rất lễ phép. Trà uống thanh mát, không bị ngọt gắt như mấy chỗ khác.",
                            rating: 4,
                            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Caty"
                        }
                    ].map((review, idx) => (
                        <div key={idx} className="group bg-white p-8 rounded-[2rem] shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-300 border border-gray-100 flex flex-col relative overflow-hidden">

                            {/* Dấu ngoặc kép trang trí */}
                            <Quote className="absolute top-6 right-8 text-orange-100 w-12 h-12 fill-current transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />

                            {/* Rating Stars */}
                            <div className="flex items-center gap-1 text-yellow-400 mb-6">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-5 h-5 ${i < review.rating ? 'fill-current' : 'text-gray-200'}`} />
                                ))}
                            </div>

                            {/* Comment Content */}
                            <p className="text-slate-700 text-lg leading-relaxed mb-8 flex-1 relative z-10">
                                "{review.comment}"
                            </p>

                            {/* User Info & Order Detail */}
                            <div className="flex items-center gap-4 pt-6 border-t border-gray-50">
                                <img src={review.avatar} alt={review.user} className="w-12 h-12 rounded-full bg-gray-100 border-2 border-white shadow-sm" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-900">{review.user}</h4>
                                        <CheckCircle className="w-4 h-4 text-green-500 fill-green-100" />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">Đã dùng: <span className="text-orange-600 font-semibold">{review.dish}</span></p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ReviewSection;
