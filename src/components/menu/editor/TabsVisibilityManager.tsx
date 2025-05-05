
import React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryType } from "@/types/menu";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface TabsVisibilityManagerProps {
  visibleTabs: CategoryType[];
  onVisibleTabsChange: (tabs: CategoryType[]) => void;
}

const TabsVisibilityManager: React.FC<TabsVisibilityManagerProps> = ({
  visibleTabs,
  onVisibleTabsChange,
}) => {
  const allTabs: { id: CategoryType, label: string }[] = [
    { id: "food", label: "Food" },
    { id: "liquor", label: "Liquor" },
    { id: "beverages", label: "Beverages" },
    { id: "revive", label: "Revive" }
  ];
  
  const handleTabToggle = (tab: CategoryType) => {
    if (visibleTabs.includes(tab)) {
      onVisibleTabsChange(visibleTabs.filter(t => t !== tab));
    } else {
      onVisibleTabsChange([...visibleTabs, tab]);
    }
  };

  const selectAll = () => {
    onVisibleTabsChange(allTabs.map(tab => tab.id));
  };

  const selectNone = () => {
    onVisibleTabsChange([]);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Visible Category Tabs</span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectAll}
              className="h-7 text-xs"
            >
              <Check className="h-3 w-3 mr-1" /> All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectNone}
              className="h-7 text-xs"
            >
              <X className="h-3 w-3 mr-1" /> None
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Select which category tabs will be visible in the menu preview. The "All" tab is always visible.
        </p>
        <Separator className="mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {allTabs.map((tab) => (
            <div 
              key={tab.id} 
              className="flex items-center space-x-2 border rounded-md p-2 hover:bg-muted/20 transition-colors"
            >
              <Checkbox 
                id={`tab-${tab.id}`} 
                checked={visibleTabs.includes(tab.id)} 
                onCheckedChange={() => handleTabToggle(tab.id)}
              />
              <Label 
                htmlFor={`tab-${tab.id}`}
                className="flex-1 cursor-pointer"
              >
                {tab.label}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TabsVisibilityManager;
