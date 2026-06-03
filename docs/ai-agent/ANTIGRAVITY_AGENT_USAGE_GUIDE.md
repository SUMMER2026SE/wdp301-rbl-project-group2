# Hướng dẫn sử dụng Antigravity Agent Kit cho dự án FOA

Tài liệu này hướng dẫn cách dùng bộ `.agents` cho dự án FOA: hệ thống chuỗi cửa hàng bán đồ ăn online dùng Express + TypeScript + MongoDB ở backend, React + Vite ở frontend, tích hợp PayOS, Socket.IO, Cloudinary, Gemini/Groq và deploy trên VPS tự quản lý.

Mục tiêu của bộ kit không phải chỉ để AI code nhanh hơn, mà để AI làm việc giống một senior engineer hơn: đọc repo trước khi sửa, dùng đúng skill, chia task nhỏ, kiểm tra rủi ro, ghi nhớ bài học mới, và không phá các luồng nhạy cảm như payment, order, auth, upload hoặc deploy production.

---

## 1. Cấu trúc file nên đặt trong repo

Mở Antigravity ở root repo, nơi chứa cả backend và frontend.

Cấu trúc khuyến nghị:

```txt
foa/
├── AGENTS.md
├── .agents/
│   ├── agents.md
│   ├── rules/
│   ├── workflows/
│   ├── skills/
│   ├── memory/
│   └── references/
├── docs/
│   └── ai-agent/
├── backend/
│   ├── package.json
│   └── src/
└── frontend/
    ├── package.json
    └── src/
```

Không nên đặt `.agents` bên trong `backend/` hoặc `frontend/` nếu Antigravity đang làm việc trên toàn hệ thống. AI cần nhìn được luồng end-to-end từ frontend → backend API → service → MongoDB → PayOS/Socket.IO/Cloudinary.

---

## 2. Ý nghĩa các nhóm file chính

### `AGENTS.md`

Đây là file hướng dẫn gốc của repo. Khi bắt đầu session hoặc task lớn, luôn yêu cầu AI đọc file này trước.

Nội dung thường gồm:

- Stack backend/frontend.
- Lệnh dev/build/test/lint.
- Quy tắc bảo mật.
- Quy tắc payment/order/auth/upload/socket.
- Quy tắc dùng memory.
- Quy tắc deploy VPS.

Prompt nên dùng:

```txt
Read AGENTS.md first. Do not edit code until you inspect the repo and produce a short plan.
```

### `.agents/agents.md`

File định nghĩa các vai AI trong Antigravity, ví dụ:

- `@architect`: phụ trách kiến trúc, scope, plan, risk.
- `@backend`: phụ trách Express, TypeScript, Mongoose, PayOS, Socket.IO backend.
- `@frontend`: phụ trách React, React Query, Zustand, Router, form, UI.
- `@security`: phụ trách auth, role, secret, payment, upload, VPS.
- `@qa`: phụ trách test, checklist, regression.
- `@devops`: phụ trách deploy runbook, backup, rollback.
- `@memory`: phụ trách memory, lesson, audit, promotion.

### `.agents/rules/`

Rules là luật nền. AI nên luôn tuân thủ các rule này.

Ví dụ:

```txt
00-agent-operating-principles.md
10-food-commerce-domain.md
21-payos-payment.md
22-socketio-realtime.md
23-cloudinary-upload.md
30-frontend-react19.md
40-mongodb-mongoose.md
50-security-vps-production.md
85-memory-governance.md
```

Dev thường không cần mention từng rule, nhưng với task rủi ro nên nhắc lại rule liên quan.

Ví dụ task payment:

```txt
Follow PayOS payment rules. Never mark an order as paid from frontend redirect only. Webhook/callback must be verified and idempotent.
```

### `.agents/workflows/`

Workflows là quy trình cần gọi khi làm việc. Không nên kỳ vọng workflow tự chạy nếu dev không gọi.

Ví dụ:

```txt
repo-onboard.md
retrieve-memory.md
spec-first.md
plan-atomic-slices.md
implement-feature.md
add-api-endpoint.md
fix-bug.md
review-current-diff.md
security-review.md
deploy-vps.md
qa-order-flow.md
capture-lesson.md
memory-audit.md
promote-lesson.md
post-incident-review.md
post-task-report.md
```

