import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, Save, LogOut, Settings, KeyRound, List } from "lucide-react";
import { RestaurantUI } from "@/services/menuService";
import { useNavigate } from "react-router-dom";
import RestaurantDetailsDialog from "@/components/menu/RestaurantDetailsDialog";
import ChangePasswordDialog from "./ChangePasswordDialog";
import TableQRDialog from "@/components/menu/TableQRDialog";
import { supabase } from '@/lib/supabase';

interface EditorHeaderProps {
  restaurant: RestaurantUI;
  handleSaveMenu: () => void;
  handleSaveRestaurantDetails: (details: Partial<RestaurantUI>) => void;
  signOut: () => void;
  isSaving: boolean;
  showUserManagement?: boolean;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  restaurant,
  handleSaveMenu,
  handleSaveRestaurantDetails,
  signOut,
  isSaving,
  showUserManagement,
}) => {
  const navigate = useNavigate();

  // User management state
  const [users, setUsers] = useState<any[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("staff");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  // Fetch users for this restaurant
  useEffect(() => {
    if (!showUserManagement || !restaurant.id) return;
    setLoadingUsers(true);
    supabase
      .from('app_users')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .then(({ data }) => {
        setUsers(data || []);
        setLoadingUsers(false);
      });
  }, [showUserManagement, restaurant.id]);

  // Add user
  const handleAddUser = async () => {
    if (!newUserEmail || !newUserRole) return;
    setAddingUser(true);
    await supabase
      .from('app_users')
      .upsert({
        email: newUserEmail,
        role: newUserRole,
        restaurant_id: restaurant.id,
      })
      .then(() => {
        setNewUserEmail("");
        setNewUserRole("staff");
        // Refresh user list
        return supabase
          .from('app_users')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .then(({ data }) => setUsers(data || []));
      });
    setAddingUser(false);
  };

  // Change user role
  const handleChangeRole = async (userId: string, newRole: string) => {
    await supabase
      .from('app_users')
      .update({ role: newRole })
      .eq('id', userId);
    // Refresh user list
    const { data } = await supabase
      .from('app_users')
      .select('*')
      .eq('restaurant_id', restaurant.id);
    setUsers(data || []);
  };

  // Remove user
  const handleRemoveUser = async (userId: string) => {
    await supabase
      .from('app_users')
      .delete()
      .eq('id', userId);
    // Refresh user list
    const { data } = await supabase
      .from('app_users')
      .select('*')
      .eq('restaurant_id', restaurant.id);
    setUsers(data || []);
  };

  return (
    <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row justify-between items-start md:items-center mb-4 md:mb-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Menu Editor</h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Create and edit your restaurant menu
        </p>
        {showUserManagement && (
          <div className="mt-2 border rounded-lg p-3 bg-purple-50">
            <h2 className="font-semibold mb-2">User Management</h2>
            <div className="flex gap-2 mb-2">
              <input
                type="email"
                placeholder="User email"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
              <select
                value={newUserRole}
                onChange={e => setNewUserRole(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
              <Button size="sm" onClick={handleAddUser} disabled={addingUser || !newUserEmail}>
                Add
              </Button>
            </div>
            {loadingUsers ? (
              <div>Loading users...</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left">Email</th>
                    <th className="text-left">Role</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>
                        <select
                          value={user.role}
                          onChange={e => handleChangeRole(user.id, e.target.value)}
                          className="border rounded px-1 py-0.5 text-xs"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="staff">Staff</option>
                        </select>
                      </td>
                      <td>
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveUser(user.id)}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 w-full md:w-auto">
        <RestaurantDetailsDialog 
          restaurant={restaurant}
          onSave={handleSaveRestaurantDetails}
        >
          <Button variant="outline" size="sm" className="h-8 px-2 md:px-3">
            <Settings className="h-4 w-4" />
            <span className="hidden md:inline ml-2">Settings</span>
          </Button>
        </RestaurantDetailsDialog>
        
        <ChangePasswordDialog>
          <Button variant="outline" size="sm" className="h-8 px-2 md:px-3">
            <KeyRound className="h-4 w-4" />
            <span className="hidden md:inline ml-2">Password</span>
          </Button>
        </ChangePasswordDialog>

        <Button 
          variant="outline" 
          size="sm"
          className="h-8 px-2 md:px-3"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline ml-2">Sign Out</span>
        </Button>

        <TableQRDialog restaurantId={restaurant.id} />

        <Button 
          variant="outline"
          size="sm"
          className="h-8 px-2 md:px-3"
          onClick={() => navigate(`/menu-preview/${restaurant.id}`, { state: { from: 'menu-editor' } })}
        >
          <Eye className="h-4 w-4" />
          <span className="hidden md:inline ml-2">Preview</span>
        </Button>

        <Button 
          size="sm"
          className="h-8 px-3 md:px-4"
          onClick={handleSaveMenu}
          disabled={isSaving}
        >
          <Save className="h-4 w-4" />
          <span className="hidden md:inline ml-2">{isSaving ? "Saving..." : "Save"}</span>
        </Button>

        <Button 
          variant="outline" 
          size="sm"
          className="h-8 px-2 md:px-3"
          onClick={() => navigate(`/restaurant/${restaurant.id}/orders`)}
        >
          <List className="h-4 w-4" />
          <span className="hidden md:inline ml-2">Track Orders</span>
        </Button>
      </div>
    </div>
  );
};

export default EditorHeader;
