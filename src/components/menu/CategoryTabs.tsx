
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryType } from "@/types/menu";
import { cn } from "@/lib/utils";
import { Utensils, Wine, Beer, Heart } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CategoryTabsProps {
  activeTab: CategoryType;
  onTabChange: (tab: CategoryType) => void;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ activeTab, onTabChange }) => {
  const isMobile = useIsMobile();

  const tabs: Array<{ value: CategoryType; label: string; icon: React.ReactNode }> = [
    { 
      value: "all", 
      label: "ALL", 
      icon: <Utensils className="h-4 w-4 md:mr-2" /> 
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

  // Ensure the tab change handler correctly passes the selected value
  const handleTabChange = (value: string) => {
    console.log("Tab changed to:", value);
    onTabChange(value as CategoryType);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="w-full grid grid-cols-5 h-12 bg-amber-100 dark:bg-amber-900/20 p-0">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "flex items-center justify-center h-full data-[state=active]:bg-teal-800 data-[state=active]:text-white",
              tab.value === activeTab ? "font-bold" : "font-medium",
              isMobile ? "text-xs" : "text-base"
            )}
          >
            <span className="flex items-center">
              {tab.icon}
              {!isMobile && tab.label}
              {isMobile && tab.value === "all" && "ALL"}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default CategoryTabs;
