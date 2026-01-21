import React, { Suspense, useEffect } from 'react';
import axios from 'axios';

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import MaintenanceCheck from 'features/admin/components/MaintenanceCheck';

import ProtectedRoute from 'app/ProtectedRoute';

import AppLayout from 'app/AppLayout';
import AdminLayout from 'app/AdminLayout';
import DashboardLayout from 'app/DashboardLayout';
import LoadingSpinner from 'shared/ui/LoadingSpinner';

import './App.css';

import Analytics from 'features/admin/components/EnhancedAnalytics';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Toaster } from 'react-hot-toast';
// Lazy load components

const HomePage = React.lazy(() => import('pages/HomePage'));

const AccountSettings = React.lazy(() => import('features/profile/components/AccountSettings'));

const LoginPage = React.lazy(() => import('features/auth/components/LoginPage'));

const RegistrationPage = React.lazy(() => import('features/auth/components/RegistrationPage'));

const ForgotPasswordPage = React.lazy(() => import('features/auth/components/ForgotPasswordPage'));

const ResetPasswordPage = React.lazy(() => import('features/auth/components/ResetPasswordPage'));

const VerifyEmail = React.lazy(() => import('features/auth/components/VerifyEmail'));

const ConfirmEmailChange = React.lazy(() => import('features/auth/components/ConfirmEmailChange'));

const Unauthorized = React.lazy(() => import('pages/Unauthorized'));

const NotFoundPage = React.lazy(() => import('pages/NotFoundPage'));

const CoursesPage = React.lazy(() => import('pages/CoursesPage'));

const EnrollmentPage = React.lazy(() => import('pages/EnrollmentPage'));

const FAQPage = React.lazy(() => import('pages/FAQPage'));

const PricingPage = React.lazy(() => import('features/monetization/components/PricingPage'));

const PrivacyPage = React.lazy(() => import('pages/PrivacyPage'));

const TermsPage = React.lazy(() => import('pages/TermsPage'));

const PaymentSuccessPage = React.lazy(
  () => import('features/monetization/components/PaymentSuccessPage')
);

const Dashboard = React.lazy(() => import('features/admin/components/Dashboard'));

const Students = React.lazy(() => import('features/admin/components/Students'));

const AdminCourses = React.lazy(() => import('features/admin/components/AdminCourses'));

const PaymentInfo = React.lazy(() => import('features/monetization/components/PaymentInfo'));

const Feedback = React.lazy(() => import('features/admin/components/FeedbackPage'));

const AdminSettingsPage = React.lazy(() => import('features/admin/components/AdminSettingsPage'));

const Support = React.lazy(() => import('features/admin/components/Support'));

const SupportDashboard = React.lazy(() => import('features/admin/components/SupportDashboard'));

const ChangePassword = React.lazy(() => import('features/auth/components/ChangePassword'));

const Billing = React.lazy(() => import('features/monetization/components/Billing'));

const ProfilePage = React.lazy(() => import('features/profile/components/ProfilePage'));

const CourseSection = React.lazy(() => import('pages/CourseSection'));

const LessonPage = React.lazy(() => import('pages/LessonPage'));

// Loading component for Suspense fallback

function App() {
  // Component to wrap routes that need maintenance check
  return (
    <>
      <SpeedInsights />
      <Router
        future={{
          v7_startTransition: true,

          v7_relativeSplatPath: true,
        }}
      >
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              theme: {
                primary: '#4aed88',
              },
            },
          }}
        />
        <AppContent />
      </Router>
    </>
  );
}

