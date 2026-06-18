# --- Stage 1: Build (Biên dịch mã nguồn) ---
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_BASE_API=/api
ARG VITE_GOOGLE_CLIENT_ID=798057503920-v2lumj24in5mt9t0j4n4v83q49f7dadh.apps.googleusercontent.com
RUN echo "VITE_BASE_API=$VITE_BASE_API" > .env && \
    echo "VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID" >> .env && \
    cat .env
RUN pnpm run build




# --- Stage 2: Run (Chạy bản build tĩnh) ---
FROM node:20-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

# Cài đặt server 'serve' bằng npm để có sẵn PATH global
RUN npm install -g serve

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Dành cho Next.js (Bỏ comment nếu dùng Next.js)
# COPY --from=builder /app/public ./public
# COPY --from=builder /app/.next ./.next

USER node
CMD ["serve", "-s", "dist", "-p", "3000"]