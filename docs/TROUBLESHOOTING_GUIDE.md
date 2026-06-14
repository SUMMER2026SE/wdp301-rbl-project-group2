# Hướng Dẫn Kiểm Tra Lỗi Hệ Thống, Tránh Tràn RAM & Cấu Hình Swap Memory

Tài liệu này hướng dẫn chi tiết quy trình chẩn đoán lỗi khi server bị sập đột ngột (crash), các bước nâng cao để tìm ra nguyên nhân ẩn và case study thực tế về lỗi tràn RAM ảo (HugePages) giúp giải phóng ngay lập tức 2.3 GB RAM trên VPS Linux.

---

## Phần 1: Quy Trình Từng Bước Chẩn Đoán Khi Server Bị Sập Đột Ngột

Khi hệ thống gặp lỗi hoặc các dịch vụ dev/prod đột ngột ngưng hoạt động mà không rõ nguyên nhân, hãy thực hiện kiểm tra tuần tự theo các bước dưới đây để tìm ra thủ phạm:

### Bước 1: Kiểm tra trạng thái và Mã thoát của Docker Container
Xem danh sách toàn bộ các container (kể cả các container đã dừng hoặc liên tục restart):
```bash
docker ps -a
```
* **Phân tích cột `STATUS`**:
  * **`Exited (137)`**: Container đã bị hệ thống ép buộc tắt bằng lệnh `SIGKILL`. Đây là dấu hiệu **99% do hệ điều hành cạn kiệt RAM (Out of Memory - OOM)**, kích hoạt cơ chế tự hạ sát tiến trình để cứu hệ thống.
  * **`Exited (1)`**: Lỗi phần mềm (ví dụ: lỗi cú pháp code, thiếu file cấu hình `.env`, lỗi kết nối database, hoặc sai phiên bản node).
  * **`Restarting (137) ...`**: Container bị sập do thiếu RAM nhưng được cấu hình `restart: always` nên Docker liên tục khởi động lại nó trong vòng lặp vô hạn.

### Bước 2: Truy vấn log OOM (Out Of Memory) của hệ thống
Hãy kiểm tra xem kernel của Linux có ghi nhận sự kiện hạ sát tiến trình do tràn RAM hay không:
```bash
sudo dmesg -T | grep -i -E 'oom|kill'
```
* **Ý nghĩa**: Nếu bạn nhìn thấy dòng có dạng `Out of memory: Killed process <PID> (node / python3)...`, điều đó khẳng định chắc chắn 100% server đã bị hết RAM vật lý tại thời điểm đó.

### Bước 3: Kiểm tra dung lượng tài nguyên thực tế của VPS
Chạy lệnh hiển thị thông tin RAM và ổ cứng hiện tại:
* **Bộ nhớ (RAM & Swap)**:
  ```bash
  free -m
  ```
  Hãy kiểm tra cột `available` (RAM khả dụng thực tế). Nếu con số này dưới 300MB, nguy cơ bị crash khi biên dịch mã nguồn hoặc chạy tác vụ nặng là rất cao.
* **Ổ cứng (Disk Space)**:
  ```bash
  df -h
  docker system df
  ```
  Nếu phân vùng chứa thư mục Docker đầy 100%, Docker daemon sẽ bị treo cứng. Chạy lệnh dọn dẹp file rác của Docker nếu cần thiết:
  ```bash
  docker system prune -f
  ```

### Bước 4: Sắp xếp và cộng tổng RAM thực tế của các tiến trình đang chạy
Đôi khi tổng dung lượng RAM báo trong `free -m` (cột `used`) rất cao (ví dụ: 3.2 GB), nhưng khi bạn xem nhanh qua lệnh `top`/`htop` lại không thấy tiến trình nào chiếm quá 200MB. Hãy chạy 2 lệnh kiểm tra nâng cao này:

1. **Liệt kê 15 tiến trình đang ngốn nhiều RAM nhất hệ thống**:
   ```bash
   ps aux --sort=-%mem | head -n 15
   ```
2. **Tính tổng RAM thực tế (RSS) mà TẤT CẢ các tiến trình đang sử dụng**:
   ```bash
   ps aux --sort=-rss | awk '{sum+=$6} END {print sum/1024 " MB"}'
   ```
* **Cách phân tích**: 
  * Nếu tổng RAM của tất cả tiến trình cộng lại (ví dụ: 800MB) nhỏ hơn rất nhiều so với dung lượng RAM báo đang dùng trong `free -m` (ví dụ: 3.2GB), hệ thống của bạn đang bị **Khóa RAM ẩn** ở cấp độ Kernel (xem Phần 3).

