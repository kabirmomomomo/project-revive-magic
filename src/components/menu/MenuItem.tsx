
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Leaf, Beef } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { MenuItem as MenuItemType } from '@/types/menu';

interface MenuItemProps {
  item: MenuItemType;
  isCartView?: boolean;
  quantity?: number;
  onQuantityChange?: (id: string, quantity: number) => void;
  showQuantity?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  item,
  isCartView = false,
  quantity = 0,
  onQuantityChange,
  showQuantity = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { addToCart } = useCart();

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const handleAddToCart = () => {
    if (!isCartView) {
      addToCart(item);
    }
  };

  const displayPrice = item.variants?.length ? `${item.price}+` : item.price;
  
  // Determine if we should show a dietary icon
  const renderDietaryIcon = () => {
    if (item.dietary_type === 'veg') {
      return <Leaf className="h-4 w-4 text-green-600" />;
    } else if (item.dietary_type === 'non-veg') {
      return <Beef className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  return (
    <Card className={`w-full mb-2 ${isOpen ? 'shadow-md' : 'shadow-sm'} transition-shadow rounded-lg overflow-hidden`}>
      <div className="flex items-start">
        {item.image_url && (
          <div className="w-24 h-24 shrink-0">
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className={`flex-1 p-3 ${!item.image_url ? 'w-full' : ''}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-1">
                <h3 className="text-lg font-medium">{item.name}</h3>
                {renderDietaryIcon()}
              </div>
              {item.weight && (
                <p className="text-xs text-gray-500">{item.weight}</p>
              )}
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center">
                {item.old_price && (
                  <span className="text-sm line-through text-gray-400 mr-2">
                    ₹{item.old_price}
                  </span>
                )}
                <span className="font-medium">₹{displayPrice}</span>
              </div>
              {!isCartView && item.variants?.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={toggleOpen}
                >
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {item.description}
          </p>
          {!isCartView && (
            <div className="mt-2 flex justify-between items-center">
              <Button
                onClick={handleAddToCart}
                size="sm"
                variant={item.variants?.length ? "outline" : "default"}
                className="text-xs py-0 h-8"
              >
                {item.variants?.length > 0 ? "Customize" : "Add to Cart"}
              </Button>
              {showQuantity && onQuantityChange && (
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      onQuantityChange(item.id, Math.max(0, quantity - 1))
                    }
                    disabled={quantity === 0}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onQuantityChange(item.id, quantity + 1)}
                  >
                    +
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
};

export default MenuItem;
