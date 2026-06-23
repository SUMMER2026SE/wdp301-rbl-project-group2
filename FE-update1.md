# Báo cáo Cập nhật Frontend - Vai trò Manager (Phase 1 → Phase 5) & Staff Store Scope

Tài liệu này ghi nhận các thay đổi frontend đã triển khai cho không gian làm việc **Manager** (Phase 1→5) và **Staff** trong dự án FoodieDash.

---

## Manager Phases (Phase 1 — Phase 5)

(Lưu giữ toàn bộ nội dung Manager Phase 1 → Phase 5 + Verification đã có, không thay đổi.)

---

## Phase 6 — Staff Store Scope

### Mục tiêu
Store-scope toàn bộ Staff workspace: Staff tự động lấy `storeId` từ authenticated user, chỉ xem và thao tác dữ liệu thuộc chi nhánh được gán. Staff không có UI chọn/switch chi nhánh. Nếu tài khoản Staff chưa có `storeId`, chuyển hướng sang `/staff/no-store`.

### Thay đổi chính

**1. Auth helpers**
- [useAuth.ts](frontend/src/hooks/useAuth.ts):
  - `storeId = user?.storeId ?? null`.
  - `hasAssignedStore = Boolean(storeId)`.

**2. Staff route guard & no-store page**
- Tạo guard [RequireStaffStore.tsx](frontend/src/components/guards/RequireStaffStore.tsx):
  - Nếu `!hasAssignedStore`, redirect `/staff/no-store`.
- Tạo page [NoStore/index.tsx](frontend/src/pages/Staff/NoStore/index.tsx):
  - Hiển thị thông báo: "Tài khoản nhân viên của bạn chưa được gán chi nhánh. Vui lòng liên hệ quản lý hoặc admin để được hỗ trợ."
  - Nút "Đăng xuất" gọi `logout()` và navigate `/login`.

**3. Staff routes trong App.tsx**
- Staff route group chỉ yêu cầu role `["STAFF"]` (không còn `["STAFF", "ADMIN"]`).
- Route `/staff/no-store` nằm ngoài `RequireStaffStore`.
- Toàn bộ `/staff/*` được bọc trong `RequireStaffStore`.
- Cấu trúc routes:
  ```
  RequireAuth → RequireRole(["STAFF"])
    ├── /staff/no-store (StaffNoStore) — không cần store
    └── RequireStaffStore → StaffLayout
        ├── index → StaffDashboard
        ├── orders → StaffOrders
        ├── orders/:id → StaffOrderDetail
        ├── delivery → StaffDeliveryMode
        ├── menu → StaffMenu
        ├── support → StaffSupportChatPage
        ├── support/settings → StaffSupportSettingsPage
        ├── customers → StaffCustomerProfile
        └── customers/:id → StaffCustomerProfile
  ```

**4. Staff order service methods**
- [order.service.ts](frontend/src/services/order.service.ts):
  - `interface StaffStoreScope { storeId: string }`.
  - `interface StaffOrderListParams extends StaffStoreScope { status?, page?, limit?, sort? }`.
  - `interface StaffOrderActionPayload extends StaffStoreScope { reason? }`.
  - `getStaffOrders(params)` → `GET /staff/orders`.
  - `getStaffOrderById(id, scope)` → `GET /staff/orders/:id`.
  - `staffConfirmOrder(id, scope)` → `PATCH /staff/orders/:id/confirm`.
  - `staffRejectOrder(id, data)` → `PATCH /staff/orders/:id/reject`.
  - `staffMarkOrderReady(id, scope)` → `PATCH /staff/orders/:id/ready`.
  - `staffAssignDelivery(id, scope)` → `PATCH /staff/orders/:id/deliver`.
  - `staffCompleteDelivery(id, scope)` → `PATCH /staff/orders/:id/complete`.

**5. Staff Orders page store-scoped**
- [Staff/Orders/index.tsx](frontend/src/pages/Staff/Orders/index.tsx):
  - Import `useAuth`, const `{ storeId } = useAuth()`.
  - Fetch dùng `getStaffOrders({ storeId, status: "pending,confirmed,processing,ready_for_delivery" })`.
  - Actions đã đổi sang Staff methods:
    - `staffConfirmOrder(orderId, { storeId })`.
    - `staffRejectOrder(orderId, { storeId, reason })`.
    - `staffMarkOrderReady(orderId, { storeId })`.
    - `staffAssignDelivery(orderId, { storeId })`.
  - Callback dependency `[storeId]`.

**6. Staff OrderDetail page store-scoped**
- [Staff/Orders/OrderDetail/index.tsx](frontend/src/pages/Staff/Orders/OrderDetail/index.tsx):
  - Dùng `useAuth()` để lấy `storeId` của chi nhánh.
  - Loại bỏ hoàn toàn các API generic (`getOrderById`, `assignDelivery`, `updateOrderStatus`, `rejectOrder`).
  - Chuyển đổi sang các phương thức API chi nhánh: `getStaffOrderById`, `staffConfirmOrder`, `staffMarkOrderReady`, `staffAssignDelivery`, `staffCompleteDelivery`, `staffRejectOrder`.
  - Validate an hoàn bằng cách return sớm nếu `!storeId`.

**7. Staff Dashboard store-scoped**
- [Staff/Dashboard/index.tsx](frontend/src/pages/Staff/Dashboard/index.tsx):
  - Thay thế generic `getAllOrders({ limit: 100 })` bằng API scoped `getStaffOrders({ storeId, limit: 100 })`.
  - Đảm bảo dependencies của react hooks đồng bộ theo `storeId`.

