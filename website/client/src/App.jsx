import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from 'pages/user/HomePage';
import CoursesPage from 'pages/user/CoursesPage';
import EnrollmentPage from 'pages/user/EnrollmentPage';
import FAQPage from 'pages/user/FAQPage';
import MaintenanceCheck from 'pages/admin/components/MaintenanceCheck';
import PricingPage from 'pages/user/PricingPage';
import RegistrationPage from 'pages/user/RegistrationPage';
import LoginPage from 'pages/user/LoginPage';
import ForgotPasswordPage from 'pages/user/ForgotPasswordPage';
import Dashboard from 'pages/admin/Dashboard';
import AdminSettingsPage from 'pages/admin/AdminSettingsPage';
import PaymentInfo from 'pages/admin/PaymentInfo';
import Feedback from 'pages/admin/FeedbackPage';
import AccountSettings from 'pages/user/AccountSettings';
import ChangePassword from 'pages/user/ChangePassword';
import Billing from 'pages/user/Billing';
import Students from 'pages/admin/Students';
import AdminCourses from 'pages/admin/AdminCourses';
import ProtectedRoute from './ProtectedRoute';
import NotFoundPage from 'pages/NotFoundPage';
import CourseSection from 'pages/user/CourseSection';
import ProfilePage from 'pages/user/ProfilePage';
import LessonPage from 'pages/user/LessonPage';
import Unauthorized from 'pages/user/Unauthorized';
import ResetPasswordPage from './pages/user/ResetPasswordPage';
import VerifyEmail from './pages/user/VerifyEmail';
import Support from 'pages/admin/Support';
import PaymentSuccessPage from 'pages/user/PaymentSuccessPage';
import './App.css';

function App() {
  // Component to wrap routes that need maintenance check
  const WithMaintenance = ({ children }) => (
    <MaintenanceCheck>{children}</MaintenanceCheck>
  );

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Auth routes - No maintenance check */}
        <Route path="/LoginPage" element={<LoginPage />} />
        <Route path="/ForgotPasswordPage" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/Unauthorized" element={<Unauthorized />} />

        {/* Public Routes - With maintenance check */}
        <Route path="/" element={<WithMaintenance><HomePage /></WithMaintenance>} />
        <Route path="/CoursesPage" element={<WithMaintenance><CoursesPage /></WithMaintenance>} />
        <Route path="/enroll/:courseId" element={<WithMaintenance><EnrollmentPage /></WithMaintenance>} />
        <Route path="/faq" element={<WithMaintenance><FAQPage /></WithMaintenance>} />
        <Route path="/pricing" element={<WithMaintenance><PricingPage /></WithMaintenance>} />
        <Route path="/RegistrationPage" element={<WithMaintenance><RegistrationPage /></WithMaintenance>} />
        <Route path="/success" element={<WithMaintenance><PaymentSuccessPage /></WithMaintenance>} />

        {/* Admin Routes - With maintenance check */}
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
          path="/Support" 
          element={
            <WithMaintenance>
              <ProtectedRoute adminRequired={true}>
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
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;