function AppContent() {
  const location = useLocation();

  // Track unique page view per session (per page), normalize dynamic routes
  function normalizePath(path) {
    // Replace numbers (IDs) with :id, e.g. /course/123 -> /course/:id
    // Also ensure leading slash and no double slashes
    if (!path) return '';
    let normalized = path;
    // Only replace numbers if not the whole path (so /ProfilePage is not affected)
    if (/\d/.test(normalized) && !/^\/?[A-Za-z]+Page$/.test(normalized)) {
      normalized = normalized.replace(/\d+/g, ':id');
    }
    if (!normalized.startsWith('/')) normalized = '/' + normalized;
    normalized = normalized.replace(/\/+/g, '/');
    return normalized;
  }

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    const apiUrl = import.meta.env.VITE_API_URL;
    const normalizedPath = normalizePath(location.pathname);
    // Allow tracking of all real pages except root
    if (!normalizedPath || normalizedPath.trim() === '') return;
    const key = `pageview_${normalizedPath}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');

      axios
        .post(
          `${apiUrl}/track-pageview`,
          {
            path: normalizedPath,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
            },
          }
        )
        .catch((err) => {
          // Don't block navigation, just log
          if (err.response && err.response.status !== 404) {
            console.error('Pageview tracking failed:', err);
          }
        });
    }
  }, [location.pathname]);

  // Move WithMaintenance definition here so it's in scope
  const WithMaintenance = ({ children }) => <MaintenanceCheck>{children}</MaintenanceCheck>;

  return (
    <Suspense fallback={<LoadingSpinner fullScreen center message="Initialising application..." />}>
      <Routes>
        {/* Auth routes - No maintenance check */}
      <Route path="/LoginPage" element={<LoginPage />} />
      <Route path="/RegistrationPage" element={<RegistrationPage />} />
      <Route path="/ForgotPasswordPage" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/Unauthorized" element={<Unauthorized />} />

      {/* Public Routes - Wrapped in AppLayout */}
      <Route path="/" element={<AppLayout />}>
        <Route
          index
          element={
            <WithMaintenance>
              <HomePage />
            </WithMaintenance>
          }
        />
        <Route
          path="confirm-email-change"
          element={
            <WithMaintenance>
              <ConfirmEmailChange />
            </WithMaintenance>
          }
        />
        <Route
          path="CoursesPage"
          element={
            <WithMaintenance>
              <CoursesPage />
            </WithMaintenance>
          }
        />
        <Route
          path="coursespage"
          element={
            <WithMaintenance>
              <CoursesPage />
            </WithMaintenance>
          }
        />
        <Route
          path="enroll/:courseId"
          element={
            <WithMaintenance>
              <EnrollmentPage />
            </WithMaintenance>
          }
        />
        <Route
          path="faq"
          element={
            <WithMaintenance>
              <FAQPage />
            </WithMaintenance>
          }
        />
        <Route
          path="pricing"
          element={
            <WithMaintenance>
              <PricingPage />
            </WithMaintenance>
          }
        />
        <Route
          path="privacy"
          element={
            <WithMaintenance>
              <PrivacyPage />
            </WithMaintenance>
          }
        />
        <Route
          path="terms"
          element={
            <WithMaintenance>
              <TermsPage />
            </WithMaintenance>
          }
        />
        <Route
          path="success"
          element={
            <WithMaintenance>
              <PaymentSuccessPage />
            </WithMaintenance>
          }
        />
        <Route
          path="ProfilePage"
          element={
            <WithMaintenance>
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="profile"
          element={
            <WithMaintenance>
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="CourseSection/:courseId"
          element={
            <WithMaintenance>
              <ProtectedRoute>
                <CourseSection />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="course/:courseId"
          element={
            <WithMaintenance>
              <ProtectedRoute>
                <CourseSection />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="lesson/:lessonId"
          element={
            <WithMaintenance>
              <ProtectedRoute>
                <LessonPage />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
      </Route>

      {/* Admin Routes - Wrapped in AdminLayout */}
      <Route element={<AdminLayout />}>
        <Route
          path="/dashboard"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <Dashboard />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/Dashboard"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <Dashboard />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/Students"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <Students />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/students"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <Students />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/AdminCourses"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <AdminCourses />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/admincourses"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <AdminCourses />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/PaymentInfo"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <PaymentInfo />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/paymentinfo"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <PaymentInfo />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/Feedback"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <Feedback />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/feedback"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <Feedback />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/AdminSettingsPage"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <AdminSettingsPage />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/adminsettingspage"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <AdminSettingsPage />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/Support"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <Support />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/support"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <Support />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/SupportDashboard"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <SupportDashboard />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/supportdashboard"
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
                <SupportDashboard />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route path="/Analytics" element={<Analytics />} />
        <Route path="/analytics" element={<Analytics />} />
      </Route>

      {/* Dashboard Routes - Wrapped in DashboardLayout */}
      <Route element={<DashboardLayout />}>
        <Route
          path="/AccountSettings"
          element={
            <WithMaintenance>
              <ProtectedRoute>
                <AccountSettings />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/changepassword"
          element={
            <WithMaintenance>
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
        <Route
          path="/billing"
          element={
            <WithMaintenance>
              <ProtectedRoute>
                <Billing />
              </ProtectedRoute>
            </WithMaintenance>
          }
        />
      </Route>

      {/* Catch-all route for 404 Not Found */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
}

export default App;
