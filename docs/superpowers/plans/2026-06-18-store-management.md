# Store Management Implementation Plan (U31-U34)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Admin full CRUD + activate/deactivate on stores, and let Manager update core info of their assigned store.

**Architecture:** Backend follows existing layered pattern: service → controller → route. New `store-management.service.ts` for business logic. Admin routes added to existing `admin.route.ts`. Manager store-update added via `manager.route.ts` with `requireManagerStore`. Frontend adds `Admin/Stores` page following existing Admin page patterns, extends Manager Settings with store info fields.

**Tech Stack:** Express 4 + TypeScript (backend), React 19 + TypeScript + Tailwind CSS + TanStack Query (frontend), Mongoose, Zod validation

## Global Constraints

- Follow existing code patterns exactly (controller handler structure, response format, validation, middleware chain)
- Backend treats `req.userId` as the only source of truth for identity
- Manager store update uses `requireManagerStore` middleware (storeId from `req.scope.storeId`)
- Frontend Admin page uses `apiClient` for API calls, following Admin/Staff page pattern
- Manager store info section integrates into existing ManagerSettings page
- All text in Vietnamese
- No refactoring of unrelated code

---

### Task 1: Backend — Store Validator

**Files:**
- Create: `backend/src/validators/store.validator.ts`

**Interfaces:**
- Consumes: none (first task)
- Produces:
  - `createStoreSchema` — Zod schema for POST body
  - `updateStoreSchema` — Zod schema for PUT body (all fields optional)

- [ ] **Step 1: Create the validator file**

```typescript
import z from 'zod';

export const createStoreSchema = z.object({
  name: z.string().min(1, 'Tên cửa hàng không được để trống').max(100),
  location: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
  address: z.string().min(1, 'Địa chỉ không được để trống'),
  district: z.string().min(1, 'Quận/Huyện không được để trống'),
});

export const updateStoreSchema = createStoreSchema.partial();
```

- [ ] **Step 2: Verify file compiles**

Run: `cd backend && npx tsc --noEmit --skipLibCheck src/validators/store.validator.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/validators/store.validator.ts
git commit -m "feat(store): add store validator schemas

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Backend — Store Management Service

**Files:**
- Create: `backend/src/services/store-management.service.ts`

**Interfaces:**
- Consumes: `createStoreSchema`, `updateStoreSchema` from Task 1
- Produces:
  - `listAllStores(page, limit, filters)` → `{ stores: IStore[], total: number, page: number, totalPages: number }`
  - `getStoreById(storeId: string)` → `IStore`
  - `createStore(data)` → `IStore`
  - `updateStore(storeId, data)` → `IStore`
  - `setStoreActive(storeId, isActive: boolean)` → `IStore`

- [ ] **Step 1: Write the service file**

```typescript
import mongoose from 'mongoose';
import { StoreModel } from '@/models';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';

