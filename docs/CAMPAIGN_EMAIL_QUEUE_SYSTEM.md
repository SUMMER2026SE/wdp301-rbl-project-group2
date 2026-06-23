# Tài liệu Thiết kế & Triển khai Hệ thống Hàng đợi Gửi Email Chiến dịch (Email Queue System)

Tài liệu này trình bày chi tiết về vấn đề quá tải luồng gửi email tiếp thị (Campaign Emails), đề xuất giải pháp sử dụng **BullMQ (Redis-backed)**, và hướng dẫn triển khai thực tế trên môi trường Docker & VPS.

---

## 1. Vấn đề của Giải pháp Hiện tại (Current Problem)

Trong triển khai hiện tại ở [campaign.service.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/services/campaign.service.ts), khi một chiến dịch được duyệt (`APPROVED`), hệ thống thực hiện gửi thông báo email đến toàn bộ khách hàng thông qua vòng lặp:

```typescript
for (const customer of customers) {
  if (customer.email) {
    sendMail({ ... }).catch((err) => ...);
  }
}
```

### Hạn chế lớn khi hệ thống mở rộng (Scale-up)
1. **Quá tải Event Loop & Bộ nhớ (OOM)**: Việc tạo ra hàng ngàn Promise gửi mail đồng thời sẽ chiếm dụng lượng RAM lớn của VPS, có thể gây ra hiện tượng tràn bộ nhớ (Out of Memory) hoặc nghẽn Event Loop tạm thời, làm chậm các API khẩn cấp khác của cửa hàng (như đặt món, thanh toán).
2. **Bị SMTP Server khóa/từ chối (Rate Limiting)**: Các nhà cung cấp dịch vụ SMTP (như Gmail, SendGrid, Mailgun) luôn có giới hạn số lượng mail gửi đi trong một giây/phút. Việc gửi hàng ngàn mail cùng một lúc sẽ bị đánh dấu là Spam hoặc bị từ chối kết nối (`421 Too many concurrent SMTP connections`).
3. **Thiếu cơ chế phục hồi và ghi nhật ký (No Retries/Monitoring)**: Nếu tiến trình gửi mail bị lỗi giữa chừng (do mất kết nối SMTP, mạng chập chờn...), hệ thống không có cách nào tự động thử lại (Retry) cho các khách hàng chưa nhận được mail, hoặc biết được tiến độ gửi mail đang ở mức bao nhiêu %.

---

## 2. Giải pháp Tối ưu: Message Queue với BullMQ & Redis

Chúng ta sử dụng kiến trúc **Producer-Consumer** dựa trên **BullMQ** (thư viện hàng đợi tối ưu nhất cho Node.js chạy trên nền cơ sở dữ liệu RAM **Redis**).

### Mô hình kiến trúc:
```
[Admin duyệt Campaign] 
       │
       ▼ (Đẩy job gửi mail tổng vào queue)
┌────────────────────────────────┐
│   BullMQ Queue (Producer)      │
└──────────────┬─────────────────┘
               │ (Lưu trữ và quản lý trạng thái các job)
               ▼
┌────────────────────────────────┐
│       Redis Database           │
└──────────────┬─────────────────┘
               │ (Lấy job và xử lý theo đợt / giãn cách)
               ▼
┌────────────────────────────────┐
│   BullMQ Worker (Consumer)     │
└──────────────┬─────────────────┘
               │ (Gửi mail chậm, giãn cách, tự động retry khi lỗi)
               ▼
   [Nodemailer / SMTP Server] ──► [Hộp thư khách hàng]
```

### Ưu điểm vượt trội:
* **Kiểm soát tốc độ (Rate Limiting)**: Giới hạn tối đa số lượng mail được gửi đi trong mỗi giây/phút (ví dụ: chỉ gửi tối đa 5 mail/giây).
* **Tự động thử lại (Automatic Retries)**: Tự động thử lại sau $X$ giây nếu kết nối tới SMTP gặp sự cố.
* **Tách biệt tải trọng (Background Processing)**: Công việc gửi mail chạy ngầm hoàn toàn, có thể tách hẳn ra một Node.js process khác (Worker) để không chiếm dụng tài nguyên của API Web Server chính.

