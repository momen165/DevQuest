# DevQuest AI Coding Agent Instructions

## Architecture Overview

DevQuest is a full-stack coding education platform with React frontend and Node.js/Express backend, using PostgreSQL with advanced performance monitoring and caching systems.

### Key Architectural Patterns

- **Monorepo Structure**: Root `package.json` with `concurrently` scripts for unified dev workflow
- **Middleware Chain**: All routes use `authenticateToken → sessionTracker → performanceMiddleware → cacheMiddleware`
- **Performance-First**: Every endpoint has performance tracking via `performance.middleware.js` and `cache.utils.js`
- **Multi-tier Caching**: NodeCache with different TTLs (courses: 5min, users: 3min, static: 15min)

## Critical Development Workflows

### Starting the Application

```bash
# From root directory - starts both frontend and backend
npm run dev

# Individual services
npm run dev:server  # Backend only
npm run dev:client  # Frontend only
```

### Database Connection

- Uses PostgreSQL with SSL certificates in `server/certs/ca.pem`
- Connection pooling configured with performance monitoring via `wrapDatabaseQuery()`
- All queries automatically tracked for performance analytics

### Authentication Flow

- JWT-based with refresh tokens and auto-refresh in `AuthContext.jsx`
- Public routes defined in `server/middleware/auth.js` (maintenance-status, health, etc.)
- Authentication state persisted in localStorage with automatic token refresh

## Project-Specific Conventions

### Backend Patterns

1. **Route Structure**: Always include middleware chain:

   ```javascript
   router.get(
     "/endpoint",
     cacheMiddleware("key", ttl),
     performanceMiddleware("endpoint-name"),
     controller.method
   );
   ```

2. **Error Handling**: Use centralized `utils/error.utils.js` with `handleError()` wrapper

3. **Performance Testing**: Each new endpoint requires a test script in `/scripts/` directory following the pattern in `test-course-sections-endpoint.js`

### Frontend Patterns

1. **Lazy Loading**: All page components are lazy-loaded in `App.jsx`
2. **API Client**: Axios with automatic auth headers via `AuthContext`
3. **State Management**: Context API for auth, local state for components
4. **Code Editor**: Monaco Editor integration for interactive coding exercises

### File Upload System

- AWS S3 integration via `utils/s3.utils.js`
- Multer configuration in `config/multer.js` with Sharp for image processing
- Upload routes use `upload.single("image")` middleware

## Integration Points

### External Services

- **Stripe**: Payment processing with webhook handling in `routes/payment.routes.js`
- **AWS S3**: File storage with presigned URL generation
- **Sentry**: Error tracking configured in Vite with source maps
- **Vercel**: Frontend deployment with speed insights

### Database Performance System

- Custom performance indexes in `utils/performance-indexes.sql`
- Query performance tracking via `trackDatabaseQuery()` in `performance.utils.js`
- Automatic performance reports generated in `/scripts/` directory

### Analytics & Monitoring

- User session tracking via `sessionTracker.js` middleware
- Visit tracking with GeoIP detection in `trackVisits.js`
- Performance metrics stored in dedicated analytics tables

## Critical Files for AI Understanding

### Backend Core

- `server/server.js` - Main application setup with middleware chain
- `server/config/database.js` - PostgreSQL connection with SSL and pooling
- `server/middleware/auth.js` - Authentication system with public routes
- `server/utils/cache.utils.js` - Multi-tier caching system
- `server/middleware/performance.middleware.js` - Performance tracking

### Frontend Core

- `client/src/App.jsx` - Main routing with lazy loading
- `client/src/AuthContext.jsx` - Authentication state and token refresh
- `client/src/ProtectedRoute.jsx` - Route protection logic

## Development Guidelines

1. **Always add performance middleware** to new routes with appropriate cache keys
2. **Use absolute imports** in React components via jsconfig.json configuration
3. **Follow the middleware chain pattern** for all authenticated routes
4. **Create performance tests** for new endpoints using existing script patterns
5. **Use caching strategically** with appropriate TTLs based on data volatility
6. **Leverage the monorepo scripts** - don't run individual npm commands in subdirectories
