---
name: socketio-realtime-guardian
description: Use this skill when adding or reviewing Socket.IO server events, room scoping, realtime order notifications, frontend socket listeners, or React Query invalidation from realtime events.
---

# Skill: socketio-realtime-guardian

Use this skill when adding or reviewing realtime events.

## Procedure

1. Find socket server initialization.
2. Find authentication/room join logic.
3. Define event name and payload type.
4. Validate inbound payloads.
5. Emit only after database change succeeds.
6. Scope event to user/store/order/admin room.
7. On frontend, register listener in a hook/effect and clean it up.
8. Update React Query cache or invalidate query intentionally.

## Guardrails

- Do not broadcast private order/payment/customer data globally.
- Socket events are notifications, not durable state.
- HTTP API/MongoDB remains source of truth.
