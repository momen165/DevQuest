# DevQuest AI Coding Instructions

## 🏗️ Architecture Overview
- **Frontend**: React 19 (Vite) + MUI + Monaco Editor. Uses Context API for state (`client/src/AuthContext.jsx`).
- **Backend**: Node.js (Express) + PostgreSQL. No ORM; uses raw SQL in `server/models/`.
- **Code Execution**: Uses Judge0 API via `server/controllers/codeExecution.controller.js`.
- **Storage/Payments**: CloudFlare R2 for uploads, Stripe for payments.

## 🛠️ Developer Workflows
- **Development**: Run `npm run dev` in both `client/` and `server/` directories.
- **Database**: SQL migrations and setup scripts are in `server/scripts/`.
- **Linting**: Uses Biome (`@biomejs/biome`) for frontend linting/formatting.

## 📝 Coding Patterns & Conventions

### Backend (Express)
- **Routing**: Routes are defined in `server/routes/` and use middleware for auth and performance.
  - Example: `router.get('/path', authenticateToken, performanceMiddleware('label'), controller.method)`.
- **Models**: Define raw SQL queries as objects in `server/models/`.
  - Example: `const courseQueries = { getAll: async () => { ... } }`.
- **Controllers**: Handle request logic and call model queries. Use `handleError` for consistent error responses.
- **Middleware**: Use `authenticateToken` for JWT verification and `requireAuth` for protected actions.

### Frontend (React)
- **Routing**: React Router 7. Pages are lazy-loaded in `client/src/App.jsx`.
- **Components**: Reusable components in `client/src/components/`, page-specific ones in `client/src/pages/`.
- **API Calls**: Use Axios. Base URL should be configured via `VITE_API_URL`.
- **Styling**: Mix of MUI components and CSS Modules.

## ⚠️ Critical Integration Points
- **Stripe Webhooks**: Handled in `server/routes/payment.routes.js`.
- **Mailgun**: Used for transactional emails (`server/utils/email.js`).
- **Judge0**: Configuration and language-specific error formatting in `server/controllers/codeExecution.controller.js`.

## 🔍 Key Files
- [server/server.js](server/server.js): Main entry point for the backend.
- [client/src/App.jsx](client/src/App.jsx): Main entry point and routing for the frontend.
- [server/config/database.js](server/config/database.js): PostgreSQL connection configuration.
- [server/middleware/auth.js](server/middleware/auth.js): JWT authentication logic.
