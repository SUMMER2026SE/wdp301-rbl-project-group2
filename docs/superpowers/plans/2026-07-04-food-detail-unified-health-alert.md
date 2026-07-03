# Food Detail Page — Unified Health Alert & Brand Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gộp 2 tab cảnh báo dị ứng thành 1 unified health alert, reorder layout, và tinh chỉnh brand identity trên trang food_detail.

**Architecture:** Single-file refactor trong `food_detail_page.dart`. Mọi thay đổi đều nằm trong StatefulWidget hiện tại. Không tạo file mới, không thay đổi data flow hay API calls.

**Tech Stack:** Flutter/Dart, `cached_network_image`, `shimmer`, `go_router`

## Global Constraints

- **File duy nhất:** `mobile/lib/features/food_detail/presentation/pages/food_detail_page.dart`
- Không thay đổi API calls, state management, hay routing
- Giữ nguyên shimmer loading, error widget, reviews, similar products, variations UI
- Màu sắc: dùng `Colors.red.shade*` và `Colors.orange.shade*` cho alert, `AppColors.primary` cho brand
- Alert visual: viền trái accent 3px, không viền full box, nền pastel nhẹ

---

### Task 1: Sửa `_loadHealthRisk()` — luôn lưu kết quả health risk

**Files:**
- Modify: `mobile/lib/features/food_detail/presentation/pages/food_detail_page.dart:153-179`

**Interfaces:**
- Produces: `_healthRisk` giờ có thể là `null` (chưa load/lỗi/404), `{'level': 'safe', ...}` (an toàn), hoặc `{'level': 'warning'|'danger', 'matchedAllergens': [...]}` (có rủi ro)

- [ ] **Step 1: Bỏ filter `level == 'warning' || level == 'danger'`**

Thay dòng 165-171:
```dart
      if (riskData != null) {
        final level = riskData['level'] as String?;
        if (level == 'warning' || level == 'danger') {
          if (mounted) {
            setState(() => _healthRisk = riskData);
          }
        }
      }
```

Thành:
```dart
      if (riskData != null) {
        if (mounted) {
          setState(() => _healthRisk = riskData);
        }
      }
```

- [ ] **Step 2: Verify code compiles**

