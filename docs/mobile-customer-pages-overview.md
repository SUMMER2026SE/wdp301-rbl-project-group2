# Mô Tả Các Trang Customer - FoodieDash Mobile App

> **Ngày tạo:** 2026-07-02
> **Branch:** feat/mobile-app
> **Framework:** Flutter (Dart)
> **State Management:** BLoC + GoRouter
> **Mục đích:** Tài liệu tham khảo cho developer về các trang customer, chức năng và luồng điều hướng

---

## Kiến Trúc Điều Hướng

Ứng dụng sử dụng `GoRouter` với 2 ShellRoute chính:

- **Customer Shell** (`_CustomerShell`): Bottom Navigation gồm 5 tab (Home, Menu, Cart, Orders, Profile)
- **Staff Shell** (`_StaffShell`): Bottom Navigation dành cho nhân viên (5 tab: Orders, Delivery, Menu, Chat, Settings)

Auth guard toàn cục: chuyển hướng dựa trên `AuthState` (splash → login/onboarding → home/staff-orders).

### Bottom Navigation (Customer)

| Index | Tab     | Path        | Icon                |
|-------|---------|-------------|---------------------|
| 0     | Home    | `/home`     | `home_outlined`     |
| 1     | Menu    | `/menu`     | `restaurant_menu`   |
| 2     | Cart    | `/cart`     | FAB (nút nổi giữa)  |
| 3     | Orders  | `/orders`   | `receipt_long`      |
| 4     | Profile | `/profile`  | `person`            |

---

## Luồng Người Dùng (User Flow)

```
Splash → [Onboarding] (lần đầu) → Login/Register
                    ↓
            [Home Page]
            ┌───┬───┬───┬───┐
            Home Menu Cart Orders Profile
            │   │   │   │   │
            │   │   ├── Checkout → PayOS WebView → Success/Fail
            │   │   │
            │   ├── Food Detail → Add to Cart / Buy Now
            │   │
            ├── Membership
            ├── Notifications
            ├── Campaign Products
            └── AI Suggestions

Profile ─┬── Edit Profile
         ├── Addresses
         ├── Health Preferences
         ├── Change Password (Bottom Sheet)
         └── Logout

Orders ──┬── Order Detail → Track Order / Cancel / Support Chat
         ├── Order Success (animation)
         ├── Order Failed
         └── Order Rating (cho đơn đã giao)

Other ───┬── Support Chat (inline expand)
         ├── Voucher List / Wallet / Detail
         └── About Page
```

---

## 1. Splash Page (`/splash`)

**File:** `features/auth/presentation/pages/splash_page.dart`

**Mô tả:** Màn hình chào với animation (fade + scale), hiển thị logo FoodieDash và slogan.

**Chức năng:**
- Animation logo 1.5s (fade + scale elastic)
- AuthBloc tự động kiểm tra trạng thái đăng nhập
- Chuyển hướng động: onboarding (lần đầu) → login (chưa đăng nhập) → home/staff (đã đăng nhập)

---

## 2. Onboarding Page (`/onboarding`)

**File:** `features/auth/presentation/pages/onboarding_page.dart`

**Mô tả:** Thiết lập hồ sơ sức khỏe lần đầu — chọn dị ứng thực phẩm (17 loại).

**Chức năng:**
- Grid 2 cột các lựa chọn dị ứng với icon + subtitle
- Thanh tìm kiếm nguyên liệu
- Banner cam kết an toàn thực phẩm
- Bottom bar: đếm số lượng đã chọn + nút lưu
- Nút "Bỏ qua" (skip)
- Lưu vào `LocalStorage`, chuyển đến `/login`

---

## 3. Trang Auth

### 3.1. Login Page (`/login`)

**File:** `features/auth/presentation/pages/login_page.dart`

**Chức năng:**
- Form email + password với validation
- Link "Quên mật khẩu?" → `/forgot-password`
- Đăng nhập Google (hỗ trợ mobile & web)
- Error block inline (màu đỏ)
- Loading spinner trên nút
- Link "Đăng ký ngay" → `/register`

