# DevQuest

## Overview

DevQuest is an interactive coding education platform that combines hands-on learning with gamification elements. Built with React and Node.js, it offers a modern learning experience for aspiring developers.

## This project is public for portfolio/review purposes only. Please do not copy, reuse, or distribute the code.

### Learning Experience

- Interactive code editor with real-time execution
- Multi-language support (Python, JavaScript, Java, C++, and more)
- Automated test case validation
- Progress tracking and achievements
- Customizable learning paths
- Instant feedback system

### Course System

- Structured learning paths
- Interactive lessons with practice exercises
- Code templates and hints
- Solution checking with custom test cases
- Course progress tracking
- Section-based organization

### User Features

- Personalized dashboard
- Progress tracking & statistics
- Skill tracking system
- Profile customization
- Achievement system
- Learning streaks

### Admin Dashboard

- Course management system
- User administration
- Content editing tools
- Analytics dashboard
- System maintenance controls
- Activity logging

## Technology Stack

### Frontend

- **Core**: React 18 + Vite
- **State Management**: Context API
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios
- **UI Components**:
  - Material-UI
  - React Icons
  - Lucide React
  - React Hot Toast
  - Tiptap
- **Code Editor**: Monaco Editor
- **Styling**: CSS and component-scoped styles

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL, Prisma ORM
- **Authentication**: JWT
- **File Storage**: AWS S3
- **Payment Processing**: Stripe
- **Security**:
  - Helmet - HTTP headers
  - Express Rate Limit - Rate limiting
  - XSS Protection - input sanitization middleware
  - CORS - Configured with allowed origins

## Project Structure

```
project/
├── client/                 # Frontend React application
│   ├── public/            # Static files
│   └── src/
│       ├── app/           # App shell, layouts, routing
│       ├── assets/        # Static assets
│       ├── features/      # Feature modules
│       ├── pages/         # Route pages
│       └── shared/        # Shared UI and utilities
│
├── server/                # Backend Node.js application
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware
│   ├── models/          # Database models
│   ├── prisma/           # Prisma schema
│   ├── routes/          # API routes
│   └── utils/           # Utility functions
│
└── docs/                 # Documentation
```

## Environment Setup

### Frontend (client/.env.local or client/.env)

```
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_SENTRY_DSN=your_sentry_dsn
VITE_SENTRY_TRACE_PROPAGATION_TARGETS=your_trace_targets
```

### Backend (server/.env)

```
PORT=5000
NODE_ENV=development

# App URLs and auth
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret

# Database (use DATABASE_URL or DB_* below)
DATABASE_URL=your_postgresql_url
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_PORT=5432
DB_SSL_MODE=require
DB_CONNECTION_LIMIT=20

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_MONTHLY_PRICE_ID=your_monthly_price_id
STRIPE_YEARLY_PRICE_ID=your_yearly_price_id

# Email (Mailgun)
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
MAILGUN_API_URL=https://api.mailgun.net
MAILGUN_WEBHOOK_SIGNING_KEY=your_mailgun_webhook_signing_key
SENDER_EMAIL=your_sender_email
SENDER_EMAIL_SUPPORT=your_support_sender_email

# Storage (Cloudflare R2, S3 compatible)
R2_ENDPOINT_URL=https://<accountid>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_BASE_URL=https://<public-subdomain>.r2.dev
# Optional: used to derive API endpoint when R2_ENDPOINT_URL is not API endpoint
R2_ACCOUNT_ID=your_cloudflare_account_id

# Code execution
RAPIDAPI_KEY=your_rapidapi_key
JUDGE0_API_URL=your_judge0_api_url

# Optional
ENABLE_PERFORMANCE_LOGS=false
```

## Getting Started

1. Clone the repository

```bash
git clone https://github.com/yourusername/devquest.git
cd devquest
```

2. Install dependencies

```bash
# Install all workspace dependencies from the repo root
npm install
```

3. Set up environment variables

- Create `client/.env.local` (or `client/.env`) and `server/.env`
- Update the variables with your values

4. Start development servers

```bash
# Start both client and server from the repo root
npm run dev
```

## Deployment

- Client: build with `npm run build --workspace=client` and deploy the `client/dist` output. Vercel is supported via [client/vercel.json](client/vercel.json).
- Server: start with `npm run start --workspace=server`. A [server/Procfile](server/Procfile) is included for process-based platforms.
- Ensure `VITE_API_URL` points to the deployed server `/api` base and `CLIENT_URL`/`FRONTEND_URL` match the deployed client origin.

## Security Features

- JWT authentication
- Rate limiting
- XSS protection
- CORS configuration
- Input validation
- Secure password hashing
- File upload validation

## License

This project is public for portfolio/review purposes only. Please do not copy, reuse, or distribute the code.
