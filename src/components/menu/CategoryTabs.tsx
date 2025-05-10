import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryType } from "@/types/menu";
import { cn } from "@/lib/utils";
import { Utensils, Wine, Beer, Heart, Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CategoryTabsProps {
  activeTab: CategoryType;
  onTabChange: (tab: CategoryType) => void;
  ordersEnabled?: boolean;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ activeTab, onTabChange, ordersEnabled = true }) => {
  const isMobile = useIsMobile();

  const tabs: Array<{ value: CategoryType; label: string; icon: React.ReactNode }> = [
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
    // { 
    //   value: "liquor", 
    //   label: "LIQUOR", 
    //   icon: <Wine className="h-4 w-4 md:mr-2" /> 
    // },
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

  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as CategoryType)} className="w-full">
      <TabsList className="w-full grid grid-cols-5 h-12 bg-gradient-to-r from-blue-50 to-purple-50 p-0">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "flex items-center justify-center h-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white hover:from-blue-100 hover:to-purple-100 transition-all duration-300",
              tab.value === activeTab ? "font-bold" : "font-medium text-gray-700",
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
