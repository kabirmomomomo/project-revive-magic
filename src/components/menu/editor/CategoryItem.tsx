
import React, { useState } from "react";
import { ChevronDown, ChevronUp, Edit, Trash, ChevronRight, Plus, ArrowUp, ArrowDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { MenuCategoryUI, MenuItemUI } from "@/services/menuService";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CategoryType } from "@/types/menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CategoryItemProps {
  category: MenuCategoryUI;
  categoryIndex: number;
  isExpanded: boolean;
  toggleExpand: (categoryId: string) => void;
  updateCategory: (id: string, name: string, type?: CategoryType) => void;
  deleteCategory: (id: string) => void;
  moveCategory: (index: number, direction: "up" | "down") => void;
  addMenuItem: (categoryId: string) => void;
  moveMenuItem: (categoryIndex: number, itemIndex: number, direction: "up" | "down") => void;
  deleteMenuItem: (categoryId: string, itemId: string) => void;
  setActiveItemId: (id: string | null) => void;
  categoriesLength: number;
}

const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  categoryIndex,
  isExpanded,
  toggleExpand,
  updateCategory,
  deleteCategory,
  moveCategory,
  addMenuItem,
  moveMenuItem,
  deleteMenuItem,
  setActiveItemId,
  categoriesLength
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(category.name);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  };

  const handleSaveName = () => {
    if (editedName.trim()) {
      updateCategory(category.id, editedName, category.type as CategoryType);
      setIsEditing(false);
    }
  };

  const handleCategoryTypeChange = (value: string) => {
    updateCategory(category.id, category.name, value as CategoryType);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setEditedName(category.name);
      setIsEditing(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <div className="flex-1 flex items-center">
          <CollapsibleTrigger
            onClick={() => toggleExpand(category.id)}
            className="mr-2"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CollapsibleTrigger>

          {isEditing ? (
            <div className="flex-1 flex gap-2">
              <Input
                value={editedName}
                onChange={handleNameChange}
                onBlur={handleSaveName}
                onKeyDown={handleKeyDown}
                autoFocus
                className="h-7 py-1"
              />
              <Button
                onClick={handleSaveName}
                variant="ghost"
                size="icon"
                className="h-7 w-7"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="font-medium text-sm md:text-base line-clamp-1 mr-2">
              {category.name}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Category Type Selection */}
          <Select
            value={category.type || ""}
            onValueChange={handleCategoryTypeChange}
          >
            <SelectTrigger className="h-7 w-[110px] text-xs">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No type</SelectItem>
              <SelectItem value="food">Food</SelectItem>
              <SelectItem value="liquor">Liquor</SelectItem>
              <SelectItem value="beverages">Beverages</SelectItem>
              <SelectItem value="revive">Revive</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => setIsEditing(true)}
            variant="ghost"
            size="icon"
            className="h-7 w-7"
          >
            <Edit className="h-3 w-3" />
          </Button>

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
              >
                <Trash className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the category "{category.name}"? This will also delete all items in this category.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteCategory(category.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={() => moveCategory(categoryIndex, "up")}
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={categoryIndex === 0}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>

          <Button
            onClick={() => moveCategory(categoryIndex, "down")}
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={categoryIndex === categoriesLength - 1}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          
          <Button
            onClick={() => addMenuItem(category.id)}
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-blue-600 dark:text-blue-400"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          {category.items.length === 0 ? (
            <div className="p-3 pt-0 border-t">
              <div className="text-center py-3 text-xs text-muted-foreground">
                No items yet. Add your first item by clicking the + button.
              </div>
            </div>
          ) : (
            <div className="p-3 pt-0 border-t">
              <div className="space-y-2 pt-2">
                {category.items.map((item, itemIndex) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border rounded-md p-2 hover:bg-accent/50 transition-colors bg-background"
                  >
                    <div
                      className="flex-1 cursor-pointer truncate"
                      onClick={() => setActiveItemId(item.id)}
                    >
                      <div className={cn("text-sm font-medium line-clamp-1", !item.is_visible ? "text-muted-foreground line-through" : "")}>
                        {item.name}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        ₹{item.price} · {item.description?.substring(0, 30) || "No description"}
                        {item.description && item.description.length > 30 ? "..." : ""}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        onClick={() => moveMenuItem(categoryIndex, itemIndex, "up")}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={itemIndex === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => moveMenuItem(categoryIndex, itemIndex, "down")}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={itemIndex === category.items.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => setActiveItemId(item.id)}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-blue-600 dark:text-blue-400"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{item.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMenuItem(category.id, item.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default CategoryItem;
