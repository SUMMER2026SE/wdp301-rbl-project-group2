import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";

const HomeFooter = () => {
    return (
        <footer className="bg-white text-gray-800 pt-20 pb-10 rounded-t-[3rem] border-t border-gray-200 mt-auto">
            <div className="max-w-7xl mx-auto px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-1">
                        <Link to="/" className="flex items-center gap-2.5 text-orange-600 hover:scale-105 transition-transform group shrink-0">
                            <img
                                src={logo}
                                alt="FoodieDash"
                                className="w-30 h-30 -mt-8 -ml-6 -mr-10 object-contain group-hover:rotate-12 transition-transform duration-300"
                            />
                            <h1 className="text-2xl font-black tracking-tighter -mt-8">FoodieDash</h1>
                        </Link>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6">
                            Trải nghiệm dịch vụ giao đồ ăn nhanh nhất với các nhà hàng địa phương tốt nhất.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-lg mb-6 text-orange-600">Công ty</h4>
                        <ul className="flex flex-col gap-3 text-gray-500 text-sm">
                            <li><a href="#" className="hover:text-orange-600 transition-colors">Về chúng tôi</a></li>
                            <li><a href="#" className="hover:text-orange-600 transition-colors">Tuyển dụng</a></li>
                            <li><a href="#" className="hover:text-orange-600 transition-colors">Blog</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg mb-6 text-orange-600">Hỗ trợ</h4>
                        <ul className="flex flex-col gap-3 text-gray-500 text-sm">
                            <li><a href="#" className="hover:text-orange-600 transition-colors">Trung tâm trợ giúp</a></li>
                            <li><a href="#" className="hover:text-orange-600 transition-colors">Điều khoản dịch vụ</a></li>
                            <li><a href="#" className="hover:text-orange-600 transition-colors">Chính sách bảo mật</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-lg mb-6 text-orange-600">Tải App</h4>
                        <div className="flex flex-col gap-3">
                            <button className="bg-gray-50 hover:bg-orange-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3 transition-all">
                                <div className="w-8 h-8 rounded bg-gray-900 text-white flex items-center justify-center font-bold text-xl">A</div>
                                <div className="text-left leading-tight">
                                    <div className="text-[10px] text-gray-400 uppercase font-bold">Tải trên</div>
                                    <div className="font-bold">App Store</div>
                                </div>
                            </button>
                            <button className="bg-gray-50 hover:bg-orange-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3 transition-all">
                                <div className="w-8 h-8 rounded bg-gray-900 text-white flex items-center justify-center font-bold text-xl">G</div>
                                <div className="text-left leading-tight">
                                    <div className="text-[10px] text-gray-400 uppercase font-bold">Tải trên</div>
                                    <div className="font-bold">Google Play</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400 text-xs font-medium">
                    <p>© 2026 FoodieDash Inc. Đã đăng ký bản quyền.</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-orange-600">Quyền riêng tư</a>
                        <a href="#" className="hover:text-orange-600">Điều khoản</a>
                        <a href="#" className="hover:text-orange-600">Sơ đồ trang</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default HomeFooter;
