import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ children, adminRequired = false }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);  // To track if the user state is being loaded

  useEffect(() => {
    if (user !== null) {
      setLoading(false);  // Once user data is loaded, stop loading
    }
  }, [user]);

  

  // If loading, return a loading indicator or null
  if (loading) {
    return <div>Loading...</div>;
  }

  // Check if the user is logged in
  if (!user) {
   
    return <Navigate to="/LoginPage" replace />;
  }

  // If the route requires an admin and the user is not an admin, redirect to unauthorized page
  if (adminRequired && !user.admin) {
    
    return <Navigate to="/Unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