---

## 3. Hướng dẫn Triển khai Chi tiết (Implementation Guide)

### Bước 3.1: Cấu hình Redis trong Docker Compose

Cập nhật tệp [docker-compose.yml](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/docker-compose.yml) để bổ sung dịch vụ Redis làm kho lưu trữ hàng đợi.

```yaml
version: '3.8'

services:
  # ... (frontend và backend giữ nguyên) ...

  redis:
    image: redis:7-alpine
    container_name: foodiedash-redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - local-network

volumes:
  redis-data:
    driver: local

networks:
  local-network:
    driver: bridge
```

### Bước 3.2: Cài đặt thư viện cần thiết cho Backend

Chạy lệnh cài đặt các package quản lý hàng đợi trong thư mục `backend`:
```bash
pnpm add bullmq ioredis
pnpm add -D @types/ioredis
```

### Bước 3.3: Định nghĩa cấu hình hàng đợi (Queue Configuration)

Tạo tệp cấu hình kết nối Redis tại `backend/src/config/redis.ts`:

```typescript
import { ConnectionOptions } from 'bullmq';

export const redisConfig: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};
```

Cập nhật các biến môi trường vào tệp `.env` của backend trên VPS hoặc local:
```env
REDIS_HOST=redis
REDIS_PORT=6379
# REDIS_PASSWORD=mật_khẩu_bảo_mật (nếu có cấu hình)
```

---

### Bước 3.4: Xây dựng Queue và Worker gửi Email

Tạo tệp quản lý hàng gửi thư tiếp thị tại `backend/src/jobs/email-queue.ts`:

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis';
import { sendMail } from '../utils/send-mail';

// 1. Khởi tạo hàng đợi chính (Producer)
export const emailQueue = new Queue('campaign-email-queue', {
  connection: redisConfig,
});

// Định nghĩa cấu trúc dữ liệu cho mỗi Job gửi thư
interface IEmailJobData {
  email: string;
  subject: string;
  text: string;
  html: string;
}

// 2. Định nghĩa Worker xử lý hàng đợi (Consumer)
export const startEmailWorker = () => {
  const worker = new Worker(
    'campaign-email-queue',
    async (job: Job<IEmailJobData>) => {
      const { email, subject, text, html } = job.data;
      
      console.log(`[EmailWorker] Đang gửi mail cho: ${email} (Job #${job.id})`);
      
      const result = await sendMail({ to: email, subject, text, html });
      
      if (result.error) {
        throw new Error(`SMTP Error: ${result.error.toString()}`);
      }
      
      return result;
    },
    {
      connection: redisConfig,
      // CẤU HÌNH TỐI ƯU HIỆU NĂNG:
      limiter: {
        max: 5,         // Chỉ gửi tối đa 5 mail...
        duration: 1000, // ... trên mỗi 1000ms (1 giây) để tránh spam/block
      },
      concurrency: 2,   // Xử lý song song tối đa 2 job một lúc
    }
  );

  worker.on('completed', (job) => {
    console.log(`[EmailWorker] Job #${job.id} hoàn thành gửi tới ${job.data.email}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job #${job?.id} thất bại khi gửi tới ${job?.data.email}. Lỗi:`, err.message);
  });
};
```

---

### Bước 3.5: Cấu hình Khởi động Worker cùng Ứng dụng Backend

Tại tệp khởi động ứng dụng [backend/src/index.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/index.ts) (hoặc file entrypoint của server), import và kích hoạt Worker chạy nền:

```typescript
import { startEmailWorker } from './jobs/email-queue';

// ... đoạn code khởi động express server ...
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Khởi chạy hàng đợi gửi mail chạy ngầm
  startEmailWorker();
  console.log('[Queue] BullMQ Email Worker đã sẵn sàng nhận nhiệm vụ.');
});
```

---

### Bước 3.6: Tích hợp Hàng đợi vào Campaign Service

Thay thế luồng gửi email trực tiếp bằng cách đẩy các tác vụ gửi thư vào hàng đợi BullMQ trong [campaign.service.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/services/campaign.service.ts):

```typescript
import { emailQueue } from '../jobs/email-queue'; // Import hàng đợi

