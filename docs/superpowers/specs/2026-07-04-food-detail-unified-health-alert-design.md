# Food Detail Page — Unified Health Alert & Brand Bold Redesign

**Date:** 2026-07-04
**Status:** Approved
**Branch:** feat/mobile-app
**Scope:** [mobile/lib/features/food_detail/presentation/pages/food_detail_page.dart](mobile/lib/features/food_detail/presentation/pages/food_detail_page.dart)

---

## Problem

Trang food_detail hiện đang hiển thị **2 tab cảnh báo dị ứng** riêng biệt:

1. `_buildHealthRisk()` (dòng 542) — Cảnh báo cá nhân hóa từ API `/products/:id/health-risk`, hiển thị matchedAllergens cụ thể với người dùng
2. `_buildAllergenWarning()` (dòng 543-548) — Hiển thị toàn bộ `allergenTags` tĩnh của sản phẩm

Khi người dùng có health risk, cả 2 tab cùng hiển thị gây trùng lặp và rối mắt.

Ngoài ra, layout các section chưa tối ưu — cảnh báo sức khỏe nên được ưu tiên hiển thị sớm hơn, và brand identity cần được làm nổi bật hơn.

---

## Solution

### 1. Unified Health Alert (fix bug 2 tab)

Gộp `_buildHealthRisk()` và `_buildAllergenWarning()` thành **1 widget duy nhất** `_buildUnifiedHealthAlert()`.

**Logic hiển thị:**

```
Nếu healthRisk có level = "warning" | "danger"
  → Hiển thị cảnh báo cá nhân hóa (có matchedAllergens)
Nếu KHÔNG có healthRisk nhưng sản phẩm có allergenTags
  → Hiển thị lưu ý dị ứng chung (allergenTags tĩnh)
Nếu không có cả 2
  → Ẩn hoàn toàn (SizedBox.shrink)
```

**Xóa:** `_buildAllergenWarning()` — không còn dùng riêng nữa.

### 2. Visual thiết kế alert (nhẹ nhàng, không đậm màu)

Thiết kế dùng **viền trái accent** thay vì viền full box, màu pastel nhẹ.

**Trạng thái "danger" — món không phù hợp:**

- Nền: `Colors.red.shade50`
- Viền trái 3px: `Colors.red.shade300`
- Icon: `Icons.shield_outlined`, màu `Colors.red.shade400`, size 20
- Title: "Món này không phù hợp với hồ sơ sức khỏe của bạn", 13px semi-bold, `Colors.red.shade700`
- Body: "Chứa: {matchedAllergens} — bạn đã khai báo dị ứng với các thành phần này", 12px, `Colors.grey.shade600`

**Trạng thái "warning" — có thể chứa dị ứng (cá nhân hóa):**

- Nền: `Colors.orange.shade50`
- Viền trái 3px: `Colors.orange.shade300`
- Icon: `Icons.warning_amber_rounded`, màu `Colors.orange.shade400`, size 20
- Title: "Cảnh báo dị ứng", 13px semi-bold, `Colors.orange.shade700`
- Body: "Món này có thể chứa: {matchedAllergens}. Vui lòng cân nhắc trước khi đặt.", 12px, `Colors.grey.shade600`

**Trạng thái "allergenTags chung" — không có health risk cá nhân:**

- Nền: `Colors.orange.shade50`
- Viền trái 3px: `Colors.orange.shade200`
- Icon: `Icons.info_outline`, màu `Colors.orange.shade300`, size 20
- Title: "Lưu ý dị ứng", 13px semi-bold, `Colors.grey.shade700`
- Body: "Món này có chứa: {allergenTags}. Kiểm tra kỹ nếu bạn có tiền sử dị ứng.", 12px, `Colors.grey.shade600`

### 3. Layout section order mới

```
1. Ảnh Hero (SliverAppBar, giữ nguyên)
2. Product Info (tên, giá, rating, discount)
3. 🆕 Unified Health Alert (đẩy lên đây, ngay sau product info)
4. NutriAI™ Card (chỉ hiện nếu an toàn, tức healthRisk level = safe hoặc null)
5. Mô tả món
6. Nguyên liệu
7. Variations (nếu có)
8. Đánh giá
9. Món tương tự
```

### 4. Brand enhancements (nhẹ nhàng)

| Thành phần | Hiện tại | Mới |
|---|---|---|
| Hero overlay | Không có | Gradient cam nhạt bottom-to-top trên ảnh |
| Section header icons | Màu xám/xanh lá | Màu cam `AppColors.primary` |
| Mô tả món - viền trái | Xanh lá (primary) | Cam `AppColors.primary` (giữ nguyên, đã đúng) |
| Nguyên liệu tags | Viền cam 10%, nền cam 5% | Viền cam 15%, nền cam 8% |
| Bottom bar shadow | Shadow xám | Shadow + viền trên `Colors.orange.shade100` 0.5px |
| Nút "Mua ngay" | Solid cam | Giữ nguyên (đã đúng brand) |

**Không thay đổi:**
- SliverAppBar, ảnh, back button
- Shimmer loading
- Error widget
- Reviews section
- Similar products section
- Bottom bar layout tổng thể
- Variations UI

---

## Code Changes Summary

**File:** `mobile/lib/features/food_detail/presentation/pages/food_detail_page.dart`

1. **Giữ nguyên state:** `_healthRisk` vẫn được load từ API health-risk
2. **Sửa `_loadHealthRisk()`:** Bỏ filter `level == 'warning' || level == 'danger'` — luôn lưu kết quả để biết khi nào an toàn (dùng cho NutriAI card)
3. **Thêm `_buildUnifiedHealthAlert()`:** Widget mới thay thế cả `_buildHealthRisk()` và `_buildAllergenWarning()`, với logic 3 trạng thái như trên
4. **Sửa `_buildAICard()`:** Chỉ hiện khi `_healthRisk == null || _healthRisk!['level'] == 'safe'`
5. **Sửa `_buildContent()`:** Reorder các section, thay `_buildHealthRisk()` + `_buildAllergenWarning()` bằng `_buildUnifiedHealthAlert()`
6. **Xóa `_buildAllergenWarning()`:** Không còn cần thiết
7. **Xóa `_buildHealthRisk()` cũ:** Thay bằng widget mới
8. **Tinh chỉnh brand:** Hero gradient overlay, màu icon section headers, border bottom bar
