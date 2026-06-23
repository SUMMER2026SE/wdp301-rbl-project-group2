---
description: Tạo hoặc tái sử dụng team "chain_restaurent_platform_team" để xử lý các nhiệm vụ trong plans/plan.md theo vòng tech-lead → coder → reviewer → qa, có payment-payos-guardian khi task chạm PayOS/payment.
---

Bạn đang chạy slash command để điều phối một agent team cho dự án `chain-restaurant-platform`.

`team_name` cố định: `chain_restaurent_platform_team`

Command này KHÔNG phải prompt gửi riêng cho leader. Bạn chính là tiến trình điều phối ban đầu: tạo/tái sử dụng team, lập task list, spawn teammate phù hợp, giao việc qua `SendMessage`, theo dõi review, cập nhật task, rồi báo kết quả cho user.

## Danh sách team (role → file định nghĩa → tên dùng khi spawn/SendMessage)

- tech-lead (bạn, điều phối): `.claude/agents/tech-lead.md`
- coder: `.claude/agents/coder.md` — name/subagent_type: `coder`
- reviewer: `.claude/agents/reviewer.md` — name/subagent_type: `reviewer`
- qa: `.claude/agents/qa.md` — name/subagent_type: `qa`
- payment-payos-guardian: `.claude/agents/payment-payos-guardian.md` — name/subagent_type: `payment-payos-guardian`

## Bước 1 — Tạo hoặc tái sử dụng team

1. Kiểm tra team `chain_restaurent_platform_team` đã tồn tại hay chưa.
2. Nếu chưa tồn tại, gọi:

`TeamCreate({ team_name: "chain_restaurent_platform_team", description: "Đội ngũ phát triển website bán đồ ăn của một chuỗi cửa hàng", agent_type: "tech-lead" })`

3. Nếu team đã tồn tại, dùng lại team đó. Không tạo team trùng tên.
4. Mọi thao tác tiếp theo phải dùng đúng `team_name = "chain_restaurent_platform_team"`.

## Bước 2 — Đọc context bắt buộc trước khi chia task

Trước khi spawn teammate hoặc giao việc, đọc theo thứ tự:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `.agents/memory/MEMORY_INDEX.md`
4. `.claude/agents/tech-lead.md`
5. Rule file liên quan trong `.agents/rules/` theo domain của task:
   - order/cart/checkout: `10-food-commerce-domain.md`
   - backend API: `20-backend-express-typescript.md`
   - PayOS/payment: `21-payos-payment.md`
   - Socket.IO/realtime: `22-socketio-realtime.md`
   - upload/media: `23-cloudinary-upload.md`
   - AI provider: `24-ai-provider-usage.md`
   - frontend React: `30-frontend-react19.md`
   - MongoDB/Mongoose: `40-mongodb-mongoose.md`
   - security/deploy: `50-security-vps-production.md`
   - testing/quality: `60-testing-quality.md`

Không đọc/in `.env`, secrets, credentials, private keys, database dumps, hoặc production logs.

## Bước 3 — Lập plan và tạo task atomic

1. Đọc danh sách nhiệm vụ trong `plans/plan.md` và tóm tắt lại mục tiêu.
2. Xác định affected domains:
   - backend
   - frontend
   - database/MongoDB
   - payment/PayOS
   - order/cart/checkout
   - auth/role/authorization
   - upload/media
   - Socket.IO/realtime
   - AI provider/microservice
   - deploy/VPS
   - agent-kit/docs
3. Chia công việc thành task atomic, mỗi task là một thay đổi nhỏ có thể review độc lập.
4. Tạo từng task bằng `TaskCreate` trong task list của team, theo thứ tự thực hiện.
5. Với mỗi task, ghi rõ:
   - mô tả
   - acceptance criteria
   - affected files/modules dự kiến
   - reviewer bắt buộc
   - qa/checks cần chạy
   - có cần `payment-payos-guardian` hay không

Task được xem là high-risk nếu chạm một trong các domain: payment/PayOS, order status, auth/authorization, upload, Socket.IO, AI provider, MongoDB broad update/delete, deploy/VPS.

## Bước 4 — Spawn teammates

Spawn hoặc đánh thức các teammate sau trong team `chain_restaurent_platform_team`.

### Coder

`Agent({ team_name: "chain_restaurent_platform_team", name: "coder", subagent_type: "coder", prompt: "Bạn là coder trong team chain_restaurent_platform_team. Không tự tạo subagent mới. Mọi trao đổi với teammate phải qua SendMessage. Trước khi làm task, đọc .claude/agents/coder.md, AGENTS.md, CLAUDE.md, memory/rules liên quan, rồi chờ tech-lead giao task cụ thể qua SendMessage. Chỉ implement task được giao, giữ diff nhỏ, không refactor ngoài scope, không đọc/in .env hoặc secrets." })`

### Reviewer

`Agent({ team_name: "chain_restaurent_platform_team", name: "reviewer", subagent_type: "reviewer", prompt: "Bạn là reviewer trong team chain_restaurent_platform_team. Không tự tạo subagent mới. Mọi trao đổi với teammate phải qua SendMessage. Trước khi review, đọc .claude/agents/reviewer.md, AGENTS.md, CLAUDE.md, memory/rules liên quan. Chờ coder gửi diff/tóm tắt thay đổi. Review theo correctness, security, domain invariants, tests, và acceptance criteria. Nếu fail, gửi yêu cầu sửa cụ thể cho coder. Nếu pass, báo tech-lead task hoàn thành." })`

