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