Cách gọi:

```txt
Run the repo-onboard workflow. Do not edit code yet.
```

Hoặc:

```txt
Use the spec-first workflow for this task before editing code.
```

### `.agents/skills/`

Skills là các chuyên gia theo ngữ cảnh. Mỗi skill nằm trong một folder riêng và có `SKILL.md`.

Ví dụ:

```txt
express-api-senior/
react-food-ui/
mongodb-commerce-data/
checkout-order-domain/
payos-payment-guardian/
socketio-realtime-guardian/
cloudinary-upload-guardian/
ai-provider-guardian/
vps-deploy-guardian/
security-reviewer/
memory-retriever/
lesson-capture/
memory-curator/
rule-evolution-engine/
repo-risk-scanner/
agent-kit-maintainer/
```

Với task quan trọng, dev nên mention rõ skill cần dùng thay vì chờ AI tự chọn.

Ví dụ:

```txt
Use the express-api-senior and mongodb-commerce-data skills.
```

### `.agents/memory/`

Đây là bộ nhớ kỹ thuật của team trong repo.

Cấu trúc:

```txt
.agents/memory/
├── MEMORY_INDEX.md
├── patterns/
├── lessons/
├── incidents/
├── decisions/
├── module-index/
├── anti-patterns.md
└── glossary.md
```

Ý nghĩa:

- `MEMORY_INDEX.md`: mục lục để AI tìm memory nhanh.
- `patterns/`: pattern đúng đã được approve.
- `lessons/`: bài học từ bug, review, lỗi agent, nguyên tắc mới.
- `incidents/`: postmortem cho lỗi staging/production hoặc lỗi nghiêm trọng.
- `decisions/`: quyết định kiến trúc/convention.
- `module-index/`: bản đồ module thật sau khi inspect repo.
- `anti-patterns.md`: các kiểu làm sai cần tránh.
- `glossary.md`: thuật ngữ domain/kỹ thuật trong dự án.

Memory phải được commit vào Git sau khi review. Không bao giờ ghi secret, token, key, thông tin nhạy cảm hoặc dữ liệu khách hàng thật vào memory.

### `.agents/references/`

References là tài liệu dài, checklist hoặc template để AI đọc khi cần.

Ví dụ:

```txt
AGENT_TASK_TEMPLATE.md
ANTIGRAVITY_PROMPT_COOKBOOK.md
FOOD_COMMERCE_INVARIANTS.md
QUALITY_GATES.md
SECURITY_REVIEW_MATRIX.md
SKILL_AUTHORING_CHECKLIST.md
```

Rules và skills nên ngắn. Checklist dài nên đặt trong `references/` để tránh làm context bị nặng.

---

## 3. Cách dùng lần đầu sau khi cài kit

### Bước 1: Mở đúng workspace

Mở Antigravity tại root repo:

```txt
foa/
```

Không mở riêng:

```txt
foa/backend/
foa/frontend/
```

trừ khi backend/frontend là repo độc lập.

### Bước 2: Chạy onboarding prompt đầu tiên

Dán prompt này vào Antigravity:

```txt
Read AGENTS.md and .agents/agents.md.
Read all .agents/rules.
Run repo-onboard workflow.
Do not edit code yet.

Then produce:
- detected backend package path
- detected frontend package path
- available scripts
- architecture map
- env variable names only, not values
- backend routes/controllers/services/models
- auth flow
- PayOS payment flow
- Socket.IO events
- Cloudinary upload flow
- frontend router/API/query/store structure
- order/cart/checkout flow
- relevant memory cards
- risky areas
- recommended next cleanup tasks
```

Mục tiêu của bước này là ép AI đọc repo trước khi sửa code.

### Bước 3: Cập nhật module memory sau onboarding

Sau khi AI inspect repo thật, yêu cầu nó cập nhật module index:

```txt
Use memory-curator skill.
Create or update .agents/memory/module-index files based on the onboarding result.
Update .agents/memory/MEMORY_INDEX.md.
Do not include secrets or env values.
```

