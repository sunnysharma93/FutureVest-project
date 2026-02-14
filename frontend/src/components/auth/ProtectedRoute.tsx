import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { RootState } from '../../store';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'USER' | 'INVESTOR' | 'ADMIN';
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  fallback 
}) => {
  const { isAuthenticated, user, isLoading } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner message="Verifying authentication..." fullScreen />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Check role requirements
  if (requiredRole && user?.role !== requiredRole) {
    // User is authenticated but doesn't have the required role
    if (fallback) {
      return <>{fallback}</>;
    }

    // Redirect to appropriate page based on user role
    switch (user?.role) {
      case 'USER':
        return <Navigate to="/dashboard" replace />;
      case 'INVESTOR':
        return <Navigate to="/dashboard" replace />;
      case 'ADMIN':
        return <Navigate to="/admin" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  // User is authenticated and has required role (or no role requirement)
  return <>{children}</>;
};

export default ProtectedRoute;
