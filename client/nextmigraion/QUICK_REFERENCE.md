# Quick Reference Guide

## Common Code Changes

### 1. Client Component Directive
Add to top of files using hooks, state, or browser APIs:
```tsx
'use client';
```

### 2. Navigation

#### Import
```tsx
// Before (Vite)
import { useNavigate, Link } from 'react-router-dom';

// After (Next.js)
import { useRouter } from 'next/navigation';
import Link from 'next/link';
```

#### Usage
```tsx
// Before
const navigate = useNavigate();
navigate('/path');
navigate(-1); // go back

<Link to="/path">Click</Link>

// After
const router = useRouter();
router.push('/path');
router.back(); // go back

<Link href="/path">Click</Link>
```

### 3. Location & Pathname

```tsx
// Before
import { useLocation } from 'react-router-dom';
const location = useLocation();
const path = location.pathname;

// After
import { usePathname } from 'next/navigation';
const pathname = usePathname();
```

### 4. Route Parameters

```tsx
// Before (in component)
import { useParams } from 'react-router-dom';
const { id } = useParams();

// After (in page.tsx)
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;
}
```

### 5. Environment Variables

```tsx
// Before
const apiUrl = import.meta.env.VITE_API_URL;
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

// After
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';
```

### 6. Import Paths

```tsx
// Before
import Navbar from '../../components/Navbar';
import { useAuth } from '../../AuthContext';
import '@/styles/HomePage.css';

// After
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/HomePage.css';
```

### 7. Images

```tsx
// Before
import logo from '../assets/logo.png';
<img src={logo} alt="Logo" />

// After
import Image from 'next/image';
import logo from '@/public/assets/logo.png';
<Image src={logo} alt="Logo" width={200} height={100} />
```

### 8. Protected Routes

```tsx
// Wrap your page content
import ProtectedRoute from '@/components/ProtectedRoute';
import MaintenanceCheck from '@/components/MaintenanceCheck';

export default function Page() {
  return (
    <MaintenanceCheck>
      <ProtectedRoute>
        {/* Your content */}
      </ProtectedRoute>
    </MaintenanceCheck>
  );
}

// For admin pages
<ProtectedRoute adminRequired={true}>
  {/* Admin content */}
</ProtectedRoute>
```

### 9. Browser APIs

Always check if window is available:

```tsx
// Before
const user = localStorage.getItem('user');

// After
const user = typeof window !== 'undefined'
  ? localStorage.getItem('user')
  : null;
```

### 10. Dynamic Imports

```tsx
// Before (React.lazy)
const Component = React.lazy(() => import('./Component'));

// After (Next.js dynamic)
import dynamic from 'next/dynamic';
const Component = dynamic(() => import('@/components/Component'), {
  loading: () => <p>Loading...</p>
});
```

## File Structure Mapping

```
Vite → Next.js

src/pages/user/HomePage.jsx → app/page.tsx
src/pages/user/LoginPage.jsx → app/(auth)/LoginPage/page.tsx
src/pages/user/ProfilePage.jsx → app/(user)/ProfilePage/page.tsx
src/pages/admin/Dashboard.jsx → app/(admin)/Dashboard/page.tsx
src/pages/NotFoundPage.jsx → app/not-found.tsx

src/components/* → components/*
src/utils/* → lib/utils/*
src/hooks/* → lib/hooks/*
src/AuthContext.jsx → contexts/AuthContext.tsx
src/styles/* → styles/*
public/* → public/*
```

## Route Groups

- `(auth)` - Authentication pages (no layout changes)
- `(user)` - User-protected pages
- `(admin)` - Admin-protected pages

## Testing Checklist

For each migrated page:

- [ ] Page loads without errors
- [ ] Navigation works correctly
- [ ] Authentication/authorization works
- [ ] API calls succeed
- [ ] Styles load correctly
- [ ] Images display properly
- [ ] Form submissions work
- [ ] Dynamic routes work
- [ ] Browser back/forward works

## Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint
npm run lint
```

## Common Errors & Fixes

### Error: "Cannot use import statement outside a module"
**Fix:** Add `'use client'` to the top of the file

### Error: "useRouter/usePathname only works in Client Components"
**Fix:** Add `'use client'` to the top of the file

### Error: "Hydration mismatch"
**Fix:** Ensure server and client render the same initially. Move client-specific code to useEffect

### Error: "Module not found"
**Fix:** Check import paths use `@/` alias correctly

### Error: "Image is missing required width and height"
**Fix:** Add width and height props to Image component

## Tips

1. Migrate one section at a time (auth, then public, then user, then admin)
2. Test each page after migration
3. Keep the original Vite app running for reference
4. Use TypeScript for better type safety (optional but recommended)
5. Leverage Next.js Image optimization for better performance
6. Use route groups to organize related pages
7. Remember to wrap protected pages with ProtectedRoute
