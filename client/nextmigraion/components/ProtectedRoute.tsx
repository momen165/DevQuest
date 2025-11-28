'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import CircularProgress from "@mui/material/CircularProgress";
import axios from 'axios';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminRequired?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminRequired = false }) => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkServerAuth = async () => {
      try {
        // Only make the request if we have a user and token
        if (!user?.token) {
          setIsAuthenticated(false);
          setLoading(false);
          router.push('/LoginPage');
          return;
        }

        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/check-auth`, {
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        });

        setIsAuthenticated(response.data.isAuthenticated);
        setIsAdmin(response.data.isAdmin);

        if (!response.data.isAuthenticated) {
          router.push('/LoginPage');
        } else if (adminRequired && !response.data.isAdmin) {
          router.push('/Unauthorized');
        }
      } catch (error) {
        console.error('Failed to check server authentication:', error);
        setIsAuthenticated(false);
        router.push('/LoginPage');
      } finally {
        setLoading(false);
      }
    };

    // Wait for auth loading to complete and check if we have a user
    if (!authLoading) {
      checkServerAuth();
    }
  }, [authLoading, user?.token, router, adminRequired]);

  if (loading || authLoading) {
    return <div className="centered-loader">
      <CircularProgress/>
    </div>;
  }

  if (!isAuthenticated) {
    return null; // Router will redirect
  }

  if (adminRequired && !isAdmin) {
    return null; // Router will redirect
  }

  return <>{children}</>;
};

export default ProtectedRoute;
