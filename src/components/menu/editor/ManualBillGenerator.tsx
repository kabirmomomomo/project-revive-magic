import React, { useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Minus, X, FileText, ChevronDown, Printer } from 'lucide-react';
import { MenuItemUI } from '@/services/menuService';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { sendBillSMS } from '@/services/smsService';
import { toast } from 'sonner';
import { printBill } from '@/services/printerService';
import PrinterSettings from './PrinterSettings';

interface ManualBillGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItems: MenuItemUI[];
  restaurantId: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variant_name?: string;
}

interface BillOrder {
  id: string;
  created_at: string;
  items: CartItem[];
  total_amount: number;
  customer_name: string;
  customer_phone: string;
}

const ManualBillGenerator: React.FC<ManualBillGeneratorProps> = ({
  open,
  onOpenChange,
  menuItems,
  restaurantId,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [showBill, setShowBill] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const billRef = useRef<HTMLDivElement>(null);
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [billUrl, setBillUrl] = useState<string | null>(null);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<{
    ip: string;
    port: number;
    paperWidth: number;
  } | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: restaurant } = useQuery({
    queryKey: ['restaurant-details', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('name, description, location, phone')
        .eq('id', restaurantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  // Filter menu items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return menuItems;
    return menuItems.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [menuItems, searchQuery]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and limit to 10 digits
    if (/^\d*$/.test(value) && value.length <= 10) {
      setCustomerPhone(value);
    }
  };

  const addToCart = () => {
    if (!selectedItem) return;

    const item = menuItems.find(i => i.id === selectedItem);
    if (!item) return;

    const existingItem = cartItems.find(
      i => i.id === selectedItem && i.variant_name === selectedVariant
    );

    if (existingItem) {
      setCartItems(cartItems.map(i =>
        i.id === selectedItem && i.variant_name === selectedVariant
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setCartItems([...cartItems, {
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: 1,
        variant_name: selectedVariant || undefined
      }]);
    }

    setSelectedItem('');
    setSelectedVariant('');
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const removeFromCart = (itemId: string, variantName?: string) => {
    setCartItems(cartItems.filter(i => 
      !(i.id === itemId && i.variant_name === variantName)
    ));
  };

  const updateQuantity = (itemId: string, variantName: string | undefined, change: number) => {
    setCartItems(cartItems.map(item => {
      if (item.id === itemId && item.variant_name === variantName) {
        const newQuantity = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const handleGenerateBill = async () => {
    if (!customerName || !customerPhone || cartItems.length === 0) return;
    
    try {
      // Generate bill URL (you'll need to implement this based on your storage solution)
      const billId = Date.now().toString();
      const billUrl = `${window.location.origin}/bills/${billId}`;
      setBillUrl(billUrl);
      
      setShowBill(true);
    } catch (error) {
      console.error('Error generating bill:', error);
      toast.error('Failed to generate bill');
    }
  };

  const handleSendSMS = async () => {
    if (!billUrl || !restaurant) return;

    setIsSendingSMS(true);
    try {
      const result = await sendBillSMS(customerPhone, billUrl, restaurant.name);
      
      if (result.success) {
        toast.success('Bill sent successfully via SMS');
      } else {
        toast.error(result.error || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error('Failed to send SMS');
    } finally {
      setIsSendingSMS(false);
    }
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItem(itemId);
    setSelectedVariant('');
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const downloadBill = async () => {
    if (!billRef.current) return;

    try {
      const canvas = await html2canvas(billRef.current);
      const dataUrl = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `receipt-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating bill:', error);
    }
  };

  const handlePrint = async () => {
    if (!printerConfig) {
      setShowPrinterSettings(true);
      return;
    }

    setIsPrinting(true);
    try {
      const result = await printBill(order!, printerConfig);
      
      if (result.success) {
        toast.success('Bill printed successfully');
      } else {
        toast.error(result.error || 'Failed to print bill');
      }
    } catch (error) {
      console.error('Error printing bill:', error);
      toast.error('Failed to print bill');
    } finally {
      setIsPrinting(false);
    }
  };

  const order: BillOrder | null = showBill ? {
    id: Date.now().toString(),
    created_at: new Date().toISOString(),
    items: cartItems,
    total_amount: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    customer_name: customerName,
    customer_phone: customerPhone
  } : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Manual Bill</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label htmlFor="customer-phone">Phone Number</Label>
              <Input
                id="customer-phone"
                value={customerPhone}
                onChange={handlePhoneChange}
                placeholder="Enter 10-digit phone number"
                maxLength={10}
                type="tel"
              />
            </div>

            {/* Item Selection */}
            <div className="space-y-2">
              <Label>Add Items</Label>
              <div className="relative">
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isDropdownOpen}
                  className="w-full justify-between"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  {selectedItem
                    ? menuItems.find((item) => item.id === selectedItem)?.name
                    : "Select an item..."}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                
                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg">
                    <div className="p-2 border-b">
                      <Input
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <ScrollArea className="h-[200px]">
                      {filteredItems.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500 text-center">
                          No items found
                        </div>
                      ) : (
                        filteredItems.map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "px-4 py-2 cursor-pointer hover:bg-gray-100",
                              selectedItem === item.id && "bg-gray-100"
                            )}
                            onClick={() => handleItemSelect(item.id)}
                          >
                            {item.name}
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>

              {selectedItem && (
                <select
                  className="w-full p-2 border rounded-md mt-2"
                  value={selectedVariant}
                  onChange={(e) => setSelectedVariant(e.target.value)}
                >
                  <option value="">No variant</option>
                  {menuItems
                    .find(i => i.id === selectedItem)
                    ?.variants.map((variant) => (
                      <option key={variant.id} value={variant.name}>
                        {variant.name} - ₹{variant.price}
                      </option>
                    ))}
                </select>
              )}

              <Button
                onClick={addToCart}
                disabled={!selectedItem}
                className="w-full mt-2"
              >
                Add to Cart
              </Button>
            </div>
          </div>

          {/* Cart */}
          <div className="space-y-4">
            <Label>Cart Items</Label>
            <ScrollArea className="h-[300px] border rounded-md p-4">
              {cartItems.map((item) => (
                <Card key={`${item.id}-${item.variant_name}`} className="mb-2">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.variant_name && (
                          <p className="text-sm text-gray-500">{item.variant_name}</p>
                        )}
                        <p className="text-sm">₹{item.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.variant_name, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span>{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.variant_name, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id, item.variant_name)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </ScrollArea>

            <div className="flex justify-between items-center font-medium">
              <span>Total:</span>
              <span>
                ₹{cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
              </span>
            </div>

            <Button
              className="w-full"
              disabled={!customerName || !customerPhone || cartItems.length === 0 || customerPhone.length !== 10}
              onClick={handleGenerateBill}
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Bill
            </Button>
          </div>
        </div>

        {/* Bill Preview */}
        {showBill && order && (
          <div className="mt-6 border-t pt-6">
            <Card className="w-full max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-xl text-purple-900 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Bill Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={billRef} className="space-y-4 bg-white p-4 rounded-xl border border-gray-200">
                  {restaurant && (
                    <div className="border-b border-gray-100 pb-2 text-center mb-2">
                      <h2 className="text-lg font-semibold text-purple-900">{restaurant.name}</h2>
                      {restaurant.description && (
                        <p className="text-xs text-gray-600 mt-0.5">{restaurant.description}</p>
                      )}
                      {restaurant.location && (
                        <p className="text-xs text-gray-600 mt-0.5">{restaurant.location}</p>
                      )}
                      {restaurant.phone && (
                        <p className="text-xs text-gray-600 mt-0.5">{restaurant.phone}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <div className="mb-4 rounded-md border border-purple-100 px-2 py-2 bg-gradient-to-br from-purple-50/20 to-white">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-muted-foreground">
                          Bill #{order.id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                      <div>
                        {order.items.map((item) => (
                          <div
                            key={`${item.id}-${item.variant_name}`}
                            className="flex justify-between items-center text-xs sm:text-sm border-b border-gray-100 py-1 px-1"
                          >
                            <div className="flex flex-col text-left w-2/3">
                              <span>
                                {item.quantity}x {item.name}
                                {item.variant_name && (
                                  <span className="text-gray-500"> ({item.variant_name})</span>
                                )}
                              </span>
                            </div>
                            <div className="text-right w-1/3 flex flex-col">
                              <span>
                                ₹{item.price.toFixed(2)} × {item.quantity} = <span className="font-bold">₹{(item.price * item.quantity).toFixed(2)}</span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-1 text-xs text-right text-purple-700 border-t border-gray-100 mt-2">
                        Subtotal: <span className="font-semibold">₹{order.total_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-300">
                    <div className="flex justify-between font-semibold text-base mt-1">
                      <span>Total Payable</span>
                      <span className="text-purple-700">₹{order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-4">
                    <p>Customer: {order.customer_name}</p>
                    <p>Phone: {order.customer_phone}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={downloadBill}
                    variant="outline"
                    className="flex-1"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download Receipt
                  </Button>
                  
                  <Button
                    onClick={handlePrint}
                    disabled={isPrinting}
                    className="flex-1"
                  >
                    {isPrinting ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Printing...
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4 mr-2" />
                        Print Bill
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleSendSMS}
                    disabled={isSendingSMS || !billUrl}
                    className="flex-1"
                  >
                    {isSendingSMS ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">📱</span>
                        Send via SMS
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <PrinterSettings
          open={showPrinterSettings}
          onOpenChange={setShowPrinterSettings}
          onSave={setPrinterConfig}
          initialConfig={printerConfig || undefined}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ManualBillGenerator; 