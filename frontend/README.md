TÀI LIỆU KIẾN TRÚC & PHÂN CHIA NHIỆM VỤ FRONTEND (FOODIEDASH)
PHẦN 1: THIẾT LẬP DESIGN SYSTEM & ARCHITECTURE
(Lấy cảm hứng từ file frontend-README-DesignSystem.md)
Trước khi code bất kỳ trang nào, team Frontend cần thống nhất các chuẩn sau:
1. Design Tokens (Biến thiết kế)
•	Primary (Màu hành động/Kích thích): Orange (#F97316 - Tailwind orange-500/600).
•	Secondary (Màu Sức khỏe/AI): Emerald Green (#10B981 - Tailwind emerald-500). Dùng cho thẻ "Healthy", "An toàn", "Đã lưu".
•	Danger/Warning (Cảnh báo dị ứng): Rose Red (#E11D48 - Tailwind rose-600).
•	Bo góc (Radius): Thống nhất dùng bo góc lớn tạo sự thân thiện: rounded-2xl cho Card, rounded-xl cho Button, rounded-full cho Badge/Tag.
•	Bóng đổ (Shadow): Dùng soft shadow (shadow-sm, hover:shadow-xl) để tạo chiều sâu kiểu thẻ nổi (Glassmorphism nhẹ).
2. Layout Patterns (Khung giao diện)
•	<CustomerLayout />: Bao gồm Header (Sticky), Footer, và Floating AI Chatbot (luôn nổi ở góc phải dưới). (Dùng cho mọi route /).
•	<DashboardLayout />: Dùng chung cho cả Admin (/admin) và Staff (/staff). Bao gồm Sidebar bên trái (có thể thu gọn trên Mobile) và Topbar (Avatar, Notifications).
________________________________________
PHẦN 2: THƯ VIỆN COMPONENT DÙNG CHUNG (SHARED COMPONENTS)
Đây là các components cần được code trước tiên để dùng lại xuyên suốt 3 roles:
1. Khối UI Cơ bản (UI Kit - Dùng shadcn/ui):
•	<Button>, <Input>, <Select>, <Modal/Dialog>, <Skeleton> (Cực kỳ quan trọng cho hiệu ứng tải trang mượt).
2. Khối Component Nghiệp vụ (Domain Components):
•	<FoodCard />: (Nâng cấp) Phải nhận props healthStatus (Safe, Warning, Danger). Nếu là Danger (Dị ứng), UI tự động làm mờ ảnh và hiện icon cảnh báo đỏ. Dùng ở Home, Menu, Gợi ý.
•	<TicketVoucher />: Component hiển thị voucher phong cách tấm vé đứt nét. Dùng ở trang Khuyến mãi, Checkout, và Admin preview.
•	<OrderTimeline />: Hiển thị process bar (Chờ xác nhận -> Đang nấu -> Đang giao). Dùng ở Customer Track Order và Admin/Staff Order Detail.
•	<StatusBadge />: Dùng chung 1 file Config màu sắc cho các trạng thái đơn hàng (VD: Pending = Vàng, Delivering = Xanh dương, Completed = Xanh lá).


FRONTEND TASKS - PHÂN CHIA SPRINT (FOODIEDASH)
PHASE 1: FOODIEDASH MVP (D2C + IN-HOUSE DELIVERY + HEALTH AI)
SPRINT 0 – THIẾT LẬP DỰ ÁN & HẠ TẦNG CƠ BẢN
Mục tiêu: Nền tảng code base sẵn sàng, cấu trúc thư mục chuẩn, bắt đầu xây dựng thư viện shared components.
1. Thiết Lập Dự Án (Infrastructure)
•	[ ] Khởi tạo project (React App Router, TypeScript).
•	[ ] Thiết lập cấu trúc thư mục theo Domain-driven:
o	/src/app/(auth) # Auth pages
o	/src/app/(customer) # Customer pages
o	/src/app/(admin) # Admin pages
o	/src/app/(staff) # Staff pages
o	/src/components/ui # shadcn/ui components
o	/src/components/shared # Reusable components (FoodCard, StatusBadge...)
o	/src/lib/api, /src/hooks, /src/types
•	[ ] Cấu hình environment variables (.env.local).
•	[ ] Thiết lập Axios instance với interceptors (xử lý token/refresh token).
•	[ ] Thiết lập TailwindCSS config + custom theme (Colors: Orange chủ đạo, Emerald cho Healthy).
•	[ ] Thiết lập React Query provider & Zustand store.
2. UI Component Library (Core)
•	[ ] Cài đặt & cấu hình shadcn/ui và lucide-react.
•	[ ] Tạo các UI component cơ bản: Button, Input, Label, Card, Badge, Dialog/Modal, Skeleton.
•	[ ] Tạo các shared layout components:
o	<AuthLayout> (Form căn giữa, background hình đồ ăn).
o	<CustomerLayout> (Kèm Header sticky, Footer, Floating AI Chatbot).
o	<DashboardLayout> (Dùng chung cho Admin/Staff, kèm Sidebar, Topbar).
•	[ ] Tạo các form components: <FormField>, <PasswordInput> (có toggle hiện/ẩn).
3. Utilities & Hooks
•	[ ] Tạo validation schemas với Zod (cho Login, Đặt hàng, Thêm món).
•	[ ] Tạo custom hooks:
o	useAuth() - Quản lý trạng thái đăng nhập & Role.
o	useCart() - Quản lý giỏ hàng (Local Storage + Sync API).
o	useToast() - Component thông báo góc màn hình.
________________________________________
SPRINT 1 – XÁC THỰC & HỒ SƠ SỨC KHỎE (AI ONBOARDING)
Mục tiêu: User có thể đăng nhập và thiết lập hồ sơ sức khỏe (yếu tố sống còn để AI hoạt động).
1. Quản Lý Trạng Thái Auth
•	[ ] Tạo Auth Store (Zustand).
•	[ ] Triển khai luồng Login/Logout và xử lý JWT Token.
•	[ ] Triển khai Route Guards: <RequireAuth>, <RequireAdmin>, <RequireStaff>.
2. Auth Pages
•	[ ] Trang /login: Form Email/Pass, Nút Social Login (Google).
•	[ ] Trang /register: Nhập thông tin cơ bản.
•	[ ] Trang /forgot-password & /reset-password: Luồng lấy lại mật khẩu.
3. Health Onboarding Flow (Unique Feature)
•	[ ] Modal/Trang /onboarding/health: Xuất hiện ngay sau khi Register.
•	[ ] Step 1: Chọn Dị ứng (Hải sản, Đậu phộng, Gluten...) - Giao diện Tag có thể click.
•	[ ] Step 2: Chọn Chế độ ăn / Bệnh lý (Tiểu đường, Eat Clean, Chay).
•	[ ] Nút "Lưu hồ sơ & Bắt đầu trải nghiệm".
________________________________________
SPRINT 2 – DANH MỤC KHÁCH HÀNG & TƯƠNG TÁC AI
Mục tiêu: Khách hàng duyệt sản phẩm mượt mà, hệ thống AI hoạt động lọc/cảnh báo món ăn.
1. Core Components (Domain)
•	[ ] Component <FoodCard>:
o	Ảnh, Tên, Giá, Đánh giá.
o	Tích hợp Health State: Hiển thị Badge (Safe/Healthy) hoặc Overlay cảnh báo đỏ (Chứa chất dị ứng).
o	Nút "Thêm nhanh vào giỏ".
•	[ ] Component <TicketVoucher>: Thẻ voucher dạng vé đứt nét (dùng ở Home và Wallet).
2. Trang Chủ (/)
•	[ ] Hero Banner (Carousel) khuyến mãi.
•	[ ] Section "AI Gợi ý cho bạn" (Load dựa trên Health Profile).
•	[ ] Section "Danh mục nổi bật" (Icon ngang).
•	[ ] Section "Món đang Hot" (Grid).
•	[ ] Tích hợp <FloatingAIChatbot> ở góc phải dưới (Giao diện Chat UI cơ bản).
3. Trang Thực Đơn & Tìm kiếm (/menu)
•	[ ] Sidebar <FoodFilters>: Lọc theo Category, Khoảng giá, Đánh giá.
•	[ ] Grid danh sách món ăn kết hợp Pagination/Load more.
•	[ ] Trạng thái Loading (Skeleton) và Trạng thái Rỗng (Empty State).
4. Chi Tiết Sản Phẩm (/food/:id)
•	[ ] Hình ảnh lớn, tên, giá, mô tả.
•	[ ] AI Warning Banner: Banner đỏ to nếu món ăn vi phạm Health Profile (VD: "⚠️ Cảnh báo: Món ăn chứa Đậu phộng").
•	[ ] Component <VariantSelector>: Chọn Size, Topping (Cập nhật giá realtime).
•	[ ] Nút thêm vào giỏ kèm bộ chọn số lượng.
________________________________________
SPRINT 3 – GIỎ HÀNG, CHECKOUT & TÀI KHOẢN (CUSTOMER)
Mục tiêu: Hoàn thiện luồng mua hàng và quản lý tài khoản cá nhân.
1. Giỏ Hàng & Checkout Flow (/cart -> /checkout)
•	[ ] Giao diện Drawer (Trượt từ phải sang) hoặc Trang /cart tĩnh.
•	[ ] Component <CartSummary>: Tính tổng tiền, nhập mã Voucher.
•	[ ] Checkout Step 1: Chọn/Thêm địa chỉ giao hàng (Tích hợp Google Maps API để ghim vị trí).
•	[ ] Checkout Step 2: Tính phí Ship tự động (Dựa trên khoảng cách Google Maps Distance Matrix).
•	[ ] Checkout Step 3: Chọn phương thức thanh toán (COD, VNPay). Cài đặt cơ chế Chống Double-click ở nút Đặt hàng.
•	[ ] Trang /success: Hiển thị Order ID, thời gian dự kiến.
2. Quản Lý Tài Khoản (/profile)
•	[ ] Layout <ProfileSidebar> điều hướng.
•	[ ] Trang /profile/history: Danh sách đơn hàng cũ.
•	[ ] Trang /track-order/:id: Component <OrderTimeline> và Card thông tin Shipper nội bộ (Tên, SĐT).
•	[ ] Trang /profile/health: Form chỉnh sửa lại Dị ứng/Bệnh lý.
•	[ ] Trang /profile/wallet: Lưới <TicketVoucher>, tính năng lưu/copy mã.
________________________________________
SPRINT 4 – VẬN HÀNH NỘI BỘ (STAFF / KITCHEN)
Mục tiêu: Tối ưu hóa tốc độ xử lý đơn cho nhân viên bếp và điều phối.
1. Quản lý Đơn hàng (Staff)
•	[ ] Trang /staff/orders:
o	Giao diện <KanbanBoard> (Chờ xác nhận -> Đang nấu -> Chờ Giao -> Đã Giao).
o	Kéo thả (Drag & Drop) để chuyển trạng thái.
•	[ ] Modal <OrderDetail>: Bấm vào thẻ Kanban hiện chi tiết món, topping, ghi chú của khách. Nút "In Bill" (Dạng máy in nhiệt).
2. Quản lý Tồn kho nhanh (Quick Inventory)
•	[ ] Trang /staff/menu:
o	Bảng danh sách món ăn thu gọn.
o	Tính năng Toggle Switch (Bật/Tắt) trạng thái isAvailable để báo hết món ngay lập tức.


SPRINT 5 – ADMIN PANEL (ĐIỀU PHỐI & QUẢN TRỊ)
Mục tiêu: Chủ quán kiểm soát doanh thu, điều phối shipper nội bộ và cấu hình AI Menu.
1. 📊 Tổng quan (Dashboard)
Dành cho Chủ quán xem lướt số liệu mỗi ngày.
•	/admin/dashboard/overview: Các thẻ KPI (Doanh thu, Đơn hoàn thành, Tỷ lệ hủy) và Biểu đồ.
•	/admin/dashboard/analytics: Thống kê chuyên sâu (Món nào bán chạy nhất, Khung giờ nào đông khách nhất).
2. 🛵 Vận hành & Giao nhận (Operations & Logistics) - [Điểm nhấn sáng tạo]
Vì bạn tự giao hàng, khu vực này phải thiết kế giống một "Trạm điều phối" (Dispatch Center).
•	/admin/operations/orders: Quản lý tất cả đơn hàng (List view & Kanban board).
•	/admin/operations/dispatch: [Sáng tạo] Bản đồ điều phối trực tiếp. Hiển thị danh sách các đơn đang chờ giao và danh sách shipper nội bộ đang rảnh để Admin kéo-thả (drag & drop) gán đơn nhanh chóng.
•	/admin/operations/shifts: Quản lý Ca làm việc và Đối soát tiền mặt (Xem Shipper A đi giao 10 đơn COD, đã nộp lại đủ tiền cho Thu ngân chưa).
3. 🧠 Quản lý Menu & Tri thức AI (Menu & AI Knowledge) - [Điểm nhấn sáng tạo]
Đây là "bộ não" của hệ thống AI. Bạn gom Menu và Ingredients vào một chỗ.
•	/admin/catalog/products: Danh sách món ăn (Thêm/Sửa/Xóa/Bật tắt hết hàng).
•	/admin/catalog/categories: Quản lý danh mục (Cơm, Phở, Nước).
•	/admin/catalog/ingredients: [Sáng tạo] Kho Nguyên liệu & Dị ứng. Đây là nơi Admin "dạy" AI (Ví dụ: Định nghĩa nguyên liệu "Sữa đặc" có chứa "Dairy/Lactose", nguyên liệu "Thịt heo" là "Non-Vegan"). Khi tạo món ăn mới, chỉ cần check vào các nguyên liệu này, AI sẽ tự động hiểu món đó có an toàn với khách hay không.
4. 👥 Khách hàng & Tương tác (CRM)
•	/admin/crm/customers: Danh sách khách hàng. Bấm vào chi tiết có thể xem được Hồ sơ sức khỏe của họ (để hỗ trợ giải đáp khi khách gọi điện) và Lịch sử mua hàng.
•	/admin/crm/reviews: Quản lý đánh giá. Có tính năng "Phản hồi đánh giá" để tăng uy tín quán.
5. 🎁 Marketing & Tăng trưởng (Marketing)
•	/admin/marketing/vouchers: Quản lý các chiến dịch mã giảm giá (CRUD Voucher).
•	/admin/marketing/posts: Quản lý Blog / Bài viết (Chia sẻ câu chuyện đầu bếp, nguồn gốc thực phẩm) để SEO và tăng niềm tin của khách ăn Healthy.
6. ⚙️ Hệ thống & Nhân sự (System & Staff)
•	/admin/system/staff: Quản lý tài khoản nhân viên (Bếp, Thu ngân, Shipper nội bộ). Cấp quyền (Role-based access control).
•	/admin/system/settings: Cấu hình chung (Giờ đóng/mở cửa, Cấu hình giá Ship mỗi km, Thông tin quán).
________________________________________
💡 CÁC ĐỀ XUẤT CẢI TIẾN UI/UX CHO ADMIN CHUYÊN NGHIỆP HƠN
Để phần Admin trông như một sản phẩm SaaS (Software as a Service) đắt tiền, bạn nên áp dụng các UX pattern sau:
1. Sử dụng Cấu trúc "Nested Layout" (Layout lồng nhau)
•	Sidebar (Trái): Chỉ hiển thị các Tab Cha (Tổng quan, Vận hành, Menu...). Và có thể đóng mở tùy thuộc vào hover chuột, topbar cũng sẽ di chuyển theo 
•	Tabs (Trong trang): Khi bấm vào "Vận hành", trang chính sẽ có thanh Tabs ngang ở trên cùng (Orders | Dispatch | Shifts) để chuyển đổi qua lại cực nhanh mà không cần load lại trang.
2. Breadcrumbs (Đường dẫn điều hướng) Luôn luôn có Breadcrumbs ở góc trên bên trái của Header Admin. Ví dụ: Admin / Tri thức AI & Menu / Danh sách món ăn / Phở Bò Đặc Biệt. Điều này giúp người quản trị không bao giờ bị lạc.
3. Bảng dữ liệu thông minh (Data Tables) Các trang danh sách (như Danh sách Món ăn, Đơn hàng) không chỉ là cái bảng đơn thuần mà phải có:
•	Thanh Search (Debounce): Tìm kiếm realtime không cần bấm Enter.
•	Quick Filters (Bộ lọc nhanh): Các nút bấm (pill buttons) như "Sắp hết hàng", "Đang ẩn", "Best Seller".
•	Inline Editing: Cho phép bấm vào giá tiền hoặc công tắc trạng thái (Toggle) ngay trên bảng để cập nhật luôn mà không cần vào trang Chi tiết.
4. Drawer / Slide-over thay vì Modal Khi Admin bấm vào xem chi tiết một Đơn hàng hoặc Khách hàng, thay vì nhảy sang một trang mới hoàn toàn, hãy thiết kế một Drawer (Bảng trượt từ bên phải màn hình ra).
•	Lợi ích: Admin có thể vừa xem chi tiết đơn hàng, vừa không bị mất bối cảnh danh sách đơn hàng ở đằng sau. Đây là chuẩn thiết kế của các hệ thống POS/Quản lý hiện đại (như Shopify, KiotViet).


*Bổ Sung, Gợi Ý:
PHẦN 1: THIẾT LẬP DESIGN SYSTEM & ARCHITECTURE
Nhận xét: Đã định nghĩa được màu sắc chủ đạo và pattern UI cơ bản. Rất tốt! 🚀 Đề xuất cải tiến (Nâng chuẩn chuyên nghiệp):
1.	Bổ sung Typography (Phông chữ): Cần chốt phông chữ. Với ngành F&B, nên dùng Inter (đọc số liệu Admin tốt) kết hợp với Be Vietnam Pro hoặc Nunito (để tạo cảm giác thân thiện, bo tròn ở Customer App).
2.	Trạng thái UI Tiêu chuẩn (Micro-interactions): Cần quy định rõ:
o	Hover: Nút bấm sáng lên hoặc nổi lên.
o	Active/Focus: Mọi thẻ Input/Button khi click vào phải có vòng ring (ví dụ: focus:ring-2 focus:ring-orange-500) để đảm bảo Accessibility (A11y).
o	Disabled: Màu xám mờ opacity-50 và cursor-not-allowed (Rất quan trọng cho nút Đặt hàng khi chưa điền đủ thông tin).
PHẦN 2: THƯ VIỆN COMPONENT DÙNG CHUNG
Nhận xét: Gom nhóm rất chuẩn các component nghiệp vụ. 🚀 Đề xuất cải tiến:
1.	Thêm khối Component Phản hồi (Feedback States):
o	<EmptyState>: Dùng khi giỏ hàng trống, không tìm thấy món, không có đơn hàng. (Gồm 1 icon mờ + Text + Nút Call-to-action).
o	<ErrorState>: Trình bày lỗi khi API sập, mất mạng.
2.	Khối Form Builder (Cực kỳ quan trọng cho Admin):
o	Yêu cầu team Dev bắt buộc dùng bộ đôi React Hook Form + Zod để bọc các Component Form. Vì form của bạn (ví dụ: Tạo món ăn kèm Tag dị ứng) rất phức tạp, dùng state thông thường sẽ gây giật lag.
PHẦN 3: CHI TIẾT SPRINT TASKS
Nhận xét: Chia phase rõ ràng, rành mạch. Ý tưởng Health Onboarding xuất sắc. 🚀 Đề xuất cải tiến Kỹ thuật & UX:
•	SPRINT 2 (Trải nghiệm Khách hàng):
o	Tìm kiếm: Ô Search cần gắn kỹ thuật Debounce (người dùng gõ xong 300ms mới gọi API) để không làm sập server.
o	Tối ưu ảnh: Các ảnh trong <FoodCard> bắt buộc phải dùng Lazy Loading (chỉ tải ảnh khi cuộn tới) vì trang Menu sẽ có rất nhiều ảnh nặng.
•	SPRINT 3 (Giỏ hàng & Checkout):
o	Trải nghiệm điền địa chỉ: Checkout Step 1 cần tích hợp Autocomplete API của Google Maps hoặc dữ liệu Phường/Xã VN để khách không phải gõ tay 100%.
•	SPRINT 4 (Staff / Kitchen - Vận hành nội bộ):
o	Cảnh báo Realtime: Giao diện bếp BẮT BUỘC phải có âm thanh thông báo (Notification Sound "Ting!") và cập nhật Realtime (dùng WebSocket/Socket.io hoặc Polling) khi có đơn mới. Bếp không thể lúc nào cũng F5 trình duyệt được.
•	SPRINT 5 (Admin Panel):
o	Phần /admin/operations/dispatch (Kéo thả gán tài xế) là ý tưởng "triệu đô". Để code mượt phần này, hãy ghi chú cho team Dev sử dụng thư viện dnd-kit hoặc hello-pangea/dnd.
o	Bổ sung tính năng Export (Xuất file Excel/CSV) ở các trang Đơn hàng và Tài chính. Chủ quán cực kỳ cần tính năng này để làm kế toán cuối tháng.
PHẦN 4: UI/UX CHO ADMIN CHUYÊN NGHIỆP HƠN
Nhận xét: Các pattern bạn list ra (Drawer, Inline Editing, Breadcrumbs) chính là chuẩn mực của các hệ thống SaaS xịn như Shopify hay KiotViet hiện nay. 🚀 Đề xuất bổ sung:
1.	Bảng dữ liệu (Data Tables): Ghi chú team Dev dùng thư viện TanStack Table (React Table v8). Nó là tiêu chuẩn công nghiệp hiện tại cho việc làm bảng có Sort, Filter, Pagination, Inline-edit mà không bị lag.
2.	Dark Mode cho Admin (Tùy chọn): Nếu có thời gian, Admin Dashboard nên có nút switch Dark/Light mode. Rất nhiều nhân viên làm ca đêm thích màn hình tối để đỡ mỏi mắt.



***LƯU Ý QUAN TRỌNG:
- MỖI TRANG ĐỀU PHẢI TẠO CÁC RESPONSIVE PHÙ HỢP, ĐẦY ĐỦ
- TÔI ĐANG MUỐN PHÁT TRIỂN PHẦN THÊM NGÔN NGỮ, CÓ CẢ TIẾNG VIỆT VÀ TIẾNG ANH NÊN VÌ VẬY VỚI MỖI TRANG SỬ DỤNG TIẾNG VIỆT ĐÃ TẠO CÓ THỂ GIÚP TÔI TẠO THÊM 1 PHẦN TIẾNG ANH CHO HỆ THỐNG.
 
+Thư mục gốc có tên "locales" chứa tất cả các tệp dịch thuật. Các thư mục con cụ thể như "en-US" (tiếng Anh Mỹ) và "vi-VN" (tiếng Việt) chứa các tài nguyên cho từng ngôn ngữ. Một tệp cấu hình hoặc tệp dịch thuật, "en-US.ts", được sử dụng để quản lý các chuỗi tiếng Anh Mỹ.

 
Để đảm bảo việc phát triển App sau này dễ dàng và có thể tái sử dụng tối đa code từ Web sang App (có thể lên tới 60-70%), ngay từ bây giờ khi code Frontend (Web), bạn cần tuân thủ triệt để các nguyên tắc sau:
1. Tách biệt hoàn toàn Business Logic và UI (Separation of Concerns)
Điểm khác biệt lớn nhất giữa Web và App là các thẻ UI (Web dùng <div>, <span>, App dùng <View>, <Text>). Tuy nhiên, logic xử lý thì hoàn toàn giống nhau.
•	Nguyên tắc: KHÔNG viết logic gọi API, xử lý dữ liệu trực tiếp bên trong component UI.
•	Thực hành: Hãy gom tất cả logic vào các Custom Hooks.
o	Ví dụ xấu: Viết hàm axios.post('/checkout') ngay trong file CheckoutForm.tsx.
o	Ví dụ chuẩn: Viết một hook useCheckout() trong thư mục /hooks. Sau này, cả React Web và React Native đều có thể import chung cái hook useCheckout() này, bạn chỉ cần code lại phần giao diện.
2. Chuẩn hóa cấu trúc thư mục (Chuẩn bị cho Monorepo)
Sau này khi có cả Web và App, bạn sẽ muốn dùng Monorepo (như Turborepo hoặc Nx) để share code. Ngay từ bây giờ hãy tổ chức các thư mục độc lập để dễ "bê" sang dự án mới:
•	/src/types: Chứa 100% các interface/type của TypeScript (Ví dụ: IUser, IOrder, IFood). Thư mục này dùng chung được hoàn toàn.
•	/src/utils: Chứa các hàm helper như format tiền tệ (formatCurrency), format ngày tháng (formatDate), validation. Share được 100%.
•	/src/services hoặc /src/api: Chứa các config Axios và các hàm gọi API thuần. Share được 100%.
•	/src/store: Chứa logic quản lý state toàn cục.
3. Chọn thư viện "Platform-Agnostic" (Không phụ thuộc nền tảng)
Khi chọn thư viện cho Web hiện tại, hãy chọn những thư viện chạy tốt trên cả React Native:
•	Quản lý State: Dùng Zustand (như kế hoạch của bạn). Zustand chạy hoàn hảo trên React Native mà không cần sửa code. Trẻ, nhẹ và dễ share.
•	Data Fetching: Dùng TanStack Query (React Query). Nó cũng hoạt động giống hệt nhau trên cả Web và Mobile.
•	Form & Validation: Dùng React Hook Form kết hợp Zod. Cặp đôi này là tiêu chuẩn trên cả Web và React Native hiện nay.
4. Thiết lập Design System bằng "Token" (Design Tokens)
Bạn đang dùng TailwindCSS cho Web. Khi chuyển sang React Native, bạn có thể sử dụng thư viện NativeWind (mang Tailwind vào React Native).
•	Lưu ý: Hãy định nghĩa toàn bộ màu sắc, kích thước, font chữ thành các token rõ ràng trong file tailwind.config.js (như primary-500, radius-md, h1).
•	Sau này, bạn chỉ cần copy nguyên file cấu hình Tailwind này sang dự án Expo, App của bạn sẽ tự động đồng bộ 100% màu sắc và phong cách với Web.
5. Xử lý Token và Storage (Bảo mật)
•	Trên Web, bạn có thể lưu Token vào localStorage hoặc Cookie.
•	Trên App, bạn sẽ phải lưu vào SecureStore (của Expo).
•	Giải pháp: Hãy tạo một file wrapper cho Storage, ví dụ storage.utils.ts chứa các hàm getToken(), setToken(). Lúc này trên Web nó gọi localStorage, sau này sang App bạn chỉ cần sửa lõi bên trong file này thành SecureStore là toàn bộ hệ thống API vẫn hoạt động bình thường.

