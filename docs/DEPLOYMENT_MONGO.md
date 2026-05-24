# Hướng dẫn triển khai Dự án Fullstack (Docker & MongoDB Atlas & Mongoose ODM)

Tài liệu này hướng dẫn chi tiết cách thiết lập, cấu hình và triển khai tự động hóa (CI/CD) hệ thống Fullstack sử dụng Docker, Mongoose ODM, MongoDB Atlas Cloud Database và Nginx SSL trên VPS Linux.

---

## 1. Kiến trúc Hệ thống (Architecture Overview)

Kiến trúc này tách biệt cơ sở dữ liệu (đẩy lên đám mây MongoDB Atlas) nhằm tối ưu hóa 90% tài nguyên cho VPS. Hệ thống được chia thành **2 Database** độc lập trong cùng một Cluster:

1.  **`my_app_local`:** Dành riêng cho môi trường phát triển (Local Development) tại máy cá nhân.
2.  **`my_app_prod`:** Dùng chung cho cả 2 môi trường chạy trên VPS là **Dev** và **Prod**.

```text
  [MÔI TRƯỜNG LOCAL]                  [MÔI TRƯỜNG DEV]                 [MÔI TRƯỜNG PROD]
 +------------------+                 +----------------+               +----------------+
 |  Laptop Cá Nhân  |                 |   VPS Server   |               |   VPS Server   |
 |  - FE & BE       |                 |   - FE & BE    |               |   - FE & BE    |
 +--------+---------+                 +-------+--------+               +-------+--------+
          |                                   |                                |
          | (Kết nối Cloud)                   | (Kết nối Cloud)                | (Kết nối Cloud)
          v                                   +---------------+----------------+
 +--------+---------+                                         |
 |  MONGODB ATLAS   | <---------------------------------------+
 |  (Cloud Cluster) |
 |  - DB: my_app_loc| -> Chứa dữ liệu thử nghiệm nội bộ của Developer
 |  - DB: my_app_prd| -> Dùng chung cho cả Dev VPS và Production VPS (Dữ liệu thực tế)
 +------------------+
```

> [!CAUTION]
> **CẢNH BÁO AN TOÀN QUAN TRỌNG KHI DÙNG CHUNG DB DEV & PROD:**
> Việc môi trường Dev và Prod kết nối chung vào database `my_app_prod` mang lại lợi thế là dữ liệu ở môi trường Dev luôn đồng nhất 100% với Prod (giúp dễ dàng debug lỗi phát sinh trên dữ liệu thực tế).
>
> Tuy nhiên, điều này đi kèm với **rủi ro cực kỳ lớn**:
>
> - Bất kỳ hành động sửa đổi dữ liệu, chạy thử các API ghi/xóa hoặc chạy test tự động (Automated Test) trên server **Dev** sẽ tác động và làm thay đổi trực tiếp dữ liệu **thật của khách hàng** trên Production.
> - **Giải pháp bảo an khuyên dùng:**
>   1. Chỉ cho phép môi trường **Dev** có quyền **Đọc (Read-Only)** đối với các Collection nhạy cảm của Production nếu có thể.
>   2. Nhắc nhở đội ngũ lập trình tuyệt đối không chạy các script test phá hủy (destructive test) trên server Dev.

---

## 2. Cấu trúc Thư mục Dự án

```text
anngon-website/
├── frontend/                # --- MÃ NGUỒN FRONTEND (REACT/VITE) ---
│   ├── src/                 # Code chính (components, pages, hooks...)
│   ├── public/              # Ảnh, logo, favicon...
│   ├── Dockerfile           # File đóng gói Frontend
│   ├── package.json         # Danh sách thư viện
│   └── pnpm-lock.yaml       # File lock của pnpm
│
├── backend/                 # --- MÃ NGUỒN BACKEND (NODE.JS) ---
│   ├── src/                 # Code API (controllers, routes, services...)
│   │   ├── models/          # Định nghĩa Mongoose Schemas & Models (User, Order...)
│   │   ├── controllers/     # Điều phối xử lý logic API
│   │   └── routes/          # Khai báo Endpoint định tuyến
│   ├── Dockerfile           # File đóng gói Backend
│   ├── entrypoint.sh        # Script khởi động an toàn
│   ├── package.json
│   └── pnpm-lock.yaml
│
├── nginx/                   # --- ĐIỀU PHỐI (REVERSE PROXY) ---
│   ├── Dockerfile           # Đóng gói Nginx
│   ├── default.conf         # Cấu hình domain, routing & SSL
│   └── maintenance.html     # Trang bảo trì tự động khi server sập
│
├── docker-compose.dev.yml    # Cấu hình cụm Dev trên VPS
├── docker-compose.prod.yml   # Cấu hình cụm Prod & Shared Services trên VPS
├── docker-compose.yml        # Cấu hình chạy Local Development
├── .dockerignore            # Loại bỏ node_modules, .git khi build
└── .github/workflows/       # Kịch bản CI/CD tự động
    └── deploy-dev.yml       # Tự động lint, build & deploy nhánh develop
```

