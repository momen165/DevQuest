import React, { Suspense, useEffect } from "react";
import axios from "axios";

import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import MaintenanceCheck from "features/admin/components/MaintenanceCheck";

import ProtectedRoute from "app/ProtectedRoute";

import AppLayout from "app/AppLayout";
import AdminLayout from "app/AdminLayout";
import DashboardLayout from "app/DashboardLayout";
import LoadingSpinner from "shared/ui/LoadingSpinner";

import "./App.css";

import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from "react-hot-toast";
// Lazy load components

const HomePage = React.lazy(() => import("pages/HomePage"));

const AccountSettings = React.lazy(() => import("features/profile/components/AccountSettings"));

const LoginPage = React.lazy(() => import("features/auth/components/LoginPage"));

const RegistrationPage = React.lazy(() => import("features/auth/components/RegistrationPage"));

const ForgotPasswordPage = React.lazy(() => import("features/auth/components/ForgotPasswordPage"));

const ResetPasswordPage = React.lazy(() => import("features/auth/components/ResetPasswordPage"));

const VerifyEmail = React.lazy(() => import("features/auth/components/VerifyEmail"));

const ConfirmEmailChange = React.lazy(() => import("features/auth/components/ConfirmEmailChange"));

const Unauthorized = React.lazy(() => import("pages/Unauthorized"));

const NotFoundPage = React.lazy(() => import("pages/NotFoundPage"));

const CoursesPage = React.lazy(() => import("pages/CoursesPage"));

const EnrollmentPage = React.lazy(() => import("pages/EnrollmentPage"));

const FAQPage = React.lazy(() => import("pages/FAQPage"));

const PricingPage = React.lazy(() => import("features/monetization/components/PricingPage"));

const PrivacyPage = React.lazy(() => import("pages/PrivacyPage"));

const TermsPage = React.lazy(() => import("pages/TermsPage"));

const PaymentSuccessPage = React.lazy(
  () => import("features/monetization/components/PaymentSuccessPage")
);

const Dashboard = React.lazy(() => import("features/admin/components/Dashboard"));

const Students = React.lazy(() => import("features/admin/components/Students"));

const AdminCourses = React.lazy(() => import("features/admin/components/AdminCourses"));

const PaymentInfo = React.lazy(() => import("features/monetization/components/PaymentInfo"));

const Feedback = React.lazy(() => import("features/admin/components/FeedbackPage"));

const AdminSettingsPage = React.lazy(() => import("features/admin/components/AdminSettingsPage"));

const Support = React.lazy(() => import("features/admin/components/Support"));

const SupportDashboard = React.lazy(() => import("features/admin/components/SupportDashboard"));

const Analytics = React.lazy(() => import("features/admin/components/EnhancedAnalytics"));

const ChangePassword = React.lazy(() => import("features/auth/components/ChangePassword"));

const Billing = React.lazy(() => import("features/monetization/components/Billing"));

const ProfilePage = React.lazy(() => import("features/profile/components/ProfilePage"));

const CourseSection = React.lazy(() => import("pages/CourseSection"));

const LessonPage = React.lazy(() => import("pages/LessonPage"));

