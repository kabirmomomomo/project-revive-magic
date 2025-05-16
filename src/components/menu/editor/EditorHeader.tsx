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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getRestaurantUsers, 
  addRestaurantUser, 
  updateRestaurantUserRole, 
  deleteRestaurantUser,
  type UserRole,
  type RestaurantUser 
} from "@/services/userService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";

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
  const queryClient = useQueryClient();
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("staff");
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Fetch restaurant users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['restaurant-users', restaurant.id],
    queryFn: () => getRestaurantUsers(restaurant.id),
    enabled: showUserManagement,
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: () => addRestaurantUser(newUserEmail, newUserRole, restaurant.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-users', restaurant.id] });
      setNewUserEmail("");
      setNewUserRole("staff");
      setIsAddingUser(false);
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: UserRole }) => 
      updateRestaurantUserRole(userId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-users', restaurant.id] });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteRestaurantUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-users', restaurant.id] });
    },
  });

  const handleAddUser = async () => {
    if (!newUserEmail) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an email address"
      });
      return;
    }
    await addUserMutation.mutateAsync();
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    await updateRoleMutation.mutateAsync({ userId, newRole });
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Are you sure you want to remove this user's access?")) {
      await deleteUserMutation.mutateAsync(userId);
    }
  };

  return (
    <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row justify-between items-start md:items-center mb-4 md:mb-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Menu Editor</h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Create and edit your restaurant menu
        </p>
        {showUserManagement && (
          <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-purple-50 hover:bg-purple-100">
                Manage Users
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Manage Restaurant Users</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter user email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={newUserRole} onValueChange={(value: UserRole) => setNewUserRole(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAddUser}
                    disabled={addUserMutation.isPending}
                  >
                    Add User
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: RestaurantUser) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value: UserRole) => handleUpdateRole(user.id, value)}
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={deleteUserMutation.isPending}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>
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
