# Project Agent Audit — Based on Provided package.json Files

This audit helps the AI agent understand risk areas before touching code.

## Backend summary

- `pnpm@9.15.4`
- Node engine: `22.x`
- Express `4.21.2`
- TypeScript `5.9.3`
- Mongoose `8.2.0`
- Zod `4.1.12`
- PayOS SDK `@payos/node@2.0.5`
- Socket.IO `4.8.1`
- Cloudinary `1.41.3`
- Multer `2.0.2`
- Nodemailer `7.0.12`
- AI providers: Google Generative AI + Groq

## Frontend summary

- `pnpm@9.15.4`
- React `19.2.0`
- React Router / React Router DOM `7.12.0`
- TanStack React Query `5.90.21`
- Zustand `5.0.11`
- React Hook Form `7.71.2`
- Zod `4.3.6`
- Tailwind CSS `4.1.18`
- MUI `7.3.7`
- Vite alias: `npm:rolldown-vite@7.2.5`

## High-risk areas

### 1. Payment with PayOS

The agent must not treat client redirect success as payment success. Server must verify PayOS webhook/callback and update payment/order status idempotently.

### 2. Order totals

Do not trust frontend totals. Backend must compute subtotal, discount, delivery fee, final amount, and PayOS amount from database data.

### 3. Socket.IO privacy

Do not broadcast private orders globally. Use user/store/order rooms and authenticated socket connections.

### 4. Upload security

Multer + Cloudinary must enforce MIME allowlist, file size limits, cleanup, and no secret exposure.

### 5. AI provider output

Gemini/Groq responses are untrusted. They should never directly change orders, payment, role, inventory, or permissions.

### 6. Dependency mismatch watchlist

- Backend uses Node 22 engine but `@types/node@20.x`. Node 22-specific APIs may type-fail.
- Frontend includes `@types/react-router-dom@5.x` while using React Router DOM 7. This package is likely unnecessary and can mislead agents into old APIs.
- Backend has `pnpm test` but package list provided does not include `jest`, `ts-jest`, or `supertest`. Inspect repo before adding tests.
- Frontend has no visible test runner. Use `pnpm lint` and `pnpm build` unless test infra exists.

## Suggested dependency cleanup PRs

These are suggestions, not automatic changes:

1. Frontend: consider removing `@types/react-router-dom` if React Router DOM 7 types are already provided and build passes without it.
2. Backend: consider aligning `@types/node` with Node 22 if code uses Node 22 APIs.
3. Backend: confirm Jest config and install missing test dependencies only if tests currently fail due to missing packages.
4. Consider adding request rate limiting, security headers, and input sanitization packages only after reviewing existing middleware.
