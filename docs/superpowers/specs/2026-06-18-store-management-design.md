# Store Management — Design Spec

**Date:** 2026-06-18
**Use Cases:** 31 Create Store, 32 Update Store, 33 Deactivate Store, 34 Activate Store

## Actors

- **Admin**: Full CRUD + activate/deactivate on all stores
- **Manager**: Update store info of their own assigned store only

## Backend Design

### New Service: `backend/src/services/store-management.service.ts`

- `listAllStores(page, limit, filters)` → paginated stores (including inactive, for admin)
- `getStoreById(storeId)` → single store
- `createStore(data)` → new store
- `updateStore(storeId, data)` → updated store
- `setStoreActive(storeId, isActive)` → toggled store

### Handlers in `admin.controller.ts`

| Handler | Method |
|---|---|
| `getAdminStoresHandler` | List all stores for admin |
| `getAdminStoreDetailHandler` | Get store detail |
| `createStoreHandler` | Create store |
| `updateStoreHandler` | Update store (admin) |
| `deactivateStoreHandler` | Deactivate store |
| `activateStoreHandler` | Activate store |

### Handler in `manager.controller.ts`

| Handler | Method |
|---|---|
| `updateManagerStoreHandler` | Manager updates own store info |

### Routes

**`admin.route.ts`:**
- `GET /admin/stores` — ADMIN
- `GET /admin/stores/:id` — ADMIN
- `POST /admin/stores` — ADMIN
- `PUT /admin/stores/:id` — ADMIN
- `PATCH /admin/stores/:id/deactivate` — ADMIN
- `PATCH /admin/stores/:id/activate` — ADMIN

**`manager.route.ts`:**
- `PUT /manager/store` — MANAGER (uses requireManagerStore)

### Validator: `store.validator.ts`

- `createStoreSchema`: name, location (Point + [lng,lat]), address, district
- `updateStoreSchema`: all fields partial

## Frontend Design

### Service: `store.service.ts` additions

- `getAdminStores(params)` → `GET /admin/stores`
- `getAdminStoreById(id)` → `GET /admin/stores/:id`
- `createAdminStore(data)` → `POST /admin/stores`
- `updateAdminStore(id, data)` → `PUT /admin/stores/:id`
- `deactivateStore(id)` → `PATCH /admin/stores/:id/deactivate`
- `activateStore(id)` → `PATCH /admin/stores/:id/activate`

### Manager service: `manager-dashboard.service.ts` addition

- `updateManagerStoreInfo(data)` → `PUT /manager/store`

### New Page: `Admin/Stores/index.tsx`

- Table listing all stores with columns: Name, Address, District, Status, Actions
- Status badge (Active=green, Inactive=gray) following existing Admin pattern
- "Add Store" button → opens AdminDrawer with create form
- Edit button per row → opens AdminDrawer with update form
- Deactivate/Activate toggle button with confirmation dialog
- Form fields: name, address, district, location coordinates (longitude, latitude)

### Sidebar: Add to `AdminLayout.tsx`

Add "Quản lý cửa hàng" to the "Cài đặt & Hệ thống" subItems group.

### Route: `App.tsx`

```tsx
<Route path="stores" element={<AdminStores />} />
```

### Manager Settings: Extend `Manager/Settings/index.tsx`

Add "Thông tin cửa hàng" section allowing Manager to update their store's name, address, district.

## Files Modified/Created

### Backend (created)
- `backend/src/services/store-management.service.ts`
- `backend/src/validators/store.validator.ts`

### Backend (modified)
- `backend/src/controllers/admin.controller.ts`
- `backend/src/controllers/manager.controller.ts`
- `backend/src/routes/admin.route.ts`
- `backend/src/routes/manager.route.ts`

### Frontend (created)
- `frontend/src/pages/Admin/Stores/index.tsx`

### Frontend (modified)
- `frontend/src/services/store.service.ts`
- `frontend/src/services/manager-dashboard.service.ts`
- `frontend/src/components/layout/AdminLayout.tsx`
- `frontend/src/App.tsx`
- `frontend/src/pages/Manager/Settings/index.tsx`
