# AGENTS.md — Senior AI Agent Guide

This repository is a MERN + TypeScript food-ordering / online food store system.

The AI agent must behave like a careful senior engineer: inspect before editing, preserve existing architecture, minimize blast radius, write type-safe code, validate inputs, and never make production-risky changes without an explicit human decision.

## Known Stack

### Backend package

- Package name: `backend`
- Package manager: `pnpm@9.15.4`
- Runtime target: Node `22.x`
- Main entry: `src/index.ts`
- Framework: Express `4.21.x` + TypeScript `5.9.x`
- Database: MongoDB via Mongoose `8.2.x`
- Validation: Zod `4.x`
- Auth/security-related deps: `jsonwebtoken`, `bcryptjs`, `cookie`, `cookie-parser`, `cors`, `dotenv`
- Payment: `@payos/node`
- Upload/media: `multer`, `cloudinary`, `mime-types`
- Realtime: `socket.io`
- Jobs/email: `node-cron`, `nodemailer`
- AI providers: `@google/generative-ai`, `groq-sdk`

Backend scripts:

```bash
pnpm dev      # ts-node-dev --respawn --transpile-only -r tsconfig-paths/register src/index.ts
pnpm build    # tsc && tsc-alias
pnpm start    # node dist/index.js
pnpm test     # jest
```

### Frontend package

- Package name: `fe-foa`
- Package manager: `pnpm@9.15.4`
- Framework: React `19.2.x` + TypeScript `5.9.x`
- Bundler: `rolldown-vite@7.2.5` through `vite` override
- Router: `react-router` / `react-router-dom` `7.12.x`
- Server state: TanStack React Query `5.x`
- Forms: React Hook Form `7.x` + Zod resolver
- UI/styling: Tailwind CSS `4.x`, MUI `7.x`, Emotion, Radix Slot, lucide-react, class-variance-authority, clsx, tailwind-merge
- Client state: Zustand `5.x`
- Realtime: `socket.io-client`
- i18n: i18next + react-i18next
- Charts: Recharts `3.x`

Frontend scripts:

```bash
pnpm dev
pnpm build    # tsc -b && vite build
pnpm lint
pnpm preview
```

## How to locate packages

The repo may be a monorepo or two folders. Before running commands, the agent must locate the actual directories by searching for package.json files where:

- backend package has `"name": "backend"`
- frontend package has `"name": "fe-foa"`

Never assume folder names blindly. Common candidates are `backend/`, `server/`, `api/`, `frontend/`, `client/`, `fe/`, and `fe-foa/`.

## Core operating rules

1. Read relevant files before editing. Do not invent project structure.
2. Prefer small, reviewable patches over large rewrites.
3. Reuse existing patterns for routes, controllers, services, models, hooks, components, and API clients.
4. Do not introduce new dependencies unless the task truly requires it. Explain why first.
5. Do not rename public routes, database fields, env names, socket events, or order/payment statuses unless explicitly requested.
6. Keep TypeScript type-safe. Avoid `any`; if unavoidable, isolate it and explain why.
7. Never log secrets, tokens, OTPs, raw authorization headers, cookies, full payment payloads, or private customer data.
8. Never read, print, modify, or commit `.env`, private keys, database dumps, backup archives, SSH keys, or production credentials.
9. Never run destructive production commands such as database drop, collection delete, Docker volume prune, `rm -rf`, or schema migration without explicit human approval.
10. If the agent is uncertain, it must inspect more code first, then make the smallest safe change.

## Backend architecture expectations

Follow the existing architecture. If the repo does not yet have a clean separation, prefer this structure for new modules:

```txt
src/
  routes/
  controllers/
  services/
  repositories/        # optional but preferred for complex Mongo queries
  models/
  validators/
  middlewares/
  utils/
  config/
  jobs/
  sockets/
```

Rules:

- Express routes should be thin.
- Controllers should handle HTTP concerns only: params, body, auth context, status codes.
- Services should hold business logic.
- Mongoose models should define schema, indexes, statics/methods only when useful.
- Zod validators should be used for request body/query/params where possible.
- Use consistent response/error format already present in the repo.
- Do not bypass existing auth middleware.
- Do not trust client-sent user id, role, price, discount, delivery fee, order total, payment amount, or status.

## Food-commerce domain invariants

The server is the source of truth.

For cart, checkout, payment, and order flows:

- Server must recompute item prices, discounts, delivery fees, taxes, and final total.
- Server must check item availability, store/branch availability, opening hours, inventory/stock if applicable, and delivery eligibility if these concepts exist.
- Order creation must be idempotent where retries can happen.
- Payment callbacks/webhooks must be idempotent and verified.
- Payment status must not be trusted from the frontend.
- Order status transitions must follow a defined state machine.
- Refund/cancel logic must preserve auditability.
- Admin/staff/customer permissions must be enforced server-side.
- Customer-facing responses should not leak internal fraud/security/payment details.

Suggested order state model if the repo does not already define one:

```txt
pending_payment -> paid -> confirmed -> preparing -> ready -> delivering -> completed
pending_payment -> cancelled
paid -> refund_pending -> refunded
confirmed/preparing/ready -> cancelled_by_store
```

Use the repo's actual statuses if they already exist.

## PayOS rules

Payment code is high-risk.

- Create payment requests only from server-calculated totals.
- Store payment/order identifiers before redirecting the user.
- Verify PayOS webhook/callback authenticity using the official SDK or existing project utility.
- Handle duplicate webhook delivery safely.
- Never mark an order as paid based only on a client redirect page.
- Use a payment transaction collection/table or embedded payment history if available.
- Never log raw payment signatures, secrets, or full webhook payloads in production logs.

## Socket.IO rules

Realtime events must be scoped and authorized.

- Authenticate socket connections if events expose user/order/admin data.
- Use rooms scoped by user id, store id, branch id, or order id.
- Do not broadcast private order data globally.
- Keep event names stable and documented.
- Validate incoming socket payloads with Zod or equivalent validation.
- Clean up listeners on frontend unmount.

## Cloudinary and upload rules

Uploads are security-sensitive.

- Validate file type using `mime-types` or existing utility; do not trust extension only.
- Enforce file size limits in multer.
- Use allowlists for image/video MIME types.
- Avoid exposing Cloudinary secrets to the frontend.
- Delete temporary files after successful or failed upload if disk storage is used.
- Store only necessary Cloudinary metadata: public id, secure URL, type, size, width/height if needed.
- Do not accept arbitrary remote URLs from users unless validated.

## AI provider rules: Gemini and Groq

AI output is untrusted input.

- Do not let AI provider output directly modify orders, payments, auth roles, pricing, inventory, or permissions.
- Validate AI responses with Zod before using them.
- Add timeouts and graceful failure behavior around AI calls.
- Never send secrets, JWTs, payment data, passwords, private user messages, or database dumps to AI providers.
- Clearly separate AI-generated suggestions from authoritative system decisions.

## MongoDB / Mongoose rules

- Validate ObjectId params before querying.
- Use indexes for frequent queries: user orders, store orders, slug, status, createdAt, payment order code, etc.
- Avoid unbounded queries and unbounded pagination.
- Prefer `.lean()` for read-only list/detail responses when document methods are not needed.
- Use atomic updates for inventory/order/payment status changes.
- Use transactions only if the deployment supports replica set; otherwise design idempotent compensating logic.
- Never run broad `updateMany` or `deleteMany` without a highly specific filter and explicit human confirmation.

## Frontend architecture expectations

Follow existing folders. For new feature code, prefer a feature-oriented structure if no clear pattern exists:

```txt
src/
  app/
  routes/
  features/
    orders/
      api/
      components/
      hooks/
      schemas/
      types.ts
  components/
  lib/
  stores/
  i18n/
```

Rules:

- Use React Query for server state, caching, mutations, invalidation, and loading/error states.
- Use Zustand only for client/session/UI state, not as a duplicate server cache.
- Use React Hook Form + Zod for non-trivial forms.
- Keep API calls in API modules/hooks, not directly inside large components.
- Keep React Router v7 patterns consistent with the repo; do not import legacy v5/v6-only types or APIs.
- Clean up Socket.IO event listeners on unmount.
- Do not expose secret env variables; only Vite `VITE_*` variables are allowed client-side.
- Use i18next keys for customer-facing strings if the module is already internationalized.
- Avoid mixing MUI, Tailwind, and Radix randomly. Follow the existing design pattern of the screen/module.

## TypeScript and dependency notes

The current dependency list has a few areas where the agent must be careful:

- Backend targets Node 22, but backend dev dependency has `@types/node@20.x`. Do not assume all Node 22 types are available unless the package is updated.
- Frontend includes `@types/react-router-dom@5.x` while `react-router-dom@7.x` ships its own types. This can cause type confusion. Do not use v5 APIs or types.
- Frontend uses `vite` as `npm:rolldown-vite@7.2.5`. Do not blindly upgrade or replace Vite/Rolldown config.
- Backend has Jest script but no visible `jest`, `ts-jest`, or `supertest` in the provided package list. Before writing integration tests, inspect actual repo config. If missing, either add minimal unit tests using existing setup or propose test dependency additions.
- Frontend has lint/build scripts but no visible test runner. Do not write Vitest/RTL tests unless dependencies/config exist or are approved.

