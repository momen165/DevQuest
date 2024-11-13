import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);  // Added loading state

  useEffect(() => {
    const storedUserData = localStorage.getItem('user');
    if (storedUserData) {
      const parsedData = JSON.parse(storedUserData);
      setUser(parsedData);
      console.log('User loaded from localStorage:', parsedData); // Check if user data is loaded correctly
    } else {
      console.log('No user found in localStorage');
    }
    setLoading(false); // Set loading to false after checking localStorage
  }, []);

  // Login function to decode token and store user data
  const login = (token) => {
    try {
      const decodedToken = jwtDecode(token);
      const { admin } = decodedToken;
      const userData = { token, admin };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error decoding token:', error);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // If still loading, render nothing or a loading spinner
  if (loading) {
    return <div>Loading...</div>; // Or a more fancy loading screen
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