### 3.2. Register Page (`/register`)

**File:** `features/auth/presentation/pages/register_page.dart`

**Chức năng:**
- 4 trường: username, email, password, confirm password
- Password strength indicator (4 tiêu chí)
- AI personalized toggle checkbox
- Đăng ký Google
- Dialog thành công → verify email

### 3.3. Forgot Password (`/forgot-password`)

**File:** `features/auth/presentation/pages/forgot_password_page.dart`

**Chức năng:** Nhập email → gửi OTP → chuyển reset password.

### 3.4. Reset Password (`/reset-password`)

**File:** `features/auth/presentation/pages/reset_password_page.dart`

**Chức năng:** 2 bước: xác thực OTP 6 số → tạo mật khẩu mới.

### 3.5. Verify Email (`/verify-email`)

**File:** `features/auth/presentation/pages/verify_email_page.dart`

**Chức năng:** Nhập OTP 6 số + gửi lại mã → xác thực tài khoản.

---

## 4. Trang Chính (Bottom Nav)

### 4.1. Home Page (`/home`)

**File:** `features/home/presentation/pages/home_page.dart`

**Mô tả:** Trang chủ với nhiều section, lọc dị ứng và dữ liệu real-time.

**Các khu vực:**
1. **Logo Header:** Brand + Notification badge (unread count) + User avatar
2. **Store Selector:** Chọn chi nhánh (bắt buộc lần đầu — Bottom Sheet)
3. **Search Box:** Dẫn đến `/menu?search=`
4. **Banner Carousel:** 3 banner quảng cáo (tự động chuyển 4s)
5. **Flash Sale:** Grid 2 cột sản phẩm bán chạy
6. **AI Recommendations:** Gợi ý AI (kèm health score, NutriAI badge)
7. **Danh Mục Món Ăn:** Horizontal scroll categories
8. **Best Seller:** Grid sản phẩm bán chạy
9. **Voucher Section:** Horizontal ticket scroll
10. **Loyalty Preview:** Điểm thành viên (xử lý lỗi riêng)
11. **Recent Orders:** Đơn hàng gần đây (horizontal)
12. **Review Highlights:** Đánh giá nổi bật

**Tính năng đặc biệt:**
- Lọc theo dị ứng (ẩn món chứa thành phần dị ứng)
- Shimmer loading riêng cho từng section
- Pull-to-refresh
- Store change → reload toàn bộ dữ liệu
- API calls song song (9 luồng), null-safe

### 4.2. Menu Page (`/menu`)

**File:** `features/menu/presentation/pages/menu_page.dart`

**Mô tả:** Thực đơn chi tiết với phân trang + lọc nâng cao.

**Các khu vực:**
1. Brand header + store name badge
2. Hot Promotions carousel
3. Today's Specials carousel
4. Search bar + filter button (icon đổi màu khi có filter)
5. Category chips: dropdown categories + rating filter
6. Quick filters: view toggle, an toàn dị ứng, dưới 50k
7. Product display: grid 2 cột hoặc list view (toggle)
8. "Xem thêm" + infinite scroll

**Tính năng đặc biệt:**
- Debounce search (400ms)
- Filter Bottom Sheet (sắp xếp, khoảng giá, lọc dị ứng)
- AlertDialog cảnh báo dị ứng trước khi add to cart
- Pull-to-refresh + scroll pagination

### 4.3. Cart Page (`/cart`)

**File:** `features/cart/presentation/pages/cart_page.dart`

**Mô tả:** Giỏ hàng đầy đủ với upsell.

**Các khu vực:**
1. Store header
2. Select All / Delete All actions
3. Danh sách item: checkbox chọn, ảnh, tên, variations, quantity +/- , tổng tiền
4. Order note field (200 ký tự)
5. Upsell "Gọi thêm" — topping & đồ uống (horizontal scroll)
6. Bottom bar: tổng tiền đã chọn → "Thanh toán"

