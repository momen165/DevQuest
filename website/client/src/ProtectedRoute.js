import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import CircularProgress from "@mui/material/CircularProgress";
import axios from 'axios';

const ProtectedRoute = ({ children, adminRequired = false }) => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkServerAuth = async () => {
      try {
        const response = await axios.get('/api/check-auth', {
          headers: {
            'Authorization': `Bearer ${user?.token}`,
          },
        });

        setIsAuthenticated(response.data.isAuthenticated);
        setIsAdmin(response.data.isAdmin);
      } catch (error) {
        console.error('Failed to check server authentication:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkServerAuth();
    }
  }, [authLoading, user]);

  if (loading) {
      return <div className="centered-loader">
          <CircularProgress/>
      </div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/LoginPage" replace />;
  }

  if (adminRequired && !isAdmin) {
    return <Navigate to="/Unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;