### Bước 4: Chạy audit nội bộ

Nếu repo có Python 3, chạy:

```bash
python .agents/skills/agent-kit-maintainer/scripts/audit_agent_kit.py .
python .agents/skills/memory-curator/scripts/update_memory_index.py .
python .agents/skills/repo-risk-scanner/scripts/safe_repo_scan.py .
```

Ý nghĩa:

- `audit_agent_kit.py`: kiểm tra cấu trúc skill/rule/workflow.
- `update_memory_index.py`: cập nhật mục lục memory.
- `safe_repo_scan.py`: scan rủi ro cơ bản như secret pattern, destructive command, trust frontend amount, global socket emit.

### Bước 5: Commit bộ agent kit

```bash
git add AGENTS.md .agents docs/ai-agent
git commit -m "chore: add Antigravity agent kit"
```

---

## 4. Quy trình làm việc hằng ngày

Mỗi task không nên bắt đầu bằng “code luôn”. Hãy dùng flow này:

```txt
Retrieve memory → chọn skill → lập plan → code từng lát nhỏ → verify → report → capture lesson nếu có
```

### 4.1 Trước khi làm task

Prompt nền:

```txt
Read AGENTS.md first.
Use memory-retriever and run retrieve-memory workflow.
Read .agents/memory/MEMORY_INDEX.md and relevant memory cards.
State which memory cards you consulted.

Task: <mô tả task>

Do not edit code until you inspect existing patterns and produce an atomic plan.
```

### 4.2 Khi task mơ hồ hoặc rủi ro

Dùng `spec-first`:

```txt
Use spec-first-planner skill and run spec-first workflow.

Task: <mô tả task>

Do not edit code yet.
Clarify:
- goal
- non-goals
- affected modules
- data changes
- auth/role impact
- payment/order impact
- frontend impact
- verification plan
```

Task được coi là rủi ro nếu đụng một trong các vùng sau:

```txt
payment
checkout
order status
auth/role/permission
MongoDB schema/query/index
file upload
Socket.IO realtime
AI provider Gemini/Groq
VPS deployment
production environment
```

### 4.3 Khi bắt đầu implement

Không yêu cầu AI sửa tất cả trong một lần. Bắt nó chia task thành lát nhỏ:

```txt
Run plan-atomic-slices workflow.
Then implement slice 1 only.
After slice 1, run the cheapest relevant verification and report the diff.
```

Ví dụ atomic slices cho tính năng order cancellation:

```txt
1. Inspect existing order status constants and model.
2. Add backend status transition validation.
3. Add API/controller/service changes.
4. Add frontend mutation and UI.
5. Invalidate React Query cache.
6. Emit Socket.IO event after DB update succeeds.
7. Run backend build/test and frontend lint/build.
8. Run security review and QA order flow.
```

### 4.4 Sau khi hoàn thành task

Yêu cầu AI report:

```txt
Run post-task-report workflow.
Report:
- summary
- files changed
- commands run
- commands not run and why
- risks
- manual QA checklist
- follow-up suggestions
```

### 4.5 Nếu có lỗi/nguyên tắc mới

Bắt AI ghi lại memory:

```txt
Use lesson-capture and run capture-lesson workflow.

Capture this lesson into .agents/memory/lessons:
<ghi bài học ở đây>

Update .agents/memory/MEMORY_INDEX.md.
If this is High/Critical or likely to repeat, propose whether to promote it into a rule, skill, workflow, or reference.
```

---

## 5. Khi nào dùng workflow nào