**Tính năng đặc biệt:**
- Swipe-to-delete (Dismissible + confirm)
- Chọn item cụ thể để thanh toán (không bắt buộc tất cả)
- Upsell API (topping + giải khát)
- Tự động map productId (có thể là String hoặc Object)

### 4.4. Order History (`/orders`)

**File:** `features/orders/presentation/pages/order_history_page.dart`

**Mô tả:** Lịch sử đơn hàng với tabs + tìm kiếm.

**Các khu vực:**
1. Header + notification + chat buttons
2. Search bar (tìm store, mã đơn, món ăn)
3. Tab bar: Tất cả | Chờ xác nhận | Đang xử lý | Đã giao | Đã hủy
4. Order cards: store, status badge, item images, mã đơn, ngày, tổng tiền
5. Action buttons theo status:
   - Chờ/Đang xử lý → "Theo dõi đơn"
   - Đã giao → "Mua lại" + "Đánh giá"
   - Đã hủy → "Mua lại đơn"

**Tính năng đặc biệt:**
- Infinite scroll (20 items/page)
- "Mua lại" (reorder): thêm tất cả items từ đơn cũ vào giỏ
- Loading dialog khi reorder

### 4.5. Profile Page (`/profile`)

**File:** `features/profile/presentation/pages/profile_page.dart`

**Mô tả:** Hồ sơ người dùng với thống kê.

**Các khu vực:**
1. **Hero Card:** Avatar, tên, email, phone, badge điểm thưởng
2. **Thống kê:** Đơn hàng | Đánh giá | Đã lưu
3. **Ăn uống của tôi:** Sức khỏe & dị ứng | Địa chỉ giao hàng
4. **Tài khoản:** Đổi mật khẩu (Bottom Sheet) | Thông báo khuyến mãi (toggle)
5. **Đăng xuất**

**Tính năng đặc biệt:**
- Gradient hero background + shadow
- Change Password Bottom Sheet (current pass, new pass, confirm)
- Campaign notification toggle → lưu lên server

---

## 5. Food Detail Page (`/food/:id`)

**File:** `features/food_detail/presentation/pages/food_detail_page.dart`

**Mô tả:** Chi tiết sản phẩm đầy đủ.

**Các khu vực:**
1. SliverAppBar — ảnh full-width + back button
2. Product Info: tên, rating badge, giá + % giảm
3. **NutriAI Card:** Badge xanh + health tags (nếu an toàn)
4. **Health Risk Alert:** Warning/danger từ AI (API riêng)
5. Allergen Warning (nếu có dị ứng)
6. Mô tả món ăn (trích dẫn border trái)
7. Nguyên liệu (wrap tags)
8. Biến thể / Topping (chọn options + giá extra)
9. Đánh giá (phân trang, load more)
10. Món ăn tương tự (horizontal scroll, cùng category)
11. **Bottom Bar:** Quantity selector + "Thêm vào giỏ" + "Mua ngay - tổng"

**Tính năng đặc biệt:**
- "Mua ngay" → thêm vào giỏ → fetch itemId → checkout với itemId
- Similar products (cùng category, trừ sản phẩm hiện tại)
- Tính tổng giá bao gồm variations
- Health risk từ AI (gọi API riêng)

---

## 6. Checkout Page (`/checkout`)

**File:** `features/checkout/presentation/pages/checkout_page.dart`

**Mô tả:** Thanh toán với validation nghiêm ngặt (Đà Nẵng).

**Các khu vực:**
1. **Cửa hàng:** Chọn store (picker nếu nhiều store)
2. **Địa chỉ giao hàng:** Chọn từ danh sách / Định vị GPS (Geolocator + Nominatim)
3. **Món đã chọn:** Danh sách + "Xem chi tiết" nếu >3
4. **Mã giảm giá:** Nhập code → validate với API (percentage/amount)
5. **Phương thức thanh toán:** COD / PayOS (đơn ≥ 2,000₫)
6. **Ghi chú đơn hàng**
7. **Bottom Bar:** Tạm tính - Giảm giá - Phí ship (miễn phí ≥100k) - Tổng cộng → "Đặt hàng"

