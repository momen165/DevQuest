import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Adjust path if necessary

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/LoginPage" replace />;
  }
  console.log(user) 
  return children;
};

export default ProtectedRoute;