export const listAllStores = async (
  page: number = 1,
  limit: number = 20,
  filters: { isActive?: boolean; search?: string } = {}
) => {
  const query: Record<string, any> = {};

  if (typeof filters.isActive === 'boolean') {
    query.isActive = filters.isActive;
  }

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { address: { $regex: filters.search, $options: 'i' } },
      { district: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [stores, total] = await Promise.all([
    StoreModel.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    StoreModel.countDocuments(query),
  ]);

  return {
    stores,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const getStoreById = async (storeId: string) => {
  appAssert(mongoose.Types.ObjectId.isValid(storeId), BAD_REQUEST, 'Id cửa hàng không hợp lệ');

  const store = await StoreModel.findById(storeId).lean();
  appAssert(store, NOT_FOUND, 'Không tìm thấy cửa hàng');

  return store;
};

export const createStore = async (data: {
  name: string;
  location: { type: 'Point'; coordinates: number[] };
  address: string;
  district: string;
}) => {
  const store = await StoreModel.create(data);
  return store.toObject();
};

export const updateStore = async (
  storeId: string,
  data: {
    name?: string;
    location?: { type: 'Point'; coordinates: number[] };
    address?: string;
    district?: string;
  }
) => {
  appAssert(mongoose.Types.ObjectId.isValid(storeId), BAD_REQUEST, 'Id cửa hàng không hợp lệ');

  const store = await StoreModel.findByIdAndUpdate(
    storeId,
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
  appAssert(store, NOT_FOUND, 'Không tìm thấy cửa hàng');

  return store;
};

export const setStoreActive = async (storeId: string, isActive: boolean) => {
  appAssert(mongoose.Types.ObjectId.isValid(storeId), BAD_REQUEST, 'Id cửa hàng không hợp lệ');

  const store = await StoreModel.findByIdAndUpdate(
    storeId,
    { $set: { isActive } },
    { new: true }
  ).lean();

  appAssert(store, NOT_FOUND, 'Không tìm thấy cửa hàng');

  return store;
};
```

- [ ] **Step 2: Verify file compiles**

Run: `cd backend && npx tsc --noEmit --skipLibCheck src/services/store-management.service.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/store-management.service.ts
git commit -m "feat(store): add store management service

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Backend — Admin Controller Handlers + Routes

**Files:**
- Modify: `backend/src/controllers/admin.controller.ts` — add 6 new handlers
- Modify: `backend/src/routes/admin.route.ts` — add 6 new routes

**Interfaces:**
- Consumes: `listAllStores`, `getStoreById`, `createStore`, `updateStore`, `setStoreActive` from Task 2; `createStoreSchema`, `updateStoreSchema` from Task 1
- Produces: 6 handler functions and 6 route registrations

- [ ] **Step 1: Add import for store management service in admin.controller.ts**

Open `backend/src/controllers/admin.controller.ts`. After the existing import from `@/services/admin-staff-request.service` (around line 26), add:

```typescript
import {
  listAllStores,
  getStoreById,
  createStore,
  updateStore,
  setStoreActive,
} from '@/services/store-management.service';
import { createStoreSchema, updateStoreSchema } from '@/validators/store.validator';
```

- [ ] **Step 2: Add 6 handler functions at end of admin.controller.ts**

```typescript
export const getAdminStoresHandler = catchErrors(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
  const search = req.query.search as string | undefined;

  const result = await listAllStores(page, limit, { isActive, search });

  return res.success(OK, {
    message: 'Lấy danh sách cửa hàng thành công',
    data: result.stores,
    pagination: {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    },
  });
});

export const getAdminStoreDetailHandler = catchErrors(async (req, res) => {
  const store = await getStoreById(req.params.id);

  return res.success(OK, {
    message: 'Lấy thông tin cửa hàng thành công',
    data: store,
  });
});

export const createStoreHandler = catchErrors(async (req, res) => {
  const body = createStoreSchema.parse(req.body);
  const store = await createStore(body);

  return res.success(CREATED, {
    message: 'Tạo cửa hàng thành công',
    data: store,
  });
});

export const updateStoreHandler = catchErrors(async (req, res) => {
  const body = updateStoreSchema.parse(req.body);
  const store = await updateStore(req.params.id, body);

  return res.success(OK, {
    message: 'Cập nhật cửa hàng thành công',
    data: store,
  });
});

export const deactivateStoreHandler = catchErrors(async (req, res) => {
  const store = await setStoreActive(req.params.id, false);

  return res.success(OK, {
    message: 'Đã vô hiệu hóa cửa hàng',
    data: store,
  });
});

export const activateStoreHandler = catchErrors(async (req, res) => {
  const store = await setStoreActive(req.params.id, true);

  return res.success(OK, {
    message: 'Đã kích hoạt cửa hàng',
    data: store,
  });
});
```

- [ ] **Step 3: Add store route entries in admin.route.ts**

Open `backend/src/routes/admin.route.ts`. Add the 6 new handler names to the existing controller import (extend the destructured import):

```typescript
import {
  // ... keep all existing imports ...
  assignAdminDispatchOrderHandler,
  // Store management
  getAdminStoresHandler,
  getAdminStoreDetailHandler,
  createStoreHandler,
  updateStoreHandler,
  deactivateStoreHandler,
  activateStoreHandler,
} from '@/controllers/admin.controller';
```

Then add these routes before `export default adminRoutes;`:

```typescript
// ── Admin: store management ────────────────────────────────────
adminRoutes.get('/stores', authenticate, authorize(Role.ADMIN), getAdminStoresHandler);
adminRoutes.get('/stores/:id', authenticate, authorize(Role.ADMIN), getAdminStoreDetailHandler);
adminRoutes.post('/stores', authenticate, authorize(Role.ADMIN), createStoreHandler);
adminRoutes.put('/stores/:id', authenticate, authorize(Role.ADMIN), updateStoreHandler);
adminRoutes.patch('/stores/:id/deactivate', authenticate, authorize(Role.ADMIN), deactivateStoreHandler);
adminRoutes.patch('/stores/:id/activate', authenticate, authorize(Role.ADMIN), activateStoreHandler);
```

- [ ] **Step 4: Verify backend build**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/admin.controller.ts backend/src/routes/admin.route.ts
git commit -m "feat(store): add admin store CRUD handlers and routes

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Backend — Manager Store Update Handler + Route

**Files:**
- Modify: `backend/src/controllers/manager.controller.ts` — add `updateManagerStoreHandler`
- Modify: `backend/src/routes/manager.route.ts` — add `PUT /manager/store`

**Interfaces:**
- Consumes: `updateStore` from Task 2; `updateStoreSchema` from Task 1; `getRequiredManagerIds` from existing manager controller
- Produces: `updateManagerStoreHandler` — route handler

- [ ] **Step 1: Add import in manager.controller.ts**

After the import from `@/services/manager-dashboard.service` (around line 37), add:

```typescript
import { updateStore } from '@/services/store-management.service';
import { updateStoreSchema } from '@/validators/store.validator';
```

- [ ] **Step 2: Add handler at end of manager.controller.ts**

```typescript
export const updateManagerStoreHandler: RequestHandler = catchErrors(async (req, res) => {
  const { storeId } = getRequiredManagerIds(req);
  const body = updateStoreSchema.parse(req.body);
  const store = await updateStore(storeId.toString(), body);

  res.status(200).json({ success: true, data: store });
});
```

- [ ] **Step 3: Add route and import in manager.route.ts**

Add `updateManagerStoreHandler` to the import block from `@/controllers/manager.controller`:

```typescript
import {
  // ... keep all existing imports ...
  updateManagerSettingsHandler,
  updateManagerStoreHandler,
} from '@/controllers/manager.controller';
```

Then add the route after `router.put('/settings', ...);`:

```typescript
router.put('/store', updateManagerStoreHandler);
```

- [ ] **Step 4: Verify backend build**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/manager.controller.ts backend/src/routes/manager.route.ts
git commit -m "feat(store): add manager store update handler and route

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Frontend — Store Service Extension

**Files:**
- Modify: `frontend/src/services/store.service.ts`
- Modify: `frontend/src/services/manager-dashboard.service.ts`

**Interfaces:**
- Consumes: `apiClient` from `@/lib/api-client`; existing `IStore` interface
- Produces:
  - `AdminStoresParams`, `CreateStorePayload`, `UpdateStorePayload`, `AdminStoresResult` — interfaces
  - `getAdminStores`, `getAdminStoreById`, `createAdminStore`, `updateAdminStore`, `deactivateStore`, `activateStore` — API functions
  - `ManagerStoreInfo` — interface and `updateManagerStoreInfo` — manager service method

- [ ] **Step 1: Add admin store management methods to store.service.ts**

Append after the existing `getStores` export (at end of file):

```typescript
export interface AdminStoresParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}

export interface CreateStorePayload {
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  address: string;
  district: string;
}

export type UpdateStorePayload = Partial<CreateStorePayload>;

export interface AdminStoresResult {
  success: boolean;
  data: IStore[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
  };
}

export const getAdminStores = (params?: AdminStoresParams): Promise<AdminStoresResult> => {
  return API.get('/admin/stores', { params }).then((res: any) => res.data);
};

export const getAdminStoreById = (id: string): Promise<{ success: boolean; data: IStore }> => {
  return API.get(`/admin/stores/${id}`).then((res: any) => res.data);
};

export const createAdminStore = (data: CreateStorePayload): Promise<{ success: boolean; data: IStore; message: string }> => {
  return API.post('/admin/stores', data).then((res: any) => res.data);
};

export const updateAdminStore = (id: string, data: UpdateStorePayload): Promise<{ success: boolean; data: IStore; message: string }> => {
  return API.put(`/admin/stores/${id}`, data).then((res: any) => res.data);
};

export const deactivateStore = (id: string): Promise<{ success: boolean; data: IStore; message: string }> => {
  return API.patch(`/admin/stores/${id}/deactivate`).then((res: any) => res.data);
};

export const activateStore = (id: string): Promise<{ success: boolean; data: IStore; message: string }> => {
  return API.patch(`/admin/stores/${id}/activate`).then((res: any) => res.data);
};
```

- [ ] **Step 2: Add manager store info interface and method to manager-dashboard.service.ts**

After the `ManagerStoreSettings` interface (around line 98), add:

```typescript
export interface ManagerStoreInfo {
  name: string;
  address: string;
  district: string;
}
```

Inside the `ManagerDashboardService` class, after the `updateManagerSettings` method, add:

```typescript
  async updateManagerStoreInfo(
    data: Partial<ManagerStoreInfo>,
  ): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.put('/manager/store', data);
    return response.data;
  }
```

- [ ] **Step 3: Verify TypeScript**

Run: `cd frontend && npx tsc --noEmit`
Expected: No new errors from these files

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/store.service.ts frontend/src/services/manager-dashboard.service.ts
git commit -m "feat(store): add frontend store management API services

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Frontend — Admin Stores Page

**Files:**
- Create: `frontend/src/pages/Admin/Stores/index.tsx`

**Interfaces:**
- Consumes: All store service methods from Task 5; `AdminDrawer` component
- Produces: `AdminStores` — default-exported React component

- [ ] **Step 1: Create the Admin Stores page**

```tsx
import { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { Store, Plus, Pencil, Ban, CheckCircle, Loader2, MapPin, Navigation } from "lucide-react";
import { AdminDrawer } from "@/components/shared/AdminDrawer";
import toast from "react-hot-toast";
import {
  getAdminStores,
  createAdminStore,
  updateAdminStore,
  deactivateStore,
  activateStore,
  type IStore,
  type AdminStoresParams,
  type CreateStorePayload,
  type UpdateStorePayload,
} from "@/services/store.service";

const normalizeStoreStatus = (isActive: boolean): "active" | "inactive" =>
  isActive ? "active" : "inactive";

const getStatusBadge = (status: "active" | "inactive") => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700 border-green-200";
    case "inactive":
      return "bg-gray-100 text-gray-500 border-gray-200";
  }
};

const getStatusLabel = (status: "active" | "inactive") => {
  switch (status) {
    case "active":
      return "Hoạt động";
    case "inactive":
      return "Không HĐ";
  }
};

const EMPTY_FORM: CreateStorePayload = {
  name: "",
  location: { type: "Point", coordinates: [106.6297, 10.8231] },
  address: "",
  district: "",
};

const AdminStores = () => {
  const [stores, setStores] = useState<IStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateStorePayload>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coordsStr, setCoordsStr] = useState("106.6297, 10.8231");

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: AdminStoresParams = { page: 1, limit: 100 };
      if (statusFilter !== "all") {
        params.isActive = statusFilter === "active";
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const res = await getAdminStores(params);
      setStores(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Lỗi tải danh sách cửa hàng:", err);
      setError("Không thể tải danh sách cửa hàng.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const parseCoordinates = (raw: string): [number, number] | null => {
    const parts = raw.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && parts.every((n) => !isNaN(n))) {
      return [parts[0], parts[1]] as [number, number];
    }
    return null;
  };

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setEditingStoreId(null);
    setFormData(EMPTY_FORM);
    setCoordsStr("106.6297, 10.8231");
    setDrawerOpen(true);
  };

  const openEditDrawer = (store: IStore) => {
    setDrawerMode("edit");
    setEditingStoreId(store._id);
    setFormData({
      name: store.name,
      location: store.location,
      address: store.address,
      district: store.district,
    });
    setCoordsStr(`${store.location.coordinates[0]}, ${store.location.coordinates[1]}`);
    setDrawerOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên cửa hàng");
      return;
    }
    if (!formData.address.trim()) {
      toast.error("Vui lòng nhập địa chỉ");
      return;
    }
    if (!formData.district.trim()) {
      toast.error("Vui lòng nhập quận/huyện");
      return;
    }

    const coords = parseCoordinates(coordsStr);
    if (!coords) {
      toast.error("Tọa độ không hợp lệ (định dạng: lng, lat)");
      return;
    }

    const payload: CreateStorePayload = {
      ...formData,
      location: { type: "Point", coordinates: coords },
    };

    setIsSubmitting(true);
    try {
      if (drawerMode === "create") {
        await createAdminStore(payload);
        toast.success("Đã tạo cửa hàng mới");
      } else if (editingStoreId) {
        const updatePayload: UpdateStorePayload = {
          name: payload.name,
          location: payload.location,
          address: payload.address,
          district: payload.district,
        };
        await updateAdminStore(editingStoreId, updatePayload);
        toast.success("Đã cập nhật cửa hàng");
      }
      setDrawerOpen(false);
      fetchStores();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Thao tác thất bại";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (store: IStore) => {
    const action = store.isActive ? "vô hiệu hóa" : "kích hoạt";
    if (!window.confirm(`Bạn có chắc muốn ${action} cửa hàng "${store.name}"?`)) return;

    try {
      if (store.isActive) {
        await deactivateStore(store._id);
        toast.success(`Đã vô hiệu hóa cửa hàng "${store.name}"`);
      } else {
        await activateStore(store._id);
        toast.success(`Đã kích hoạt cửa hàng "${store.name}"`);
      }
      fetchStores();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Thao tác thất bại";
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#1b140d]">
            Quản lý cửa hàng
          </h2>
          <p className="text-[#9a734c] mt-1">
            Tạo, cập nhật và quản lý trạng thái hoạt động của các chi nhánh.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateDrawer}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#ee8c2b] text-white text-sm font-bold rounded-xl hover:bg-[#d87c24] transition-colors shadow-sm"
        >
          <Plus size={18} />
          Thêm cửa hàng
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9a734c] text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên, địa chỉ, quận..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#e7dbcf] rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
          />
        </div>
        <div className="flex border border-[#e7dbcf] rounded-xl overflow-hidden">
          {[
            { id: "all", label: "Tất cả" },
            { id: "active", label: "Hoạt động" },
            { id: "inactive", label: "Không HĐ" },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id as typeof statusFilter)}
              className={clsx(
                "px-4 py-2.5 text-sm font-semibold transition-colors",
                statusFilter === filter.id
                  ? "bg-[#ee8c2b] text-white"
                  : "bg-white text-[#9a734c] hover:bg-[#f3ede7]"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm font-bold text-rose-600">
          {error}
        </div>
      ) : stores.length === 0 ? (
        <div className="rounded-2xl border border-[#e7dbcf] bg-white p-12 text-center">
          <Store className="mx-auto h-12 w-12 text-[#9a734c]/40 mb-4" />
          <p className="text-sm font-bold text-[#9a734c]">Chưa có cửa hàng nào</p>
          <p className="text-xs text-[#9a734c]/70 mt-1">
            Nhấn "Thêm cửa hàng" để tạo chi nhánh mới.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#e7dbcf] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f3ede7]/60 border-b border-[#e7dbcf]">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-[#9a734c]">
                    Tên cửa hàng
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-[#9a734c]">
                    Địa chỉ
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-[#9a734c]">
                    Quận/Huyện
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-[#9a734c]">
                    Trạng thái
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-black uppercase tracking-wider text-[#9a734c]">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7dbcf]/60">
                {stores.map((store) => {
                  const status = normalizeStoreStatus(store.isActive);
                  return (
                    <tr key={store._id} className="hover:bg-[#f3ede7]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                            <Store size={18} />
                          </div>
                          <span className="font-bold text-[#1b140d]">{store.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-[#6b5744]">
                          <MapPin size={14} />
                          <span className="text-sm">{store.address}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#6b5744] text-sm font-medium">
                        {store.district}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={clsx(
                            "inline-flex px-2.5 py-1 rounded-full text-xs font-bold border",
                            getStatusBadge(status)
                          )}
                        >
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditDrawer(store)}
                            className="p-2 text-[#6b5744] hover:text-[#ee8c2b] hover:bg-orange-50 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(store)}
                            className={clsx(
                              "p-2 rounded-lg transition-colors",
                              store.isActive
                                ? "text-red-500 hover:text-red-600 hover:bg-red-50"
                                : "text-green-500 hover:text-green-600 hover:bg-green-50"
                            )}
                            title={store.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                          >
                            {store.isActive ? <Ban size={16} /> : <CheckCircle size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer for Create/Edit */}
      <AdminDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerMode === "create" ? "Thêm cửa hàng mới" : "Chỉnh sửa cửa hàng"}
      >
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#9a734c] mb-2">
              Tên cửa hàng
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-xl border border-[#e7dbcf] px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              placeholder="Nhập tên cửa hàng"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#9a734c] mb-2">
              Địa chỉ
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full rounded-xl border border-[#e7dbcf] px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              placeholder="Số nhà, tên đường"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#9a734c] mb-2">
              Quận/Huyện
            </label>
            <input
              type="text"
              value={formData.district}
              onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))}
              className="w-full rounded-xl border border-[#e7dbcf] px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              placeholder="VD: Quận 1, Quận Bình Thạnh..."
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#9a734c] mb-2">
              Tọa độ (longitude, latitude)
            </label>
            <div className="flex items-center gap-2">
              <Navigation size={16} className="text-[#9a734c] shrink-0" />
              <input
                type="text"
                value={coordsStr}
                onChange={(e) => setCoordsStr(e.target.value)}
                className="flex-1 rounded-xl border border-[#e7dbcf] px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                placeholder="106.6297, 10.8231"
              />
            </div>
            <p className="mt-1 text-xs text-[#9a734c]/70">
              Định dạng: kinh độ, vĩ độ (VD: 106.6297, 10.8231 cho TP.HCM)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="flex-1 px-4 py-3 border border-[#e7dbcf] text-[#1b140d] font-bold rounded-xl hover:bg-[#f3ede7] transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void handleFormSubmit()}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-[#ee8c2b] text-white font-bold rounded-xl hover:bg-[#d87c24] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : drawerMode === "create" ? (
                <Plus size={18} />
              ) : (
                <Pencil size={18} />
              )}
              {isSubmitting
                ? "Đang xử lý..."
                : drawerMode === "create"
                ? "Tạo cửa hàng"
                : "Cập nhật"}
            </button>
          </div>
        </div>
      </AdminDrawer>
    </div>
  );
};

export default AdminStores;
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd frontend && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Admin/Stores/index.tsx
git commit -m "feat(store): add Admin Stores page with CRUD

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Frontend — Sidebar Navigation + Route

**Files:**
- Modify: `frontend/src/components/layout/AdminLayout.tsx` — sidebar entry
- Modify: `frontend/src/App.tsx` — route + import

**Interfaces:**
- Consumes: `AdminStores` component from Task 6
- Produces: Sidebar navigation item + route registration

- [ ] **Step 1: Add sidebar navigation item in AdminLayout.tsx**

In the `NAV_ITEMS` array, find:
```typescript
    subItems: [
      { label: "Cấu hình chung", href: "/admin/settings" },
    ],
```
Change to:
```typescript
    subItems: [
      { label: "Cấu hình chung", href: "/admin/settings" },
      { label: "Quản lý cửa hàng", href: "/admin/stores" },
    ],
```

- [ ] **Step 2: Add import and route in App.tsx**

Add import near other Admin imports:
```typescript
import AdminStores from "./pages/Admin/Stores";
```

Add route after the settings route:
```tsx
              <Route path="stores" element={<AdminStores />} />
```

- [ ] **Step 3: Verify TypeScript**

Run: `cd frontend && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/AdminLayout.tsx frontend/src/App.tsx
git commit -m "feat(store): add stores nav entry and route for admin

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Frontend — Manager Settings Store Info Section

**Files:**
- Modify: `frontend/src/pages/Manager/Settings/index.tsx`

**Interfaces:**
- Consumes: `managerDashboardService.updateManagerStoreInfo()` from Task 5; `useAuth` hook; `getAdminStoreById` from store service
- Produces: Store info form section in Manager Settings page

- [ ] **Step 1: Update ManagerSettings with store info imports and state**

Change the service import line to:
```typescript
import managerDashboardService, { type ManagerStoreSettings, type ManagerStoreInfo } from "@/services/manager-dashboard.service";
import { getAdminStoreById } from "@/services/store.service";
import { useAuth } from "@/hooks/useAuth";
```

Add store info state after the `saving` state:
```typescript
  const { storeId } = useAuth();
  const [storeInfo, setStoreInfo] = useState<ManagerStoreInfo | null>(null);
  const [savingStoreInfo, setSavingStoreInfo] = useState(false);
```

- [ ] **Step 2: Load store info in useEffect**

Update the existing `useEffect` to also fetch store core info. Change:

```typescript
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await managerDashboardService.getManagerSettings();
        setSettings(response.data);
      } catch (error) {
        console.error("Failed to load manager settings:", error);
        toast.error("Không tải được cài đặt chi nhánh");
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);
```

To:

```typescript
  const { storeId } = useAuth();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const [settingsRes] = await Promise.all([
          managerDashboardService.getManagerSettings(),
        ]);
        setSettings(settingsRes.data);

        if (storeId) {
          try {
            const storeRes = await getAdminStoreById(storeId);
            if (storeRes?.success && storeRes.data) {
              setStoreInfo({
                name: storeRes.data.name,
                address: storeRes.data.address,
                district: storeRes.data.district,
              });
            }
          } catch {
            // Non-blocking
          }
        }
      } catch (error) {
        console.error("Failed to load manager settings:", error);
        toast.error("Không tải được cài đặt chi nhánh");
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, [storeId]);
```

Note: Move `const { storeId } = useAuth();` outside the useEffect, as defined in Step 1.

- [ ] **Step 3: Add saveStoreInfo handler**

Add after the existing `saveSettings` function:
```typescript
  const saveStoreInfo = async () => {
    if (!storeInfo) return;
    setSavingStoreInfo(true);
    const toastId = toast.loading("Đang lưu thông tin cửa hàng...");
    try {
      await managerDashboardService.updateManagerStoreInfo({
        name: storeInfo.name,
        address: storeInfo.address,
        district: storeInfo.district,
      });
      toast.success("Đã lưu thông tin cửa hàng", { id: toastId });
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Không lưu được thông tin cửa hàng";
      toast.error(msg, { id: toastId });
    } finally {
      setSavingStoreInfo(false);
    }
  };
```

- [ ] **Step 4: Add store info section in JSX**

After the closing `</div>` of the grid containing openHours + status (around line 111), add:
```tsx
      {storeInfo && (
        <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-slate-950">
            <Store className="h-5 w-5 text-orange-500" />
            Thông tin cửa hàng
          </h2>
          <p className="mb-5 text-xs font-semibold text-slate-400">Cập nhật tên, địa chỉ và quận/huyện của chi nhánh.</p>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Tên cửa hàng</span>
              <input
                type="text"
                value={storeInfo.name}
                onChange={(e) => setStoreInfo((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-orange-400"
                placeholder="Tên cửa hàng"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Địa chỉ</span>
              <input
                type="text"
                value={storeInfo.address}
                onChange={(e) => setStoreInfo((prev) => prev ? { ...prev, address: e.target.value } : prev)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-orange-400"
                placeholder="Số nhà, tên đường"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Quận/Huyện</span>
              <input
                type="text"
                value={storeInfo.district}
                onChange={(e) => setStoreInfo((prev) => prev ? { ...prev, district: e.target.value } : prev)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-orange-400"
                placeholder="Quận/Huyện"
              />
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              disabled={savingStoreInfo}
              onClick={() => void saveStoreInfo()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 text-xs font-black text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-60"
            >
              {savingStoreInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingStoreInfo ? "Đang lưu..." : "Lưu thông tin"}
            </button>
          </div>
        </section>
      )}
```

Note: `Store`, `Save`, and `Loader2` icons are already imported. No new icon imports needed.

- [ ] **Step 5: Verify TypeScript**

Run: `cd frontend && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Manager/Settings/index.tsx
git commit -m "feat(store): add store info section to Manager Settings

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Verification — Build Check

**Files:** (all previously created/modified)

- [ ] **Step 1: Verify backend TypeScript**

Run: `cd backend && npx tsc --noEmit`
Expected: PASS (no errors)

- [ ] **Step 2: Verify frontend TypeScript**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS (no new errors)

- [ ] **Step 3: Report results**

Backend build: pass/fail
Frontend TypeScript: pass/fail

---

## File Change Summary

| File | Action |
|------|--------|
| `backend/src/validators/store.validator.ts` | **Created** |
| `backend/src/services/store-management.service.ts` | **Created** |
| `frontend/src/pages/Admin/Stores/index.tsx` | **Created** |
| `backend/src/controllers/admin.controller.ts` | Modified — 6 new handlers |
| `backend/src/routes/admin.route.ts` | Modified — 6 new routes |
| `backend/src/controllers/manager.controller.ts` | Modified — 1 new handler |
| `backend/src/routes/manager.route.ts` | Modified — 1 new route |
| `frontend/src/services/store.service.ts` | Modified — 6 new API functions |
| `frontend/src/services/manager-dashboard.service.ts` | Modified — 1 new method |
| `frontend/src/components/layout/AdminLayout.tsx` | Modified — 1 sidebar entry |
| `frontend/src/App.tsx` | Modified — 1 route + import |
| `frontend/src/pages/Manager/Settings/index.tsx` | Modified — store info section |
