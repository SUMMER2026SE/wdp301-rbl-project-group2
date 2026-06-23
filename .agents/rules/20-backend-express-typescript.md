# Backend Express + TypeScript Rules

Backend package is known as `backend`.

Stack:

- pnpm `9.15.4`
- Node `22.x`
- Express `4.21.x`
- TypeScript `5.9.x`
- Mongoose `8.2.x`
- Zod `4.x`

Scripts:

```bash
pnpm dev
pnpm build
pnpm start
pnpm test
```

## Architecture

Follow existing structure. For new modules, prefer:

```txt
routes -> middlewares -> validators -> controllers -> services -> repositories/models
```

Rules:

- Routes define paths and middleware only.
- Controllers translate HTTP request/response concerns.
- Services contain business rules.
- Repositories/helpers contain complex Mongo queries.
- Validators use Zod for body/query/params.
- Models define schema/indexes and minimal model behavior.

## TypeScript

- Avoid `any`; prefer typed DTOs and inferred Zod types.
- Keep path aliases compatible with `tsconfig-paths` and `tsc-alias`.
- Do not use Node 22-only APIs unless backend `@types/node` supports them or types are aligned.
- Do not suppress errors with broad `as any` or `// @ts-ignore` unless there is a documented reason.

## Express API rules

- Validate ObjectId params before Mongoose queries.
- Return consistent response shapes used by the repo.
- Use existing error handler / async handler pattern.
- Never leak stack traces in production responses.
- Use correct HTTP status codes.
- Do not bypass auth/role middleware.
- Do not trust role/user id from request body.

## Security rules

- JWT secrets, cookies, PayOS keys, Cloudinary keys, email passwords, and AI API keys must stay server-side.
- Use secure cookie options in production if cookies are used: `httpOnly`, `secure`, `sameSite` appropriate to deployment.
- CORS should be allowlist-based in production.
- Do not log authorization headers, cookies, raw tokens, OTPs, passwords, or secrets.

## Performance rules

- Use pagination for list endpoints.
- Use projection to avoid sending unnecessary fields.
- Use `.lean()` for read-only queries when Mongoose document methods are not needed.
- Add indexes for frequent queries.
- Avoid N+1 query patterns.