**Validation:**
- SĐT: `^0\d{8,10}$`
- City: phải là Đà Nẵng
- Ward: phải trong `deliverableWards`
- Store: phải được chọn

**Luồng thanh toán PayOS:**
1. POST `/orders` → nhận `checkoutUrl`
2. Push `/payment-webview` với URL
3. WebView phát hiện redirect success → pop(true)
4. Push `/order-success/:id` hoặc `/order-failed/:id`

---

## 7. Trang Orders

### 7.1. Order Detail (`/orders/:id`)

**File:** `features/orders/presentation/pages/order_detail_page.dart`

**Mô tả:** Chi tiết đơn hàng với expandable cards.

**Các khu vực:**
1. Info header: mã đơn, ngày, store, ghi chú, status badge
2. Hỗ trợ trực tuyến card → `/chat?orderId=`
3. Expandable: Món ăn | Voucher | Địa chỉ | Thanh toán | Chi tiết giá | Trạng thái
4. Status timeline (dots + connectors)
5. **Bottom Actions theo status:**
   - Pending: "Hủy đơn" + "Theo dõi"
   - Delivering: "Đã nhận hàng" + "Theo dõi"
   - Delivered/Completed: "Theo dõi" + "Đánh giá"
   - Luôn có: "Hỗ trợ"

### 7.2. Track Order (`/track-order/:id`)

**File:** `features/orders/presentation/pages/track_order_page.dart`

**Mô tả:** Theo dõi đơn hàng real-time với timeline.

**Chức năng:**
- Current Status Hero: icon, label, code, tổng tiền
- Timeline dọc: dots (pulse animation ở bước hiện tại) + connectors
- Delivery info: driver, shipped/delivered time
- "Trạng thái được cập nhật tự động" hint
- Socket.io listener: `order:status_updated`

### 7.3. Order Success (`/order-success/:id`)

**File:** `features/orders/presentation/pages/order_success_page.dart`

**Chức năng:**
- Icon check circle + scale animation (elastic)
- Sparkle decorations
- Order card: mã đơn, payment method, tổng tiền, status
- Actions: "Theo dõi" | "Xem chi tiết" | "Tiếp tục mua"

### 7.4. Order Failed (`/order-failed/:id`)

**File:** `features/orders/presentation/pages/order_failed_page.dart`

**Chức năng:**
- Icon cancel + scale animation
- Lý do thất bại (nếu có)
- Actions: "Thử lại" → `/checkout` | "Về trang chủ"

---

## 8. Trang Settings & Profile

### 8.1. Edit Profile (`/profile/edit`)

**File:** `features/profile/presentation/pages/edit_profile_page.dart`

**Chức năng:**
- Avatar: chụp ảnh hoặc thư viện (ImagePicker)
- Trường: username, họ tên, phone, email (read-only)
- FormData upload (MultipartFile cho avatar)

### 8.2. Address Page (`/profile/addresses`)

**File:** `features/profile/presentation/pages/address_page.dart`

**Chức năng:**
- Danh sách + swipe-to-delete
- Thêm/Sửa Bottom Sheet: người nhận, SĐT, thành phố (Đà Nẵng), phường/xã (dropdown), chi tiết, mặc định
- "Đặt làm mặc định"
- FAB "Thêm"

### 8.3. Health Preferences (`/profile/health`)

**File:** `features/profile/presentation/pages/health_preferences_page.dart`

**Chức năng:**
- Danh sách dị ứng (17 loại) với search + toggle
- Intro card thông báo
- Bottom bar: đếm + "Lưu dị ứng"

---

## 9. Trang Phụ

### 9.1. Support Chat (`/chat`) và Chat Detail (`/chat/:conversationId`)

**File:** `features/support_chat/presentation/pages/chat_list_page.dart`
**File:** `features/support_chat/presentation/pages/chat_detail_page.dart`

**Mô tả:** Trang danh sách hội thoại hỗ trợ + trang chat full-screen.

