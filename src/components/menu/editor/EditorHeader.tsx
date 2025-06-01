import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, Save, LogOut, Settings, KeyRound, List, Receipt, BarChart3 } from "lucide-react";
import { RestaurantUI } from "@/services/menuService";
import { useNavigate } from "react-router-dom";
import RestaurantDetailsDialog from "@/components/menu/RestaurantDetailsDialog";
import ChangePasswordDialog from "./ChangePasswordDialog";
import TableQRDialog from "@/components/menu/TableQRDialog";
import ManualBillGenerator from "./ManualBillGenerator";

interface EditorHeaderProps {
  restaurant: RestaurantUI;
  handleSaveMenu: () => void;
  handleSaveRestaurantDetails: (details: Partial<RestaurantUI>) => void;
  signOut: () => void;
  isSaving: boolean;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  restaurant,
  handleSaveMenu,
  handleSaveRestaurantDetails,
  signOut,
  isSaving,
}) => {
  const navigate = useNavigate();
  const [isRestaurantDetailsOpen, setIsRestaurantDetailsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isTableQROpen, setIsTableQROpen] = useState(false);
  const [isManualBillOpen, setIsManualBillOpen] = useState(false);

  // Get all menu items from all categories
  const allMenuItems = restaurant.categories.flatMap(category => category.items);

  return (
    <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row justify-between items-start md:items-center mb-4 md:mb-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Menu Editor</h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Create and edit your restaurant menu
        </p>
      </div>
      <div className="flex flex-wrap gap-2 w-full md:w-auto">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 md:px-3"
          onClick={() => setIsManualBillOpen(true)}
        >
          <Receipt className="h-4 w-4" />
          <span className="hidden md:inline ml-2">Generate Bill</span>
        </Button>

        <RestaurantDetailsDialog 
          open={isRestaurantDetailsOpen}
          onOpenChange={setIsRestaurantDetailsOpen}
          restaurant={restaurant}
          onSave={handleSaveRestaurantDetails}
        >
          <Button variant="outline" size="sm" className="h-8 px-2 md:px-3">
            <Settings className="h-4 w-4" />
            <span className="hidden md:inline ml-2">Settings</span>
          </Button>
        </RestaurantDetailsDialog>
        
        <ChangePasswordDialog
          open={isChangePasswordOpen}
          onOpenChange={setIsChangePasswordOpen}
        >
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

        <TableQRDialog
          open={isTableQROpen}
          onOpenChange={setIsTableQROpen}
          restaurantId={restaurant.id}
        />

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
          variant="outline"
          size="sm"
          onClick={() => navigate(`/analytics/${restaurant.id}`)}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Analytics
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

      <ManualBillGenerator
        open={isManualBillOpen}
        onOpenChange={setIsManualBillOpen}
        menuItems={allMenuItems}
        restaurantId={restaurant.id}
      />
    </div>
  );
};

export default EditorHeader;
