# Checkout Store Availability Flow

## Mục tiêu

Tại checkout, khi người dùng chọn địa chỉ giao hàng, hệ thống gợi ý chi nhánh gần hơn và kiểm tra tình trạng món trong giỏ hàng theo chi nhánh được chọn.

Flow này phải đảm bảo:

- Chi nhánh được gợi ý theo khoảng cách, nhưng chi nhánh đang chọn luôn hiện lên đầu.
- Việc kiểm tra món theo chi nhánh diễn ra ngầm, không hiện loading message trong từng card chi nhánh.
- Món hết tại chi nhánh mới vẫn hiện trong khối tổng cộng, nhưng bị grayscale và không được tính tiền.
- Người dùng vẫn có thể đặt hàng nếu còn ít nhất một món khả dụng.
- Đơn hàng gửi lên backend chỉ gồm các món khả dụng.
- Backend vẫn là nguồn sự thật cho giá tiền, tình trạng món, phí giao hàng và tổng thanh toán.

## Định nghĩa

| Khái niệm           | Mô tả                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Chi nhánh đang chọn | Chi nhánh hiện tại được gán cho checkout/cart.                                                                    |
| Chi nhánh gợi ý     | Danh sách chi nhánh phù hợp với địa chỉ giao hàng, sắp xếp theo rule bên dưới.                                    |
| Món đã chọn         | Món trong giỏ hàng có checkbox đang selected.                                                                     |
| Món khả dụng        | Món đã chọn và còn bán tại chi nhánh checkout hiện tại.                                                           |
| Món không khả dụng  | Món đã chọn nhưng hết/ngừng bán/không tồn tại tại chi nhánh checkout hiện tại.                                    |
| Store override      | Bản ghi product riêng của một chi nhánh, có thể ghi đè trạng thái của product global.                             |
| Product identity    | Khóa ổn định để match món giữa global product và store override, hiện tại là `category + name` sau khi normalize. |

## Flow tổng quan

1. Người dùng vào checkout với các món đã chọn trong giỏ hàng.
2. Người dùng chọn hoặc thay đổi địa chỉ giao hàng.
3. Frontend tính khoảng cách từ địa chỉ đến tất cả chi nhánh đang hoạt động.
4. Modal `Chọn chi nhánh giao hàng` hiện danh sách chi nhánh:
   - Chi nhánh đang chọn luôn nằm trên cùng.
   - Các chi nhánh còn lại sắp xếp từ gần nhất đến xa nhất.
   - Chi nhánh gần nhất được gắn label `Gần nhất`.
   - Chi nhánh đang chọn được gắn label `Đang chọn`.
5. Khi người dùng bấm chọn một chi nhánh:
   - Frontend đổi chi nhánh checkout sang chi nhánh đó.
   - Frontend gọi API lấy danh sách món khả dụng của chi nhánh đó.
   - Frontend match các món trong giỏ hàng bằng product identity.
   - Món nào không khả dụng sẽ được đánh dấu `unavailable`.
   - Không hiện toast và không hiện message loading trong card chi nhánh.
6. Nếu có món không khả dụng, checkout page hiện text dưới khối địa chỉ:

```txt
Một số món ở chi nhánh này đã hết. Nhấn vào sản phẩm để biết sản phẩm nào còn hàng.
```

## Hành vi khối tổng cộng

Khối tổng cộng vẫn hiện tất cả món đã chọn để người dùng biết món nào bị ảnh hưởng khi đổi chi nhánh.

Với món khả dụng:

- Hiện bình thường.
- Giá được tính vào tạm tính và tổng cộng.
- Món được gửi trong payload tạo đơn hàng.

Với món không khả dụng:

- Ảnh và dòng item hiện grayscale.
- Giá có thể hiện để người dùng nhận diện, nhưng không được tính vào tổng thanh toán.
- Có label trạng thái, ví dụ `Không tính tiền`.
- Item có thể click được để mở modal tìm chi nhánh phù hợp.
- Món không được gửi trong payload tạo đơn hàng.

Nút `Đặt hàng`:

- Enable nếu còn ít nhất một món khả dụng.
- Disable nếu tất cả món đã chọn đều không khả dụng.

## Click vào món grayscale

Khi người dùng click vào một món không khả dụng trong khối tổng cộng:

1. Frontend mở modal `Chi nhánh phù hợp`.
2. Modal liệt kê các chi nhánh có đủ tất cả món đang nằm trong khối tổng cộng và còn khả dụng.
3. Danh sách sắp xếp theo khoảng cách, gần nhất trước.
4. Nếu chi nhánh hiện tại nằm trong danh sách, vẫn cần hiện rõ trạng thái hiện tại.
5. Khi người dùng chọn một chi nhánh phù hợp:
   - Checkout đổi sang chi nhánh đó.
   - Các món được sync lại availability.
   - Các item grayscale sẽ trở lại bình thường nếu chi nhánh mới có đủ món.

Nếu không có chi nhánh nào có đủ các món đang chọn, modal hiện empty state ngắn gọn, không remove món tự động.

## Backend invariants

