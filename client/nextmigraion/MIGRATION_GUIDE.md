# DevQuest Vite to Next.js Migration Guide

## Migration Status

✅ **Completed:**
- Project structure setup
- Dependencies configuration
- AuthContext migrated to client component
- Utilities and hooks copied and updated
- Shared components copied
- Styles and assets migrated
- Root layout with metadata and SEO
- Next.js configuration with Sentry support
- Environment variables configuration
- ProtectedRoute component
- MaintenanceCheck component

⚠️ **In Progress:**
- Page migrations (only homepage created as example)

## Project Structure

```
nextmigraion/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes group
│   ├── (admin)/           # Admin routes group
│   ├── (user)/            # User routes group
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   └── providers.tsx      # Client-side providers
├── components/            # React components (copied from src/components)
├── contexts/              # React contexts
│   └── AuthContext.tsx   # Authentication context
├── lib/                   # Utilities and hooks
│   ├── hooks/            # Custom hooks
│   └── utils/            # Utility functions
├── public/               # Static assets
├── styles/               # CSS files
└── .env.local.example    # Environment variables template

## Key Changes from Vite

### 1. Environment Variables
- **Before:** `import.meta.env.VITE_API_URL`
- **After:** `process.env.NEXT_PUBLIC_API_URL`

### 2. Routing
- **Before:** React Router (`useNavigate`, `<Link>`, `<Routes>`)
- **After:** Next.js App Router (`useRouter`, `<Link>` from next/link, file-based routing)

### 3. Image Handling
- **Before:** Direct imports `import img from './img.png'`
- **After:** Next.js Image component `<Image src={img} alt="..." />`

### 4. Client Components
- All components using hooks, browser APIs, or event handlers need `'use client'` directive at the top

### 5. Lazy Loading
- **Before:** `React.lazy(() => import('./Component'))`
- **After:** Next.js automatically code-splits, or use `next/dynamic`

## Migration Steps for Remaining Pages

### Step 1: Create Route Groups (Already Done)
```
app/
├── (auth)/          # LoginPage, RegistrationPage, ForgotPasswordPage, etc.
├── (admin)/         # Dashboard, Students, AdminCourses, etc.
└── (user)/          # ProfilePage, CoursesPage, CourseSection, etc.
```

### Step 2: Convert Pages

For each page in `src/pages/`:

#### Example: Login Page

**Before (Vite):** `src/pages/user/LoginPage.jsx`
```jsx
import { useNavigate } from 'react-router-dom';
import '../../styles/AuthPages.css';

function LoginPage() {
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  // ... component code
}
```

**After (Next.js):** `app/(auth)/LoginPage/page.tsx`
```tsx
'use client';

import { useRouter } from 'next/navigation';
import '@/styles/AuthPages.css';

export default function LoginPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // ... component code (use router.push() instead of navigate())
}
```

### Step 3: Update Import Paths

Use the `@/` alias for imports:
- `import Navbar from '../../components/Navbar'` → `import Navbar from '@/components/Navbar'`
- `import { useAuth } from '../../AuthContext'` → `import { useAuth } from '@/contexts/AuthContext'`

### Step 4: Handle Protected Routes

For protected pages, wrap content with ProtectedRoute:

```tsx
'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import MaintenanceCheck from '@/components/MaintenanceCheck';

export default function ProfilePage() {
  return (
    <MaintenanceCheck>
      <ProtectedRoute>
        {/* Your page content */}
      </ProtectedRoute>
    </MaintenanceCheck>
  );
}
```

For admin pages:
```tsx
<ProtectedRoute adminRequired={true}>
  {/* Admin page content */}
</ProtectedRoute>
```

### Step 5: Dynamic Routes

**Before:** `/course/:courseId` (React Router)
**After:** `app/(user)/course/[courseId]/page.tsx`

Access params:
```tsx
'use client';

export default function CoursePage({ params }: { params: { courseId: string } }) {
  const { courseId } = params;
  // ... use courseId
}
```

## Pages to Migrate

### Auth Pages (app/(auth)/)
- [ ] LoginPage
- [ ] RegistrationPage
- [ ] ForgotPasswordPage
- [ ] ResetPasswordPage
- [ ] VerifyEmail
- [ ] ConfirmEmailChange
- [ ] Unauthorized

### Public Pages (app/)
- [x] HomePage (✅ Done as example)
- [ ] CoursesPage
- [ ] EnrollmentPage (app/enroll/[courseId]/page.tsx)
- [ ] FAQPage
- [ ] PricingPage
- [ ] PrivacyPage
- [ ] TermsPage
- [ ] PaymentSuccessPage
- [ ] NotFoundPage (app/not-found.tsx)

### User Pages (app/(user)/)
- [ ] AccountSettings
- [ ] ChangePassword
- [ ] Billing
- [ ] ProfilePage
- [ ] CourseSection (app/(user)/course/[courseId]/page.tsx)
- [ ] LessonPage (app/(user)/lesson/[lessonId]/page.tsx)

### Admin Pages (app/(admin)/)
- [ ] Dashboard
- [ ] Students
- [ ] AdminCourses
- [ ] PaymentInfo
- [ ] FeedbackPage
- [ ] AdminSettingsPage
- [ ] Support
- [ ] SupportDashboard
- [ ] EnhancedAnalytics

## Component Updates Needed

Most components should work as-is, but check for:

1. **Navigation Links**: Update `<Link to="/path">` to `<Link href="/path">`
2. **`useNavigate` hooks**: Replace with `useRouter` from `next/navigation`
3. **`useLocation` hooks**: Replace with `usePathname` from `next/navigation`
4. **`useParams` hooks**: Use params prop in page components
5. **Image imports**: Use Next.js `<Image>` component

## Environment Setup

1. Copy `.env.local.example` to `.env.local`
2. Add your API URL:
   ```
   NEXT_PUBLIC_API_URL=https://api.dev-quest.tech/api
   ```
3. (Optional) Add Sentry configuration if needed

## Testing

Run the development server:
```bash
cd nextmigraion
npm run dev
```

Build for production:
```bash
npm run build
npm start
```

## Common Issues & Solutions

### Issue: "localStorage is not defined"
**Solution:** Check if window exists:
```tsx
const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
```

### Issue: "Hydration mismatch"
**Solution:** Ensure server and client render the same content initially. Use `useEffect` for client-only content.

### Issue: CSS not loading
**Solution:** Import CSS in the component/page that uses it:
```tsx
import '@/styles/YourComponent.css';
```

### Issue: Absolute imports not working
**Solution:** Use `@/` prefix (already configured in tsconfig.json)

## Next Steps

1. Create page files following the structure above
2. Copy component code from src/pages/
3. Update imports and API calls
4. Add `'use client'` directive where needed
5. Test each page individually
6. Update any remaining components that need Next.js-specific changes

## Additional Resources

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Migrating from Vite](https://nextjs.org/docs/app/building-your-application/upgrading/from-vite)
- [Next.js Image Optimization](https://nextjs.org/docs/app/api-reference/components/image)
- [Client and Server Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
