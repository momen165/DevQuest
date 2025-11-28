# Migration Checklist

Use this checklist to track your progress migrating pages from Vite to Next.js.

## Auth Pages - `app/(auth)/`

- [x] **LoginPage** - `app/(auth)/LoginPage/page.tsx` ✅
  - Original: `src/pages/user/LoginPage.jsx`
  - Notes: Update navigation after login success

- [x] **RegistrationPage** - `app/(auth)/RegistrationPage/page.tsx` ✅
  - Original: `src/pages/user/RegistrationPage.jsx`

- [x] **ForgotPasswordPage** - `app/(auth)/ForgotPasswordPage/page.tsx` ✅
  - Original: `src/pages/user/ForgotPasswordPage.jsx`

- [x] **ResetPasswordPage** - `app/(auth)/reset-password/page.tsx` ✅
  - Original: `src/pages/user/ResetPasswordPage.jsx`

- [x] **VerifyEmail** - `app/(auth)/verify-email/page.tsx` ✅
  - Original: `src/pages/user/VerifyEmail.jsx`

- [x] **ConfirmEmailChange** - `app/(auth)/confirm-email-change/page.tsx` ✅
  - Original: `src/pages/user/ConfirmEmailChange.jsx`

- [x] **Unauthorized** - `app/(auth)/Unauthorized/page.tsx` ✅
  - Original: `src/pages/user/Unauthorized.jsx`

## Public Pages - `app/`

- [x] **HomePage** - `app/page.tsx` ✅
  - Original: `src/pages/user/HomePage.jsx`

- [x] **CoursesPage** - `app/CoursesPage/page.tsx` ✅
  - Original: `src/pages/user/CoursesPage.jsx`

- [x] **EnrollmentPage** - `app/enroll/[courseId]/page.tsx` ✅
  - Original: `src/pages/user/EnrollmentPage.jsx`
  - Notes: Dynamic route with courseId

- [x] **FAQPage** - `app/faq/page.tsx` ✅
  - Original: `src/pages/user/FAQPage.jsx`

- [x] **PricingPage** - `app/pricing/page.tsx` ✅
  - Original: `src/pages/user/PricingPage.jsx`

- [x] **PrivacyPage** - `app/privacy/page.tsx` ✅
  - Original: `src/pages/user/PrivacyPage.jsx`

- [x] **TermsPage** - `app/terms/page.tsx` ✅
  - Original: `src/pages/user/TermsPage.jsx`

- [x] **PaymentSuccessPage** - `app/success/page.tsx` ✅
  - Original: `src/pages/user/PaymentSuccessPage.jsx`

- [x] **NotFoundPage** - `app/not-found.tsx` ✅
  - Original: `src/pages/NotFoundPage.jsx`

## User Protected Pages - `app/(user)/`

- [x] **ProfilePage** - `app/(user)/ProfilePage/page.tsx` ✅
  - Original: `src/pages/user/ProfilePage.jsx`
  - Protection: ✅ Required

- [x] **AccountSettings** - `app/(user)/AccountSettings/page.tsx` ✅
  - Original: `src/pages/user/AccountSettings.jsx`
  - Protection: ✅ Required

- [x] **ChangePassword** - `app/(user)/ChangePassword/page.tsx` ✅
  - Original: `src/pages/user/ChangePassword.jsx`
  - Protection: ✅ Required

- [x] **Billing** - `app/(user)/Billing/page.tsx` ✅
  - Original: `src/pages/user/Billing.jsx`
  - Protection: ✅ Required

- [x] **CourseSection** - `app/(user)/course/[courseId]/page.tsx` ✅
  - Original: `src/pages/user/CourseSection.jsx`
  - Protection: ✅ Required
  - Notes: Dynamic route with courseId

- [x] **LessonPage** - `app/(user)/lesson/[lessonId]/page.tsx` ✅
  - Original: `src/pages/user/LessonPage.jsx`
  - Protection: ✅ Required
  - Notes: Dynamic route with lessonId

## Admin Pages - `app/(admin)/`

All admin pages require `adminRequired={true}` protection.

- [x] **Dashboard** - `app/(admin)/Dashboard/page.tsx` ✅
  - Original: `src/pages/admin/Dashboard.jsx`
  - Protection: ✅ Admin Required

- [x] **Students** - `app/(admin)/Students/page.tsx` ✅
  - Original: `src/pages/admin/Students.jsx`
  - Protection: ✅ Admin Required

- [x] **AdminCourses** - `app/(admin)/AdminCourses/page.tsx` ✅
  - Original: `src/pages/admin/AdminCourses.jsx`
  - Protection: ✅ Admin Required

- [x] **PaymentInfo** - `app/(admin)/PaymentInfo/page.tsx` ✅
  - Original: `src/pages/admin/PaymentInfo.jsx`
  - Protection: ✅ Admin Required

- [x] **FeedbackPage** - `app/(admin)/Feedback/page.tsx` ✅
  - Original: `src/pages/admin/FeedbackPage.jsx`
  - Protection: ✅ Admin Required

- [x] **AdminSettingsPage** - `app/(admin)/AdminSettingsPage/page.tsx` ✅
  - Original: `src/pages/admin/AdminSettingsPage.jsx`
  - Protection: ✅ Admin Required

- [x] **Support** - `app/(admin)/Support/page.tsx` ✅
  - Original: `src/pages/admin/Support.jsx`
  - Protection: ✅ Admin Required

- [x] **SupportDashboard** - `app/(admin)/SupportDashboard/page.tsx` ✅
  - Original: `src/pages/admin/components/SupportDashboard.jsx`
  - Protection: ✅ Admin Required

- [x] **Analytics** - `app/(admin)/Analytics/page.tsx` ✅
  - Original: `src/pages/admin/EnhancedAnalytics.jsx`
  - Protection: ✅ Admin Required

## Component Updates

### Navigation Components
- [x] Update `Navbar.jsx` - Replace React Router Link with Next.js Link ✅
- [x] Update `Footer.jsx` - Replace React Router Link with Next.js Link ✅
- [x] Update `AccountSettingsSidebar.jsx` - Update navigation ✅

### Other Components
- [x] Review all components for React Router dependencies ✅
- [x] Update image imports to use Next.js Image component where beneficial ✅
- [x] Ensure components that use browser APIs have proper `typeof window` checks ✅

## Migration Quick Reference

### For each page:

1. **Create the file** in the appropriate directory
2. **Add 'use client'** directive at the top if it uses hooks or browser APIs
3. **Copy the component code** from the original file
4. **Update imports:**
   - Use `@/` alias for all imports
   - `useNavigate` → `useRouter` from `next/navigation`
   - `useLocation` → `usePathname` from `next/navigation`
   - `useParams` → Get from props for dynamic routes
5. **Update navigation:**
   - `navigate('/path')` → `router.push('/path')`
   - `<Link to="/path">` → `<Link href="/path">`
6. **Update environment variables:**
   - `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*`
7. **Add protection** if needed (ProtectedRoute, MaintenanceCheck)
8. **Test the page** in development mode

## Final Steps

- [ ] Create `.env.local` from `.env.local.example`
- [ ] Test all pages in development
- [ ] Run `npm run build` to check for errors
- [ ] Test production build with `npm start`
- [ ] Update any remaining dependencies if needed
- [ ] Configure deployment (Vercel recommended for Next.js)

## Notes

- Keep the Vite version running until migration is complete
- Test thoroughly after migrating each section
- Pay special attention to authentication flows
- Verify all dynamic routes work correctly