const normalizeTrackedPath = (path) => {
  if (!path) return "";

  let normalized = path;
  if (/\d/.test(normalized) && !/^\/?[A-Za-z]+Page$/.test(normalized)) {
    normalized = normalized.replace(/\d+/g, ":id");
  }

  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  return normalized.replace(/\/+/g, "/");
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const MaintenanceGuard = ({ children }) => <MaintenanceCheck>{children}</MaintenanceCheck>;

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
              background: "#363636",
              color: "#fff",
            },
            success: {
              duration: 3000,
              theme: {
                primary: "#4aed88",
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

  useEffect(() => {
    const user = getStoredUser();
    const apiUrl = import.meta.env.VITE_API_URL;
    const normalizedPath = normalizeTrackedPath(location.pathname);
    if (!normalizedPath || normalizedPath.trim() === "") return;
    const key = `pageview_${normalizedPath}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");

      void axios
        .post(
          `${apiUrl}/track-pageview`,
          {
            path: normalizedPath,
          },
          {
            headers: {
              "Content-Type": "application/json",
              ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
            },
          }
        )
        .catch((err) => {
          // Don't block navigation, just log
          if (err.response && err.response.status !== 404) {
            console.error("Pageview tracking failed:", err);
          }
        });
    }
  }, [location.pathname]);

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
              <MaintenanceGuard>
                <HomePage />
              </MaintenanceGuard>
            }
          />
          <Route
            path="confirm-email-change"
            element={
              <MaintenanceGuard>
                <ConfirmEmailChange />
              </MaintenanceGuard>
            }
          />
          <Route
            path="CoursesPage"
            element={
              <MaintenanceGuard>
                <CoursesPage />
              </MaintenanceGuard>
            }
          />
          <Route
            path="coursespage"
            element={
              <MaintenanceGuard>
                <CoursesPage />
              </MaintenanceGuard>
            }
          />
          <Route
            path="enroll/:courseId"
            element={
              <MaintenanceGuard>
                <EnrollmentPage />
              </MaintenanceGuard>
            }
          />
          <Route
            path="faq"
            element={
              <MaintenanceGuard>
                <FAQPage />
              </MaintenanceGuard>
            }
          />
          <Route
            path="pricing"
            element={
              <MaintenanceGuard>
                <PricingPage />
              </MaintenanceGuard>
            }
          />
          <Route
            path="privacy"
            element={
              <MaintenanceGuard>
                <PrivacyPage />
              </MaintenanceGuard>
            }
          />
          <Route
            path="terms"
            element={
              <MaintenanceGuard>
                <TermsPage />
              </MaintenanceGuard>
            }
          />
          <Route
            path="success"
            element={
              <MaintenanceGuard>
                <PaymentSuccessPage />
              </MaintenanceGuard>
            }
          />
          <Route
            path="ProfilePage"
            element={
              <MaintenanceGuard>
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="profile"
            element={
              <MaintenanceGuard>
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="CourseSection/:courseId"
            element={
              <MaintenanceGuard>
                <ProtectedRoute>
                  <CourseSection />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="course/:courseId"
            element={
              <MaintenanceGuard>
                <ProtectedRoute>
                  <CourseSection />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="lesson/:lessonId"
            element={
              <MaintenanceGuard>
                <ProtectedRoute>
                  <LessonPage />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
        </Route>

        {/* Admin Routes - Wrapped in AdminLayout */}
        <Route element={<AdminLayout />}>
          <Route
            path="/dashboard"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <Dashboard />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/Dashboard"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <Dashboard />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/Students"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <Students />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/students"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <Students />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/AdminCourses"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <AdminCourses />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/admincourses"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <AdminCourses />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/PaymentInfo"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <PaymentInfo />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/paymentinfo"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <PaymentInfo />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/Feedback"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <Feedback />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/feedback"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <Feedback />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/AdminSettingsPage"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <AdminSettingsPage />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/adminsettingspage"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <AdminSettingsPage />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/Support"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <Support />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/support"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <Support />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/SupportDashboard"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <SupportDashboard />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/supportdashboard"
            element={
              <MaintenanceGuard>
                <ProtectedRoute adminRequired={true}>
                  <SupportDashboard />
                </ProtectedRoute>
              </MaintenanceGuard>
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
              <MaintenanceGuard>
                <ProtectedRoute>
                  <AccountSettings />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/changepassword"
            element={
              <MaintenanceGuard>
                <ProtectedRoute>
                  <ChangePassword />
                </ProtectedRoute>
              </MaintenanceGuard>
            }
          />
          <Route
            path="/billing"
            element={
              <MaintenanceGuard>
                <ProtectedRoute>
                  <Billing />
                </ProtectedRoute>
              </MaintenanceGuard>
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
