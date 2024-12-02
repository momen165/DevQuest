import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ children, adminRequired = false }) => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkServerAuth = async () => {
      try {
        const response = await fetch('/api/check-auth', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(data.isAuthenticated);
          setIsAdmin(data.isAdmin);
        } else {
          setIsAuthenticated(false);
        }
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
    return <div>Loading...</div>;
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