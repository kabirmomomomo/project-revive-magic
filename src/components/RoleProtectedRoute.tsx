import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RoleProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, loading, role } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    // Redirect based on role if not allowed
    if (role === 'staff') return <Navigate to="/restaurant/your-restaurant-id/orders" replace />;
    if (role === 'manager' || role === 'admin') return <Navigate to="/menu-editor" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute; 