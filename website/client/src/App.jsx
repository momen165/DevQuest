import React, { Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from 'react-router-dom';
import MaintenanceCheck from './pages/admin/components/MaintenanceCheck';
import ProtectedRoute from './ProtectedRoute';
import './App.css';

// Lazy load components
const HomePage = React.lazy(
  () => import('pages/user/HomePage')
);
const AccountSettings = React.lazy(
  () =>
    import('pages/user/AccountSettings')
);
const LoginPage = React.lazy(
  () => import('pages/user/LoginPage')
);
const RegistrationPage = React.lazy(
  () =>
    import(
      'pages/user/RegistrationPage'
    )
);
const ForgotPasswordPage = React.lazy(
  () =>
    import(
      'pages/user/ForgotPasswordPage'
    )
);
const ResetPasswordPage = React.lazy(
  () =>
    import(
      './pages/user/ResetPasswordPage'
    )
);
const VerifyEmail = React.lazy(
  () =>
    import('./pages/user/VerifyEmail')
);
const ConfirmEmailChange = React.lazy(
  () =>
    import(
      './pages/user/ConfirmEmailChange'
    )
);
const Unauthorized = React.lazy(
  () =>
    import('pages/user/Unauthorized')
);
const NotFoundPage = React.lazy(
  () => import('pages/NotFoundPage')
);
const CoursesPage = React.lazy(
  () => import('pages/user/CoursesPage')
);
const EnrollmentPage = React.lazy(
  () =>
    import('pages/user/EnrollmentPage')
);
const FAQPage = React.lazy(
  () => import('pages/user/FAQPage')
);
const PricingPage = React.lazy(
  () => import('pages/user/PricingPage')
);
const PaymentSuccessPage = React.lazy(
  () =>
    import(
      'pages/user/PaymentSuccessPage'
    )
);
const Dashboard = React.lazy(
  () => import('pages/admin/Dashboard')
);
const Students = React.lazy(
  () => import('pages/admin/Students')
);
const AdminCourses = React.lazy(
  () =>
    import('pages/admin/AdminCourses')
);
const PaymentInfo = React.lazy(
  () =>
    import('pages/admin/PaymentInfo')
);
const Feedback = React.lazy(
  () =>
    import('pages/admin/FeedbackPage')
);
const AdminSettingsPage = React.lazy(
  () =>
    import(
      'pages/admin/AdminSettingsPage'
    )
);
const Support = React.lazy(
  () => import('pages/admin/Support')
);
const ChangePassword = React.lazy(
  () =>
    import('pages/user/ChangePassword')
);
const Billing = React.lazy(
  () => import('pages/user/Billing')
);
const ProfilePage = React.lazy(
  () => import('pages/user/ProfilePage')
);
const CourseSection = React.lazy(
  () =>
    import('pages/user/CourseSection')
);
const LessonPage = React.lazy(
  () => import('pages/user/LessonPage')
);

// Loading component for Suspense fallback
const Loading = () => (
  <div className="loading">
    Loading...
  </div>
);

function App() {
  // Component to wrap routes that need maintenance check
  const WithMaintenance = ({
    children,
  }) => (
    <MaintenanceCheck>
      {children}
    </MaintenanceCheck>
  );

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Auth routes - No maintenance check */}
          <Route
            path="/LoginPage"
            element={<LoginPage />}
          />
          <Route
            path="/ForgotPasswordPage"
            element={
              <ForgotPasswordPage />
            }
          />
          <Route
            path="/reset-password"
            element={
              <ResetPasswordPage />
            }
          />
          <Route
            path="/verify-email"
            element={<VerifyEmail />}
          />
          <Route
            path="/confirm-email-change"
            element={
              <ConfirmEmailChange />
            }
          />
          <Route
            path="/Unauthorized"
            element={<Unauthorized />}
          />

          {/* Public Routes - With maintenance check */}
          <Route
            path="/"
            element={
              <WithMaintenance>
                <HomePage />
              </WithMaintenance>
            }
          />
          <Route
            path="/CoursesPage"
            element={
              <WithMaintenance>
                <CoursesPage />
              </WithMaintenance>
            }
          />
          <Route
            path="/enroll/:courseId"
            element={
              <WithMaintenance>
                <EnrollmentPage />
              </WithMaintenance>
            }
          />
          <Route
            path="/faq"
            element={
              <WithMaintenance>
                <FAQPage />
              </WithMaintenance>
            }
          />
          <Route
            path="/pricing"
            element={
              <WithMaintenance>
                <PricingPage />
              </WithMaintenance>
            }
          />
          <Route
            path="/RegistrationPage"
            element={
              <WithMaintenance>
                <RegistrationPage />
              </WithMaintenance>
            }
          />
          <Route
            path="/success"
            element={
              <WithMaintenance>
                <PaymentSuccessPage />
              </WithMaintenance>
            }
          />

          {/* Admin Routes - With maintenance check */}
          <Route
            path="/Dashboard"
            element={
              <WithMaintenance>
                <ProtectedRoute
                  adminRequired={true}
                >
                  <Dashboard />
                </ProtectedRoute>
              </WithMaintenance>
            }
          />
          <Route
            path="/Students"
            element={
              <WithMaintenance>
                <ProtectedRoute
                  adminRequired={true}
                >
                  <Students />
                </ProtectedRoute>
              </WithMaintenance>
            }
          />
          <Route
            path="/AdminCourses"
            element={
              <WithMaintenance>
                <ProtectedRoute
                  adminRequired={true}
                >
                  <AdminCourses />
                </ProtectedRoute>
              </WithMaintenance>
            }
          />
          <Route
            path="/PaymentInfo"
            element={
              <WithMaintenance>
                <ProtectedRoute
                  adminRequired={true}
                >
                  <PaymentInfo />
                </ProtectedRoute>
              </WithMaintenance>
            }
          />
          <Route
            path="/Feedback"
            element={
              <WithMaintenance>
                <ProtectedRoute
                  adminRequired={true}
                >
                  <Feedback />
                </ProtectedRoute>
              </WithMaintenance>
            }
          />
          <Route
            path="/AdminSettingsPage"
            element={
              <WithMaintenance>
                <ProtectedRoute
                  adminRequired={true}
                >
                  <AdminSettingsPage />
                </ProtectedRoute>
              </WithMaintenance>
            }
          />
          <Route
            path="/Support"
            element={
              <WithMaintenance>
                <ProtectedRoute
                  adminRequired={true}
                >
                  <Support />
                </ProtectedRoute>
              </WithMaintenance>
            }
          />

          {/* Protected User Routes - With maintenance check */}
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
            path="/ChangePassword"
            element={
              <WithMaintenance>
                <ProtectedRoute>
                  <ChangePassword />
                </ProtectedRoute>
              </WithMaintenance>
            }
          />
          <Route
            path="/Billing"
            element={
              <WithMaintenance>
                <ProtectedRoute>
                  <Billing />
                </ProtectedRoute>
              </WithMaintenance>
            }
          />
          <Route
            path="/ProfilePage"
            element={
              <WithMaintenance>
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              </WithMaintenance>
            }
          />
          <Route
            path="/CourseSection/:courseId"
            element={
              <WithMaintenance>
                <ProtectedRoute>
                  <CourseSection />
                </ProtectedRoute>
              </WithMaintenance>
            }
          />
          <Route
            path="/course/:courseId"
            element={
              <WithMaintenance>
                <ProtectedRoute>
                  <CourseSection />
                </ProtectedRoute>
              </WithMaintenance>
            }
          />
          <Route
            path="/lesson/:lessonId"
            element={
              <WithMaintenance>
                <ProtectedRoute>
                  <LessonPage />
                </ProtectedRoute>
              </WithMaintenance>
            }
          />

          {/* Catch-all route for 404 Not Found */}
          <Route
            path="*"
            element={<NotFoundPage />}
          />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
