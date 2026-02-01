# DevQuest AI Agent Instructions

## 🏗 Project Architecture
- **Type**: Monorepo-style structure with distinct `client` (React/Vite) and `server` (Node/Express) directories.
- **Root**: Manages concurrent execution of both services via `npm run dev`.
- **Database**: PostgreSQL accessed via `pg` driver using raw SQL queries. No ORM.
- **Authentication**: Custom JWT implementation with Access (2h) and Refresh (7d) tokens. Use `server/middleware/auth.js`.

## 💻 Tech Stack
- **Frontend**: React 18, Vite, Material-UI, CSS Modules, Axios, formatting via Prettier/ESLint.
- **Backend**: Express.js, PostgreSQL, Node.js, Stripe, Mailgun, AWS S3.
- **Services**:
  - `Stripe`: Payment processing (webhooks in `server/routes/payment.routes.js`).
  - `Mailgun`: Transactional emails.
  - `AWS S3`: File storage.

## 🛠 Critical Developer Workflows
- **Start Development**: Run `npm run dev` in the root directory to start both client (port 5173 default) and server (port 5000 default).
- **Server DB Connection**: Managed in `server/config/database.js`. Exports a `Pool` object.
- **Frontend API Config**: Primary axios instance at `client/src/shared/lib/apiClient.js`. Prefer using this over local `axios.create` calls.
- **Scripts & Migrations**: Database migrations and utility scripts are located in `server/scripts/` (e.g., `performance-indexes-migration.sql`).

## 📝 Coding Patterns & Conventions

### Backend (Server)
- **Data Access**: 
  - Do NOT use an ORM. Use raw SQL strings with parameterized queries: `db.query('SELECT * FROM users WHERE id = $1', [id])`.
  - "Models" (e.g., `server/models/badge.model.js`) are actually Data Access Objects (DAOs) containing schema setup (`CREATE TABLE`) and helper functions.
- **Error Handling**: 
  - Wrap all async controller functions with `asyncHandler` from `server/utils/error.utils.js` (preferred) or `handleAsync`.
  - Throw `AppError` (from `server/utils/error.utils.js`) for controlled error responses.
- **Route Structure**: 
  - Routes defined in `server/routes/`.
  - Controllers in `server/controllers/`.
  - Middleware in `server/middleware/`.

### Frontend (Client)
- **Structure**:
  - `src/app`: App setup, providers, layouts.
  - `src/features`: Feature-based modules (admin, course, etc).
  - `src/pages`: Route entry components.
  - `src/shared`: Reusable logic and UI.
- **State**: React Context (`AuthContext`) for global auth state.
- **Styling**: Mixed usage of direct CSS imports and CSS Modules. Prefer consistency with existing file patterns.

## 🔍 Key Files
- **Server Entry**: `server/server.js` (Middleware setup, route mounting).
- **Database Config**: `server/config/database.js`.
- **Error Utils**: `server/utils/error.utils.js`.
- **Frontend Entry**: `client/src/main.jsx`.
- **API Client**: `client/src/shared/lib/apiClient.js`.

## ⚠️ Gotchas
- **Database**: Tables are often created/checked in "Model" files (e.g., `createBadgesTable`). Ensure SQL migrations/schema changes are handled there or in `scripts/`.
- **CORS**: Configured in `server/server.js` to accept `CLIENT_URL` or `FRONTEND_URL`.
- **Env Vars**: Required in both `client/.env` and `server/.env`.
