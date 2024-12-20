import React, { createContext, useContext, useState, useEffect } from 'react';
import {jwtDecode} from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUserData = localStorage.getItem('user');
    if (storedUserData) {
      const parsedData = JSON.parse(storedUserData);
      try {
        const decodedToken = jwtDecode(parsedData.token);

        // Check if the token has expired
        if (decodedToken.exp * 1000 < Date.now()) {
         
          logout();
        } else {
          setUser({
            ...parsedData,
            user_id: decodedToken.userId, // Normalize userId to user_id
          });
        }
      } catch (error) {
        logout();
      }
    } else {
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    try {
      const decodedToken = jwtDecode(token);
      const { userId, name, country, bio, admin, profileimage } = decodedToken;

      const userData = {
        token,
        user_id: userId, // Normalize userId to user_id
        name,
        country,
        bio,
        admin,
        profileimage,
      };

      // Store the token and user data in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      
      throw new Error('Invalid token');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('subscriptionStatus');
    
  };

  const isAuthenticated = !!user;

  if (loading) {
    return null; // Avoid rendering children until loading is complete
  }

  return (
    <AuthContext.Provider value={{ user, token: user?.token, setUser, login, logout, isAuthenticated }}>
    {children}
</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);