import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "features/admin/components/AdminSidebar";
import LoadingSpinner from "shared/ui/LoadingSpinner";

const AdminLayout = () => {
  return (
    <AdminSidebar>
      <Suspense fallback={<LoadingSpinner message="Loading admin dashboard..." />}>
        <Outlet />
      </Suspense>
    </AdminSidebar>
  );
};

export default AdminLayout;
