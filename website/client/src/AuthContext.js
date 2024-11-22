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
      const decodedToken = jwtDecode(parsedData.token);

      // Check if the token has expired
      if (decodedToken.exp * 1000 < Date.now()) {
        console.log('Token expired. Logging out...');
        logout();
      } else {
        setUser(parsedData);
      }
    } else {
      console.log('No user found in localStorage');
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    try {
      const decodedToken = jwtDecode(token);
      const { userId, name, country, bio, admin, profileimage } = decodedToken;
      const userData = { token, userId, name, country, bio, admin, profileimage };

      // Store the token and user data in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error decoding token:', error);
      throw new Error('Invalid token');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (loading) {
    return null; // Don't block rendering
  }

  return (
    <AuthContext.Provider value={{ user, token: user?.token, setUser, login, logout }}>
    {children}
</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
