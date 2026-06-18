# Báo cáo Cập nhật Backend - Vai trò Manager (Phase 1 → Phase 5) & Staff Store Scope

Tài liệu này ghi nhận các thay đổi backend đã triển khai cho vai trò **Manager** (Phase 1→5) và **Staff** trong dự án FoodieDash.

---

## Manager Phases (Phase 1 — Phase 5)

(Lưu giữ toàn bộ nội dung Manager Phase 1 → Phase 5 + Staff Invite Email + Verification đã có, không thay đổi.)

---

## Phase 6 — Staff Store Scope

### Mục tiêu
Thiết lập store scope cho role STAFF: Staff chỉ được xem và thao tác đơn hàng trong chi nhánh mà tài khoản được gán. Backend dùng `req.userId` và `UserModel.findById().select('role storeId')` làm nguồn tin cậy duy nhất; nếu client gửi `storeId` thì chỉ để so sánh xác thực (nếu lệch → 403), không tin tưởng để query.

### Thay đổi chính
- Tạo middleware [require-staff-store.ts](backend/src/middlewares/require-staff-store.ts):
  - Xác thực `req.userId`.
  - Kiểm tra user có role `STAFF`.
  - Kiểm tra user có `storeId`.
  - Đọc optional client `storeId` từ `req.query` hoặc `req.body`.
  - Nếu client gửi storeId và không trùng với storeId thật của user → 403 `FORBIDDEN`.
  - Gắn `storeId` vào `req.scope.storeId` (kiểu `mongoose.Types.ObjectId`).
- Xuất middleware qua [index.ts](backend/src/middlewares/index.ts).
- Tạo service [staff-order.service.ts](backend/src/services/staff-order.service.ts):
  - `getStaffOrders(storeId, query)` — filter orders theo `storeId`, hỗ trợ pagination, populate `cusId` và `items.productId`.
  - `getStaffOrderById(storeId, orderId)` — tìm order với `{ _id: orderId, storeId }`.
  - `transitionStaffOrderStatus(storeId, orderId, nextStatus, actorId, options)` — kiểm tra order thuộc store, validate status transition, ghi `statusHistory` với `actorRole: 'staff'`.
  - Status transition map cho phép Staff: PENDING→CONFIRMED/CANCELLED, CONFIRMED→READY_FOR_DELIVERY, PROCESSING→READY_FOR_DELIVERY, READY_FOR_DELIVERY→SHIPPING, SHIPPING→COMPLETED/DELIVERED.
- Bổ sung handlers trong [order.controller.ts](backend/src/controllers/order.controller.ts):
  - `getStaffOrders` — đọc `req.scope.storeId`, truyền vào service.
  - `getStaffOrderById` — đọc `req.scope.storeId` + `req.params.id`.
  - `staffConfirmOrder` — PENDING → CONFIRMED.
  - `staffRejectOrder` — PENDING → CANCELLED, có `reason`.
  - `staffMarkOrderReady` — CONFIRMED/PROCESSING → READY_FOR_DELIVERY.
  - `staffAssignDelivery` — READY_FOR_DELIVERY → SHIPPING.
  - `staffCompleteDelivery` — SHIPPING → COMPLETED.
- Bổ sung routes trong [order.route.ts](backend/src/routes/order.route.ts):
  - `GET /orders/staff/orders` — authenticate, authorize(STAFF), requireStaffStore, getStaffOrders.
  - `GET /orders/staff/orders/:id` — authenticate, authorize(STAFF), requireStaffStore, getStaffOrderById.
  - `PATCH /orders/staff/orders/:id/confirm` — authenticate, authorize(STAFF), requireStaffStore, staffConfirmOrder.
  - `PATCH /orders/staff/orders/:id/reject` — authenticate, authorize(STAFF), requireStaffStore, staffRejectOrder.
  - `PATCH /orders/staff/orders/:id/ready` — authenticate, authorize(STAFF), requireStaffStore, staffMarkOrderReady.
  - `PATCH /orders/staff/orders/:id/deliver` — authenticate, authorize(STAFF), requireStaffStore, staffAssignDelivery.
  - `PATCH /orders/staff/orders/:id/complete` — authenticate, authorize(STAFF), requireStaffStore, staffCompleteDelivery.
  - (Lưu ý: do `orderRoutes` được mount dưới `/orders` tại `/api`, các endpoint thực tế có tiền tố `/orders`).