**Chat List (`/chat`):**
- Danh sách hội thoại (active/closed) với phân loại
- Click vào hội thoại → push sang `/chat/:conversationId`
- Unread badge trên từng conversation
- Tự động tạo hội thoại khi gửi từ Order Detail với `?orderId=`
- Pull-to-refresh

**Chat Detail (`/chat/:conversationId`) — Thiết kế mới:**\
Màn hình chat full-screen chuẩn mobile với:
- AppBar: tiêu đề + subtitle số tin nhắn + nút back tự động
- Danh sách tin nhắn dạng bubble (staff bên trái, customer bên phải)
- Tự động scroll xuống cuối khi có tin nhắn mới
- Input bar: nút gửi ảnh (camera hoặc thư viện) + TextField + nút gửi
- Hỗ trợ gửi text và hình ảnh (upload → gửi URL)
- Empty state khi chưa có tin nhắn

### 9.2. Membership (`/membership`)

**File:** `features/membership/presentation/pages/membership_page.dart`

**Chức năng:**
- Card hạng thành viên (gradient theo tier color)
- Progress bar lên hạng
- Tier steps (Bronze→Silver→Gold→Diamond)
- Quyền lợi danh sách
- Lịch sử điểm (10 gần nhất)
- "Chia sẻ giới thiệu bạn bè"

### 9.3. Notifications (`/notifications`)

**File:** `features/notifications/presentation/pages/notification_list_page.dart`

**Chức năng:**
- Danh sách (order_update, promotion, system)
- Đánh dấu đã đọc (tap / swipe)
- "Đã đọc tất cả"
- Unread badge + dot indicator

### 9.4. Voucher List (`/vouchers`)

**File:** `features/vouchers/presentation/pages/voucher_list_page.dart`

**Chức năng:**
- Category chips + search debounce
- Thẻ voucher: % giảm, code, HSD, đơn tối thiểu
- "Sao chép mã" → clipboard
- Tự động expired badge

### 9.5. Campaign Products (`/campaign/:id`)

**File:** `features/campaigns/presentation/pages/campaign_products_page.dart`

**Chức năng:**
- Header gradient + countdown timer
- Grid sản phẩm giá KM
- Countdown real-time (1s interval)
- Add to cart

### 9.6. AI Suggestions (`/ai-suggestions`)

**File:** `features/ai_suggestions/presentation/pages/ai_suggestions_page.dart`

**Các section:**
1. Health info card / Preferences setup prompt
2. "Gợi ý cho bạn" — horizontal product list
3. "Món ăn an toàn" — phù hợp chế độ ăn
4. "Xu hướng" — bán chạy nhất

### 9.7. Order Rating (`/rating/:orderId`)

**File:** `features/reviews/presentation/pages/order_rating_page.dart`

**Chức năng:**
- Overall rating bar
- Rate-all checkbox
- Per-product: stars, comment (500 ký tự), feedback tags (< 3 sao), upload ảnh (tối đa 4)
- Ẩn danh toggle
- Upload ảnh → gửi ObjectId

---

## 10. PayOS WebView (`/payment-webview`)

**Mô tả:** WebView thanh toán PayOS.

**Chức năng:**
- Load URL thanh toán
- Phát hiện redirect success/fail
- Callback pop(true/false)

---

## Phụ Lục: Patterns Chung

| Pattern | Implementation |
|---------|---------------|
| **Loading** | Shimmer effect (`shimmer` package) |
| **Error** | `AppErrorWidget(message, onRetry)` — reusable |
| **Empty State** | Icon + text + CTA button riêng từng trang |
| **Refresh** | `RefreshIndicator` (pull-to-refresh) |
| **Image** | `CachedNetworkImage` (placeholder + errorWidget) |
| **API Client** | Custom `ApiClient()` wrapper trên Dio |
| **Auth** | `AuthBloc` + `SecureStorage` (token) |
| **Socket** | `SocketService()` — Socket.IO real-time |
| **Store** | `StoreCubit` — toàn cục, hydrate từ localStorage |
| **Bottom Sheet** | `showModalBottomSheet` pattern thống nhất |
| **Snackbar** | Floating, rounded corners, màu theo type |
