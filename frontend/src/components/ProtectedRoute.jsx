import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 text-neutral-600">
        <div className="flex items-center space-x-3 bg-white p-4 rounded-md border border-neutral-200">
          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-neutral-700">Verifying clinical credentials...</span>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to their appropriate dashboard
    const destination = user.role === 'DOCTOR' ? '/doctor' : '/patient';
    return <Navigate to={destination} replace />;
  }

  return children;
};