## Quality gates

Before finalizing backend changes, run from the backend package directory when possible:

```bash
pnpm build
pnpm test
```

Before finalizing frontend changes, run from the frontend package directory when possible:

```bash
pnpm lint
pnpm build
```

If a command cannot be run due to missing dependencies, unavailable services, or environment constraints, report exactly what was not run and why.

## VPS / production deployment guardrails

Production VPS is self-managed and high-risk.

- Do not deploy production automatically.
- Do not SSH to production or modify production services without explicit instruction.
- Before deploy, verify git status, build result, env names, database backup, rollback plan, and health check.
- Do not print secrets from `.env` or shell history.
- Do not run `docker system prune`, `docker volume prune`, `rm -rf`, database drop, or destructive migration commands.
- Prefer zero/low-downtime deployment if current infrastructure supports it.
- After deploy, verify health endpoint, logs, frontend route loading, checkout/order smoke flow, payment callback endpoint, and socket connection if relevant.

## Pull request standard

Every AI-generated PR or patch must include:

- What changed
- Why it changed
- Files touched
- How it was tested
- Any migrations/env changes
- Any payment/order/security implications
- Rollback notes for risky changes

## When the agent should stop and ask for human approval

Stop before:

- Changing payment semantics
- Changing order status model
- Changing auth/role permissions
- Running migrations on production data
- Adding new external services
- Rotating secrets
- Deleting data/files
- Changing deployment process
- Installing large new dependencies

## Agent Lifecycle — GitHub-inspired Senior Loop

For any non-trivial task, use this loop:

```txt
Discover -> Spec -> Plan atomic slices -> Implement one slice -> Verify -> Review diff -> Report -> Learn if needed
```

### Discover

Read `AGENTS.md`, relevant `.agents/rules`, relevant `SKILL.md`, then inspect existing source code. Do not assume folder names or architecture.

### Spec

For risky or vague tasks, use `spec-first-planner` and `spec-first` workflow. Define acceptance criteria and non-goals before code.

### Plan atomic slices

Prefer small changes that can be reviewed and rolled back independently. Do not mix unrelated refactor/dependency/deploy work into feature patches.

### Implement

Apply the relevant skill(s). Keep public contracts stable unless explicitly changed.

### Verify

Use available commands:

- Backend: `pnpm build`, `pnpm test`
- Frontend: `pnpm lint`, `pnpm build`

If commands cannot run, say why.

### Review

Before final response, review changed diff for secrets, debug logs, validation, authorization, payment/order consistency, socket scoping, frontend cache invalidation, and deployment risk.

### Report

Use `post-task-report` format for completion. Include files changed, checks run, checks not run, and remaining risk.

### Learn

If the team corrects the same behavior repeatedly, suggest `learn-from-session` to update `.agents`.

## Skill Usage Policy

Before relying on generic model knowledge, evaluate applicable project skills. For high-risk tasks, explicitly say which skills are being used.

Do not blindly import public skill packs. Public repos are idea sources; this repo's `.agents` content must remain reviewed, minimal, and project-specific.

## Repository-backed Agent Memory

This repo uses `.agents/memory/` as durable project memory for Antigravity.

Important distinction:

- Model/chat memory is not reliable enough for team engineering standards.
- Repo memory is explicit Markdown stored in git and reviewed by humans.

For non-trivial tasks, the agent must:

1. Read `.agents/memory/MEMORY_INDEX.md` after `AGENTS.md`.
2. Retrieve relevant memory cards before planning.
3. State which memory cards were consulted.
4. Capture new memory after bugs, failed attempts, new rules, incidents, or repeated review comments.
5. Update `MEMORY_INDEX.md` after adding/editing memory cards.
6. Propose promotion when a lesson is Critical/High or repeated.

Use these skills/workflows:

```txt
memory-retriever        # retrieve relevant memory before work
lesson-capture          # write new lesson/pattern/incident/decision cards
memory-curator          # audit/dedupe/update MEMORY_INDEX.md
rule-evolution-engine   # promote lessons into rules/skills/workflows/references
retrieve-memory         # workflow before implementation/review/debug
capture-lesson          # workflow after new learning
memory-audit            # workflow for periodic cleanup
promote-lesson          # workflow for durable guardrail promotion
post-incident-review    # workflow after production/staging/high-impact issue
```

Memory must never contain secrets, `.env` values, JWTs, private keys, payment signatures, raw production logs, customer private data, or database dumps.
