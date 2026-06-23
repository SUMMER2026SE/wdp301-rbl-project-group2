# Frontend React 19 Rules

Frontend package is known as `fe-foa`.

Stack:

- React `19.2.x`
- React Router / React Router DOM `7.12.x`
- TypeScript `5.9.x`
- TanStack React Query `5.x`
- React Hook Form `7.x` + Zod
- Zustand `5.x`
- Tailwind CSS `4.x`
- MUI `7.x` + Emotion
- Radix Slot, lucide-react, class-variance-authority, clsx, tailwind-merge
- i18next/react-i18next
- Recharts
- Vite via `npm:rolldown-vite@7.2.5`

Scripts:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm preview
```

## Architecture

Follow existing folder structure. For new features, prefer:

```txt
features/<feature>/api
features/<feature>/components
features/<feature>/hooks
features/<feature>/schemas
features/<feature>/types.ts
```

## Server state

- Use React Query for API data, loading, error, mutation, cache invalidation.
- Use stable query keys.
- Invalidate affected queries after mutations.
- Do not duplicate server data into Zustand unless there is a clear reason.

## Client/UI state

- Use Zustand for client-only state: cart draft, UI filters, modal state, session-like local state.
- Keep persistence intentional; do not persist sensitive user/payment data in localStorage.

## Forms

- Use React Hook Form + Zod for forms with validation.
- Keep frontend validation aligned with backend Zod schemas or API contracts.
- Never rely only on frontend validation for security/business rules.

## Router

- Use React Router v7-compatible APIs already used in the repo.
- Do not import or rely on React Router v5 patterns.
- Avoid using `@types/react-router-dom` v5 types as a guide; React Router DOM 7 includes types.

## UI/styling

- Follow the screen's existing UI system.
- Do not randomly mix MUI and Tailwind in the same component unless the surrounding code already does.
- Use `cn`/`clsx`/`tailwind-merge` helpers if the repo has them.
- Keep components accessible: labels, button types, keyboard-friendly controls.

## i18n

- Use existing translation namespaces/keys for customer-facing text.
- Do not hardcode Vietnamese/English copy inside shared components if the module uses i18n.

## Realtime

- Socket events should update or invalidate React Query state carefully.
- Clean up socket listeners on unmount.
- Do not treat socket payload as the only source of truth for critical order/payment state.