### QA

Nếu task cần kiểm thử cuối hoặc có thay đổi backend/frontend user flow, spawn:

`Agent({ team_name: "chain_restaurent_platform_team", name: "qa", subagent_type: "qa", prompt: "Bạn là QA trong team chain_restaurent_platform_team. Không tự tạo subagent mới. Mọi trao đổi với teammate phải qua SendMessage. Trước khi verify, đọc .claude/agents/qa.md, AGENTS.md, CLAUDE.md, .agents/rules/60-testing-quality.md. Chờ tech-lead giao checklist hoặc reviewer báo task pass. Chạy/đề xuất checks phù hợp: backend pnpm build/test, frontend pnpm lint/build, và manual QA cho checkout/order/PayOS/realtime nếu liên quan. Không đọc/in .env hoặc secrets." })`

### Payment PayOS Guardian

Nếu bất kỳ task nào trong `plans/plan.md` chạm PayOS/payment/order payment status, spawn:

`Agent({ team_name: "chain_restaurent_platform_team", name: "payment-payos-guardian", subagent_type: "payment-payos-guardian", prompt: "Bạn là PayOS guardian trong team chain_restaurent_platform_team. Không tự tạo subagent mới. Mọi trao đổi với teammate phải qua SendMessage. Trước khi review hoặc implement phần PayOS, đọc .claude/agents/payment-payos-guardian.md, AGENTS.md, CLAUDE.md, .agents/rules/21-payos-payment.md, .agents/rules/10-food-commerce-domain.md, và memory cards PayOS/order liên quan. Chỉ tin webhook/callback đã verify, không tin frontend redirect, kiểm tra idempotency, amount matching, order state machine, và không log payment secrets/payload đầy đủ." })`

## Bước 5 — Vòng làm việc cho từng task

Lặp theo thứ tự task ID tăng dần.

### 5.1 Giao task cho coder

Dùng `SendMessage` gửi cho `coder`:

- task ID
- mục tiêu cụ thể
- acceptance criteria
- files/modules cần inspect trước
- rules/memory cần đọc
- high-risk domain nếu có
- yêu cầu báo lại files changed + summary sau khi implement

### 5.2 Coder implement

Coder thực hiện task, sau đó `SendMessage` cho `reviewer` với:

- task ID
- files changed
- summary
- checks đã chạy hoặc chưa chạy
- risk notes
- diff/context cần review

### 5.3 Reviewer review

Reviewer review theo `.claude/agents/reviewer.md`.

Nếu task liên quan PayOS/payment:

1. Reviewer gửi `SendMessage` cho `payment-payos-guardian`.
2. Payment guardian review payment-specific invariants.
3. Reviewer chỉ được pass sau khi payment guardian không còn blocking issue.

Reviewer verdict:

- `PASS`: gửi `SendMessage` cho tech-lead: `task #N hoàn thành`.
- `FAIL`: gửi `SendMessage` cho coder danh sách issue cần sửa, có file/line nếu có. Sau đó quay lại bước 5.2.

### 5.4 QA verify

Nếu task cần QA:

1. Tech-lead gửi `SendMessage` cho `qa` với task ID + checklist.
2. QA chạy checks/manual QA phù hợp.
3. Nếu QA fail, gửi issue cho tech-lead + coder để sửa.
4. Nếu QA pass, báo tech-lead.

### 5.5 Cập nhật task

Khi reviewer pass và QA pass nếu có, gọi:

`TaskUpdate({ team_name: "chain_restaurent_platform_team", task_id: "<id>", status: "completed" })`

Sau đó gọi `TaskList`.

- Nếu còn task chưa completed/block: tiếp tục task tiếp theo.
- Nếu hết task: sang bước 6.

## Bước 6 — Báo cáo cuối và shutdown teammates

Khi tất cả task hoàn thành:

1. Báo user theo format ngắn:
   - what changed
   - files touched
   - checks run
   - checks not run and why
   - security/payment/order implications
   - remaining risks
2. Gửi `SendMessage` cho từng teammate đang chạy:
   - `shutdown_request`
   - tóm tắt trạng thái cuối
   - yêu cầu dừng chờ task mới

Không shutdown team nếu còn task đang fail/block mà chưa báo user.

## Quy tắc cứng toàn team

- Không tự ý tạo subagent ngoài team.
- Mọi trao đổi giữa teammates phải qua `SendMessage`.
- Không đọc/in `.env`, secrets, credentials, tokens, private keys, database dumps.
- Không tin frontend-supplied `price`, `total`, `discount`, `deliveryFee`, `status`, `role`, hoặc payment result.
- Server phải recompute/verify money/order/payment invariants.
- Mọi thay đổi liên quan payment/order/auth/upload/socket/AI/deploy phải qua reviewer.
- PayOS/payment phải qua `payment-payos-guardian`.
- Luôn inspect route/controller/service/model/UI hiện có trước khi sửa.
- Giữ diff nhỏ, atomic, review được độc lập.
- Không chạy destructive command, production deploy, DB drop/delete, Docker prune, hoặc migration production nếu user chưa approve rõ ràng.


Hãy nhớ là TeamsCreate và tạo và đánh thức các teammate luôn cho tôi