| Workflow | Khi nào dùng | Ghi chú |
|---|---|---|
| `repo-onboard` | Lần đầu mở repo hoặc sau thay đổi kiến trúc lớn | Không edit code |
| `retrieve-memory` | Trước mọi task vừa và lớn | Bắt AI đọc memory liên quan |
| `spec-first` | Task mơ hồ/rủi ro/nhiều module | Không edit trước khi có spec |
| `plan-atomic-slices` | Trước khi implement task nhiều bước | Chia nhỏ để dễ verify |
| `implement-feature` | Làm feature mới | Dùng sau spec/plan |
| `add-api-endpoint` | Thêm/sửa API backend | Bắt xác định contract trước |
| `fix-bug` | Sửa bug | Bắt tìm root cause trước |
| `review-current-diff` | Review diff trước merge | Dùng với security/code review skills |
| `security-review` | Khi đụng auth/payment/upload/order/deploy | Block Critical/High |
| `qa-order-flow` | Trước release liên quan order/payment | Checklist thủ công |
| `deploy-vps` | Chuẩn bị deploy VPS | Chỉ tạo runbook, không tự deploy |
| `capture-lesson` | Sau bug, review comment, convention mới | Ghi vào memory |
| `memory-audit` | Định kỳ hoặc khi memory lộn xộn | Dedupe/update/promote |
| `promote-lesson` | Lesson lặp lại hoặc severity cao | Nâng thành rule/skill/workflow |
| `post-incident-review` | Sau incident staging/prod | Tạo postmortem |
| `post-task-report` | Sau mọi task vừa và lớn | Chuẩn hóa output |

---

## 6. Khi nào dùng skill nào

| Skill | Dùng khi | Prompt mẫu |
|---|---|---|
| `express-api-senior` | Backend API, route/controller/service | `Use express-api-senior skill.` |
| `react-food-ui` | Frontend React UI/form/page | `Use react-food-ui skill.` |
| `mongodb-commerce-data` | Model, schema, query, index | `Use mongodb-commerce-data skill.` |
| `checkout-order-domain` | Cart, checkout, order, status, cancellation | `Use checkout-order-domain skill.` |
| `payos-payment-guardian` | PayOS payment, webhook, callback | `Use payos-payment-guardian skill.` |
| `socketio-realtime-guardian` | Socket.IO event/room/client listener | `Use socketio-realtime-guardian skill.` |
| `cloudinary-upload-guardian` | Upload ảnh, Cloudinary, Multer | `Use cloudinary-upload-guardian skill.` |
| `ai-provider-guardian` | Gemini/Groq/chatbot/AI output | `Use ai-provider-guardian skill.` |
| `vps-deploy-guardian` | Deploy VPS, rollback, smoke test | `Use vps-deploy-guardian skill.` |
| `security-reviewer` | Review bảo mật | `Use security-reviewer skill.` |
| `code-review-sentinel` | Review current diff | `Use code-review-sentinel skill.` |
| `performance-hotpath-reviewer` | API chậm, dashboard, list page, analytics | `Use performance-hotpath-reviewer skill.` |
| `memory-retriever` | Trước task để tìm memory | `Use memory-retriever skill.` |
| `lesson-capture` | Sau bug/nguyên tắc mới | `Use lesson-capture skill.` |
| `memory-curator` | Dọn memory/update index | `Use memory-curator skill.` |
| `rule-evolution-engine` | Nâng lesson thành rule/skill/workflow | `Use rule-evolution-engine skill.` |
| `repo-risk-scanner` | Scan rủi ro repo/diff | `Use repo-risk-scanner skill.` |
| `agent-kit-maintainer` | Audit/chỉnh bộ `.agents` | `Use agent-kit-maintainer skill.` |
| `spec-first-planner` | Task chưa rõ scope | `Use spec-first-planner skill.` |

---

## 7. Prompt mẫu theo từng loại việc

### 7.1 Làm backend API

```txt
Read AGENTS.md first.
Use memory-retriever and run retrieve-memory workflow.
Use express-api-senior and mongodb-commerce-data skills.
Run add-api-endpoint workflow.

Task: <mô tả API>

Rules:
- Inspect existing routes/controllers/services/models first.
- Define method, path, auth, role, params, query, body, response, and errors before editing.
- Use Zod validation.
- Keep routes thin and business logic in services.
- Scope MongoDB queries by actor/role/store/branch where applicable.
- Report files changed and checks run.
```

### 7.2 Làm frontend feature

```txt
Read AGENTS.md first.
Use memory-retriever and run retrieve-memory workflow.
Use react-food-ui skill.

Task: <mô tả frontend feature>

Rules:
- Inspect existing router, API client, query hooks, store, and component patterns first.
- Use React Query for server state.
- Use Zustand only for client/UI state.
- Use React Hook Form + Zod for forms when applicable.
- Handle loading, error, empty, and success states.
- Run frontend lint/build if possible.
```