async function notifyCustomersOfCampaign(campaign: ICampaign) {
  try {
    const customers = await UserModel.find({
      role: Role.CUSTOMER,
      receiveCampaignNotifications: { $ne: false },
    }).select('email username').lean();

    if (!customers.length) return;

    const subject = `🎉 Chiến dịch ưu đãi mới: ${campaign.name}`;
    const text = `Xin chào! Cửa hàng vừa ra mắt chiến dịch khuyến mãi "${campaign.name}"...`;
    const html = `...[mã HTML email]...`;

    // Thay thế vòng lặp cũ bằng việc đẩy jobs vào hàng đợi BullMQ
    const jobs = customers
      .filter(customer => customer.email)
      .map(customer => ({
        name: `campaign-notify-${campaign._id}-${customer._id}`,
        data: {
          email: customer.email,
          subject,
          text,
          html,
        },
        opts: {
          attempts: 3,             // Tự động thử lại tối đa 3 lần nếu lỗi
          backoff: {
            type: 'exponential',   // Chờ giãn cách tăng dần (exponential backoff)
            delay: 5000,           // Lần đầu thử lại sau 5s, lần hai 10s...
          },
          removeOnComplete: true,  // Tự động xóa lịch sử job khi gửi thành công
          removeOnFail: 1000,      // Giữ lại tối đa 1000 jobs lỗi để debug
        }
      }));

    // Đẩy hàng loạt (Bulk insert) vào Redis để đạt hiệu năng tối ưu nhất
    await emailQueue.addBulk(jobs);
    console.log(`[Queue] Đã đẩy thành công ${jobs.length} email chiến dịch vào hàng đợi.`);
    
  } catch (error) {
    console.error('Failed to notify customers of new campaign:', error);
  }
}
```

---

## 4. Quy trình Cài đặt & Triển khai trên VPS (VPS Deployment)

Khi bạn triển khai hệ thống này lên VPS thông qua Docker, hãy tuân thủ các bước thiết lập bảo mật và vận hành dưới đây:

### Bước 4.1: Cập nhật biến môi trường trên VPS
Trước khi rebuild các container, đảm bảo tệp `.env` trên VPS chứa đúng cấu hình Redis:
```env
REDIS_HOST=redis
REDIS_PORT=6379
```

### Bước 4.2: Tái khởi động Docker Compose
Rebuild và khởi chạy container mới (bao gồm cả Redis):
```bash
docker-compose up -d --build
```

### Bước 4.3: Kiểm tra tính hoạt động của hàng đợi
Xem log hoạt động của backend để xác nhận Worker đã được kết nối với Redis:
```bash
docker logs chain-restaurant-platform-backend-1 --tail 100 -f
```
*(Bạn sẽ thấy dòng chữ: `[Queue] BullMQ Email Worker đã sẵn sàng nhận nhiệm vụ.`)*

### 🔒 Lưu ý quan trọng về Bảo mật VPS (Security Hardening)
1. **Không mở cổng Redis ra ngoài Internet (Ports Security)**:
   Trong file `docker-compose.yml`, dịch vụ `redis` được khai báo cổng:
   ```yaml
   ports:
     - "6379:6379"
   ```
   Nếu VPS của bạn mở firewall cổng `6379` ra ngoài mạng công cộng, kẻ xấu có thể quét và tấn công/đánh cắp dữ liệu RAM Redis. 
   - **Khuyên dùng**: Nếu Backend và Redis chạy chung trên một VPS thông qua Docker Compose, hãy loại bỏ dòng cấu hình `ports` này ra khỏi Redis. Docker sẽ tự liên kết qua `local-network` nội bộ, giúp ngăn chặn 100% nguy cơ tấn công Redis từ bên ngoài.
2. **Đặt mật khẩu Redis (Optional nhưng khuyến khích)**:
   Nếu cần tăng độ bảo mật, bạn có thể khởi chạy Redis kèm mật khẩu bằng cách thêm lệnh khởi chạy trong `docker-compose.yml`:
   ```yaml
   redis:
     image: redis:7-alpine
     command: redis-server --requirepass MatKhauSieuBaoMatCuaBan
   ```
