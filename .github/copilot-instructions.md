## DevQuest AI coding notes

### Big picture

- Monorepo with two workspaces: React/Vite client in [client/](client/) and Express API in [server/](server/). Root scripts run both via `concurrently` in [package.json](package.json).
- API base path is `/api` and is mounted in [server/server.js](server/server.js). Public endpoints (health, feedback, courses, maintenance) are defined before auth middleware.
- Frontend routing is React Router with lazy-loaded pages and layouts in [client/src/app/App.jsx](client/src/app/App.jsx). Maintenance gating uses `MaintenanceCheck`; auth gating uses `ProtectedRoute`.
- Pageview tracking is client-driven: `AppContent` posts to `/track-pageview` with a normalized path in [client/src/app/App.jsx](client/src/app/App.jsx), handled by [server/routes/pageview.routes.js](server/routes/pageview.routes.js).

### Data and integrations

- Prisma uses a pooled `pg` adapter and optional SSL cert in [server/config/prisma.js](server/config/prisma.js). Connection is from `DATABASE_URL` or `DB_*` vars; see [README.md](README.md).
- Stripe webhooks require `express.raw()` before body parsing; keep `/api/webhook` ordering intact in [server/server.js](server/server.js).
- CORS uses `CLIENT_URL` (preferred) with `FRONTEND_URL` as a fallback in [server/server.js](server/server.js).
- Sentry is initialized in the client entry point [client/src/main.jsx](client/src/main.jsx) using `VITE_SENTRY_DSN`.

### Project conventions

- Route files handle auth explicitly; `authenticateToken` allows anonymous requests and `requireAuth`/`requireAdmin` enforce protection in [server/middleware/auth.js](server/middleware/auth.js).
- `authenticateToken` caches admin lookups with `node-cache` to reduce DB queries in [server/middleware/auth.js](server/middleware/auth.js).
- Client import aliases are configured in [client/jsconfig.json](client/jsconfig.json) and [client/vite.config.mjs](client/vite.config.mjs) (for example, `app/*`, `features/*`, `shared/*`).

### Developer workflows

- Root dev: `npm run dev` (runs server and client) in [package.json](package.json).
- Client dev/build: `npm run dev` / `npm run build` in [client/package.json](client/package.json).
- Server dev/start: `npm run dev` / `npm run start` in [server/package.json](server/package.json).
- Prisma: `npm run prisma:generate` or `npm run prisma:push` in [server/package.json](server/package.json).

### Where to look first

- API routes: [server/routes/](server/routes/)
- Controllers: [server/controllers/](server/controllers/)
- Frontend pages/features: [client/src/pages/](client/src/pages/) and [client/src/features/](client/src/features/)
- Shared UI and utils: [client/src/shared/](client/src/shared/)
