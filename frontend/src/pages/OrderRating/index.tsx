import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import orderService, { type Order } from "@/services/order.service";
import reviewService from "@/services/review.service";
import { apiClient } from "@/lib/api-client";
import { Loader2, Camera, X, CheckCircle2 } from "lucide-react";

interface ProductImage {
  id: string;
  url: string;
}

interface ProductRating {
  product_id: string;
  name: string;
  image: string;
  stars: number;
  comment: string;
  images: ProductImage[];
  isUploading: boolean;
  isSubmitted: boolean;
  isSubmitting: boolean;
}

const OrderRatingPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  useTranslation(['customer', 'common']);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [productRatings, setProductRatings] = useState<ProductRating[]>([]);
  const [applyToAll, setApplyToAll] = useState(false);
  
  // For "Rate all" state
  const [globalStars, setGlobalStars] = useState(5);
  const [globalComment, setGlobalComment] = useState("");
  const [globalSubmitting, setGlobalSubmitting] = useState(false);

  useEffect(() => {
    const fetchOrderAndReviews = async () => {
      if (!orderId) return;
      try {
        setLoading(true);
        const [orderRes, reviewRes] = await Promise.all([
          orderService.getOrderById(orderId),
          reviewService.getOrderReviews(orderId)
        ]);

        const orderData = orderRes.data;
        const existingReviews = reviewRes.data || [];
        setOrder(orderData);
        
        // Initialize product ratings
        const initialRatings: ProductRating[] = orderData.items.map(item => {
          const existing = existingReviews.find((r: any) => r.product_id === (item.product_id as any)?._id);
          
          return {
            product_id: (item.product_id as any)?._id,
            name: (item.product_id as any)?.name,
            image: typeof (item.product_id as any)?.image === 'string' 
              ? (item.product_id as any)?.image 
              : ((item.product_id as any)?.image as any)?.secure_url || "",
            stars: existing ? existing.rating : 5,
            comment: existing ? existing.comment : "",
            images: existing ? existing.images.map((img: any) => ({ id: img._id, url: img.secure_url })) : [],
            isUploading: false,
            isSubmitted: !!existing,
            isSubmitting: false
          };
        });
        setProductRatings(initialRatings);
      } catch (err) {
        console.error("Failed to fetch order or reviews:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrderAndReviews();
  }, [orderId]);

  const updateRating = (index: number, updates: Partial<ProductRating>) => {
    setProductRatings(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleFileUpload = async (index: number, file: File) => {
    updateRating(index, { isUploading: true });
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiClient.post("/files/upload?ownerType=review", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      const fileData = res.data?.data;
      if (fileData?._id && fileData?.secure_url) {
        setProductRatings(prev => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            images: [...next[index].images, { id: fileData._id, url: fileData.secure_url }]
          };
          return next;
        });
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      updateRating(index, { isUploading: false });
    }
  };

  const removeImage = (pIndex: number, imgIndex: number) => {
    setProductRatings(prev => {
      const next = [...prev];
      next[pIndex].images = next[pIndex].images.filter((_, i) => i !== imgIndex);
      return next;
    });
  };

  const handleIndividualSubmit = async (index: number) => {
    if (!orderId) return;
    const rating = productRatings[index];
    updateRating(index, { isSubmitting: true });
    
    try {
      await reviewService.createOrderReviews({
        order_id: orderId,
        reviews: [{
          product_id: rating.product_id,
          rating: rating.stars,
          comment: rating.comment,
          images: rating.images.map(img => img.id),
          isAnonymous: false
        }]
      });
      updateRating(index, { isSubmitted: true });
    } catch (err) {
      console.error("Failed to submit review", err);
    } finally {
      updateRating(index, { isSubmitting: false });
    }
  };

  const handleGlobalSubmit = async () => {
    if (!orderId) return;
    setGlobalSubmitting(true);
    try {
      const pendingReviews = productRatings.filter(p => !p.isSubmitted);
      if (pendingReviews.length === 0) return;

      const reviews = pendingReviews.map(p => ({
        product_id: p.product_id,
        rating: globalStars,
        comment: globalComment,
        images: p.images.map(img => img.id),
        isAnonymous: false
      }));

      await reviewService.createOrderReviews({
        order_id: orderId,
        reviews
      });
      
      setProductRatings(prev => prev.map(p => ({ ...p, isSubmitted: true })));
    } catch (err) {
      console.error("Failed to submit reviews", err);
    } finally {
      setGlobalSubmitting(false);
    }
  };

  const allSubmitted = productRatings.length > 0 && productRatings.every(p => p.isSubmitted);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
        <p className="text-[#8c7f5a] font-medium">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-[#8c7f5a] font-medium">Không tìm thấy đơn hàng</p>
        <button onClick={() => navigate("/profile/history")} className="text-orange-600 font-bold">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#191710] dark:text-gray-100 transition-colors duration-300 min-h-screen pb-20">
      <div className="max-w-[800px] mx-auto px-4 py-10">
        <div className="flex flex-wrap gap-2 py-2 mb-6">
          <button onClick={() => navigate("/profile/history")} className="text-[#8c7f5a] text-sm font-medium hover:underline">Đơn hàng</button>
          <span className="text-[#8c7f5a] text-sm font-medium">/</span>
          <span className="text-[#1b140d] dark:text-gray-400 text-sm font-medium">Đánh giá & Nhận xét</span>
        </div>

        <div className="flex flex-col gap-2 mb-8 text-center sm:text-left">
          <h1 className="text-[#1b140d] dark:text-white text-4xl font-black leading-tight tracking-tight">Đánh giá món ăn</h1>
          <p className="text-[#8c7f5a] text-lg">Đơn hàng #{order.code} • {new Date(order.createdAt).toLocaleDateString("vi-VN")}</p>
        </div>

        {/* Global Rating (Apply to all) */}
        {!allSubmitted && productRatings.length > 1 && (
          <div className="mb-8 p-6 bg-orange-600/5 dark:bg-orange-600/10 rounded-2xl border-2 border-orange-600/20">
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={applyToAll} 
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="w-5 h-5 rounded border-orange-600 text-orange-600 focus:ring-orange-600"
                />
                <span className="text-[#1b140d] dark:text-white font-bold text-lg group-hover:text-orange-600 transition-colors">
                  Áp dụng cùng mức đánh giá cho các món chưa gửi
                </span>
              </label>
            </div>
            
            {applyToAll && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setGlobalStars(star)}
                        className="transition-transform active:scale-90"
                      >
                        <span className={`material-symbols-outlined text-4xl ${globalStars >= star ? "text-[#c9a94a]" : "text-gray-200 dark:text-gray-700"}`} style={{ fontVariationSettings: globalStars >= star ? "'FILL' 1" : "" }}>
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={globalComment}
                  onChange={(e) => setGlobalComment(e.target.value)}
                  placeholder="Nhận xét chung cho các món còn lại..."
                  className="w-full p-4 rounded-xl border-0 bg-white dark:bg-[#1a1b1c] shadow-inner focus:ring-2 focus:ring-orange-600/50 min-h-[100px] resize-none"
                />
                <button
                  onClick={handleGlobalSubmit}
                  disabled={globalSubmitting}
                  className="w-full py-4 rounded-xl bg-orange-600 text-white font-bold text-lg shadow-lg hover:bg-orange-600/90 transition-all flex items-center justify-center gap-2"
                >
                  {globalSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Gửi tất cả nhận xét
                </button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-8">
          {productRatings.map((rating, idx) => (
            <div key={idx} className={`bg-white dark:bg-[#1f2122] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all ${applyToAll && !rating.isSubmitted ? "opacity-60 pointer-events-none grayscale-[0.5]" : ""}`}>
              <div className="p-4 bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img src={rating.image} alt={rating.name} className="w-16 h-16 object-cover rounded-lg shadow-sm" />
                  <h3 className="font-bold text-lg text-text-main dark:text-white">{rating.name}</h3>
                </div>
                {rating.isSubmitted && (
                  <div className="flex items-center gap-2 text-green-500 font-bold bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-800">
                    <CheckCircle2 className="w-4 h-4" />
                    Đã đánh giá
                  </div>
                )}
              </div>
              
              {(!applyToAll || rating.isSubmitted) && (
                <div className="p-6 space-y-8">
                  <div className="flex flex-col items-center gap-3">
                    <p className="font-bold text-gray-700 dark:text-gray-300">
                      {rating.isSubmitted ? "Sửa đánh giá của bạn" : "Bạn thấy món này thế nào?"}
                    </p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => updateRating(idx, { stars: star })}
                          className="transition-transform active:scale-90"
                        >
                          <span className={`material-symbols-outlined text-4xl ${rating.stars >= star ? "text-[#c9a94a]" : "text-gray-200 dark:text-gray-700"}`} style={{ fontVariationSettings: rating.stars >= star ? "'FILL' 1" : "" }}>
                            star
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block font-bold text-gray-700 dark:text-gray-300">Chia sẻ cảm nhận</label>
                    <textarea
                      value={rating.comment}
                      onChange={(e) => updateRating(idx, { comment: e.target.value })}
                      placeholder="Món ăn có ngon không? Vừa miệng chứ?..."
                      className="w-full p-4 rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1b1c] focus:ring-2 focus:ring-orange-600/50 min-h-[120px] resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block font-bold text-gray-700 dark:text-gray-300 text-sm italic">Thêm hình ảnh thực tế</label>
                    <div className="flex flex-wrap gap-4">
                      {rating.images.map((img, i) => (
                        <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden group shadow-md border animate-in zoom-in-75">
                          <img src={img.url} alt="Review photo" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => removeImage(idx, i)}
                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      
                      {rating.images.length < 4 && (
                        <label className={`w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${rating.isUploading ? "opacity-50 pointer-events-none" : "hover:border-orange-600 hover:bg-orange-600/5 border-gray-200 dark:border-gray-800"}`}>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(idx, e.target.files[0])}
                          />
                          {rating.isUploading ? (
                            <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                          ) : (
                            <>
                              <Camera className="w-6 h-6 text-orange-600" />
                              <span className="text-[10px] font-bold text-orange-600 uppercase">Tải lên</span>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleIndividualSubmit(idx)}
                    disabled={rating.isSubmitting}
                    className={`w-full py-4 rounded-xl font-bold shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 ${
                      rating.isSubmitted 
                        ? "bg-orange-600 text-white" 
                        : "bg-[#1b140d] dark:bg-white text-white dark:text-[#1b140d]"
                    }`}
                  >
                    {rating.isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    {rating.isSubmitted ? "Cập nhật đánh giá" : "Gửi đánh giá món này"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {allSubmitted && (
          <div className="mt-12 text-center animate-in zoom-in duration-500">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-500 mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-[#1b140d] dark:text-white mb-2">Đã gửi đánh giá thành công!</h2>
            <p className="text-[#8c7f5a] mb-8">Cảm ơn bạn đã đóng góp ý kiến để chúng tôi cải thiện dịch vụ.</p>
            <button
              onClick={() => navigate("/profile/history")}
              className="px-10 py-4 rounded-2xl bg-orange-600 text-white font-black text-xl shadow-xl shadow-orange-600/30 hover:-translate-y-1 transition-all"
            >
              Quay lại đơn hàng
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderRatingPage;