Frontend chỉ hiển thị ước tính và trạng thái UX. Backend phải tiếp tục validate lại trước khi tạo đơn hàng.

Backend cần đảm bảo:

- Không tin `price`, `total`, `amount`, `deliveryFee`, `discount` từ frontend.
- Tự tính lại giá món, tạm tính, phí giao hàng, giảm giá và tổng thanh toán.
- Validate product còn bán tại chi nhánh order.
- Khi cart item đang trỏ đến global product hoặc override của chi nhánh khác, backend phải resolve product hiện hành theo chi nhánh order bằng product identity.
- Nếu product có store override tại chi nhánh order, dùng override đó để tính giá/trạng thái.
- Nếu không có store override, có thể fallback về global product nếu product global khả dụng theo rule hiện tại.
- Payload tạo đơn hàng từ frontend chỉ nên gồm món khả dụng, nhưng backend vẫn phải reject nếu trong lúc tạo đơn món đó đã hết/ngừng bán.

## UX rules

- Không hiện dòng `Đang kiểm tra món trong giỏ hàng theo chi nhánh này...` trong card chi nhánh.
- Không hiện toast khi chi nhánh mới có món hết.
- Chỉ hiện page-level notice dưới khối địa chỉ:

```txt
Một số món ở chi nhánh này đã hết. Nhấn vào sản phẩm để biết sản phẩm nào còn hàng.
```

- Không tự động remove món khi người dùng chỉ mới xem/chọn chi nhánh gợi ý.
- Món không khả dụng chỉ bị loại khỏi tổng tiền và payload đặt hàng.
- Nếu người dùng muốn sửa giỏ hàng, họ có thể quay lại cart để remove/replace.

## Implementation map

Frontend:

- `frontend/src/hooks/useCheckout.ts`
  - Quản lý selected store, address, cart item availability, subtotal payable và order payload.
  - Tính `availableCartItems`, `unavailableCartItems`, `hasUnavailableCartItems`.
  - `handlePlaceOrder` chỉ gửi các món khả dụng.
- `frontend/src/pages/Checkout/index.tsx`
  - Render modal gợi ý chi nhánh.
  - Render warning dưới địa chỉ.
  - Render item grayscale trong khối tổng cộng.
  - Render modal chi nhánh phù hợp khi click item grayscale.
- `frontend/src/pages/ShoppingCart/index.tsx`
  - Sync availability theo chi nhánh hiện tại.
  - Grayscale item hết hàng tại cart.
  - Disable quantity controls cho item hết hàng.
- `frontend/src/store/cartStore.ts`
  - Lưu flag `unavailable` và `unavailableReason` trong cart item local state.
  - Cập nhật availability map sau khi đổi chi nhánh.

Backend:

- `backend/src/services/product.service.ts`
  - Hỗ trợ query product theo `storeId`.
  - Dedupe global product và store override theo product identity.
- `backend/src/services/order.service.ts`
  - Resolve item theo chi nhánh order.
  - Validate availability và tính tiền server-side.
- `backend/src/services/manager-menu.service.ts`
  - Cho phép manager cập nhật trạng thái bán theo chi nhánh bằng store override.
- `backend/src/models/product.model.ts`
  - Product có optional `storeId` để phân biệt global product và override theo chi nhánh.

## Manual QA checklist

1. Chuẩn bị giỏ hàng có 2 món:
   - Món A còn bán tại tất cả chi nhánh.
   - Món B còn bán tại Hải Châu nhưng hết/ngừng bán tại Ngũ Hành Sơn.
2. Vào checkout khi chi nhánh đang chọn là Hải Châu.
3. Chọn địa chỉ giao hàng gần Ngũ Hành Sơn.
4. Modal chi nhánh hiện:
   - Hải Châu ở trên đầu nếu đang chọn.
   - Các chi nhánh còn lại sắp xếp gần đến xa.
   - Ngũ Hành Sơn có label gần nhất nếu gần nhất theo địa chỉ.
5. Chọn Ngũ Hành Sơn.
6. Xác nhận:
   - Không có toast báo hết hàng.
   - Không có dòng loading trong card chi nhánh.
   - Notice hiện dưới khối địa chỉ.
   - Món B grayscale trong khối tổng cộng.
   - Tạm tính và tổng cộng chỉ tính Món A.
   - Nút `Đặt hàng` vẫn enable.
7. Đặt hàng.
8. Xác nhận payload/order chỉ gồm Món A.
9. Quay lại checkout, click Món B grayscale.
10. Xác nhận modal `Chi nhánh phù hợp` hiện các chi nhánh có đủ Món A và Món B.
11. Chọn Hải Châu.
12. Xác nhận Món B không còn grayscale và tổng cộng tính lại cả Món A + Món B.
13. Test trường hợp tất cả món đều hết tại chi nhánh mới:

- Tất cả item grayscale.
- Tổng món thanh toán bằng 0, chỉ phí cần xử lý theo rule hiện tại.
- Nút `Đặt hàng` disabled.

## Non-goals

- Không tự động xóa món khỏi giỏ hàng khi user chỉ mới chọn chi nhánh.
- Không thay đổi order status/payment flow.
