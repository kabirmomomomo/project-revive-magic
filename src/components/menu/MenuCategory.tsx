
import React from "react";
import { MenuCategory as MenuCategoryType } from "@/types/menu";
import MenuItem from "./MenuItem";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface MenuCategoryProps {
  category: MenuCategoryType;
  isOpen: boolean;
  toggleCategory: (categoryId: string) => void;
  categoryIndex: number;
  ordersEnabled?: boolean;
}

const MenuCategory: React.FC<MenuCategoryProps> = ({
  category,
  isOpen,
  toggleCategory,
  categoryIndex,
  ordersEnabled = true
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
      <div 
        className={cn(
          "px-4 py-3 flex justify-between items-center cursor-pointer bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-all duration-300",
          isMobile ? "px-3 py-2" : "px-4 py-3"
        )}
        onClick={() => toggleCategory(category.id)}
      >
        <h2 className={cn(
          "font-semibold flex items-center",
          isMobile ? "text-sm" : "text-lg"
        )}>
          {category.icon && (
            <span className="mr-2">{category.icon}</span>
          )}
          {category.name}
        </h2>
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-1 h-auto text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            toggleCategory(category.id);
          }}
        >
          {isOpen ? (
            <ChevronUp className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
          ) : (
            <ChevronDown className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
          )}
        </Button>
      </div>
      
      {isOpen && (
        <div className={cn(
          "transition-all duration-300 ease-in-out",
          isMobile ? "px-2 py-2 space-y-2" : "p-4 space-y-4"
        )}>
          {category.items.length > 0 ? (
            category.items.map((item, index) => (
              <MenuItem 
                key={item.id} 
                item={item} 
                index={index}
                ordersEnabled={ordersEnabled}
              />
            ))
          ) : (
            <p className="text-center text-muted-foreground text-sm py-4">No items in this category</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MenuCategory;
