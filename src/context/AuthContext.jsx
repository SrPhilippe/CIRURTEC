import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from local storage", e);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (usernameOrEmail, password) => {
    const response = await api.post('/auth/login', {
      usernameOrEmail,
      password,
    });
    if (response.data.accessToken) {
      localStorage.setItem('user', JSON.stringify(response.data));
      setUser(response.data);
    }
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const register = async (username, email, password, role, rights) => {
    return await api.post('/auth/register', {
      username,
      email,
      password,
      role,
      rights
    });
  };

  const updateProfile = async (id, data) => {
    const response = await api.put(`/auth/users/${id}`, data);
    if (response.data.user) {
        // Update local user state but keep the token!
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const updatedUser = { ...currentUser, ...response.data.user };
        
        // Rights/Role might not change but if they do, we rely on the backend response
        // Note: Code above in backend returns { id, username, email, role, rights }
        // We preserve accessToken from existing local storage user
        
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
    }
    return response.data;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