- Bổ sung store scope chặt chẽ cho Support Chat:
  - Cập nhật [support-chat.controller.ts](backend/src/controllers/support-chat.controller.ts) và [support-chat.service.ts](backend/src/services/support-chat.service.ts):
    - Khi tạo cuộc hội thoại mới với `orderId`, hệ thống tự lấy `storeId` của đơn hàng lưu vào `store_id` của conversation.
    - Lấy `storeId` của Staff từ DB (`UserModel`) làm nguồn tin cậy.
    - Lọc danh sách chat của Staff (`listStaffConversations`) chỉ trả về các cuộc trò chuyện thuộc chi nhánh của Staff.
    - Bảo vệ tất cả API chat của Staff: `getMessages`, `sendMessage`, `markAsRead`, `closeConversation` đều kiểm tra Store Scope. Nếu tài khoản Staff chưa gán chi nhánh hoặc thao tác sang hội thoại của chi nhánh khác → 403 `FORBIDDEN`.

### Lưu ý kiến trúc
- Backend dùng `req.userId` (không có `req.user` trong global.d.ts), nên middleware tự gọi `UserModel.findById(req.userId)` để lấy role và storeId.
- Module import đúng:
  - `@/utils/app-assert` (không phải `@/utils/appAssert`).
  - `{ catchErrors }` từ `@/utils/async-handler`.
- Các route support chat được bảo vệ theo store scope của Staff và vẫn đảm bảo quyền truy cập toàn cục cho Admin/Manager.

### Regression
- [staff-store-scope.regression.ts](backend/tests/staff-store-scope.regression.ts) — PASS

### Trạng thái hiện tại
- Backend regression `staff-store-scope.regression.ts` — PASS
- Backend build — PASS (sau khi sửa lỗi kiểu dữ liệu helper trong controller nhận `string | ObjectId`)

---

---

## Phase 7 — Store Management (Admin + Manager)

### Mục tiêu
Triển khai usecase Store Management (U31-U34): Admin quản lý toàn bộ cửa hàng (CRUD + activate/deactivate), Manager cập nhật thông tin cơ bản của store được gán.

### Thay đổi chính

**1. New validator** [store.validator.ts](backend/src/validators/store.validator.ts):
- `createStoreSchema` — Zod schema cho tạo store: name, location (GeoJSON Point), address, district.
- `updateStoreSchema` — partial của create, cho phép cập nhật từng field.

**2. New service** [store-management.service.ts](backend/src/services/store-management.service.ts):
- `listAllStores(page, limit, filters)` — lấy danh sách store có phân trang, hỗ trợ filter `isActive` và `search`.
- `getStoreById(storeId)` — lấy chi tiết 1 store.
- `createStore(data)` — tạo store mới.
- `updateStore(storeId, data)` — cập nhật store (name/address/district/location).
- `setStoreActive(storeId, isActive)` — toggle trạng thái hoạt động của store.

**3. Admin controller + routes**:
- Thêm 6 handlers vào [admin.controller.ts](backend/src/controllers/admin.controller.ts):
  - `getAdminStoresHandler`, `getAdminStoreDetailHandler`, `createStoreHandler`, `updateStoreHandler`, `deactivateStoreHandler`, `activateStoreHandler`.
- Thêm 6 routes vào [admin.route.ts](backend/src/routes/admin.route.ts):
  - `GET /admin/stores`, `GET /admin/stores/:id`, `POST /admin/stores`, `PUT /admin/stores/:id`, `PATCH /admin/stores/:id/deactivate`, `PATCH /admin/stores/:id/activate`.
  - Tất cả yêu cầu `authenticate` + `authorize(Role.ADMIN)`.

**4. Manager controller + route**:
- Thêm `updateManagerStoreHandler` vào [manager.controller.ts](backend/src/controllers/manager.controller.ts): Manager cập nhật thông tin store của chính mình, dùng `requireManagerStore` để lấy `storeId`.
- Thêm `PUT /manager/store` vào [manager.route.ts](backend/src/routes/manager.route.ts).

### Trạng thái hiện tại
- Backend build — PASS

---

*Cập nhật bởi Claude Code — 2026-06-18.*
