## Task: Đồng bộ giá campaign trên toàn bộ product listing

### Vấn đề

Khi 1 sản phẩm đang trong campaign đang chạy (approved + trong thời gian hiệu lực), giá giảm chỉ hiển thị đúng ở `FlashSaleSection` (homepage) nhưng **không đồng bộ** ở:
- `/menu` — danh sách sản phẩm
- Phần "Trending / Best Seller" trên homepage
- Phần "Recommended" trên homepage
- Trang `/food/:id` (product detail)

### Nguyên nhân gốc

`GET /api/products` và `GET /api/products/:id` trả về `price` gốc, không có field `campaignPrice`.

### Yêu cầu implement

#### 1. Backend — `backend/src/services/product.service.ts`

Trước đây (tech-lead đã thử implement nhưng chưa verify chạy được):
- Import `CampaignModel` và `CampaignStatus`
- Thêm helper `applyCampaignPricing(products)`:
  - Query tất cả campaign approved + `startTime <= now <= endTime`
  - Build map `productId → { discount, fixedPrice, type }`
  - Với mỗi product trong danh sách, nếu có rule → thêm field `campaignPrice`
    - `type === 'fixed_price'` → `campaignPrice = fixedPrice`
    - `type === 'discount'` → `campaignPrice = Math.round(price * (1 - discount/100))`
- Gọi `applyCampaignPricing` ở cuối `getAllProducts` (trước khi return) và trong `getProductById`

**Cần verify:** 
- Xem `git diff backend/src/services/product.service.ts` để kiểm tra code tech-lead đã commit hay chưa
- Nếu đã có rồi nhưng sai → sửa lại cho đúng
- Build backend: `cd backend && pnpm build` phải pass

#### 2. Frontend — `frontend/src/types/product.ts`

Thêm `campaignPrice?: number` vào interface `Product`.

#### 3. Frontend — tất cả nơi render `FoodCard` và hiển thị price

Với mỗi product `p`, đổi:
- `price={p.price}` → `price={p.campaignPrice ?? p.price}`
- Thêm `originalPrice={p.campaignPrice != null ? p.price : undefined}`
- `addItem({ price: p.price })` → `addItem({ price: p.campaignPrice ?? p.price })`

Files cần sửa:
- `frontend/src/pages/Menu/index.tsx`
- `frontend/src/pages/Home/components/BestSellerSection.tsx`
- `frontend/src/pages/Home/components/RecommendedSection.tsx`

#### 4. Frontend — `frontend/src/pages/FoodDetail/index.tsx`

- `currentPrice` phải dùng `campaignPrice` làm base thay vì `price`:
  ```ts
  const basePrice = (product?.campaignPrice ?? product?.price) || 0;
  const currentPrice = basePrice + extraPrice;
  ```
- Hiển thị giá gốc gạch ngang khi có `campaignPrice`:
  - Thêm `<span className="text-slate-400 line-through">{product.price.toLocaleString('vi-VN')}đ</span>` bên trên giá hiện tại

### Acceptance criteria

- [ ] `pnpm build` (backend) pass
- [ ] `pnpm lint` (frontend) 0 errors
- [ ] Sản phẩm trong campaign active → hiện `campaignPrice` (màu cam) + giá gốc gạch đỏ ở: homepage BestSeller, homepage Recommended, trang /menu, trang /food/:id
- [ ] Sản phẩm không trong campaign → giá hiển thị như bình thường (không thay đổi)
- [ ] `addItem` trong giỏ hàng dùng `campaignPrice` (không phải `price` gốc)
- [ ] FoodCard hiển thị badge `-%` tự động khi có `originalPrice` (đã có sẵn trong component)
