import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';

export type UserRole = 'admin' | 'manager' | 'staff';

export interface RestaurantUser {
  id: string;
  email: string;
  role: UserRole;
  restaurant_id: string;
  created_at: string;
}

export const addRestaurantUser = async (email: string, role: UserRole, restaurantId: string) => {
  try {
    // First check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('restaurant_users')
      .select('*')
      .eq('email', email)
      .eq('restaurant_id', restaurantId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingUser) {
      toast.error('User already has access to this restaurant');
      return null;
    }

    // Add new user
    const { data, error } = await supabase
      .from('restaurant_users')
      .insert({
        email,
        role,
        restaurant_id: restaurantId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    toast.success('User added successfully');
    return data;
  } catch (error: any) {
    console.error('Error adding restaurant user:', error);
    toast.error(error.message || 'Failed to add user');
    return null;
  }
};

export const updateRestaurantUserRole = async (userId: string, newRole: UserRole) => {
  try {
    const { data, error } = await supabase
      .from('restaurant_users')
      .update({ role: newRole })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    toast.success('User role updated successfully');
    return data;
  } catch (error: any) {
    console.error('Error updating user role:', error);
    toast.error(error.message || 'Failed to update user role');
    return null;
  }
};

export const deleteRestaurantUser = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('restaurant_users')
      .delete()
      .eq('id', userId);

    if (error) {
      throw error;
    }

    toast.success('User access removed successfully');
    return true;
  } catch (error: any) {
    console.error('Error deleting restaurant user:', error);
    toast.error(error.message || 'Failed to remove user access');
    return false;
  }
};

export const getRestaurantUsers = async (restaurantId: string) => {
  try {
    const { data, error } = await supabase
      .from('restaurant_users')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error: any) {
    console.error('Error fetching restaurant users:', error);
    toast.error(error.message || 'Failed to fetch users');
    return [];
  }
}; 