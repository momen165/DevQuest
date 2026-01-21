import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from 'shared/layout/Navbar';
import Sidebar from 'shared/layout/AccountSettingsSidebar';
import Footer from 'shared/layout/Footer';
import SupportForm from 'features/support/components/SupportForm';
import LoadingSpinner from 'shared/ui/LoadingSpinner';
import './DashboardLayout.css';

const DashboardLayout = () => {
    const location = useLocation();
    
    // Determine active link based on current path
    const getActiveLink = () => {
        const path = location.pathname.toLowerCase();
        if (path.includes('accountsettings')) return 'profile';
        if (path.includes('changepassword')) return 'login';
        if (path.includes('billing')) return 'billing';
        return '';
    };

    return (
        <div className="dashboard-layout">
            <Navbar />
            <div className="account-settings-profile-page">
                <Sidebar activeLink={getActiveLink()} />
                <Suspense fallback={<LoadingSpinner center={true} message="Loading dashboard..." />}>
                    <Outlet />
                </Suspense>
            </div>
            <SupportForm />
            <Footer />
        </div>
    );
};

export default DashboardLayout;
