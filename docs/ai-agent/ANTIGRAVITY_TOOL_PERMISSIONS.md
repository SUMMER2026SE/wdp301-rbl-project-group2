# Antigravity Tool Permission Policy

Dùng file này khi cấu hình quyền terminal, MCP, GitHub, database, log reader, SSH hoặc deploy trong Antigravity.

## Safe by default

Agent có thể:

```txt
- đọc source code thông thường
- chạy lint/build/test local
- phân tích git diff/status/log
- tạo patch nhỏ
- viết runbook deploy
- đọc docs không chứa secret
```

## Needs explicit approval

Agent phải xin approval trước khi:

```txt
- cài dependency mới
- đổi schema hoặc migration
- đổi order/payment status semantics
- sửa auth/role middleware
- chạy script seed/migration
- chạy command deploy
- restart service
- truy cập log production
```

## Forbidden unless owner explicitly authorizes in that session

Agent không được:

```txt
- đọc/in nội dung `.env`
- đọc SSH key, private key, cert, token, DB dump
- commit secret
- drop database/collection
- chạy delete/updateMany destructive
- docker volume prune
- rm -rf trên production path
- SSH vào production VPS
- deploy production trực tiếp
```

## Production deployment stance

Mặc định agent chỉ được tạo runbook:

```txt
- commit/branch cần deploy
- commands đề xuất
- backup checklist
- rollback plan
- smoke tests
- risk notes
```

Con người chạy lệnh production.

## Recommended tool tiers

### Tier 0 — Always safe

- read normal source files
- run local typecheck/build/lint/test
- run agent kit audit scripts
- inspect git diff/status/log

### Tier 1 — Ask before action

- install dependencies
- modify lockfiles
- create migrations/backfills
- edit deployment scripts
- read local non-production logs
- run repo risk scanner on large repos

### Tier 2 — Human-only unless explicitly approved

- SSH to VPS
- restart services
- deploy production
- read production logs with customer/payment data
- connect to production MongoDB
- run destructive shell commands
- rotate/change secrets

### Forbidden

- print `.env` values
- upload secrets/logs/customer data to AI providers
- run `docker system prune` or `rm -rf` on production
- mark payment/order states manually in production DB without a human runbook
