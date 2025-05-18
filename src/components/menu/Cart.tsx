import React, { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, X, Minus, Plus, Trash2, Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useOrders } from '@/contexts/OrderContext';
import { useParams } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';
import { Badge } from "@/components/ui/badge";

interface CartProps {
  tableId?: string;
  sessionId?: string;
  sessionCode?: string;
  isSessionOwner?: boolean;
}

const Cart: React.FC<CartProps> = ({ tableId, sessionId, sessionCode, isSessionOwner }) => {
  const [open, setOpen] = useState(false);
  const { menuId } = useParams();
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, getItemCount, clearCart } = useCart();
  const { placeOrder, isLoading, userName } = useOrders();

  const handleCheckout = async () => {
    if (!menuId) {
      toast.error('Restaurant ID not found');
      return;
    }
    
    // Pass both tableId and sessionId to the placeOrder function, and userName
    await placeOrder(menuId, tableId, sessionId, sessionCode, userName);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="fixed bottom-4 right-2 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-none pulse-animation z-50"
        >
          <ShoppingCart className="h-6 w-6 float-animation" />
          {getItemCount() > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-bounce">
              {getItemCount()}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="w-full sm:max-w-md border-t border-purple-100 bg-gradient-to-b from-white to-purple-50 rounded-t-2xl">
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 z-10 rounded-full p-1 text-gray-400 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
          aria-label="Close cart"
        >
          <X className="h-4 w-4" />
        </button>
        <SheetHeader>
          <SheetTitle className="text-xl flex items-center gap-2 text-purple-900">
            <ShoppingCart className="h-5 w-5" />
            Your Cart 
            {tableId && (
              <span className="text-sm font-normal">(Table {tableId})</span>
            )}
            {sessionCode && (
              <Badge 
                variant="outline" 
                className="ml-2 bg-purple-50 text-purple-700 border-purple-200 gap-1"
              >
                <Users className="h-3 w-3" />
                {sessionCode}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 flex flex-col h-[calc(100vh-180px)]">
          {cartItems.length === 0 ? (
            <div className="text-center py-10 animate-fade-in">
              <div className="mb-4 text-purple-300">
                <ShoppingCart className="h-16 w-16 mx-auto" />
              </div>
              <p className="text-muted-foreground">Your cart is empty</p>
              
              {sessionCode && !isSessionOwner && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
                  You've joined bill <span className="font-mono font-medium">{sessionCode}</span>. 
                  <br/>Your orders will be added to this shared bill.
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto pr-2 space-y-4">
                {cartItems.map((item, index) => (
                  <div 
                    key={`${item.id}-${item.selectedVariant?.id || 'default'}`} 
                    className="py-4 px-3 border-b border-purple-100 rounded-lg transition-all duration-300 hover:bg-purple-50 animate-fade-in"
                    style={{animationDelay: `${index * 100}ms`}}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-purple-900">{item.name}</h3>
                        {item.selectedVariant && (
                          <p className="text-xs text-purple-600 font-medium mt-1">
                            Variant: {item.selectedVariant.name}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          ₹{item.selectedVariant ? parseFloat(item.selectedVariant.price).toFixed(2) : parseFloat(item.price).toFixed(2)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.id, item.selectedVariant?.id)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </div>
                    <div className="flex items-center mt-2">
                      <div className="flex items-center border border-purple-200 rounded-full overflow-hidden bg-white">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedVariant?.id)}
                          className="h-8 w-8 p-0 rounded-full text-purple-700 hover:text-purple-900 hover:bg-purple-100"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                          <span className="sr-only">Decrease quantity</span>
                        </Button>
                        <span className="w-8 text-center text-sm font-medium text-purple-900">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedVariant?.id)}
                          className="h-8 w-8 p-0 rounded-full text-purple-700 hover:text-purple-900 hover:bg-purple-100"
                        >
                          <Plus className="h-3 w-3" />
                          <span className="sr-only">Increase quantity</span>
                        </Button>
                      </div>
                      <div className="ml-auto font-medium text-purple-900">
                        <span className="text-sm font-medium">
                          ₹{((item.selectedVariant ? parseFloat(item.selectedVariant.price) : parseFloat(item.price)) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-purple-100 py-4 mt-auto bg-white bg-opacity-70 backdrop-blur-sm rounded-t-xl">
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-purple-700">Subtotal</span>
                  <span className="text-purple-900 font-medium">₹{getCartTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 font-bold">
                  <span className="text-purple-900">Total</span>
                  <span className="text-purple-900">₹{getCartTotal().toFixed(2)}</span>
                </div>
                <div className="mt-4 space-y-2">
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                    onClick={handleCheckout}
                    disabled={isLoading || cartItems.length === 0}
                  >
                    {isLoading ? 'Placing Order...' : `Checkout ${tableId ? `(Table ${tableId})` : ''}`}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors"
                    onClick={() => clearCart()}
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear Cart
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Cart;