### 7.3 Làm checkout/order

```txt
Read AGENTS.md first.
Use memory-retriever and run retrieve-memory workflow.
Use checkout-order-domain and mongodb-commerce-data skills.
Run spec-first workflow before editing.

Task: <mô tả task order/checkout>

Rules:
- Do not trust frontend price, total, discount, delivery fee, status, or role.
- Server must compute totals from database state.
- Inspect existing order status constants/state transitions first.
- Do not invent new statuses if existing ones exist.
- Order status updates must be authorized and transition-safe.
- Emit Socket.IO events only after MongoDB update succeeds.
```

### 7.4 Làm PayOS payment

```txt
Read AGENTS.md first.
Use memory-retriever and run retrieve-memory workflow.
Use payos-payment-guardian and checkout-order-domain skills.
Run security-review workflow for the planned change before editing.

Task: <mô tả PayOS task>

Rules:
- Amount must be server-computed.
- Do not mark order as paid from frontend redirect only.
- Verify PayOS webhook/callback.
- Webhook/callback handling must be idempotent.
- Do not log secrets, signatures, or sensitive payment payloads.
- Report all failure cases and retry behavior.
```

### 7.5 Làm Socket.IO realtime

```txt
Read AGENTS.md first.
Use socketio-realtime-guardian skill.

Task: <mô tả realtime task>

Rules:
- Use scoped rooms such as user/store/branch/order rooms.
- Do not broadcast private order/payment data globally.
- Emit only after database update succeeds.
- Frontend must clean up listeners on unmount.
- Socket event should notify UI; API/MongoDB remains source of truth.
```

### 7.6 Làm upload ảnh Cloudinary

```txt
Read AGENTS.md first.
Use cloudinary-upload-guardian skill.

Task: <mô tả upload task>

Rules:
- Validate MIME type, not only file extension.
- Enforce file size limit.
- Do not expose Cloudinary secret to frontend.
- Store public_id and secure_url if replacement/deletion is needed later.
- Clean temporary files if disk storage is used.
```

### 7.7 Làm Gemini/Groq/AI feature

```txt
Read AGENTS.md first.
Use ai-provider-guardian skill.

Task: <mô tả AI feature>

Rules:
- Do not send secrets, JWTs, payment data, or unnecessary PII to AI providers.
- Treat AI output as untrusted.
- Validate structured AI output with Zod.
- AI must not decide payment status, order status, user role, inventory, or authorization.
```

### 7.8 Sửa bug

```txt
Read AGENTS.md first.
Use memory-retriever and run retrieve-memory workflow.
Run fix-bug workflow.

Bug: <mô tả bug>

Before editing, report:
- symptom
- reproduction path if known
- suspected root cause
- files/modules to inspect
- verification plan

After fixing, run post-task-report.
If a new lesson was learned, run capture-lesson.
```

### 7.9 Review trước merge

```txt
Read AGENTS.md first.
Use code-review-sentinel and security-reviewer skills.
Run review-current-diff workflow.

Review the current diff.
Block merge on Critical or High findings.
Report:
- Critical/High/Medium/Low findings
- missing tests/checks
- risky files changed
- payment/order/auth/upload/socket/deploy risks
- recommended fixes
```

### 7.10 Chuẩn bị deploy VPS

```txt
Read AGENTS.md first.
Use vps-deploy-guardian skill.
Run deploy-vps workflow.

Produce a deployment runbook only.
Do not execute SSH, restart services, modify production env, run migrations, or touch production database.

Include:
- pre-deploy checks
- backup plan
- deployment steps
- smoke tests
- rollback plan
- monitoring/log checks
```

---

## 8. Quy trình memory chuẩn

### 8.1 Trước task: retrieve memory

Luôn dùng với task vừa/lớn:

```txt
Use memory-retriever and run retrieve-memory workflow.
Read MEMORY_INDEX.md and relevant memory cards.
State which cards you consulted before planning.
```