---

## 3. Cấu hình Dockerfile & Entrypoint (Sử dụng PNPM & Mongoose)

Dưới đây là cấu hình Dockerfile tối ưu hóa dung lượng (Multi-stage build) và tốc độ tải thư viện (sử dụng pnpm cache) của cả 3 thành phần.

### File `backend/Dockerfile`

```dockerfile
# --- Stage 1: Build (Tạo bản dựng) ---
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# --- Stage 2: Run (Chạy ứng dụng tối giản) ---
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER node
ENTRYPOINT ["./entrypoint.sh"]
```

### File `frontend/Dockerfile`

```dockerfile
# --- Stage 1: Build (Biên dịch mã nguồn) ---
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# --- Stage 2: Run (Chạy bản build tĩnh) ---
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# Cài đặt server 'serve' bằng pnpm để đồng nhất
RUN pnpm add -g serve

COPY --from=builder /app/dist ./dist

# Dành cho Next.js (Bỏ comment nếu dùng Next.js)
# COPY --from=builder /app/public ./public
# COPY --from=builder /app/.next ./.next

USER node
CMD ["serve", "-s", "dist", "-p", "3000"]
```

### File `nginx/Dockerfile`

```dockerfile
FROM nginx:alpine
# Đóng gói file cấu hình
COPY default.conf /etc/nginx/conf.d/default.conf
# Đóng gói trang bảo trì
COPY maintenance.html /usr/share/nginx/html/maintenance.html
```

### File `backend/entrypoint.sh`

```bash
#!/bin/sh
echo "🚀 Connecting to MongoDB Atlas & Starting Node.js API..."
# Chạy trực tiếp file build bằng Node để tránh overhead và lỗi pnpm/corepack khi khởi động container
node dist/index.js
```

---

## 4. Cấu hình Bảo mật Mạng (Network Security / IP Whitelist)

Vì MongoDB Atlas nằm trên Cloud chứ không nằm trong mạng nội bộ VPS, bạn cần cấu hình tường lửa (Network Access) trên giao diện web của MongoDB Atlas:

1.  **Cho phép máy Local của Dev:** Thêm địa chỉ IP mạng nhà/văn phòng của các thành viên vào Whitelist.
2.  **Cho phép VPS:** Thêm **Địa chỉ IP Public của VPS** vào Whitelist để Backend trên VPS có thể truy cập được.
3.  **Cho phép GitHub Actions (Tùy chọn):** Nếu quy trình CI/CD có chạy Test kết nối DB, bạn cần tạm thời mở IP `0.0.0.0/0` (Không khuyến khích cho Prod) hoặc chỉ chạy test bằng Mock DB.

---

## 5. Cấu hình Nginx & Docker Compose

### File `nginx/default.conf` (Bản "Vạn năng" hỗ trợ SSL)

```nginx
# --- 1. CHUYỂN HƯỚNG HTTP SANG HTTPS & XÁC THỰC SSL ---
server {
    listen 80;
    server_name anngon.site dev.anngon.site;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # BƯỚC KHỞI ĐẦU: Hãy comment dòng này lại ở lần deploy đầu tiên để lấy SSL.
    # Sau khi chạy Certbot lấy được SSL thành công thì mới mở comment ra và redeploy.
    location / {
        return 301 https://$host$request_uri;
    }
}

# --- 2. CẤU HÌNH HTTPS CHO PRODUCTION (anngon.site) ---
server {
    listen 443 ssl;
    server_name anngon.site;

    # Hãy comment toàn bộ block listen 443 ở lần deploy đầu tiên (chưa có chứng chỉ SSL)
    ssl_certificate /etc/letsencrypt/live/anngon.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/anngon.site/privkey.pem;

    # TỰ ĐỘNG HIỂN THỊ TRANG BẢO TRÌ KHI SERVICE SẬP
    error_page 502 503 504 /maintenance.html;
    location = /maintenance.html {
        root /usr/share/nginx/html;
        internal;
    }

    location /api { proxy_pass http://be-prod:5000; }
    location / { proxy_pass http://fe-prod:3000; }
}

# --- 3. CẤU HÌNH HTTPS CHO DEVELOPMENT (dev.anngon.site) ---
server {
    listen 443 ssl;
    server_name dev.anngon.site;

    # Hãy comment toàn bộ block listen 443 ở lần deploy đầu tiên (chưa có chứng chỉ SSL)
    ssl_certificate /etc/letsencrypt/live/anngon.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/anngon.site/privkey.pem;

    # TỰ ĐỘNG HIỂN THỊ TRANG BẢO TRÌ
    error_page 502 503 504 /maintenance.html;
    location = /maintenance.html {
        root /usr/share/nginx/html;
        internal;
    }

    location /api { proxy_pass http://be-dev:5000; }
    location / { proxy_pass http://fe-dev:3000; }
}
```

