
import React, { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryType } from "@/types/menu";
import { cn } from "@/lib/utils";
import { Utensils, Wine, Beer, Heart, Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CategoryTabsProps {
  activeTab: CategoryType;
  onTabChange: (tab: CategoryType) => void;
  visibleTabs?: CategoryType[]; // Add this prop to control which tabs are visible
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ 
  activeTab, 
  onTabChange,
  visibleTabs 
}) => {
  const isMobile = useIsMobile();

  const allTabs: Array<{ value: CategoryType; label: string; icon: React.ReactNode }> = [
    {
      value: "all",
      label: "ALL",
      icon: <Menu className="h-4 w-4 md:mr-2" />
    },
    { 
      value: "food", 
      label: "FOOD", 
      icon: <Utensils className="h-4 w-4 md:mr-2" /> 
    },
    { 
      value: "liquor", 
      label: "LIQUOR", 
      icon: <Wine className="h-4 w-4 md:mr-2" /> 
    },
    { 
      value: "beverages", 
      label: "BEVERAGES", 
      icon: <Beer className="h-4 w-4 md:mr-2" /> 
    },
    { 
      value: "revive", 
      label: "REVIVE", 
      icon: <Heart className="h-4 w-4 md:mr-2" /> 
    }
  ];

  // Filter tabs based on visibleTabs prop if provided
  const tabs = useMemo(() => {
    if (!visibleTabs || visibleTabs.length === 0) {
      return allTabs; // If no visible tabs specified, show all
    }
    
    // Always include "all" tab and any other tabs in the visibleTabs array
    return allTabs.filter(tab => tab.value === "all" || visibleTabs.includes(tab.value));
  }, [visibleTabs]);

  // Calculate grid columns based on number of visible tabs
  const gridCols = `grid-cols-${Math.min(tabs.length, 5)}`;

  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as CategoryType)} className="w-full">
      <TabsList className={`w-full grid ${gridCols} h-12 bg-amber-100 dark:bg-amber-900/20 p-0`}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "flex items-center justify-center h-full data-[state=active]:bg-teal-800 data-[state=active]:text-white",
              tab.value === activeTab ? "font-bold" : "font-medium",
              isMobile ? "text-xs" : "text-base"
            )}
            onClick={() => console.log(`Tab clicked: ${tab.value}`)}
          >
            <span className="flex items-center">
              {tab.icon}
              {!isMobile && tab.label}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default CategoryTabs;
