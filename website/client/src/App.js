import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from 'pages/user/HomePage';
import CoursesPage from 'pages/user/CoursesPage';
import EnrollmentPage from 'pages/user/EnrollmentPage';
import FAQPage from 'pages/user/FAQPage';
import PricingPage from 'pages/user/PricingPage';
import RegistrationPage from 'pages/user/RegistrationPage';
import LoginPage from 'pages/user/LoginPage';
import ForgotPasswordPage from 'pages/user/ForgotPasswordPage';
import Dashboard from 'pages/admin/Dashboard';
import AccountSettings from 'pages/user/AccountSettings';
import ChangePassword from 'pages/user/ChangePassword';
import Billing from 'pages/user/Billing';
import Students from 'pages/admin/Students';
import AdminCourses from 'pages/admin/AdminCourses';
import ProtectedRoute from './ProtectedRoute'; // Import ProtectedRoute
import { useAuth } from 'AuthContext';
import NotFoundPage from 'pages/NotFoundPage'; // Import NotFoundPage
import CourseSection from 'pages/user/CourseSection'; // Import CourseSections
import ProfilePage from 'pages/user/ProfilePage'; // Import ProfilePage
import './App.css';

function App() {

  

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/CoursesPage" element={<CoursesPage />} />
        <Route path="/enroll/:courseId" element={<EnrollmentPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/RegistrationPage" element={<RegistrationPage />} />
        <Route path="/LoginPage" element={<LoginPage />} />
        <Route path="/ForgotPasswordPage" element={<ForgotPasswordPage />} />

        {/* Admin Routes (Protected for Admins) */}
        <Route path="/Dashboard" element={<ProtectedRoute adminRequired={true}><Dashboard /></ProtectedRoute>} />
        <Route path="/Students" element={<ProtectedRoute adminRequired={true}><Students /></ProtectedRoute>} />
        <Route path="/AdminCourses" element={<ProtectedRoute adminRequired={true}><AdminCourses /></ProtectedRoute>} />

        {/* Protected Routes for Users */}
        <Route path="/AccountSettings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
        <Route path="/ChangePassword" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/Billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
        <Route path="/CourseSection/:courseId" element={<ProtectedRoute><CourseSection /></ProtectedRoute>} />
        <Route path="/ProfilePage" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        {/* Catch-all route for 404 Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;