Chạy: `cd mobile && flutter analyze lib/features/food_detail/presentation/pages/food_detail_page.dart`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/lib/features/food_detail/presentation/pages/food_detail_page.dart
git commit -m "fix: always store health risk result, not just warning/danger"
```

---

### Task 2: Tạo `_buildUnifiedHealthAlert()` — widget gộp 3 trạng thái

**Files:**
- Modify: `mobile/lib/features/food_detail/presentation/pages/food_detail_page.dart`

**Interfaces:**
- Consumes: `_healthRisk` (Map<String, dynamic>?), `_product?['allergenTags']` (List?)
- Produces: Widget hiển thị 1 trong 3 trạng thái hoặc `SizedBox.shrink()`

- [ ] **Step 1: Thêm method `_buildUnifiedHealthAlert()` vào class**

Chèn vào trước `_buildAICard()` (trước dòng 882):

```dart
  Widget _buildUnifiedHealthAlert() {
    final riskLevel = _healthRisk?['level'] as String?;
    final matchedAllergens =
        _healthRisk?['matchedAllergens'] as List<dynamic>? ?? [];
    final allergenTags =
        (_product?['allergenTags'] as List<dynamic>?)?.cast<String>() ?? [];

    // State 1: Personalized health risk (warning or danger)
    if (_healthRisk != null &&
        (riskLevel == 'warning' || riskLevel == 'danger')) {
      final isDanger = riskLevel == 'danger';
      final bgColor = isDanger ? Colors.red.shade50 : Colors.orange.shade50;
      final accentColor =
          isDanger ? Colors.red.shade300 : Colors.orange.shade300;
      final iconColor =
          isDanger ? Colors.red.shade400 : Colors.orange.shade400;
      final titleColor =
          isDanger ? Colors.red.shade700 : Colors.orange.shade700;
      final icon =
          isDanger ? Icons.shield_outlined : Icons.warning_amber_rounded;
      final title = isDanger
          ? 'Món này không phù hợp với hồ sơ sức khỏe của bạn'
          : 'Cảnh báo dị ứng';
      final body = isDanger
          ? 'Chứa: ${matchedAllergens.join(", ")} — bạn đã khai báo dị ứng với các thành phần này'
          : 'Món này có thể chứa: ${matchedAllergens.join(", ")}. Vui lòng cân nhắc trước khi đặt.';

      return Container(
        margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
          border: Border(
            left: BorderSide(color: accentColor!, width: 3),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: iconColor, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      color: titleColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    body,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // State 2: General allergen tags (no personalized health risk)
    if (allergenTags.isNotEmpty) {
      return Container(
        margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.orange.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border(
            left: BorderSide(color: Colors.orange.shade200!, width: 3),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.info_outline, color: Colors.orange.shade300, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Lưu ý dị ứng',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      color: Colors.grey.shade700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Món này có chứa: ${allergenTags.join(", ")}. Kiểm tra kỹ nếu bạn có tiền sử dị ứng.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // State 3: Nothing to show
    return const SizedBox.shrink();
  }
```

- [ ] **Step 2: Verify code compiles**

Chạy: `cd mobile && flutter analyze lib/features/food_detail/presentation/pages/food_detail_page.dart`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/lib/features/food_detail/presentation/pages/food_detail_page.dart
git commit -m "feat: add unified health alert widget with 3 states"
```

---

### Task 3: Reorder layout + dùng unified alert, bỏ widget cũ

**Files:**
- Modify: `mobile/lib/features/food_detail/presentation/pages/food_detail_page.dart`

**Interfaces:**
- Consumes: `_buildUnifiedHealthAlert()` (Task 2), `_buildAICard()`
- Produces: Layout mới trong `_buildContent()`

- [ ] **Step 1: Đổi `_buildContent()` — reorder sections**

Thay toàn bộ phần `children` trong Column của SliverToBoxAdapter (dòng 536-572) thành:

```dart
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                  child: _buildProductInfo(),
                ),
                _buildUnifiedHealthAlert(),
                _buildAICard(),
                if (_product?['description'] != null &&
                    (_product!['description'] as String).isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                    child: _buildDescription(),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: _buildIngredientsSection(),
                ),
                if (_variations.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                    child: _buildVariations(),
                  ),

                // Reviews section
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
                  child: _buildReviewsSection(),
                ),

                _buildSimilarProductsSection(),
              ],
```

Khác biệt so với cũ:
- `_buildAICard()` và `_buildHealthRisk()` → thay bằng `_buildUnifiedHealthAlert()` rồi `_buildAICard()`
- Xóa block `if (_product?['allergenTags'] ...` và `_buildAllergenWarning()` cũ
- Giữ nguyên các section còn lại

- [ ] **Step 2: Sửa `_buildAICard()` — chỉ hiện khi an toàn**

Thay dòng 888-889:
```dart
    final riskLevel = _healthRisk?['level'] as String? ?? 'safe';
    if (riskLevel != 'safe') return const SizedBox.shrink();
```

Thành:
```dart
    final riskLevel = _healthRisk?['level'] as String?;
    if (riskLevel == 'warning' || riskLevel == 'danger') {
      return const SizedBox.shrink();
    }
```

- [ ] **Step 3: Verify code compiles**

Chạy: `cd mobile && flutter analyze lib/features/food_detail/presentation/pages/food_detail_page.dart`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add mobile/lib/features/food_detail/presentation/pages/food_detail_page.dart
git commit -m "feat: reorder layout with unified health alert, fix NutriAI card visibility"
```

---

### Task 4: Xóa `_buildHealthRisk()` và `_buildAllergenWarning()` cũ

**Files:**
- Modify: `mobile/lib/features/food_detail/presentation/pages/food_detail_page.dart`

- [ ] **Step 1: Xóa `_buildHealthRisk()` cũ**

Xóa toàn bộ method `_buildHealthRisk()` (dòng 181-236).

- [ ] **Step 2: Xóa `_buildAllergenWarning()`**

Xóa toàn bộ method `_buildAllergenWarning()` (dòng 1044-1081).

- [ ] **Step 3: Verify code compiles**

Chạy: `cd mobile && flutter analyze lib/features/food_detail/presentation/pages/food_detail_page.dart`
Expected: No errors (không còn reference đến 2 method đã xóa).

- [ ] **Step 4: Commit**

```bash
git add mobile/lib/features/food_detail/presentation/pages/food_detail_page.dart
git commit -m "refactor: remove old _buildHealthRisk and _buildAllergenWarning methods"
```

---

### Task 5: Brand enhancements — hero gradient, section icons, bottom bar, ingredient tags

**Files:**
- Modify: `mobile/lib/features/food_detail/presentation/pages/food_detail_page.dart`

- [ ] **Step 1: Thêm gradient overlay lên ảnh hero**

Trong `_buildContent()`, sửa `flexibleSpace` của SliverAppBar (dòng 504-524). Thay Stack background từ chỉ có ảnh thành ảnh + gradient overlay:

```dart
          flexibleSpace: FlexibleSpaceBar(
            background: Stack(
              fit: StackFit.expand,
              children: [
                _buildProductImage(),
                // Gradient overlay for brand feel
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 80,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          AppColors.primary.withValues(alpha: 0.15),
                        ],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: MediaQuery.of(context).padding.top + 8,
                  left: 8,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.9),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back_rounded),
                      onPressed: () => context.pop(),
                    ),
                  ),
                ),
              ],
            ),
          ),
