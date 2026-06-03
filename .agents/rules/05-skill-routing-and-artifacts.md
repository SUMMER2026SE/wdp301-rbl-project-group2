# Skill Routing and Task Artifacts

This repository uses Antigravity rules, workflows, and skills together. The agent must not treat them as decorative docs.

## Skill routing protocol

Before implementing non-trivial work, identify applicable skills by name.

Mandatory skills by domain:

- Backend API: `express-api-senior`, `mongodb-commerce-data`
- React UI: `react-food-ui`
- Checkout/order/cart/payment: `checkout-order-domain`, `payos-payment-guardian`
- Socket.IO realtime: `socketio-realtime-guardian`
- Upload/media: `cloudinary-upload-guardian`
- Gemini/Groq: `ai-provider-guardian`
- Deploy/VPS: `vps-deploy-guardian`
- Security review: `security-reviewer`
- Feature planning: `spec-first-planner`
- Agent rules/skills maintenance: `agent-kit-maintainer`
- Performance-sensitive query/API work: `performance-hotpath-reviewer`
- Final diff review: `code-review-sentinel`

If a task touches payment, auth, order status, customer data, upload, production deploy, or database migrations, explicitly say which high-risk skill is being applied before editing.

## Progressive disclosure

Do not load every reference file into context at once. Read the smallest relevant file first, then only load deeper references when the task requires it.

Preferred order:

1. `AGENTS.md`
2. Relevant `.agents/rules/*.md`
3. Relevant skill `SKILL.md`
4. Specific reference/checklist under `.agents/references/`
5. Existing source code and tests

## Task artifacts

For tasks that affect more than 3 files, payment/order/auth/deploy, or shared architecture, produce a short task artifact before editing.

Use `.agents/references/AGENT_TASK_TEMPLATE.md` as the shape. If the user does not want a file created, keep the artifact in the chat response.

Required artifact sections:

- Goal
- In scope / out of scope
- Relevant skills
- Existing patterns found
- Planned atomic slices
- Verification commands
- Risk notes

## Evidence-based completion

At completion, report:

- files changed
- commands run
- commands not run and why
- behavior verified
- remaining risk
- suggested follow-up only if it is actionable
