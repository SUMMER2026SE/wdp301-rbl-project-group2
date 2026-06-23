# Antigravity-only Agent Kit — FOA Food Ordering Platform

Bộ này chỉ dành cho Google Antigravity. Không có Cursor rules, không có `.cursor`, không có `.cursorignore`.

## Cài đặt

Từ thư mục kit:

```bash
./install-antigravity-only.sh /absolute/path/to/your/repo
```

Hoặc copy thủ công vào root repo:

```txt
AGENTS.md
.agents/
PROJECT_AGENT_AUDIT.md
RULES_SKILLS_ORIGIN.md
ANTIGRAVITY_TOOL_PERMISSIONS.md
ANTIGRAVITY_SETUP.md
```

Commit:

```bash
git add AGENTS.md .agents PROJECT_AGENT_AUDIT.md RULES_SKILLS_ORIGIN.md ANTIGRAVITY_TOOL_PERMISSIONS.md ANTIGRAVITY_SETUP.md
git commit -m "chore: add Antigravity senior agent setup"
```

## Cấu trúc chính

```txt
.agents/
├── rules/      # Guardrails nền: agent nên tuân thủ trong repo
├── workflows/  # Quy trình dev cần gọi khi làm task
└── skills/     # Chuyên môn theo task, mỗi skill có SKILL.md
```

## Prompt đầu tiên trong Antigravity

```txt
Read AGENTS.md and all .agents/rules. Then run the repo-onboard workflow. Do not edit code yet.

First produce:
- detected backend package path
- detected frontend package path
- architecture map
- available scripts
- env variable names only, not values
- backend routes/controllers/services/models
- auth flow
- PayOS payment flow
- Socket.IO events
- Cloudinary upload flow
- frontend router/API/query/store structure
- order/cart/checkout flow
- risky areas
- recommended next cleanup tasks
```

## File nào thường được nạp thẳng?

| Nhóm | Path | Cách dùng |
|---|---|---|
| Repo constitution | `AGENTS.md` | Nên được yêu cầu đọc đầu session/task lớn |
| Rules | `.agents/rules/*.md` | Guardrails nền cho Antigravity workspace |
| Skills | `.agents/skills/*/SKILL.md` | Agent có thể chọn theo description; với task rủi ro nên mention rõ |
| Workflows | `.agents/workflows/*.md` | Dev nên gọi rõ khi làm task |
| Audit docs | `PROJECT_AGENT_AUDIT.md` | Mention khi review dependencies/risk/cleanup |
| Tool permissions | `ANTIGRAVITY_TOOL_PERMISSIONS.md` | Mention khi cấp terminal/MCP/SSH/GitHub/database access |

## Workflows nên gọi

```txt
Run the repo-onboard workflow.
Run the implement-feature workflow for: <task>
Run the add-api-endpoint workflow for: <api>
Run the fix-bug workflow for: <bug>
Run the security-review workflow for the current diff.
Run the qa-order-flow workflow for this release.
Run the deploy-vps workflow. Produce a runbook only; do not execute production commands.
```

## Skills nên mention rõ

```txt
Use the express-api-senior skill.
Use the react-food-ui skill.
Use the mongodb-commerce-data skill.
Use the checkout-order-domain skill.
Use the payos-payment-guardian skill.
Use the socketio-realtime-guardian skill.
Use the cloudinary-upload-guardian skill.
Use the ai-provider-guardian skill.
Use the security-reviewer skill.
Use the vps-deploy-guardian skill.
```

## Ghi chú về `.agents` và `.agent`

Bộ này dùng `.agents` làm path chính. Một số tài liệu/bản preview cũ của Antigravity có thể nhắc `.agent`. Nếu Antigravity trên máy bạn không nhận `.agents`, hãy tạo mirror:

```bash
cp -R .agents .agent
```

Không giữ hai bản lâu dài nếu team không cần; dễ bị lệch nội dung. Chọn một path mà Antigravity của team bạn đang nhận.

## Cập nhật GitHub-inspired trong bản này

Bản này bổ sung thêm các ý tưởng thực chiến từ những repo agent/rules/skills tốt trên GitHub:

```txt
.agents/references/
.agents/skills/agent-kit-maintainer/
.agents/skills/repo-risk-scanner/
.agents/skills/spec-first-planner/
.agents/skills/code-review-sentinel/
.agents/skills/performance-hotpath-reviewer/
.agents/workflows/spec-first.md
.agents/workflows/plan-atomic-slices.md
.agents/workflows/review-current-diff.md
.agents/workflows/post-task-report.md
.agents/workflows/learn-from-session.md
.agents/workflows/agent-kit-audit.md
.agents/rules/05-skill-routing-and-artifacts.md
.agents/rules/70-change-management-and-git.md
.agents/rules/80-agent-memory-and-learning.md
GITHUB_REFERENCE_NOTES.md
```

## Prompt nên dùng sau khi cài

```txt
Read AGENTS.md and all .agents/rules. Then run repo-onboard workflow. Do not edit code yet.
After onboarding, evaluate applicable skills before every non-trivial task.
```

## Kiểm tra kit sau khi copy vào repo

```bash
python .agents/skills/agent-kit-maintainer/scripts/audit_agent_kit.py .
```

## Scan rủi ro repo trước khi merge lớn

```bash
python .agents/skills/repo-risk-scanner/scripts/safe_repo_scan.py .
```

## Về thư mục `.agent` và `.agents`

Bản này dùng `.agents` làm source of truth vì nhiều repo Antigravity cộng đồng dùng `.agents/skills`. Một số tài liệu/codelab có nhắc `.agent/skills`. Nếu Antigravity trên máy bạn chỉ nhận `.agent`, chạy:

```bash
cp -R .agents .agent
```

Hoặc dùng installer với biến môi trường:

```bash
MIRROR_DOT_AGENT=true ./install-antigravity-only.sh /absolute/path/to/repo
```

## Memory layer setup

This kit includes repository-backed agent memory under `.agents/memory/`.

Recommended first command after installing:

```bash
python .agents/skills/memory-curator/scripts/update_memory_index.py .
```

Recommended prompt before non-trivial tasks:

```txt
Read AGENTS.md. Use memory-retriever and run retrieve-memory workflow before planning. State which memory cards you consulted. If you learn a new bug pattern or team rule, use lesson-capture and update MEMORY_INDEX.md before the final report.
```

Recommended weekly/release prompt:

```txt
Use memory-curator and run memory-audit workflow. Deduplicate memory cards, mark stale cards, update MEMORY_INDEX.md, and propose lessons that should be promoted into rules/skills/workflows.
```
