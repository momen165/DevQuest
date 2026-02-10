import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "app/AuthContext";
import CircularProgress from "@mui/material/CircularProgress";
import axios from "axios";

const ProtectedRoute = ({ children, adminRequired = false }) => {
  const { user, loading: authLoading } = useAuth();
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
          return;
        }

        const response = await axios.get(`${import.meta.env.VITE_API_URL}/check-auth`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        setIsAuthenticated(response.data.isAuthenticated);
        setIsAdmin(response.data.isAdmin);
      } catch (error) {
        console.error("Failed to check server authentication:", error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    // Wait for auth loading to complete and check if we have a user
    if (!authLoading) {
      checkServerAuth();
    }
  }, [authLoading, user?.token]);

  if (loading) {
    return (
      <div className="centered-loader">
        <CircularProgress />
      </div>
    );
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
