import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('slotzero_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('slotzero_token') || null);
  const [loading, setLoading] = useState(true);

  // Sync token in localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('slotzero_token', token);
    } else {
      localStorage.removeItem('slotzero_token');
    }
  }, [token]);

  // Sync user in localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('slotzero_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('slotzero_user');
    }
  }, [user]);

  // Fetch current user on initial mount
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        if (data.success) {
          setUser(data.user);
        }
      } catch (err) {
        console.warn('Session expired or invalid, logging out:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        toast.success(`Welcome back, ${data.user.name}`);
        return { success: true, user: data.user };
      }
    } catch (err) {
      toast.error(err.message || 'Login failed');
      return { success: false, error: err.message };
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await api.post('/auth/register', userData);
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        toast.success(`Account registered! Welcome, ${data.user.name}`);
        return { success: true, user: data.user };
      }
    } catch (err) {
      toast.error(err.message || 'Registration failed');
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('slotzero_token');
    localStorage.removeItem('slotzero_user');
    toast.success('Signed out securely');
  };

  // Instant demo login for judges
  const quickDemoLogin = async (email) => {
    return login(email, 'demoPassword123!');
  };

  const updateUserTimezone = (tz) => {
    if (user) {
      const updated = { ...user, timezone: tz };
      setUser(updated);
    }
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    loading,
    login,
    register,
    logout,
    quickDemoLogin,
    updateUserTimezone,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
