# --- Stage 1: Build (Tạo bản dựng) ---
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8 --activate
COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# --- Stage 2: Run (Chạy ứng dụng tối giản) ---
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8 --activate
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER node
ENTRYPOINT ["./entrypoint.sh"]