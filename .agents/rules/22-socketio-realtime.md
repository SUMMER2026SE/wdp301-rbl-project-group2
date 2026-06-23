# Socket.IO Realtime Rules

Backend uses `socket.io`; frontend uses `socket.io-client`.

## Security

- Authenticate socket connections before exposing private data.
- Use rooms scoped to `userId`, `storeId`, `branchId`, `orderId`, or admin/staff roles.
- Never broadcast private order/customer/payment details globally.
- Validate incoming socket payloads.
- Do not trust role/user/store id from client socket payload.

## Event design

- Keep event names stable and documented.
- Prefer explicit names such as `order:updated`, `payment:updated`, `store:order:new`.
- Keep payloads small and typed.
- Avoid sending full user/customer records if only id/status is needed.

## Frontend cleanup

When adding socket listeners in React:

- Register inside `useEffect` or a dedicated hook.
- Remove listeners in cleanup.
- Avoid duplicate listener registration on rerenders.
- Keep socket state separate from React Query cache; invalidate/update queries intentionally.

## Reliability

- Socket events should notify the UI, not be the sole source of truth.
- Critical state must be persisted in MongoDB and available through HTTP API.
