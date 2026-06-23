# Hướng dẫn sử dụng Husky (Local Git Hooks)

Tài liệu này hướng dẫn cách cấu hình, hoạt động và xử lý sự cố liên quan đến **Husky Git Hooks** trong dự án Chain Restaurant Platform.

---

## 1. Giới thiệu về Husky

**Husky** là công cụ giúp tự động hóa việc chạy các đoạn mã kiểm tra (Git Hooks) ngay trên máy cục bộ của lập trình viên trước khi thực hiện các thao tác Git (như `commit`, `push`). 

Mục tiêu chính trong dự án của chúng ta là chặn việc đẩy code lỗi lên repository chung:
* Đảm bảo không có lỗi cú pháp (**ESLint/TypeScript compiler**).
* Đảm bảo toàn bộ ứng dụng (cả **Frontend** và **Backend**) đều có thể **build thành công**.

---

## 2. Cách Husky Hoạt Động Trong Dự Án (Tối ưu hóa thông minh)

Chúng ta đang cấu hình hook **`pre-push`** (chạy ngay khi gõ lệnh `git push` và trước khi code thực sự được tải lên GitHub).

Để tránh tốn thời gian chạy kiểm tra toàn bộ dự án mỗi lần push, Husky được cấu hình chạy thông qua file script thông minh [.husky/pre-push.js](file:///.husky/pre-push.js):

1. **Phát hiện tệp thay đổi:** Script tự động so sánh mã nguồn hiện tại của bạn với nhánh đích (như `develop` hoặc `main`) để tìm ra những tệp tin bạn vừa sửa đổi.
2. **Quyết định chạy kiểm tra cục bộ:**
   * **Chỉ sửa Backend (`backend/`):** Chỉ chạy kiểm tra Backend (`pnpm lint:be` và `pnpm build:be`). Hiển thị thông báo `Frontend skipped` và `AI skipped`.
   * **Chỉ sửa Frontend (`frontend/`):** Chỉ chạy kiểm tra Frontend (`pnpm lint:fe` và `pnpm build:fe`). Hiển thị thông báo `Backend skipped` và `AI skipped`.
   * **Chỉ sửa AI (`ai/`):** Chỉ chạy kiểm tra cú pháp các file Python (`python3 -m compileall -q ai`). Hiển thị thông báo `Backend skipped` và `Frontend skipped`.
   * **Sửa đổi toàn cục (ví dụ `package.json`, cấu hình chung...):** Chạy kiểm tra cả ba phía (Backend, Frontend, và AI) để đảm bảo an toàn tuyệt đối.
3. **Ưu tiên so sánh nhánh thông minh:**
   * Đối với nhánh tính năng thông thường, script so sánh với nhánh phát triển `develop`.
   * Đối với nhánh sửa lỗi nóng (`hotfix/*` hoặc `release/*`), script sẽ ưu tiên so sánh trực tiếp với nhánh sản phẩm `main` để cho ra kết quả thay đổi chính xác nhất.

* **Nếu không có lỗi (xanh):** Code sẽ được push lên GitHub bình thường.
* **Nếu có lỗi (đỏ):** Tiến trình push sẽ bị **chặn đứng** ngay lập tức và in lỗi ra màn hình để bạn sửa.

---

## 3. Hướng dẫn dành cho Thành viên mới (New Member Setup)

Khi một thành viên mới clone dự án này về máy lần đầu, họ **không cần làm thêm bất kỳ thao tác cài đặt nào khác**. 

Chỉ cần đứng ở thư mục gốc và chạy lệnh cài đặt thư viện tiêu chuẩn:
```bash
pnpm install
```
Nhờ có script `"prepare": "husky"` được định nghĩa trong file `package.json` gốc, Husky sẽ tự động được khởi tạo và kích hoạt các file hook ẩn trong thư mục `.git` của họ.

---

## 4. Cách Tự Kiểm Tra Trước Khi Push (Rất khuyên dùng)

Trước khi thực hiện `git push`, bạn nên chủ động tự kiểm tra chất lượng code trên máy của mình bằng cách chạy các lệnh sau ở thư mục gốc:

* **Kiểm tra lỗi Lint (cú pháp):**
  ```bash
  pnpm lint:all
  ```
* **Kiểm tra lỗi Build:**
  ```bash
  pnpm build:all
  ```
* **Chạy thử toàn bộ quy trình pre-push tại local:**
  ```bash
  ./.husky/pre-push
  ```

---

## 5. Xử lý sự cố thường gặp (Troubleshooting)

### Q: Tôi bị chặn khi push vì lỗi Lint hoặc Build?
**Cách xử lý:** 
1. Đọc kỹ thông báo lỗi được hiển thị trên Terminal.
2. Sửa lỗi tại file tương ứng.
3. Chạy lại `pnpm lint:all` hoặc `pnpm build:all` để chắc chắn lỗi đã hết.
4. Tạo commit mới và push lại.

### Q: Lỗi từ file của người khác hoặc lỗi môi trường và tôi cần push gấp? (Không khuyến khích)
Nếu trong trường hợp khẩn cấp, bạn muốn bỏ qua sự kiểm tra của Husky để push code lên trước, bạn có thể thêm cờ `--no-verify` vào cuối câu lệnh push:
```bash
git push --no-verify
```
> [!WARNING]
> **Chú ý:** Việc sử dụng `--no-verify` sẽ bỏ qua kiểm tra tại máy của bạn, nhưng code của bạn vẫn sẽ bị kiểm tra lại một lần nữa trên GitHub CI khi mở Pull Request. Nếu code lỗi, bạn vẫn không thể merge vào nhánh `develop`/`main`.

### Q: Husky không tự chạy khi tôi gõ lệnh git push?
Hãy đảm bảo bạn đã cấp quyền thực thi cho file hook bằng lệnh sau trong thư mục dự án:
```bash
chmod +x .husky/pre-push
```
