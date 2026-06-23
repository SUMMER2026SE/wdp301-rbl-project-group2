---
name: react-food-ui
description: Use this skill when building or reviewing React 19 food-ordering frontend UI, React Router routes, TanStack Query hooks, Zustand stores, React Hook Form and Zod forms, or Socket.IO client updates.
---

# Skill: react-food-ui

Use this skill when building frontend UI for the food-ordering app.

## Context

Frontend package:

- React 19.2.x
- React Router 7.12.x
- TanStack React Query 5.x
- Zustand 5.x
- React Hook Form + Zod
- Tailwind 4.x + MUI 7.x + Emotion
- Vite through rolldown-vite

## Procedure

1. Locate frontend package by package name `fe-foa`.
2. Inspect existing feature/component patterns.
3. Put API calls in API modules or hooks.
4. Use React Query for server data.
5. Use Zustand only for local/client state.
6. Use RHF + Zod for forms.
7. Add loading, empty, and error states.
8. Keep route APIs compatible with React Router v7.
9. Use i18n for customer-facing copy when the module uses translations.
10. Run checks when possible:

```bash
pnpm lint
pnpm build
```

## Food UI checklist

- Cart update is clear and resilient.
- Checkout errors are actionable.
- Payment return/cancel states are understandable.
- Order status UI maps correctly to backend states.
- Mobile layout works.
- Socket listeners are cleaned up.
