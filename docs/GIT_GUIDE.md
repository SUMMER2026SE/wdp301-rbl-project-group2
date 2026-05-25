# Hướng Dẫn Git Workflow Chuẩn Dự Án

Tài liệu này tổng hợp cấu hình tối ưu và quy trình làm việc (workflow) chuẩn với Git cho các thành viên trong dự án để hạn chế tối đa xung đột (conflict) và giữ lịch sử commit sạch sẽ.

---

## 1. Cấu Hình Tối Ưu Ban Đầu (Chỉ cần chạy 1 lần)

Chạy các lệnh cấu hình toàn cục (global) dưới đây trên terminal để giúp thao tác đẩy/kéo code nhanh và an toàn hơn:

### A. Chỉ cho phép Fast-Forward khi pull (Tránh Merge Commit rác)
```bash
git config --global pull.ff only
```
*   **Tác dụng:** Khi gõ `git pull`, Git sẽ chỉ cập nhật nếu nhánh local của bạn hoàn toàn sạch. Nó sẽ **không tự động tạo Merge Commit** hay mở cửa sổ Vim để viết tin nhắn gộp nữa. Nếu bị lệch commit, lệnh pull sẽ dừng lại cảnh báo để bạn xử lý thủ công (reset hoặc rebase).

### B. Tự động thiết lập đẩy code lên nhánh cùng tên
```bash
git config --global push.default current
```
*   **Tác dụng:** Giúp bạn có thể thoải mái gõ lệnh ngắn gọn `git push` để đẩy code lên nhánh cùng tên trên GitHub mà không cần gõ tên nhánh dài dòng.

### C. Thiết lập liên kết nhánh chính local và remote
Đứng ở nhánh `develop` local và chạy lệnh:
```bash
git branch --set-upstream-to=origin/develop develop
```
*   **Tác dụng:** Liên kết nhánh `develop` local với remote. Lần sau ở `develop` bạn chỉ cần gõ `git pull` để lấy code mới nhất.

---

## 2. Quy Trình Làm Việc Hằng Ngày (Daily Workflow)

Khi được giao một task/issue mới (ví dụ: làm tính năng có mã Issue `#123`):

### Bước 1: Cập nhật `develop` local mới nhất
Trước khi bắt đầu code tính năng mới, hãy lấy code mới nhất từ dự án:
```bash
git checkout develop
git pull
```

### Bước 2: Tạo nhánh phụ cho tính năng
Tạo một nhánh con tách ra từ nhánh `develop` sạch:
```bash
# Đặt tên nhánh theo cấu trúc: [loại-nhánh]/[issue-id]-[mô-tả-ngắn]
git checkout -b feature/123-them-thong-bao
```
*   *Các loại nhánh phổ biến:* `feature/` (tính năng mới), `bugfix/` (sửa lỗi), `refactor/` (tái cấu trúc code), `hotfix/` (sửa lỗi gấp trên sản xuất).

### Bước 3: Code và Commit
Thực hiện code trên nhánh phụ. Khi commit, áp dụng chuẩn **Conventional Commits**:
```bash
git add .
git commit -m "feat: thêm tính năng gửi thông báo đơn hàng cho shipper

- Tích hợp socket để gửi real-time notification
- Cập nhật database lưu trạng thái đã đọc
- Closes #123"
```
*   *Tiêu chuẩn viết Commit:*
    *   `feat:` Tính năng mới.
    *   `fix:` Sửa lỗi.
    *   `refactor:` Tái cấu trúc code nhưng không đổi tính năng.
    *   `docs:` Cập nhật tài liệu.

### Bước 4: Đẩy nhánh phụ lên remote
```bash
git push
```
*(Do đã cấu hình `push.default current` ở mục 1, nhánh mới sẽ tự động tạo và đẩy lên GitHub).*

### Bước 5: Tạo Pull Request (PR) & Gộp nhánh
1. Lên GitHub, mở Pull Request từ nhánh phụ của bạn vào nhánh `develop`.
2. Chờ phê duyệt (approve) từ các thành viên khác.
3. Nhấn **Merge Pull Request** trên giao diện web GitHub.
4. Xóa nhánh phụ trên GitHub sau khi đã merge thành công.

---

## 3. Cách Xử Lý Các Tình Huống Thường Gặp

### A. Đồng bộ nhánh chính local bị lệch (Khi pull báo lỗi không thể fast-forward)
Nếu bạn lỡ commit trực tiếp trên `develop` local làm nó bị lệch với trên GitHub, khi gõ `git pull` sẽ bị lỗi. Cách đưa `develop` local khớp hoàn toàn lại với GitHub:
```bash
git checkout develop
git reset --hard origin/develop
```
> [!CAUTION]
> Lệnh `git reset --hard` sẽ xóa sạch các file chưa commit và các commit local chưa push trên nhánh đó. Hãy chắc chắn bạn đã sao lưu hoặc cất giữ code cẩn thận trước khi chạy.

### B. Cất tạm thời các thay đổi chưa hoàn thành để chuyển nhánh (Stash)
Nếu bạn đang code dở dang trên nhánh `feature/A` nhưng cần quay sang nhánh `develop` gấp để kiểm tra lỗi:
```bash
# Cất code dở dang vào kho tạm
git stash

# Chuyển nhánh thoải mái
git checkout develop

# Sau khi xong việc, quay lại nhánh cũ và lấy code ra tiếp tục làm
git checkout feature/A
git stash pop
```

### C. Khôi phục (Hủy bỏ) file đã chỉnh sửa chưa commit
Nếu bạn chỉnh sửa file lỗi và muốn đưa file đó trở lại trạng thái ban đầu:
```bash
git restore duong/dan/toi/file.ts
```
