# Hướng dẫn sử dụng Husky (Local Git Hooks)

Tài liệu này hướng dẫn cách cấu hình, hoạt động và xử lý sự cố liên quan đến **Husky Git Hooks** trong dự án Chain Restaurant Platform.

---

## 1. Giới thiệu về Husky

**Husky** là công cụ giúp tự động hóa việc chạy các đoạn mã kiểm tra (Git Hooks) ngay trên máy cục bộ của lập trình viên trước khi thực hiện các thao tác Git (như `commit`, `push`). 

Mục tiêu chính trong dự án của chúng ta là chặn việc đẩy code lỗi lên repository chung:
* Đảm bảo không có lỗi cú pháp (**ESLint/TypeScript compiler**).
* Đảm bảo toàn bộ ứng dụng (cả **Frontend** và **Backend**) đều có thể **build thành công**.

---

## 2. Cách Husky Hoạt Động Trong Dự Án

Chúng ta đang cấu hình hook **`pre-push`** (chạy ngay khi gõ lệnh `git push` và trước khi code thực sự được tải lên GitHub).

Khi bạn chạy lệnh `git push`, Husky sẽ tự động thực hiện các câu lệnh sau từ thư mục gốc:

```bash
pnpm lint:all   # Quét lỗi linter cho cả frontend và backend
pnpm build:all  # Tiến hành compile kiểm tra lỗi build cho cả FE và BE
```

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
