import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Adjust path if necessary

const ProtectedRoute = ({ children, adminRequired = false }) => {
  const { user } = useAuth();

  // Check if the user is logged in
  if (!user) {
    return <Navigate to="/LoginPage" replace />;
  }

  // If the route requires admin access, check if the user is an admin
  if (adminRequired && !user.admin) {
    return <Navigate to="/Unauthorized" replace />;
    console.log('Unauthorized access');
  }

  return children;
};


export default ProtectedRoute;
