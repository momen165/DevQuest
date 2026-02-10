import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "shared/layout/Navbar";
import Footer from "shared/layout/Footer";
import SupportForm from "features/support/components/SupportForm";
import LoadingSpinner from "shared/ui/LoadingSpinner";
import "./AppLayout.css";

const AppLayout = () => {
  const location = useLocation();
  const isLessonPage = location.pathname.includes("/lesson/");

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Suspense
          fallback={<LoadingSpinner fullScreen={false} center={true} message="Loading page..." />}
        >
          <Outlet />
        </Suspense>
      </main>
      {!isLessonPage && <SupportForm />}
      {!isLessonPage && <Footer />}
    </div>
  );
};

export default AppLayout;
