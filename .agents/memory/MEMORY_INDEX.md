# FOA Agent Memory Index

This index is the first file agents should read after `AGENTS.md` for non-trivial tasks.

> Run `python .agents/skills/memory-curator/scripts/update_memory_index.py .` after adding or editing memory cards.

## Fast routing

| Task area | Read these first |
|---|---|
| Order, cart, checkout | `patterns/order-status-transitions.md`, `patterns/server-computed-totals.md`, `lessons/0000-template.md` |
| PayOS payment/callback/webhook | `patterns/payos-idempotent-webhook.md`, `patterns/server-computed-totals.md` |
| Socket.IO realtime | `patterns/socketio-scoped-rooms.md` |
| Upload/Cloudinary/Multer | `patterns/cloudinary-safe-upload.md` |
| React Query/frontend mutations | `patterns/react-query-mutation-invalidation.md` |
| VPS/deploy | `patterns/vps-safe-deploy-runbook.md`, `incidents/0000-template.md` |
| AI provider/Gemini/Groq | `patterns/ai-provider-safe-boundary.md` |
| New bug/failure | `lessons/0000-template.md`, `workflows/capture-lesson.md` |
| Production/staging incident | `incidents/0000-template.md`, `workflows/post-incident-review.md` |
| New architecture convention | `decisions/0000-template.md`, `workflows/promote-lesson.md` |

## Auto-generated card index

<!-- AUTO-GENERATED:START -->
_Generated on 2026-06-23 from `.agents/memory` cards._

### Lesson

| Severity | Status | Tags | Applies to | Card |
|---|---|---|---|---|
| medium | active | `[referral, membership, points, frontend, legacy-data]` | `[backend, frontend]` | [Lesson: Referral UI must complete both invite and claim flows](lessons/2026-06-22-referral-ui-must-complete-both-invite-and-claim-flows.md) |
| medium | active | `[search, menu, product, mongodb, ux]` | `[backend, frontend]` | [Lesson: Menu search is literal by product name](lessons/2026-06-23-menu-search-is-literal-by-product-name.md) |
| medium | active | `[allergy, cart, product-detail, frontend, ux]` | `[frontend]` | [Lesson: Product detail allergy disclosure is a single confirmation point](lessons/2026-06-23-product-detail-allergy-warning-is-single-confirmation.md) |

### Pattern

| Severity | Status | Tags | Applies to | Card |
|---|---|---|---|---|
| high | active | `[ai-provider, gemini, groq, privacy, zod]` | `[backend]` | [Pattern: AI provider safe boundary](patterns/ai-provider-safe-boundary.md) |
| high | active | `[cloudinary, multer, upload, image, security]` | `[backend, frontend]` | [Pattern: Safe Cloudinary/Multer uploads](patterns/cloudinary-safe-upload.md) |
| critical | active | `[order, status, state-machine, staff, customer]` | `[backend, frontend]` | [Pattern: Order status transitions are a state machine](patterns/order-status-transitions.md) |
| critical | active | `[payos, payment, webhook, callback, idempotency, order]` | `[backend]` | [Pattern: PayOS callback/webhook must be verified and idempotent](patterns/payos-idempotent-webhook.md) |
| medium | active | `[react, react-query, mutation, invalidation, zustand]` | `[frontend]` | [Pattern: React Query owns server state](patterns/react-query-mutation-invalidation.md) |
| critical | active | `[checkout, cart, order, payment, price, total]` | `[backend, frontend]` | [Pattern: Server-computed totals only](patterns/server-computed-totals.md) |
| high | active | `[socketio, realtime, order, privacy, rooms]` | `[backend, frontend]` | [Pattern: Socket.IO events must be scoped to rooms](patterns/socketio-scoped-rooms.md) |
| critical | active | `[vps, deploy, production, rollback, backup]` | `[ops, backend, frontend]` | [Pattern: VPS deployment requires backup, rollback, and smoke tests](patterns/vps-safe-deploy-runbook.md) |

### Uncategorized

| Severity | Status | Tags | Applies to | Card |
|---|---|---|---|---|
|  |  | `` | `` | [Module Index: Backend Auth Flow](module-index/backend-auth-flow.md) |
|  |  | `` | `` | [Module Index: Backend Order Flow](module-index/backend-order-flow.md) |
|  |  | `` | `` | [Module Index: Backend PayOS Flow](module-index/backend-payos-flow.md) |
|  |  | `` | `` | [Module Index: Backend Socket Flow](module-index/backend-socket-flow.md) |
|  |  | `` | `` | [Module Index: Backend Upload Flow](module-index/backend-upload-flow.md) |
|  |  | `` | `` | [Module Index: Frontend API Query Map](module-index/frontend-api-query-map.md) |
|  |  | `` | `` | [Module Index: Frontend Routing Map](module-index/frontend-routing-map.md) |
|  |  | `` | `` | [Module Index: Frontend State Map](module-index/frontend-state-map.md) |
<!-- AUTO-GENERATED:END -->
