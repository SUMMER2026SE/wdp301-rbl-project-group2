# Hướng Dẫn Kiểm Tra Lỗi Hệ Thống & Cấu Hình Swap Memory

Tài liệu này hướng dẫn chi tiết quy trình chẩn đoán lỗi khi server bị sập đột ngột (crash) và các bước cấu hình Swap Memory (bộ nhớ ảo) làm phương án dự phòng chống tràn RAM (OOM - Out of Memory) trên VPS Linux.

---

## Phần 1: Quy Trình Kiểm Tra Lỗi Hệ Thống (Troubleshooting)

Khi hệ thống gặp lỗi hoặc các dịch vụ dev/prod đột ngột ngưng hoạt động mà không rõ nguyên nhân, thực hiện kiểm tra theo trình tự sau:

### 1. Kiểm tra trạng thái các Docker Container
Xem danh sách các container đang chạy và đã dừng để kiểm tra mã thoát (Exit Code):
```bash
docker ps -a
```
* **Lưu ý cột `STATUS`:** Nếu container bị dừng, hãy để ý mã thoát của nó:
  * **`Exited (137)`**: Đây là mã lỗi điển hình báo hiệu tiến trình đã bị hệ thống ép buộc tắt bằng lệnh `SIGKILL` (thường 99% là do bị hệ điều hành tắt khi RAM bị cạn kiệt - OOM Killer).
  * **`Exited (1)`**: Lỗi ứng dụng (lỗi code, thiếu biến môi trường, hoặc cấu hình sai).

### 2. Xem logs của ứng dụng
Di chuyển vào thư mục dự án tương ứng (`anngon-dev` hoặc `anngon-prod`) và xem logs của container để phân tích nguyên nhân:
```bash
# Xem log của toàn bộ stack dev/prod kèm thời gian thực
docker compose -f docker-compose.dev.yml logs --tail=100 -f

# Hoặc xem log của một container cụ thể
docker logs <tên_hoặc_id_container>
```

### 3. Kiểm tra tài nguyên của VPS
Thiếu hụt tài nguyên (RAM, ổ cứng) là nguyên nhân hàng đầu khiến dịch vụ bị crash.

#### a. Kiểm tra dung lượng RAM và bộ nhớ ảo Swap
```bash
free -m
```
* **Cột `available`**: RAM vật lý thực sự còn lại cho hệ thống. Nếu con số này quá thấp (dưới 300MB), nguy cơ sập ứng dụng rất cao.
* **Dòng `Swap`**: Nếu `total = 0`, hệ thống chưa có bộ nhớ ảo và sẽ crash ngay khi RAM vật lý bị đầy.

#### b. Kiểm tra dung lượng ổ đĩa (Disk Space)
Nếu phân vùng ổ đĩa chứa Docker bị đầy 100%, Docker daemon sẽ ngưng hoạt động hoặc không thể ghi chép dữ liệu:
```bash
df -h
```
Kiểm tra dung lượng do Docker chiếm dụng:
```bash
docker system df
```
Nếu dung lượng gần đầy, dọn dẹp các tài nguyên dư thừa (container đã tắt, image không sử dụng, mạng không dùng):
```bash
docker system prune -f
```

### 4. Kiểm tra Logs hệ thống phát hiện lỗi OOM (Out Of Memory)
Chạy lệnh sau để truy vấn trực tiếp xem hệ điều hành có kích hoạt cơ chế OOM-Killer để tắt tiến trình của bạn hay không:
```bash
sudo dmesg -T | grep -i -E 'oom|kill'
```
* Nếu có log xuất hiện dạng: `Out of memory: Killed process <PID> (MainThread/node)...`, điều đó xác nhận hệ thống bị thiếu RAM vật lý.

---

## Phần 2: Hướng Dẫn Cấu Hình Swap Memory (Bộ Nhớ Ảo)

Để tránh hiện tượng OOM Killer tắt ứng dụng khi RAM bị quá tải (ví dụ: lúc chạy lệnh build, cài thư viện hoặc lượng truy cập tăng đột biến), hãy thiết lập 4GB Swap làm bộ đệm cứu sinh.

### Các bước cấu hình Swap từng bước:

#### Bước 1: Kiểm tra Swap hiện tại
```bash
sudo swapon --show
```
*(Nếu không hiển thị kết quả nào, nghĩa là hệ thống hiện tại chưa cấu hình Swap).*

#### Bước 2: Tạo tệp Swap có dung lượng 4GB
Tạo nhanh một tập tin dung lượng 4GB tại thư mục gốc của hệ thống `/`:
```bash
sudo fallocate -l 4G /swapfile
```
*(Trường hợp hệ thống báo lỗi không hỗ trợ lệnh `fallocate`, sử dụng lệnh `dd` để tạo thủ công)*:
```bash
sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
```

#### Bước 3: Phân quyền truy cập an toàn
Giới hạn quyền đọc/ghi chỉ cho tài khoản `root` quản trị viên để bảo mật dữ liệu nhạy cảm nằm trong bộ nhớ đệm:
```bash
sudo chmod 600 /swapfile
```

#### Bước 4: Định dạng file thành phân vùng Swap
```bash
sudo mkswap /swapfile
```
*(Kết quả thành công sẽ in ra dòng: `Setting up swapspace version 1, size = 4 GiB...`)*

#### Bước 5: Kích hoạt Swap trên hệ thống
```bash
sudo swapon /swapfile
```

#### Bước 6: Xác nhận hoạt động
Kiểm tra lại xem Swap đã hoạt động hay chưa bằng lệnh:
```bash
free -m
```
*(Nếu dòng `Swap` hiển thị chỉ số `total` khoảng `4096` MB, bạn đã cấu hình thành công).*

#### Bước 7: Thiết lập tự động kích hoạt Swap sau khi reboot VPS
Để cấu hình Swap không bị mất đi mỗi khi VPS khởi động lại:
1. Tạo một bản sao lưu file cấu hình phân vùng hệ thống:
   ```bash
   sudo cp /etc/fstab /etc/fstab.bak
   ```
2. Thêm dòng cấu hình tự động mount swapfile:
   ```bash
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

#### Bước 8: Tối ưu hóa độ nhạy của bộ nhớ ảo (Swappiness)
Mặc định hệ điều hành có độ nhạy Swappiness là `60` (chuyển đổi dữ liệu sang swap khá sớm). Để tối ưu hiệu năng của VPS, chúng ta điều chỉnh swappiness về mức `10`. Mức này giúp hệ thống **ưu tiên sử dụng tối đa RAM vật lý tốc độ cao trước**, chỉ dùng đến ổ đĩa ảo Swap khi RAM thật sự cạn kiệt (dưới 10%).

1. Thiết lập swappiness tạm thời thành `10`:
   ```bash
   sudo sysctl vm.swappiness=10
   ```
2. Cấu hình swappiness vĩnh viễn (lưu lại kể cả sau khi reboot):
   ```bash
   echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
   ```
