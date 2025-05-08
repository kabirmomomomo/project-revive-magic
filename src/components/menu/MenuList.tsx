import React from "react";
import MenuCategory from "./MenuCategory";
import { CategoryType, MenuCategory as MenuCategoryType } from "@/types/menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface MenuListProps {
  categories: MenuCategoryType[];
  openCategories: Record<string, boolean>;
  toggleCategory: (categoryId: string) => void;
  searchQuery?: string;
  activeTab?: CategoryType;
  ordersEnabled?: boolean;
}

const MenuList: React.FC<MenuListProps> = ({ 
  categories, 
  openCategories, 
  toggleCategory,
  searchQuery = "",
  activeTab = "all",
  ordersEnabled = true
}) => {
  const isMobile = useIsMobile();
  
  // Filter categories by tab and search
  const filteredCategories = categories
    .filter(category => {
      // First filter by active tab
      if (activeTab === "all" || category.type === undefined) {
        return true;
      }
      return category.type === activeTab;
    })
    .map(category => {
      // Then filter items by search query and visibility
      const filteredItems = category.items
        .filter(item => item.is_visible !== false) // Only show visible items
        .filter(item => {
          if (!searchQuery) return true;
          
          const searchLower = searchQuery.toLowerCase();
          
          // Check item name
          if (item.name?.toLowerCase().includes(searchLower)) return true;
          
          // Check item description
          if (item.description?.toLowerCase().includes(searchLower)) return true;
          
          // Check variants
          if (item.variants?.some(variant => 
            variant.name?.toLowerCase().includes(searchLower)
          )) return true;
          
          // Check addons
          if (item.addons?.some(addon => 
            addon.title?.toLowerCase().includes(searchLower) ||
            addon.options?.some(option => 
              option.name?.toLowerCase().includes(searchLower)
            )
          )) return true;
          
          return false;
        });
      
      // Return category with filtered items
      return {
        ...category,
        items: filteredItems,
      };
    }).filter(category => category.items.length > 0 || !searchQuery);

  if (filteredCategories.length === 0) {
    return (
      <div className="text-center py-12 border rounded-xl border-dashed animate-fade-in">
        <p className="text-muted-foreground">
          {searchQuery 
            ? "No items match your search." 
            : activeTab !== "all" 
              ? `No items found in the ${activeTab} category.`
              : "No categories yet. Go to the menu editor to add categories and items."
          }
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "space-y-6",
      isMobile ? "px-2" : ""
    )}>
      {filteredCategories.map((category, categoryIndex) => (
        <MenuCategory
          key={category.id}
          category={category}
          isOpen={openCategories[category.id] || !!searchQuery}
          toggleCategory={toggleCategory}
          categoryIndex={categoryIndex}
          ordersEnabled={ordersEnabled}
        />
      ))}
    </div>
  );
};

export default MenuList;
