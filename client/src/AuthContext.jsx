import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshingToken, setRefreshingToken] = useState(false);

  // Function to refresh token
  const refreshToken = useCallback(async () => {
    try {
      // Prevent multiple refresh attempts
      if (refreshingToken) return null;

      setRefreshingToken(true);

      const storedRefreshToken = localStorage.getItem("refreshToken");
      if (!storedRefreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/refresh-token`, {
        refreshToken: storedRefreshToken
      });

      const { token, user: userData } = response.data;

      const updatedUserData = {
        ...userData,
        token
      };

      localStorage.setItem("user", JSON.stringify(updatedUserData));
      setUser(updatedUserData);

      return token;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      // If refresh fails, log the user out
      logout();
      return null;
    } finally {
      setRefreshingToken(false);
    }
  }, [refreshingToken]);

  // Set up axios interceptor for automatic token refresh
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      async (config) => {
        // Don't intercept auth requests to prevent infinite loops
        if (
          config.url === `${import.meta.env.VITE_API_URL}/refresh-token` ||
          config.url === `${import.meta.env.VITE_API_URL}/login` ||
          config.url === `${import.meta.env.VITE_API_URL}/logout`
        ) {
          return config;
        }

        // Check if we have a token and it's expired
        const userData = JSON.parse(localStorage.getItem("user") || "null");
        if (userData?.token) {
          try {
            const decodedToken = jwtDecode(userData.token);
            const currentTime = Date.now() / 1000;

            // If token is expired or about to expire (within 5 minutes), refresh it
            if (decodedToken.exp < currentTime + 300) {
              const newToken = await refreshToken();
              if (newToken) {
                config.headers.Authorization = `Bearer ${newToken}`;
              }
            } else {
              config.headers.Authorization = `Bearer ${userData.token}`;
            }
          } catch (error) {
            console.error("Token validation error:", error);
          }
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Clean up interceptor on unmount
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, [refreshToken]);

  useEffect(() => {
    const storedUserData = localStorage.getItem("user");
    if (storedUserData) {
      const parsedData = JSON.parse(storedUserData);
      try {
        const decodedToken = jwtDecode(parsedData.token);

        // Check if the token has expired
        if (decodedToken.exp * 1000 < Date.now()) {
          // Try to refresh the token
          refreshToken();
        } else {
          setUser({
            ...parsedData,
            user_id: decodedToken.userId, // Normalize userId to user_id
          });
        }
      } catch (error) {
        logout();
      }
    }
    setLoading(false);
  }, [refreshToken]);

  const login = async (token, refreshToken, userData) => {
    try {
      const decodedToken = jwtDecode(token);
      const { userId, name, country, bio, admin, profileimage } = decodedToken;

      const combinedUserData = {
        token,
        user_id: userId, // Normalize userId to user_id
        ...userData
      };

      // Store the tokens and user data
      localStorage.setItem("user", JSON.stringify(combinedUserData));
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      setUser(combinedUserData);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await axios.post(`${import.meta.env.VITE_API_URL}/logout`, { refreshToken });
      }
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("subscriptionStatus");
    }
  }, []);

  const isAuthenticated = !!user;

  if (loading) {
    return null; // Avoid rendering children until loading is complete
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token: user?.token,
        setUser,
        login,
        logout,
        isAuthenticated,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