### File `nginx/maintenance.html` (Trang Bảo trì Tự động)

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Hệ thống đang bảo trì</title>
    <style>
      body {
        text-align: center;
        padding: 150px;
        font-family: "Outfit", sans-serif;
        background: #0f172a;
        color: #cbd5e1;
      }
      h1 {
        font-size: 50px;
        color: #f8fafc;
        margin-bottom: 20px;
      }
      p {
        font-size: 20px;
        color: #94a3b8;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        border: 1px solid #334155;
        padding: 40px;
        border-radius: 12px;
        background: #1e293b;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🔧 Đang bảo trì hệ thống</h1>
      <p>
        Chúng tôi đang nâng cấp ứng dụng để mang lại trải nghiệm tốt nhất. Xin
        vui lòng quay lại sau ít phút!
      </p>
    </div>
  </body>
</html>
```

### File `docker-compose.yml` (Chạy thử ở Local)

```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - local-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    env_file:
      - ./backend/.env # Chứa MONGODB_URI=mongodb+srv://... (Trỏ tới DB 'my_app_local' trên Atlas)
    volumes:
      - ./backend:/app
      - /app/node_modules
    networks:
      - local-network

networks:
  local-network:
    driver: bridge
```

### File `docker-compose.dev.yml` (Cho môi trường Dev trên VPS)

```yaml
services:
  fe-dev:
    image: ${DOCKERHUB_USERNAME}/fe:dev
    restart: always
    networks: [web-network]

  be-dev:
    image: ${DOCKERHUB_USERNAME}/be:dev
    env_file: .env.dev # Chứa MONGODB_URI=mongodb+srv://... (Trỏ tới DB 'my_app_prod' trên Atlas)
    restart: always
    networks: [web-network]

networks:
  web-network:
    external: true
```

### File `docker-compose.prod.yml` (Cho môi trường Prod & Nginx trên VPS)

```yaml
services:
  nginx:
    image: ${DOCKERHUB_USERNAME}/nginx:latest
    ports:
      - "80:80"
      - "443:443"
    restart: always
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    networks: [web-network]

  fe-prod:
    image: ${DOCKERHUB_USERNAME}/fe:latest
    restart: always
    networks: [web-network]

  be-prod:
    image: ${DOCKERHUB_USERNAME}/be:latest
    env_file: .env.prod # Chứa MONGODB_URI=mongodb+srv://... (Trỏ tới DB 'my_app_prod' trên Atlas)
    restart: always
    networks: [web-network]

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

networks:
  web-network:
    external: true
```

---

## 6. Quy trình Tự động hóa CI/CD (GitHub Actions)

### Mẫu Workflow: `.github/workflows/deploy-dev.yml`

```yaml
name: Build and Deploy (Dev)

on:
  push:
    branches: [develop]

jobs:
  check-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      # --- BƯỚC 1: KIỂM TRA CHẤT LƯỢNG CODE ---
      - name: Setup PNPM & Node
        uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - name: Install & Check Lint
        run: |
          cd frontend && pnpm install && pnpm run lint
          cd ../backend && pnpm install && pnpm run lint

      # --- BƯỚC 2: BUILD & PUSH LÊN DOCKER HUB ---
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build & Push Images
        run: |
          docker build -t ${{ secrets.DOCKERHUB_USERNAME }}/fe:dev ./frontend
          docker build -t ${{ secrets.DOCKERHUB_USERNAME }}/be:dev ./backend
          docker build -t ${{ secrets.DOCKERHUB_USERNAME }}/nginx:dev ./nginx
          docker push ${{ secrets.DOCKERHUB_USERNAME }}/fe:dev
          docker push ${{ secrets.DOCKERHUB_USERNAME }}/be:dev
          docker push ${{ secrets.DOCKERHUB_USERNAME }}/nginx:dev

      # --- BƯỚC 3: DEPLOY LÊN VPS QUA SSH ---
      - name: 🚀 Sync Compose to VPS (Tự động copy file cấu hình)
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: "docker-compose.dev.yml"
          target: "/home/anngon/anngon-website"

      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/anngon/anngon-website
            docker compose -f docker-compose.dev.yml pull
            docker compose -f docker-compose.dev.yml up -d
            docker image prune -f
```

---

## 7. Hướng dẫn thiết lập VPS lần đầu (Từng bước một)

### Bước 1: Cài đặt Docker & Network

SSH vào VPS của bạn và chạy:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose -y
sudo systemctl start docker && sudo systemctl enable docker

# BẮT BUỘC: Tạo mạng cầu nối dùng chung
docker network create web-network

# Tạo thư mục chứa dự án
mkdir -p /home/anngon/anngon-website
```

### Bước 2: Tạo các file biến môi trường trực tiếp trên VPS

Do yếu tố bảo mật, bạn **không bao giờ** commit các file này lên Git. Hãy tạo trực tiếp trên VPS:

```bash
cd /home/anngon/anngon-website
nano .env.dev   # Điền MONGODB_URI trỏ tới DB 'my_app_prod' trên Atlas
nano .env.prod  # Điền MONGODB_URI trỏ tới DB 'my_app_prod' trên Atlas
```

### Bước 3: Thiết lập khóa bảo mật SSH Key cho GitHub Actions

1. **Trên máy cá nhân:** Chạy `ssh-keygen -t rsa -b 4096`.
2. **VPS Server:** Đưa khóa công khai (Public Key) vào `~/.ssh/authorized_keys`.
3. **GitHub:** Copy khóa bí mật (Private Key) và tạo Secret `VPS_SSH_KEY` trong repo GitHub Settings.

### Bước 4: Khởi chạy Nginx lấy chứng chỉ SSL lần đầu

Để lấy chứng chỉ SSL lần đầu tiên, bạn có **2 cách tiếp cận** tùy thuộc vào việc Nginx đã chạy hay chưa:

> [!WARNING]
> **Yêu cầu trước khi chạy:** Bạn phải đưa file `docker-compose.prod.yml` lên VPS trước (bằng cách `git clone` mã nguồn hoặc tạo thủ công bằng `nano docker-compose.prod.yml` và dán cấu hình vào).

#### Cách 1: Sử dụng Standalone mode (Khuyên dùng - Rất nhanh, không cần Nginx chạy trước)
Nếu cổng 80 trên VPS đang trống (Nginx chưa chạy), bạn có thể chạy lệnh sau để Certbot tự dựng một server ảo xác thực và tải chứng chỉ về. Cách này không đòi hỏi cấu hình Nginx trước:

```bash
# Thay thế /home/anngon/anngon-website bằng đường dẫn thư mục dự án của bạn trên VPS
docker run --rm -it \
  -p 80:80 \
  -v /home/anngon/anngon-website/certbot/conf:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  --email your-email@gmail.com --agree-tos \
  -d anngon.site -d dev.anngon.site
```

#### Cách 2: Sử dụng Webroot mode (Yêu cầu Nginx cổng 80 đang chạy trên VPS)
Nếu bạn muốn dùng lệnh sidecar certbot qua Docker Compose, hãy đảm bảo rằng:
1. Bạn đã khởi động container Nginx chạy thành công ở cổng 80 (với cấu hình SSL 443 đã bị comment lại để tránh lỗi).
2. Chạy lệnh sau:

```bash
docker-compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path=/var/www/certbot --email your-email@gmail.com --agree-tos -d anngon.site -d dev.anngon.site
```

### Bước 5: Kích hoạt SSL (Bỏ Comment) & Hoàn tất

Quay trở lại file `default.conf` ở local, **bỏ comment** các dòng SSL và dòng redirect 301, push code lên nhánh chính để GitHub Actions tự động redeploy bản HTTPS bảo mật hoàn chỉnh!

---

## 8. Quy trình Cập nhật Biến môi trường (.env) trên VPS

Vì yếu tố bảo mật tuyệt đối, các file chứa thông số nhạy cảm như `.env.dev` hay `.env.prod` **không bao giờ được commit lên GitHub**. Khi bạn thêm hoặc chỉnh sửa biến môi trường mới (ví dụ: bổ sung API Key cho cổng thanh toán PayOS), hãy tuân thủ quy trình 2 bước dưới đây:

### Bước 1: SSH vào VPS và chỉnh sửa file cấu hình

Bạn mở terminal trên máy tính và kết nối tới VPS:

```bash
# 1. SSH vào VPS của bạn
ssh anngon@161.248.147.99

# 2. Truy cập vào thư mục dự án
cd /home/anngon/anngon-website

# 3. Mở file .env của môi trường tương ứng (Dùng nano hoặc vi)
nano .env.dev    # Nếu là môi trường Dev
# Hoặc: nano .env.prod   # Nếu là môi trường Production
```

- Sử dụng phím mũi tên để di chuyển xuống dưới và thêm biến mới (ví dụ: `PAYOS_CLIENT_ID=xxxxx`).
- Nhấn `Ctrl + O` -> `Enter` để lưu, sau đó nhấn `Ctrl + X` để thoát.

### Bước 2: Bắt buộc Recreate hoặc Restart Container tương ứng

Các biến môi trường chỉ được Docker nạp **duy nhất một lần lúc container khởi động**. Do đó, sau khi lưu file `.env`, bạn cần ra lệnh cho Docker khởi tạo lại Container để áp dụng cấu hình mới:

- **Cho cụm Dev:**
  ```bash
  # Sử dụng cờ -f để chỉ định file cấu hình Dev và --force-recreate để ép nạp biến mới
  docker-compose -f docker-compose.dev.yml up -d --force-recreate be-dev
  ```
- **Cho cụm Production:**
  ```bash
  # Sử dụng cờ -f để chỉ định file cấu hình Prod và --force-recreate để ép nạp biến mới
  docker compose -f docker-compose.prod.yml up -d --force-recreate be-prod
  ```

> [!TIP]
> **Best Practice cho Đội Ngũ (Tạo file `.env.example`):**
> Bạn nên tạo sẵn một file `.env.example` (chỉ chứa tên biến không chứa giá trị thật) đẩy lên GitHub. Bất cứ khi nào dự án có thêm biến môi trường mới, nhà phát triển chỉ cần cập nhật tên biến vào `.env.example` trên Git để toàn bộ đội ngũ biết và cập nhật theo.

---

## 9. Đồng bộ cấu trúc Dữ liệu (Mongoose ODM)

Một điểm cộng cực kỳ lớn khi bạn chuyển đổi sang **Mongoose (ODM)** là: **Không cần bất kỳ kịch bản Migration hay Sync thủ công nào ở entrypoint!**

- **Tự động hóa chỉ mục (Auto Indexes):** Mongoose tự động kiểm tra, định nghĩa các Schema và tự động tạo các chỉ mục (`indexes` như unique, compound index...) ngay khi kết nối thành công với database trên cả Local lẫn Atlas trong quá trình khởi động ứng dụng.
- **Mongoose Connection (Best Practice):** Đảm bảo bạn bật chế độ tự tạo index trong mã nguồn NodeJS:
  ```javascript
  mongoose.connect(process.env.MONGODB_URI, {
    autoIndex: true, // Tự động tạo index từ Schema của Mongoose
  });
  ```

---

## 10. So sánh Ưu & Nhược điểm của Mô hình Mới

| Tiêu chí             | Mô hình Postgres tự chạy (Cũ)             | Mô hình MongoDB Atlas Cloud (Mới)                  |
| :------------------- | :---------------------------------------- | :------------------------------------------------- |
| **Tài nguyên VPS**   | Tốn RAM, CPU và ổ đĩa cho 2 container DB. | Cực kỳ nhẹ, VPS chỉ lo chạy Node/React.            |
| **Bảo mật**          | Phải tự cấu hình SSH Tunneling phức tạp.  | Quản lý IP Whitelist trực quan trên web.           |
| **Độ tin cậy**       | Dễ mất dữ liệu nếu VPS sập / đầy ổ cứng.  | Tự động Backup, bảo mật và nhân bản (Replication). |
| **Độ trễ (Latency)** | Cực thấp (kết nối nội bộ VPS).            | Có một chút độ trễ nhỏ do phải gọi qua Internet.   |
| **Quản lý**          | Phải dùng DBeaver qua SSH.                | Có giao diện web Atlas UI trực quan và sinh động.  |

---

## 11. Hướng dẫn sửa các lỗi thường gặp (Troubleshooting Guide)

Trong quá trình vận hành thực tế trên VPS, bạn có thể gặp một số lỗi kỹ thuật phổ biến sau đây. Dưới đây là nguyên nhân và cách xử lý chi tiết:

### Lỗi 1: `KeyError: 'ContainerConfig'` khi chạy `docker-compose up`
- **Hiện tượng:** Khi deploy bằng Docker Compose V1 (bản cũ viết bằng Python, ví dụ `1.29.2`), log báo lỗi `KeyError: 'ContainerConfig'` và container không thể khởi chạy. Lỗi này xuất hiện do sự không tương thích giữa Docker Engine phiên bản mới (v25+) và Docker Compose V1 cũ khi cố gắng recreate (khởi tạo lại) container đã tồn tại.
- **Cách khắc phục nhanh:**
  Tắt hoàn toàn cụm container cũ trước để dọn sạch tài nguyên rồi mới khởi chạy lại:
  ```bash
  # Tắt và xóa container cũ
  docker-compose -f docker-compose.dev.yml down
  
  # Khởi chạy lại cụm mới
  docker-compose -f docker-compose.dev.yml up -d
  ```
- **Giải pháp lâu dài:** Nên gỡ cài đặt `docker-compose` cũ và cài đặt plugin **Docker Compose V2** (viết bằng Go, tích hợp thẳng vào Docker CLI và được gọi bằng lệnh `docker compose` - không có dấu gạch ngang).

### Lỗi 2: Lỗi cú pháp Docker Compose (Lỗi vị trí flag `-f` hoặc `-f` sau command)
- **Hiện tượng:** Chạy lệnh `docker compose logs -f` báo lỗi `unknown shorthand flag: 'f' in -f` hoặc báo lỗi không tìm thấy file cấu hình yaml.
- **Quy tắc cú pháp:**
  - Các cờ (flag) cấu hình chung như `-f` (chỉ định file compose) hay `--env-file` **bắt buộc phải nằm TRƯỚC** câu lệnh con (`up`, `down`, `logs`, `pull`,...).
  - Cờ `-f` của câu lệnh `logs` (viết tắt của follow - theo dõi log thời gian thực) **bắt buộc phải nằm SAU** câu lệnh `logs`.
- **Ví dụ đúng:**
  ```bash
  # Xem log thời gian thực của service be-dev
  docker-compose -f docker-compose.dev.yml logs -f be-dev
  
  # Kéo các image mới về
  docker-compose -f docker-compose.dev.yml pull
  ```

### Lỗi 3: `MongoServerError: bad auth : authentication failed`
- **Hiện tượng:** Backend chạy báo lỗi kết nối DB thất bại do sai thông tin đăng nhập, mặc dù mật khẩu bạn nhập hoàn toàn đúng.
- **Nguyên nhân:** Mật khẩu tài khoản MongoDB Atlas của bạn chứa các ký tự đặc biệt (như `@`, `:`, `/`, `?`, `#`, `[`, `]`,...). Khi đưa vào chuỗi kết nối URI, các ký tự này làm sai lệch định dạng URL.
- **Cách khắc phục:** Bạn phải **URL-encode (mã hóa URL)** các ký tự đặc biệt trong mật khẩu của mình trước khi đưa vào file `.env`:
  - Ví dụ: Ký tự `@` phải được đổi thành `%40`.
  - Mật khẩu gốc: `my@password` -> URI: `mongodb+srv://user:my%40password@cluster.mongodb.net/...`
- **Bảng tra cứu mã hóa nhanh:**
  - `@` -> `%40`
  - `:` -> `%3A`
  - `/` -> `%2F`
  - `?` -> `%3F`
  - `#` -> `%23`

### Lỗi 4: `ERR_PNPM_LOCKFILE_BREAKING_CHANGE` hoặc lỗi tải Corepack trong Container
- **Hiện tượng:** Container backend dừng đột ngột hoặc mất nhiều thời gian khởi động, log báo lỗi không khớp phiên bản pnpm lockfile hoặc corepack không tải được pnpm/node_modules.
- **Cách khắc phục:**
  1. **Khóa cứng phiên bản pnpm** trong file `package.json` của cả backend và frontend bằng trường `"packageManager"` để đảm bảo đồng nhất môi trường build:
     ```json
     "packageManager": "pnpm@9.15.4"
     ```
  2. **Bỏ qua pnpm runtime trong entrypoint:** Thay vì chạy `pnpm run start` ở entrypoint.sh (sẽ chạy qua pnpm CLI để kiểm tra lockfile mất thời gian), hãy chạy trực tiếp file build JS bằng Node:
     ```sh
     node dist/index.js
     ```

### Lỗi 5: Vô hiệu hóa/Comment khóa SSH tạm thời trong `authorized_keys`
- **Hiện tượng:** Bạn muốn vô hiệu hóa tạm thời một khóa SSH của ai đó hoặc của GitHub Actions nhưng không muốn xóa hẳn để sau này dùng lại.
- **Cách làm:** Thêm dấu thăng `#` ở ngay đầu dòng chứa SSH key đó trong file `~/.ssh/authorized_keys`.
  - **Ví dụ:**
    ```text
    # ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQD... github-actions-deploy-key
    ```
  - Khi cần kích hoạt lại, chỉ cần xóa ký tự `#` ở đầu dòng đó là xong.

---

## 12. Quy trình Deploy thủ công khi CI/CD gặp sự cố (Manual Deployment Guide)

Nếu hệ thống CI/CD (GitHub Actions) gặp sự cố (ví dụ: GitHub Runner bị nghẽn, Docker Hub bị lỗi, lỗi kết nối SSH, hoặc không push được code), bạn có thể tự triển khai thủ công theo 2 cách dưới đây.

---

### CÁCH 1: Build & Push từ máy cá nhân (Local) lên Docker Hub, sau đó SSH vào VPS để chạy
*Cách này giả lập đúng quy trình của GitHub Actions, tận dụng tài nguyên build của máy cá nhân để giữ cho VPS nhẹ nhàng.*

#### Bước 1: Build các Docker Image từ thư mục dự án ở máy cá nhân:
Mở terminal tại thư mục gốc của dự án ở máy local của bạn và chạy:
```bash
# Thay thế "your_dockerhub_username" bằng tài khoản Docker Hub của bạn
docker build -t your_dockerhub_username/fe:dev ./frontend
docker build -t your_dockerhub_username/be:dev ./backend
# (Nếu có thay đổi cấu hình Nginx)
docker build -t your_dockerhub_username/nginx:dev ./nginx
```

#### Bước 2: Đăng nhập và Push Image lên Docker Hub:
```bash
# Đăng nhập tài khoản Docker Hub của bạn nếu chưa đăng nhập
docker login

# Push các bản build lên Docker Hub
docker push your_dockerhub_username/fe:dev
docker push your_dockerhub_username/be:dev
docker push your_dockerhub_username/nginx:dev
```

#### Bước 3: SSH vào VPS và kích hoạt ứng dụng:
```bash
# 1. SSH vào VPS
ssh anngon@161.248.147.99

# 2. Truy cập thư mục dự án trên VPS
cd /home/anngon/anngon-website

# 3. Kéo image mới từ Docker Hub về
docker-compose -f docker-compose.dev.yml pull

# 4. Hạ các container cũ xuống để tránh lỗi KeyError 'ContainerConfig'
docker-compose -f docker-compose.dev.yml down

# 5. Khởi chạy lại cụm container mới
docker-compose -f docker-compose.dev.yml up -d
```

---

### CÁCH 2: Build trực tiếp trên VPS (Không phụ thuộc vào Docker Hub)
*Dùng cách này khi Docker Hub bị lỗi hoặc đường truyền mạng từ local/GitHub Actions lên Docker Hub bị gián đoạn.*

#### Bước 1: Đồng bộ mã nguồn mới nhất lên VPS
- **Phương án A (Khuyên dùng):** Nếu bạn đã push code thành công lên GitHub, hãy SSH vào VPS và kéo code về:
  ```bash
  ssh anngon@161.248.147.99
  cd /home/anngon/anngon-website
  git pull origin develop
  ```
- **Phương án B (Copy trực tiếp từ máy cá nhân qua SCP):** Nếu không pull được từ GitHub, copy thư mục code từ máy local lên VPS:
  ```bash
  # Chạy lệnh này tại máy cá nhân (nén code lại rồi gửi đi)
  tar -czf project.tar.gz --exclude='node_modules' --exclude='.git' .
  scp project.tar.gz anngon@161.248.147.99:/home/anngon/anngon-website/
  
  # Sau đó SSH vào VPS và giải nén:
  ssh anngon@161.248.147.99
  cd /home/anngon/anngon-website
  tar -xzf project.tar.gz
  rm project.tar.gz
  ```

#### Bước 2: Tiến hành Build trực tiếp trên VPS
Tại terminal của VPS, bạn chạy lệnh build để Docker lưu image trực tiếp vào bộ nhớ máy ảo:
```bash
# Truy cập vào thư mục dự án
cd /home/anngon/anngon-website

# Khai báo biến môi trường DOCKERHUB_USERNAME
export DOCKERHUB_USERNAME="your_dockerhub_username"

# Tiến hành build các image trực tiếp bằng Docker trên VPS
docker build -t ${DOCKERHUB_USERNAME}/fe:dev ./frontend
docker build -t ${DOCKERHUB_USERNAME}/be:dev ./backend
```

#### Bước 3: Tắt và Khởi chạy lại Container
Vì các image vừa build đã nằm sẵn trong bộ nhớ của máy VPS, bạn chỉ cần recreate container mà không cần pull:
```bash
# 1. Tắt các container cũ để dọn dẹp ContainerConfig
docker-compose -f docker-compose.dev.yml down

# 2. Khởi chạy lại với các image mới vừa build nội bộ
docker-compose -f docker-compose.dev.yml up -d
```

---

## 13. Các lệnh Linux & Docker thường dùng để quản lý VPS (VPS Cheat Sheet)

Dưới đây là tổng hợp các lệnh hữu ích để bạn giám sát, vận hành và sửa lỗi hệ thống trực tiếp trên VPS:

### 1. Quản lý Container bằng Docker Compose
*Lưu ý thay `docker-compose -f docker-compose.dev.yml` bằng cấu hình tương ứng (`docker-compose -f docker-compose.prod.yml`) khi thao tác trên môi trường Production.*

- **Xem trạng thái hoạt động của các container:**
  ```bash
  docker ps
  # Hoặc (bao gồm cả container đã tắt/lỗi)
  docker ps -a
  ```

- **Xem log (nhật ký hoạt động) của hệ thống:**
  ```bash
  # Xem toàn bộ log và theo dõi trực tiếp (nhấn Ctrl + C để thoát)
  docker-compose -f docker-compose.dev.yml logs -f
  
  # Xem log của riêng service backend và chỉ lấy 100 dòng gần nhất
  docker-compose -f docker-compose.dev.yml logs --tail=100 -f be-dev
  ```

- **Khởi động / Dừng / Khởi động lại dịch vụ:**
  ```bash
  # Chạy ngầm cụm dịch vụ
  docker-compose -f docker-compose.dev.yml up -d
  
  # Tắt và xóa sạch cụm container để tránh lỗi KeyError 'ContainerConfig'
  docker-compose -f docker-compose.dev.yml down
  
  # Khởi động lại nhanh một container cụ thể (ví dụ: be-dev)
  docker-compose -f docker-compose.dev.yml restart be-dev
  
  # Ép Docker xóa container cũ và nạp lại cấu hình biến môi trường mới
  docker-compose -f docker-compose.dev.yml up -d --force-recreate be-dev
  ```

- **Truy cập vào terminal bên trong một container đang chạy:**
  ```bash
  # Truy cập vào terminal của backend để gõ lệnh hoặc kiểm tra file
  docker exec -it anngon-website_be-dev_1 sh
  ```

### 2. Quản lý Tài nguyên VPS (Giám sát Phần cứng)

- **Xem dung lượng ổ đĩa (Rất quan trọng - Docker hay gây đầy ổ cứng):**
  ```bash
  df -h
  ```
  *(Nếu thấy phân vùng `/` hoặc `/data` đạt mức 90% - 100%, hãy tiến hành dọn dẹp Docker ngay lập tức).*

- **Xem dung lượng RAM đang sử dụng:**
  ```bash
  free -h
  ```

- **Giám sát CPU, RAM của từng Container trực gian (Thời gian thực):**
  ```bash
  docker stats
  ```

- **Dọn dẹp rác Docker để giải phóng ổ cứng (Xóa cache build, image cũ thừa, container rác):**
  ```bash
  # Xóa các image không dùng tới
  docker image prune -f
  
  # DỌN SẠCH TRIỆT ĐỂ: Xóa sạch image/volume/network không dùng (Thận trọng khi dùng)
  docker system prune -a --volumes -f
  ```

### 3. Quản lý Mạng & Kết nối (Network & Port)

- **Xem các cổng (Port) đang mở trên VPS (Kiểm tra xem Nginx cổng 80/443 đã chạy chưa):**
  ```bash
  sudo ss -tulnp
  # Hoặc nếu không có lệnh ss
  sudo netstat -tulnp
  ```

- **Kiểm tra xem VPS có kết nối mạng tới MongoDB Atlas Cloud được không:**
  ```bash
  # Cú pháp: nc -zv [địa chỉ host mongodb] [cổng 27017]
  nc -zv cluster0-xxxx.mongodb.net 27017
  ```
  *(Nếu hiện `Connection to ... port 27017 [tcp] succeeded!` tức là kết nối thông suốt. Nếu báo `Connection refused` hoặc `Timeout` thì kiểm tra lại IP Whitelist trên Atlas).*

- **Xem nhật ký đăng nhập VPS (Xem ai đang SSH vào):**
  ```bash
  # Xem 50 dòng log đăng nhập gần nhất
  tail -n 50 /var/log/auth.log
  ```



