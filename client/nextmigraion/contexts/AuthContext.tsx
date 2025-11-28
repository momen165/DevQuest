'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

interface User {
  token: string;
  user_id: string;
  name?: string;
  country?: string;
  bio?: string;
  admin?: boolean;
  profileimage?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  login: (token: string, refreshToken: string, userData: any) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  refreshToken: () => Promise<string | null>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingToken, setRefreshingToken] = useState(false);

  // Create a ref to hold the logout function
  const logoutRef = useRef<(() => Promise<void>) | null>(null);

  // Function to refresh token
  const refreshToken = useCallback(async () => {
    try {
      // Prevent multiple refresh attempts
      if (refreshingToken) return null;

      // Add refresh cooldown check
      const lastRefreshAttempt = sessionStorage.getItem('lastRefreshAttempt');
      const currentTime = Date.now();
      if (lastRefreshAttempt && (currentTime - parseInt(lastRefreshAttempt)) < 10000) {
        // Don't retry within 10 seconds
        return null;
      }

      sessionStorage.setItem('lastRefreshAttempt', currentTime.toString());
      setRefreshingToken(true);

      const storedRefreshToken = localStorage.getItem("refreshToken");
      if (!storedRefreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/refresh-token`, {
        refreshToken: storedRefreshToken
      });

      const { token, user: userData } = response.data;

      const updatedUserData: User = {
        ...userData,
        token
      };

      localStorage.setItem("user", JSON.stringify(updatedUserData));
      setUser(updatedUserData);

      return token;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      // Use the ref to call logout, avoiding the circular dependency
      logoutRef.current?.();
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
          config.url === `${process.env.NEXT_PUBLIC_API_URL}/refresh-token` ||
          config.url === `${process.env.NEXT_PUBLIC_API_URL}/login` ||
          config.url === `${process.env.NEXT_PUBLIC_API_URL}/logout`
        ) {
          return config;
        }

        // Check if we have a token and it's expired
        const userData = JSON.parse(localStorage.getItem("user") || "null");
        if (userData?.token) {
          try {
            const decodedToken: any = jwtDecode(userData.token);
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
    const initializeAuth = async () => {
      setLoading(true); // Ensure loading is true at the start of this effect
      const storedUserData = localStorage.getItem("user");
      if (storedUserData) {
        const parsedData = JSON.parse(storedUserData);
        try {
          const decodedToken: any = jwtDecode(parsedData.token);
          const currentTimeInSeconds = Date.now() / 1000;

          // Proactively refresh if token is expired OR will expire in the next 5 minutes
          if (decodedToken.exp < currentTimeInSeconds + 300) {
            await refreshToken(); // This function handles setUser on success or logout (which sets user to null) on failure.
          } else {
            // Token is valid and not expiring soon
            setUser({
              ...parsedData,
              user_id: decodedToken.userId,
            });
          }
        } catch (error) {
          // Invalid token stored (e.g., malformed) or other decoding error
          console.error("Error initializing auth from storage:", error);
          await logoutRef.current?.(); // Attempt to logout, which will clear user state
        }
      }
      // If no storedUserData, user remains null (initial state)
      setLoading(false); // Set loading to false after all checks and potential refresh
    };

    initializeAuth();
  }, [refreshToken]);

  const login = async (token: string, refreshTokenProp: string, userData: any) => {
    try {
      const decodedToken: any = jwtDecode(token);
      const { userId } = decodedToken;

      const combinedUserData: User = {
        token,
        user_id: userId, // Normalize userId to user_id
        ...userData
      };

      // Store the tokens and user data
      localStorage.setItem("user", JSON.stringify(combinedUserData));
      if (refreshTokenProp) {
        localStorage.setItem("refreshToken", refreshTokenProp);
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
      // Track logout attempts in session storage to prevent rapid retries
      const lastLogoutAttempt = sessionStorage.getItem('lastLogoutAttempt');
      const currentTime = Date.now();

      if (refreshToken &&
        (!lastLogoutAttempt || (currentTime - parseInt(lastLogoutAttempt)) > 10000)) { // 10 second cooldown
        sessionStorage.setItem('lastLogoutAttempt', currentTime.toString());
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/logout`, { refreshToken });
      }
    } catch (error) {
      console.error("Error during logout:", error);
      // Don't retry if we get a rate limit error
      if (axios.isAxiosError(error) && error.response && error.response.status === 429) {
        console.log("Rate limited on logout, proceeding with local cleanup only");
      }
    } finally {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("subscriptionStatus");
    }
  }, []);

  // Update the ref whenever logout changes
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const isAuthenticated = !!user;

  const contextValue = useMemo(() => ({
    user,
    token: user?.token || null,
    setUser,
    login,
    logout,
    isAuthenticated,
    refreshToken,
    loading,
  }), [user, isAuthenticated, loading, login, logout, refreshToken]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