**8. Staff Delivery Mode store-scoped**
- [Staff/DeliveryMode/index.tsx](frontend/src/pages/Staff/DeliveryMode/index.tsx):
  - Thay thế generic `getAllOrders` bằng `getStaffOrders({ storeId, status: "shipping" })`.
  - Thực hiện lọc local theo `driverId` (chỉ hiển thị đơn hàng thuộc driver đang phục vụ chi nhánh đó).
  - Thay thế generic `completeDelivery` bằng `staffCompleteDelivery`.
  - Sửa lỗi TypeScript `user is possibly null` bằng guard check `user?.storeId`.

**9. Staff SupportChat store-scoped**
- Cập nhật [support-chat-staff.service.ts](frontend/src/services/support-chat-staff.service.ts) để truyền `storeId` tùy chọn lên backend.
- Cập nhật hook [useStaffSupportChat.ts](frontend/src/hooks/useStaffSupportChat.ts) và component [Staff/SupportChat/index.tsx](frontend/src/pages/Staff/SupportChat/index.tsx):
  - Truyền `storeId` vào hook và gọi API `listConversations({ storeId })`.
  - Khi xem chi tiết đơn hàng trong khung chat, dùng `getStaffOrderById(orderId, { storeId })` thay vì generic `getOrderById`.
  - Hủy load chat nếu `!storeId`.

### Lưu ý và Trạng thái build
- **Route Alignment**: Các endpoint đã được chuyển đổi từ `/staff/orders/...` thành `/orders/staff/orders/...` để khớp hoàn toàn với thiết lập mount route thực tế trên backend.
- **Frontend Build**: 
  - Trạng thái kiểm tra lỗi TypeScript (`tsc -b`) đã **PASS** hoàn toàn.
  - Lệnh đóng gói build của Vite (`vite build`) có thể bị lỗi `EPERM` trên Windows do file lock từ IDE/editor process đang mở trên thư mục `frontend/dist`. Để khắc phục khi deploy: cần đóng các tiến trình đang khóa (đóng server dev, terminal đang chạy) hoặc xoá thủ công thư mục `dist` rồi chạy lại `pnpm build`.

### Regression
- [staff-store-scope.regression.cjs](frontend/src/pages/Staff/staff-store-scope.regression.cjs) — PASS (Đã bổ sung assertions mở rộng kiểm tra sự tồn tại của `useAuth`, `storeId`, và khẳng định 100% không còn sử dụng bất kì api generic nào trên tất cả các trang: Dashboard, Orders, OrderDetail, DeliveryMode).

---

---

## Phase 7 — Store Management Admin Page (U31-U34) + Manager Settings

### Mục tiêu
Triển khai trang quản lý cửa hàng cho Admin (CRUD + activate/deactivate) và mở rộng Manager Settings cho phép cập nhật thông tin cơ bản của chi nhánh.

### Thay đổi chính

**1. Store service methods** [store.service.ts](frontend/src/services/store.service.ts):
- Thêm interfaces: `AdminStoresParams`, `CreateStorePayload`, `UpdateStorePayload`, `AdminStoresResult`.
- Thêm API functions: `getAdminStores`, `getAdminStoreById`, `createAdminStore`, `updateAdminStore`, `deactivateStore`, `activateStore`.

**2. Manager dashboard service** [manager-dashboard.service.ts](frontend/src/services/manager-dashboard.service.ts):
- Thêm interface `ManagerStoreInfo` (name, address, district).
- Thêm method `updateManagerStoreInfo(data)` — gọi `PUT /manager/store`.

**3. Admin Stores page** [Admin/Stores/index.tsx](frontend/src/pages/Admin/Stores/index.tsx):
- Bảng danh sách cửa hàng: Tên, Địa chỉ, Quận/Huyện, Trạng thái (Active/Inactive badge), Hành động (Edit, Toggle Active).
- Filter: search theo tên/địa chỉ/quận + lọc theo trạng thái (Tất cả/Hoạt động/Không HĐ).
- Sử dụng `AdminDrawer` component có sẵn cho form Create/Edit store.
- Form fields: Tên cửa hàng, Địa chỉ, Quận/Huyện, Tọa độ (longitude, latitude).
- Xác nhận bằng `window.confirm()` khi deactivate/activate.
- UI/UX đồng bộ với các trang Admin hiện có (Staff, Customers, Reviews...).

**4. Sidebar navigation** [AdminLayout.tsx](frontend/src/components/layout/AdminLayout.tsx):
- Thêm "Quản lý cửa hàng" vào subItems của "Cài đặt & Hệ thống".

**5. Route** [App.tsx](frontend/src/App.tsx):
- Import `AdminStores`, thêm `<Route path="stores" element={<AdminStores />} />`.

**6. Manager Settings extension** [Manager/Settings/index.tsx](frontend/src/pages/Manager/Settings/index.tsx):
- Thêm section "Thông tin cửa hàng" cho phép Manager cập nhật: tên, địa chỉ, quận/huyện của chi nhánh được gán.
- Tự động fetch thông tin store từ `getAdminStoreById(storeId)` khi vào trang.
- Form với 3 input fields (name, address, district) + nút "Lưu thông tin".

### Trạng thái hiện tại
- Frontend TypeScript build — PASS

---

*Cập nhật bởi Claude Code — 2026-06-18.*