### Bước 5: Truy vết xem tiến trình lạ trên Host thuộc Container nào
Khi bạn dùng lệnh `ps aux` hoặc `htop` trên máy chủ VPS, bạn có thể thấy các tiến trình lạ (ví dụ: `tsx ./backend/index.ts` hay `node dist/index.js`) chạy dưới quyền `root` nhưng không rõ nó thuộc dự án nào hoặc container nào.
Để tìm ra container chứa tiến trình đó, hãy lấy **PID** của tiến trình và chạy lệnh:
```bash
cat /proc/<PID_CỦA_TIẾN_TRÌNH>/cgroup
```
* **Cách đọc**: Kết quả trả về sẽ hiển thị đường dẫn cgroup chứa ID container dài 64 ký tự (ví dụ: `docker-e16a3b886984...`). 12 ký tự đầu chính là **Container ID** của container chứa tiến trình đó. Bạn có thể dùng `docker inspect <Container_ID>` để kiểm tra chi tiết.

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

---

## Phần 3: Case Study Thực Tế - Tràn RAM Ẩn Do Cấu Hình HugePages

### 1. Hiện tượng (Symptom)
* Cả hai container `fe-dev` và `be-dev` của dự án liên tục bị tắt đột ngột với mã thoát **`137 (OOM)`**.
* Khi chạy lệnh kiểm tra bộ nhớ `free -m`, hệ thống luôn báo RAM đã bị sử dụng khoảng **`3.2 GB`** (chỉ còn trống khoảng 100MB - 300MB khả dụng).
* Tuy nhiên, khi dùng lệnh cộng dồn tổng dung lượng RAM của toàn bộ tiến trình đang hoạt động (`ps aux --sort=-rss | awk ...`), kết quả chỉ hiển thị khoảng **`800 MB`**.
* Hệ thống xuất hiện khoảng trống bộ nhớ **2.1 GB** bị sử dụng nhưng không thuộc về bất kỳ tiến trình nào hiển thị trên hệ điều hành. Các thao tác xóa cache (`drop_caches`) hoàn toàn không giải phóng được lượng RAM này.

### 2. Chẩn đoán nguyên nhân (Diagnosis)
Chạy lệnh kiểm tra thông tin phân bổ bộ nhớ sâu của Kernel:
```bash
cat /proc/meminfo | grep -E 'HugePages_Total|Unevictable|Mlocked'
```
Kết quả hiển thị:
```txt
HugePages_Total:    1171
Unevictable:       27620 kB
Mlocked:           27620 kB
```
* **Nguyên nhân chính**: Hệ thống đã được cấu hình tĩnh trước đó để đặt chỗ và khóa cứng **1171 HugePages** (trang nhớ siêu lớn). Mặc định mỗi trang HugePage trên hệ thống Linux là **2MB**.
* Tổng dung lượng RAM bị khóa cứng: $1171 \times 2\text{MB} = 2342\text{MB}$ (khoảng **2.34 GB**).
* Lượng RAM này bị cô lập ở cấp độ nhân Kernel và chỉ cho phép các ứng dụng được cấu hình đặc biệt sử dụng. Các tiến trình thông thường như Node.js, Docker... bị chặn quyền truy cập, khiến các container dev bị bóp nghẹt tài nguyên trong không gian RAM 1.6GB còn lại dẫn đến sập liên tục.

### 3. Cách khắc phục triệt để (Resolution)

#### Tác động ngay lập tức (Không cần khởi động lại VPS)
Chạy lệnh thiết lập số lượng HugePages tĩnh về `0` để trả lại toàn bộ 2.34 GB RAM bị khóa về bộ nhớ RAM thường khả dụng:
```bash
sudo sysctl -w vm.nr_hugepages=0
```
*(Ngay sau khi chạy lệnh này, kiểm tra `free -m` sẽ thấy dung lượng RAM khả dụng lập tức tăng thêm ~2.3 GB, mức RAM sử dụng rớt về ~835MB)*.

#### Cấu hình tắt vĩnh viễn (Không bị cấu hình lại khi reboot VPS)
Thêm cấu hình thiết lập HugePages về 0 vào cuối file `/etc/sysctl.conf`:
```bash
echo "vm.nr_hugepages = 0" | sudo tee -a /etc/sysctl.conf
```
Lệnh này đảm bảo rằng mỗi lần máy chủ khởi động lại, hệ điều hành sẽ tự động giải phóng các trang Hugepages về 0, duy trì tối đa bộ nhớ RAM thường khả dụng cho ứng dụng của bạn.
