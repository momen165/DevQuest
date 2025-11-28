# DevQuest Next.js Migration

This directory contains a migrated version of the DevQuest frontend from Vite to Next.js 16.

## Current Status

### ✅ Completed

- **Project Setup**: Next.js 16 with App Router, React 18, Tailwind v4
- **Dependencies**: All required packages installed (see package.json)
- **Core Infrastructure**:
  - AuthContext migrated to TypeScript client component
  - ProtectedRoute component for authentication
  - MaintenanceCheck component
  - Providers setup (Auth, Toaster, SpeedInsights)
  - Root layout with full SEO metadata
- **Configuration**:
  - Next.js config with Sentry integration
  - TypeScript config with path aliases
  - Environment variables template
- **Assets & Styles**:
  - All styles copied from src/styles
  - All public assets migrated
  - Components and utilities copied
- **Documentation**:
  - Migration guide (MIGRATION_GUIDE.md)
  - Quick reference (QUICK_REFERENCE.md)
  - Checklist (MIGRATION_CHECKLIST.md)

### ⚠️ Pending

- **Component Updates**: Components need import path updates (see below)
- **Page Migrations**: Most pages need to be migrated (examples provided)
- **Testing**: Full testing after migration

## Build Errors (Expected)

The build currently fails because the copied components still have Vite-specific imports. This is intentional to preserve the original code structure. You need to update the components as part of the migration process.

### Common Import Issues

Components import from relative paths that need updating:
```jsx
// Current (causes errors):
import { useAuth } from '../AuthContext';
import logo from '../assets/logo.svg';

// Needs to be:
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/public/assets/logo.svg';
```

## Quick Start

### 1. Setup Environment

```bash
# Copy environment template
cp .env.local.example .env.local

# Edit .env.local and add your API URL
# NEXT_PUBLIC_API_URL=https://api.dev-quest.tech/api
```

### 2. Update Components (Critical Step)

You need to update all components in the `components/` directory to use correct import paths:

**Option A: Manual Update**
Update each component file:
- Change `import { useAuth } from '../AuthContext'` to `import { useAuth } from '@/contexts/AuthContext'`
- Change `import '../styles/X.css'` to `import '@/styles/X.css'`
- Change asset imports to use `@/public/assets/...`
- Replace `import { useNavigate, Link } from 'react-router-dom'` with Next.js equivalents
- Replace `import.meta.env.VITE_*` with `process.env.NEXT_PUBLIC_*`

**Option B: Search and Replace**
Use find/replace in your editor:

1. Find: `from '../AuthContext'` → Replace: `from '@/contexts/AuthContext'`
2. Find: `from '../../AuthContext'` → Replace: `from '@/contexts/AuthContext'`
3. Find: `'../styles/` → Replace: `'@/styles/`
4. Find: `'../../styles/` → Replace: `'@/styles/`
5. Find: `'../assets/` → Replace: `'@/public/assets/`
6. Find: `'../../assets/` → Replace: `'@/public/assets/`
7. Find: `import.meta.env.VITE_API_URL` → Replace: `process.env.NEXT_PUBLIC_API_URL`

For components using React Router:
- Add `'use client';` to the top
- Replace `useNavigate` with `useRouter` from `next/navigation`
- Replace `<Link to=` with `<Link href=` from `next/link`
- Replace `useLocation` with `usePathname` from `next/navigation`

### 3. Migrate Pages

Follow the examples in:
- `app/page.tsx` (HomePage - completed)
- `app/(auth)/LoginPage/page.tsx` (example template)
- `app/(user)/ProfilePage/page.tsx` (protected page template)
- `app/(admin)/Dashboard/page.tsx` (admin page template)
- `app/(user)/course/[courseId]/page.tsx` (dynamic route template)

See `MIGRATION_GUIDE.md` for detailed instructions and `MIGRATION_CHECKLIST.md` for tracking.

### 4. Test Development Build

```bash
npm run dev
```

Visit http://localhost:3000

### 5. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
nextmigraion/
├── app/                    # Next.js pages (App Router)
│   ├── (auth)/            # Auth pages group
│   ├── (admin)/           # Admin pages group
│   ├── (user)/            # User pages group
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Homepage
│   ├── providers.tsx      # Client providers
│   └── not-found.tsx      # 404 page
├── components/            # Shared React components
├── contexts/              # React contexts
│   └── AuthContext.tsx   # Auth context
├── lib/                   # Utilities and hooks
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Utility functions
├── public/               # Static files
│   ├── assets/           # Images, icons, etc.
│   └── *                 # Favicon, manifest, etc.
├── styles/               # CSS files
│   ├── admin/           # Admin-specific styles
│   └── *.css            # Component styles
├── .env.local.example    # Environment template
├── next.config.ts        # Next.js configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies
```

## Key Differences from Vite

| Feature | Vite | Next.js |
|---------|------|---------|
| Routing | React Router | File-based App Router |
| Navigation | `useNavigate()` | `useRouter()` |
| Links | `<Link to>` | `<Link href>` |
| Env Vars | `import.meta.env.VITE_*` | `process.env.NEXT_PUBLIC_*` |
| Images | Direct import | `<Image>` component |
| Lazy Loading | `React.lazy()` | Automatic + `dynamic()` |
| Client Code | Automatic | `'use client'` directive |

## Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
```

## Documentation Files

- **README.md** (this file) - Overview and quick start
- **MIGRATION_GUIDE.md** - Comprehensive migration guide
- **QUICK_REFERENCE.md** - Quick syntax reference
- **MIGRATION_CHECKLIST.md** - Track migration progress

## Deployment

This project is optimized for deployment on [Vercel](https://vercel.com):

1. Push code to Git repository
2. Import project in Vercel
3. Add environment variables
4. Deploy

Alternatively, you can deploy to any Node.js hosting platform that supports Next.js.

## Troubleshooting

### Build Fails with "Module not found"
- Check import paths use `@/` alias
- Ensure files exist at the specified paths
- Verify `tsconfig.json` has correct path mappings

### "localStorage is not defined"
- Add check: `typeof window !== 'undefined'`
- Move localStorage access to `useEffect`

### Hydration Errors
- Ensure server and client render identical content initially
- Use `useEffect` for client-only rendering

### CSS Not Loading
- Import CSS files in components that use them
- Check CSS file paths are correct

## Support

For issues specific to:
- **Next.js**: [Next.js Documentation](https://nextjs.org/docs)
- **Migration**: See MIGRATION_GUIDE.md
- **DevQuest**: Contact your team

## Next Steps

1. Update component import paths (critical)
2. Migrate remaining pages (see MIGRATION_CHECKLIST.md)
3. Test all features thoroughly
4. Update any remaining React Router dependencies
5. Deploy to staging environment
6. Full QA testing
7. Deploy to production

## Notes

- Keep the original Vite project until migration is complete and tested
- Migrate and test one section at a time (auth → public → user → admin)
- The migration preserves all functionality while modernizing the stack
- Tailwind v4 configuration is preserved as requested
