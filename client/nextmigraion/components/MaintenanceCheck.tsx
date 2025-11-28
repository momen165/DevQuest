'use client';

import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/admin/MaintenanceCheck.css';

interface MaintenanceCheckProps {
  children: React.ReactNode;
}

const MaintenanceCheck: React.FC<MaintenanceCheckProps> = ({ children }) => {
  const [isInMaintenance, setIsInMaintenance] = useState(false);
  const [isInitialCheck, setIsInitialCheck] = useState(true);
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Cache the axios instance with configuration
  const axiosInstance = useMemo(() => {
    const baseURL = process.env.NEXT_PUBLIC_API_URL;
    if (!baseURL) {
      console.error('NEXT_PUBLIC_API_URL is not defined. Please check your environment variables.');
    }
    return axios.create({
      baseURL,
      timeout: 8000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkMaintenanceStatus = async () => {
      try {
        let response;
        try {
          response = await axiosInstance.get('/admin/system-settings');
        } catch (firstError) {
          response = await axiosInstance.get('/admin/maintenance-status');
        }

        if (isMounted) {
          setIsInMaintenance(!!response.data.maintenanceMode);
        }
      } catch (err) {
        console.error('Error checking maintenance status:', err);
        if (isMounted) {
          setIsInMaintenance(false);
        }
      } finally {
        if (isMounted) {
          setIsInitialCheck(false);
        }
      }
    };

    checkMaintenanceStatus();

    // Poll every 5 minutes
    const pollInterval = setInterval(checkMaintenanceStatus, 300000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [axiosInstance]);

  useEffect(() => {
    if (isInMaintenance && user && !user.admin) {
      sessionStorage.setItem('redirectPath', pathname);
      logout();
    }
  }, [isInMaintenance, user, logout, pathname]);

  const handleAdminLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    sessionStorage.setItem('redirectPath', pathname);
    router.push('/LoginPage');
  };

  if (isInitialCheck) {
    return <>{children}</>;
  }

  if (!isInMaintenance || (user && user.admin)) {
    return <>{children}</>;
  }

  return (
    <div className="maintenance-page">
      <div className="maintenance-content">
        <h1>Site Under Maintenance</h1>
        <p>We&apos;re currently performing scheduled maintenance to improve your experience.</p>
        <div className="maintenance-info">
          <p>Expected Duration: 2 hours</p>
          <p>We&apos;ll be back online soon!</p>
        </div>
        <div className="admin-login-section">
          <p>
            Administrators can{' '}
            <button
              onClick={handleAdminLogin}
              className="login-link"
              aria-label="Administrator login"
            >
              log in here
            </button>
          </p>
        </div>
        <div className="contact-info">
          <p>Need help? Contact us:</p>
          <a href="mailto:support@mail.dev-quest.me">support@email.dev-quest.me</a>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceCheck;
