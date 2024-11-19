import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ children, adminRequired = false }) => {
  const { user, loading: authLoading } = useAuth(); // Assuming `useAuth` provides a `loading` state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      setLoading(false); // Stop loading when `useAuth` finishes loading user data
    }
  }, [authLoading]);

  // Show a loading indicator while checking user state
  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect to login page if the user is not logged in
  if (!user) {
    return <Navigate to="/LoginPage" replace />;
  }

  // Redirect to unauthorized page if admin access is required and the user is not an admin
  if (adminRequired && !user.admin) {
    return <Navigate to="/Unauthorized" replace />;
  }

  // Render the children if all checks pass
  return children;
};

export default ProtectedRoute;
  