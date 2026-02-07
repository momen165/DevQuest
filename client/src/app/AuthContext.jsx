import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logoutRef = useRef();
  const refreshPromiseRef = useRef(null);

  const parseStoredUser = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const refreshToken = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const pendingRefresh = (async () => {
      const lastRefreshAttempt = sessionStorage.getItem('lastRefreshAttempt');
      const currentTime = Date.now();
      if (lastRefreshAttempt && currentTime - Number.parseInt(lastRefreshAttempt, 10) < 10000) {
        return null;
      }

      sessionStorage.setItem('lastRefreshAttempt', currentTime.toString());

      try {
        const storedRefreshToken = localStorage.getItem('refreshToken');
        if (!storedRefreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${import.meta.env.VITE_API_URL}/refresh-token`, {
          refreshToken: storedRefreshToken,
        });

        const { token, user: userData } = response.data;
        const updatedUserData = {
          ...userData,
          token,
        };

        localStorage.setItem('user', JSON.stringify(updatedUserData));
        setUser(updatedUserData);
        return token;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        await logoutRef.current?.();
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = pendingRefresh;
    return pendingRefresh;
  }, []);

  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      async (config) => {
        if (
          config.url === `${import.meta.env.VITE_API_URL}/refresh-token` ||
          config.url === `${import.meta.env.VITE_API_URL}/login` ||
          config.url === `${import.meta.env.VITE_API_URL}/logout`
        ) {
          return config;
        }

        const userData = parseStoredUser();
        if (userData?.token) {
          try {
            const decodedToken = jwtDecode(userData.token);
            const currentTime = Date.now() / 1000;

            if (decodedToken.exp < currentTime + 300) {
              const newToken = await refreshToken();
              if (newToken) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${newToken}`;
              }
            } else {
              config.headers = config.headers || {};
              config.headers.Authorization = `Bearer ${userData.token}`;
            }
          } catch (error) {
            console.error('Token validation error:', error);
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
  }, [parseStoredUser, refreshToken]);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const storedUserData = localStorage.getItem('user');
      if (storedUserData) {
        try {
          const parsedData = JSON.parse(storedUserData);
          const decodedToken = jwtDecode(parsedData.token);
          const currentTimeInSeconds = Date.now() / 1000;

          if (decodedToken.exp < currentTimeInSeconds + 300) {
            await refreshToken();
          } else {
            setUser({
              ...parsedData,
              user_id: decodedToken.userId,
            });
          }
        } catch (error) {
          console.error('Error initializing auth from storage:', error);
          await logoutRef.current?.();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [refreshToken]);

  const login = useCallback(async (token, refreshTokenProp, userData) => {
    try {
      const decodedToken = jwtDecode(token);
      const { userId } = decodedToken;

      const combinedUserData = {
        token,
        user_id: userId,
        ...userData,
      };

      localStorage.setItem('user', JSON.stringify(combinedUserData));
      if (refreshTokenProp) {
        localStorage.setItem('refreshToken', refreshTokenProp);
      }

      setUser(combinedUserData);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const lastLogoutAttempt = sessionStorage.getItem('lastLogoutAttempt');
      const currentTime = Date.now();

      if (refreshToken &&
        (!lastLogoutAttempt || currentTime - Number.parseInt(lastLogoutAttempt, 10) > 10000)) {
        sessionStorage.setItem('lastLogoutAttempt', currentTime.toString());
        await axios.post(`${import.meta.env.VITE_API_URL}/logout`, { refreshToken });
      }
    } catch (error) {
      console.error('Error during logout:', error);
      if (error.response && error.response.status === 429) {
        console.log('Rate limited on logout, proceeding with local cleanup only');
      }
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('subscriptionStatus');
    }
  }, []);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const contextValue = useMemo(
    () => ({
      user,
      token: user?.token,
      setUser,
      login,
      logout,
      isAuthenticated: Boolean(user),
      refreshToken,
      loading,
    }),
    [user, loading, login, logout, refreshToken]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