AI phải trả lời kiểu:

```txt
Memory consulted:
- .agents/memory/patterns/server-computed-totals.md
- .agents/memory/patterns/payos-idempotent-webhook.md
- .agents/memory/lessons/2026-xx-xx-duplicate-checkout.md
```

### 8.2 Sau task: capture lesson nếu có

Ghi lesson khi xảy ra một trong các trường hợp:

```txt
- Bug mới được phát hiện.
- Human review correction quan trọng.
- Agent vừa làm sai hoặc hiểu sai convention.
- Có nguyên tắc domain mới.
- Có pattern đúng được approve.
- Có incident staging/production.
- Có quyết định kiến trúc mới.
```

Prompt:

```txt
Use lesson-capture and run capture-lesson workflow.
Capture this lesson:
<lesson>
Update MEMORY_INDEX.md.
Propose promotion if repeated or high-risk.
```

### 8.3 Khi lesson lặp lại: promote

Nếu một lesson xảy ra nhiều lần hoặc severity High/Critical:

```txt
Use rule-evolution-engine and run promote-lesson workflow.
Promote this lesson into the right place:
- rule if it must always be followed
- skill if it is domain-specific expertise
- workflow if it is a repeatable process
- reference if it is a long checklist
```

### 8.4 Audit memory định kỳ

Nên làm mỗi tuần hoặc sau một đợt feature lớn:

```txt
Use memory-curator and run memory-audit workflow.
Audit .agents/memory for:
- duplicates
- stale cards
- missing tags
- conflicting guidance
- lessons that should be promoted
- patterns that need clearer examples
Update MEMORY_INDEX.md.
Do not delete memory cards without approval.
```

---

## 9. Quy tắc an toàn bắt buộc

AI không được làm các việc sau nếu chưa có approval rõ ràng:

```txt
- Đọc hoặc in nội dung .env thật.
- Commit secret, token, private key, database dump, backup archive.
- SSH vào production.
- Restart production service.
- Chạy migration trên production.
- Drop database, deleteMany, updateMany diện rộng.
- docker system prune trên VPS production.
- Mark order paid dựa vào frontend redirect.
- Tin price/total/status/role từ frontend.
- Broadcast private order/payment data qua Socket.IO global.
- Gửi JWT, secret, payment data, PII không cần thiết sang Gemini/Groq.
```

Nếu task cần thông tin env, chỉ yêu cầu AI liệt kê tên biến:

```txt
List env variable names only. Do not read or print values.
```

---

## 10. Checklist trước khi merge

Trước khi merge PR hoặc task lớn, dùng checklist này:

```txt
- AI đã đọc AGENTS.md chưa?
- AI đã retrieve memory chưa?
- AI đã dùng đúng skill chưa?
- Task có spec/plan chưa?
- Có thay đổi payment/order/auth/upload/socket/deploy không?
- Có Zod validation cho input không?
- Backend có enforce role/ownership không?
- MongoDB query có scope đúng không?
- Frontend có handle loading/error/empty state không?
- React Query có invalidate/update cache đúng không?
- Socket listener có cleanup không?
- Backend build/test đã chạy chưa?
- Frontend lint/build đã chạy chưa?
- Security review đã chạy nếu task rủi ro chưa?
- Có lesson mới cần capture không?
- MEMORY_INDEX.md đã update nếu có memory mới chưa?
```

Prompt:

```txt
Run review-current-diff and security-review workflows.
Then run post-task-report.
If new lessons exist, run capture-lesson and update MEMORY_INDEX.md.
```

---

## 11. Command hữu ích

### Audit cấu trúc agent kit

```bash
python .agents/skills/agent-kit-maintainer/scripts/audit_agent_kit.py .
```

### Update memory index

```bash
python .agents/skills/memory-curator/scripts/update_memory_index.py .
```

### Scan rủi ro repo

```bash
python .agents/skills/repo-risk-scanner/scripts/safe_repo_scan.py .
```

### Search memory

```bash
python .agents/skills/memory-retriever/scripts/search_memory.py . "payos webhook idempotent"
```

### Tạo lesson mới

