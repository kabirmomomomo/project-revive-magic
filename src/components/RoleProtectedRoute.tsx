import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRestaurant } from '@/services/menuService';

interface RoleProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, loading, role } = useAuth();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [fetchingRestaurant, setFetchingRestaurant] = useState(false);

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (role === 'staff' && user) {
        setFetchingRestaurant(true);
        const restaurant = await getUserRestaurant();
        setRestaurantId(restaurant?.id || null);
        setFetchingRestaurant(false);
      }
    };
    fetchRestaurant();
  }, [role, user]);

  if (loading || (role === 'staff' && fetchingRestaurant)) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    // Redirect based on role if not allowed
    if (role === 'staff') {
      if (restaurantId) {
        return <Navigate to={`/restaurant/${restaurantId}/orders`} replace />;
      }
      return <div className="flex justify-center items-center min-h-screen">No restaurant found for this staff user.</div>;
    }
    if (role === 'manager' || role === 'admin') return <Navigate to="/menu-editor" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute; 