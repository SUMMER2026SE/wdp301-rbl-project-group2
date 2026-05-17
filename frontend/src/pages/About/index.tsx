import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80";
const PROJECT_IMAGE =
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80";
const FEATURES_IMAGE =
  "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800&q=80";

const AboutPage = () => {
  const { t } = useTranslation(['common']);
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Hero */}
      <section className="bg-white border-b border-gray-100 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:gap-12 lg:gap-16">
            <div className="flex-1 mb-8 md:mb-0">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">
                Về chúng tôi
              </h1>
              <p className="text-lg text-slate-600 max-w-xl">
                FoodieDash — nền tảng đặt món ăn trực tuyến, kết nối bạn với các món ngon và cửa hàng yêu thích mọi lúc mọi nơi.
              </p>
            </div>
            <div className="flex-1 max-w-lg">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
                <img
                  src={HERO_IMAGE}
                  alt="Món ăn đa dạng"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="space-y-14 text-slate-700">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12">
            <div className="flex-1 order-2 lg:order-1">
              <h2 className="text-xl font-bold text-slate-900 mb-3">Dự án FoodieDash</h2>
              <p className="leading-relaxed">
                FoodieDash là dự án ứng dụng đặt đồ ăn (Food Order App) được xây dựng với mục tiêu mang đến trải nghiệm đặt món nhanh chóng, tiện lợi. Ứng dụng hỗ trợ người dùng duyệt thực đơn, đặt món, theo dõi đơn hàng và tận hưởng nhiều ưu đãi từ voucher, membership.
              </p>
            </div>
            <div className="flex-1 max-w-md mx-auto lg:mx-0 mb-6 lg:mb-0 order-1 lg:order-2">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/5">
                <img
                  src={PROJECT_IMAGE}
                  alt="Đặt món trực tuyến"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">Tính năng chính</h2>
            <ul className="list-none space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1.5">•</span>
                <span>Duyệt danh mục món ăn đa dạng (Phở, Bún, Mì, Cơm, Đồ uống, Ăn vặt…)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1.5">•</span>
                <span>Đặt món, giỏ hàng và thanh toán trực tuyến</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1.5">•</span>
                <span>Theo dõi đơn hàng và lịch sử giao dịch</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1.5">•</span>
                <span>Voucher, ví voucher và chương trình thành viên</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1.5">•</span>
                <span>Gợi ý món ăn phù hợp (AI / sở thích cá nhân)</span>
              </li>
            </ul>
            <div className="mt-8 rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/5 aspect-[21/9] max-h-[240px]">
              <img
                src={FEATURES_IMAGE}
                alt="Giao hàng tận nơi"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">Liên hệ & Hỗ trợ</h2>
            <p className="leading-relaxed">
              Chúng tôi luôn cải tiến sản phẩm để phục vụ bạn tốt hơn. Nếu có góp ý hoặc cần hỗ trợ, hãy liên hệ qua ứng dụng hoặc trang Liên hệ khi tính năng được triển khai.
            </p>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-gray-200">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-orange-600 font-bold hover:text-orange-700 transition-colors"
          >
            ← {t('common:nav.home')}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
