# Rules & Skills Origin

## Tóm tắt ngắn

Các rules/skills trong kit này không phải là bộ chính thức của Google và cũng không phải copy từ một repo community.

Nguồn của chúng gồm 3 lớp:

1. **Format và vị trí file** lấy theo cơ chế Antigravity: `.agents`, `rules`, `workflows`, `skills`, `SKILL.md`, YAML frontmatter `name`/`description`.
2. **Nội dung kỹ thuật** được custom từ package.json backend/frontend của dự án.
3. **Guardrails senior** được thiết kế theo best practices cho MERN commerce, payment, realtime, upload, AI provider, MongoDB, và VPS self-managed production.

## Lớp 1 — Format Antigravity

Các quyết định format:

```txt
.agents/rules/*.md
.agents/workflows/*.md
.agents/skills/<skill-name>/SKILL.md
```

Mỗi `SKILL.md` có frontmatter:

```md
---
name: skill-name
description: Use this skill when ...
---
```

Lý do: Antigravity Skills là dạng package theo thư mục, có file định nghĩa `SKILL.md`. Description là phần quan trọng để agent router biết khi nào cần kích hoạt skill.

## Lớp 2 — Custom từ project của bạn

Từ backend package.json:

```txt
Express 4.21
TypeScript 5.9
Mongoose 8.2
Zod 4
PayOS
Socket.IO
Cloudinary + Multer
Nodemailer
Gemini + Groq
pnpm 9.15.4
Node 22.x
```

Từ frontend package.json:

```txt
React 19.2
React Router 7.12
TanStack React Query 5
Zustand 5
React Hook Form + Zod
Tailwind CSS 4
MUI 7
Socket.IO client
i18next
Recharts
rolldown-vite
```

Vì vậy mới có các rule/skill riêng như:

```txt
payos-payment-guardian
socketio-realtime-guardian
cloudinary-upload-guardian
ai-provider-guardian
react-food-ui
express-api-senior
mongodb-commerce-data
checkout-order-domain
vps-deploy-guardian
security-reviewer
```

## Lớp 3 — Senior guardrails

Các guardrails được viết để giảm rủi ro thật của hệ thống bán đồ ăn online:

```txt
- Không tin price/total/status/role từ frontend.
- Backend tự tính lại tổng tiền.
- PayOS webhook/callback phải verify và idempotent.
- Không mark paid chỉ dựa vào frontend redirect success.
- Order status phải đi qua transition hợp lệ.
- Socket.IO không broadcast dữ liệu đơn hàng/payment global.
- Upload phải validate MIME type và size limit.
- Không expose Cloudinary secret.
- Không gửi JWT, payment data, secret, PII không cần thiết sang Gemini/Groq.
- Mongo query phải scope theo user/role/store/branch.
- Deploy VPS phải có backup, rollback, smoke test.
- Agent không được đọc/commit `.env`, private keys, DB dumps, SSH keys.
```

## Không lấy từ đâu?

Không lấy nguyên văn từ:

```txt
- community skill libraries
- random GitHub rule packs
- template Cursor rules
- private/proprietary rule collections
```

Có thể dùng thư viện community để tham khảo ý tưởng sau này, nhưng với dự án có payment + VPS tự quản lý, không nên cài ồ ạt hàng trăm skill không review. Skill cũng là operational instruction, nếu skill xấu hoặc quá rộng quyền thì có thể làm agent hành động sai.

## Cách team nên duy trì

Khi team phải nhắc agent cùng một điều 2-3 lần, hãy đưa điều đó vào rule.

Khi một loại task lặp lại và cần chuyên môn riêng, hãy tạo skill.

Khi một quy trình có nhiều bước cố định, hãy tạo workflow.

Quy tắc đơn giản:

```txt
Rules = luôn/không bao giờ làm gì.
Skills = chuyên gia theo tình huống.
Workflows = các bước phải chạy theo thứ tự.
AGENTS.md = hiến pháp chung của repo.
```

## Lớp 4 — Ý tưởng cập nhật sau khi tham khảo GitHub

Bản GitHub-inspired này bổ sung thêm các pattern từ các repo/chuẩn agent phổ biến:

- `spec-first`: đặc tả trước khi code cho task rủi ro.
- `atomic slices`: chia thay đổi thành lát nhỏ, verify từng lát.
- `task artifacts`: ghi rõ goal, scope, skills, plan, verification, risk.
- `progressive disclosure`: rules ngắn, checklist dài đưa vào `.agents/references/`.
- `skill governance`: có checklist và script audit để tránh skill mơ hồ.
- `deterministic scripts`: agent không chỉ đoán, có script kiểm tra cấu trúc kit và scan rủi ro repo.
- `review severity`: Critical / High / Medium / Low cho review trước merge.

Các nội dung này là bản thiết kế lại phù hợp FOA, không copy nguyên văn từ public repo.
Xem thêm `GITHUB_REFERENCE_NOTES.md`.

## Memory layer origin

The memory layer is designed as repository-backed, human-reviewable Antigravity context rather than hidden model memory.

Design principles:

- Progressive disclosure: keep always-on rules short, store deeper knowledge in `.agents/memory` cards, and retrieve only relevant cards.
- Write/manage/read loop: capture learning, curate/index it, and retrieve it before similar tasks.
- Promotion: repeated or high-severity lessons become durable rules, workflows, skills, or references.
- Safety: memory must never store secrets, payment signatures, raw production logs, or private customer data.

The implementation is custom for this FOA project and its Express + React + MongoDB + PayOS + Socket.IO + Cloudinary + VPS context.
