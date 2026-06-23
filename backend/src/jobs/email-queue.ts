import { Queue, Worker, Job } from 'bullmq';
import { redisConfig } from '@/config/redis';
import { sendMail } from '@/utils/send-mail';

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
