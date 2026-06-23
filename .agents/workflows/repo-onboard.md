# Workflow: repo-onboard

Goal: understand the repository before editing.

## Steps

1. Read `AGENTS.md` and `.agents/rules/*`.
2. Locate package.json files:
   - backend package name `backend`
   - frontend package name `fe-foa`
3. Identify package paths and scripts.
4. Inspect root files: README, pnpm-workspace, docker compose, nginx/deploy docs, env examples.
5. Inspect backend:
   - entrypoint `src/index.ts`
   - app/server setup
   - routes
   - middlewares
   - auth/session/JWT logic
   - Mongoose connection
   - models/schemas
   - PayOS/payment code
   - Socket.IO setup
   - Cloudinary/upload code
   - cron jobs
   - AI provider wrappers
6. Inspect frontend:
   - router setup
   - API client/axios config
   - React Query provider
   - Zustand stores
   - auth handling
   - checkout/order/payment pages
   - socket client setup
   - i18n setup
7. Produce an architecture map.

## Output

Return:

- Detected backend path
- Detected frontend path
- Build/test/lint commands
- Main backend modules
- Main frontend modules
- API auth strategy
- Payment flow summary
- Order status model if found
- Socket events if found
- Env variable names only
- Highest-risk areas
- Suggested next cleanup tasks

Do not edit code during this workflow unless explicitly asked.