```bash
python .agents/skills/lesson-capture/scripts/new_lesson.py . \
  --title "Order status must not be hard-coded in controller" \
  --severity high \
  --tags order,status,controller,state-machine \
  --applies-to backend
```

Sau khi tạo lesson mới:

```bash
python .agents/skills/memory-curator/scripts/update_memory_index.py .
```

---

## 12. Quy tắc đặt tên memory card

Nên đặt tên file dễ scan:

```txt
YYYY-MM-DD-short-kebab-title.md
```

Ví dụ:

```txt
.agents/memory/lessons/2026-06-03-order-status-not-hardcoded-in-controller.md
.agents/memory/incidents/2026-06-03-payos-webhook-staging-env-missing.md
.agents/memory/decisions/2026-06-03-react-query-server-state-source-of-truth.md
```

Frontmatter gợi ý:

```md
---
type: lesson
status: active
severity: high
tags: [order, status, backend, controller]
applies_to: [backend]
created: 2026-06-03
updated: 2026-06-03
---
```

Memory card nên có:

```txt
- Context
- Trigger
- Root cause or decision
- Correct pattern next time
- Files/modules affected
- Verification
- Promotion suggestion
```

Không ghi secret hoặc dữ liệu khách hàng thật vào memory card.

---

## 13. Câu thần chú cho team

Trước task:

```txt
Read AGENTS.md.
Use memory-retriever and run retrieve-memory workflow.
Use relevant skills.
Do not edit code until you state memory cards consulted and produce an atomic plan.
```

Trong lúc làm:

```txt
Implement one atomic slice at a time.
After each meaningful slice, run the cheapest relevant verification and report the diff.
```

Sau task:

```txt
Run post-task-report.
If any new bug pattern, invariant, project convention, or review lesson was discovered, use lesson-capture and update MEMORY_INDEX.md.
Propose promotion if this is Critical, High, or repeated.
```

Trước deploy:

```txt
Use vps-deploy-guardian and run deploy-vps workflow.
Produce a runbook only. Do not execute production commands.
```

---

## 14. FAQ

### Có cần giữ `install-antigravity-only.sh` trong repo không?

Không cần. Script đó chỉ để copy kit vào repo lần đầu. Sau khi setup xong, repo chỉ cần `AGENTS.md`, `.agents/`, và tài liệu trong `docs/ai-agent/` nếu team muốn giữ.

### Có cần dùng `.agent/` không?

Mặc định dùng `.agents/` làm source of truth. Nếu version Antigravity trên máy không nhận `.agents`, có thể mirror tạm:

```bash
cp -R .agents .agent
```

Không nên duy trì hai bản lâu dài vì dễ lệch nội dung.

### Có cần external memory service không?

Chưa cần. Memory bằng Markdown trong repo là đủ cho giai đoạn hiện tại: dễ review, dễ version, không phụ thuộc tool ngoài, ít rủi ro leak dữ liệu.

### Có cần Harness, GitNexus, Sourcegraph không?

Chưa cần nếu repo vẫn là backend + frontend trong một workspace. Chỉ cân nhắc khi team lớn hơn, nhiều repo hơn, nhiều deploy environment hơn, hoặc cần governance CI/CD/AppSec mạnh hơn.

### Có nên để AI tự deploy production không?

Không. AI chỉ nên tạo runbook deploy, checklist, rollback plan, smoke test. Lệnh production cần người có trách nhiệm approve và tự chạy hoặc giám sát trực tiếp.

---

## 15. Nguyên tắc quan trọng nhất

AI agent có thể code nhanh, nhưng với hệ thống bán đồ ăn online, các phần sau là vùng tiền thật và dữ liệu thật:

```txt
payment
checkout
order status
auth/role
customer data
file upload
Socket.IO private event
production VPS
```

Vì vậy mọi task chạm vào các vùng này phải đi qua:

```txt
retrieve-memory
spec-first
relevant skills
security-review
post-task-report
capture-lesson nếu có bài học mới
```

Đây là cách biến Antigravity từ công cụ generate code thành một senior workflow có trí nhớ, có guardrails, có audit, và có khả năng học từ lỗi cũ.
