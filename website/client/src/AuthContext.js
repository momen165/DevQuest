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
      setUser(parsedData);
    } else {
      console.log('No user found in localStorage');
    }
    setLoading(false);
  }, []);

  const fetchUserName = async (userId) => {
    // Replace with your actual API endpoint to fetch user data
    const response = await fetch(`/api/users/${userId}`);
    const data = await response.json();
    return data.name; // Adjust based on API response structure
  };

  const login = (token) => {
    try {
        const decodedToken = jwtDecode(token);
        const { userId, name, country, bio, admin, profileimage } = decodedToken;
        const userData = { token, userId, name, country, bio, admin, profileimage };
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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