```

- [ ] **Step 2: Tăng độ đậm nhẹ cho ingredient tags**

Trong `_buildIngredientsSection()`, sửa container của mỗi ingredient tag. Thay `alpha: 0.05` → `alpha: 0.08` và `alpha: 0.1` → `alpha: 0.15`:

```dart
              return Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.15),
                  ),
                ),
```

- [ ] **Step 3: Thêm viền cam nhạt trên bottom bar**

Trong `_buildBottomBar()`, thêm border trên:

```dart
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: Colors.orange.shade100, width: 0.5),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
```

- [ ] **Step 4: Verify code compiles**

Chạy: `cd mobile && flutter analyze lib/features/food_detail/presentation/pages/food_detail_page.dart`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/features/food_detail/presentation/pages/food_detail_page.dart
git commit -m "feat: brand enhancements — hero gradient, ingredient tag opacity, bottom bar border"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full flutter analyze**

```bash
cd mobile && flutter analyze
```
Expected: No errors.

- [ ] **Step 2: Manual visual QA checklist**

Build và chạy app, kiểm tra:

1. **Món có health risk (danger):** Vào món mà user bị dị ứng → chỉ hiện 1 alert đỏ nhạt, viền trái, tiêu đề "Món này không phù hợp với hồ sơ sức khỏe của bạn"
2. **Món có health risk (warning):** Vào món có matchedAllergens → chỉ hiện 1 alert cam nhạt, viền trái, tiêu đề "Cảnh báo dị ứng"
3. **Món KHÔNG có health risk nhưng có allergenTags:** Vào món có allergenTags nhưng user không dị ứng → hiện alert "Lưu ý dị ứng" nhẹ
4. **Món KHÔNG có gì:** Vào món không có allergenTags và user không dị ứng → không hiện alert nào
5. **NutriAI card:** Chỉ hiện khi không có health risk danger/warning
6. **Layout order:** Alert nằm ngay sau product info, trước NutriAI card
7. **Hero gradient:** Có gradient cam nhạt bottom-to-top trên ảnh
8. **Bottom bar:** Có viền cam nhạt phía trên
9. **Ingredient tags:** Màu nền cam đậm hơn chút (8% thay vì 5%)
