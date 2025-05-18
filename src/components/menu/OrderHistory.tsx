import React, { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronUp, Smartphone, Receipt, Users, Table, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useOrders } from '@/contexts/OrderContext';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TableOrders from './TableOrders';

interface OrderHistoryProps {
  tableId?: string;
}

const OrderHistoryItem = ({ order, isOpen, onToggle }: {
  order: any;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden shadow-sm mb-2 animate-in fade-in">
      <div
        className="flex items-center justify-between p-2 cursor-pointer bg-white hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="bg-purple-100 p-1.5 rounded-full shrink-0">
            <Receipt className="h-3.5 w-3.5 text-purple-700" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">
              Order #{order.id.substring(0, 6)}...
              {order.is_split_bill && (
                <Badge variant="outline" className="ml-1 text-xs bg-purple-50 text-purple-700 border-purple-200">
                  Split
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(order.created_at), 'MMM d, h:mm a')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <div className="text-right">
            <div className="font-medium text-sm">₹{Number(order.total_amount).toFixed(2)}</div>
            <div className="text-xs text-gray-500">
              {order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} items
            </div>
          </div>
          <div className="text-gray-400">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="px-2 py-1.5 bg-gray-50 border-t border-gray-100 animate-in slide-in-from-top">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {order.table_id && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                <Table className="h-3 w-3" />
                Table {order.table_id}
              </Badge>
            )}
            {order.session_code && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Session {order.session_code}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200 flex items-center gap-1">
              <Smartphone className="h-3 w-3" />
              Device {order.device_id.substring(0, 6)}...
            </Badge>
          </div>
          <div className="space-y-0.5 pt-1">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm py-0.5">
                <div className="text-gray-700 truncate pr-2">
                  {item.quantity}× {item.item_name}
                  {item.variant_name && (
                    <span className="text-gray-500 text-xs"> ({item.variant_name})</span>
                  )}
                </div>
                <div className="text-gray-900 shrink-0">₹{(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
            <div className="border-t border-gray-200 mt-1.5 pt-1.5 flex justify-between text-sm font-medium">
              <div className="text-gray-700">Total</div>
              <div className="text-purple-700">₹{Number(order.total_amount).toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const OrderHistory: React.FC<OrderHistoryProps> = ({ tableId }) => {
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { orders, tableOrders, fetchOrders, fetchTableOrders, fetchSessionOrders } = useOrders();
  const { menuId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionCode = searchParams.get('sessionCode');
  const navigate = useNavigate();

  const handleRefresh = async () => {
    if (!menuId) return;
    setIsRefreshing(true);
    try {
      await fetchOrders(menuId);
      if (tableId) {
        await fetchTableOrders(menuId, tableId);
      }
      if (sessionCode) {
        await fetchSessionOrders(menuId, sessionCode);
      }
      // toast.success('Orders refreshed successfully');
    } catch (error) {
      console.error('Error refreshing orders:', error);
      toast.error('Failed to refresh orders');
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleOrder = (orderId: string) => {
    setOpenStates(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Filter orders by sessionCode if provided
  const filteredOrders = sessionCode
    ? orders.filter(order => order.session_code === sessionCode)
    : orders;

  const hasOrders = filteredOrders.length > 0;
  const hasTableOrders = tableOrders.length > 0;

  useEffect(() => {
    const intervalId = setInterval(() => {
      handleRefresh();
    }, 10000);
    return () => clearInterval(intervalId);
  }, [handleRefresh]);

  return (
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "fixed bottom-4 left-2 h-14 w-14 rounded-full shadow-lg border-none z-50 transition-all sm:bottom-8 sm:left-8 sm:h-16 sm:w-16",
            hasOrders
              ? "bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          )}
        >
          <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
          {hasOrders && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center sm:-top-2 sm:-right-2 sm:h-6 sm:w-6">
              {filteredOrders.length}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="px-3 pb-4 h-[90vh] md:h-[85vh] flex flex-col sm:px-4 sm:pb-6">
        <DrawerHeader className="text-left sticky top-0 bg-white z-10 border-b px-0 sm:px-4">
          <div className="flex justify-between items-center relative">
            <DrawerTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              Order History
              {sessionCode && (
                <Badge variant="outline" className="ml-2 bg-purple-50 text-purple-700 border-purple-200">
                  <Users className="h-3 w-3 mr-1" />
                  {sessionCode}
                </Badge>
              )}
            </DrawerTitle>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-4 sm:gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-7 min-w-[90px] px-3 text-sm font-semibold flex items-center gap-1.5 sm:h-8 sm:min-w-[100px] sm:px-4 sm:text-base sm:gap-2"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isRefreshing && "animate-spin")} />
            </Button>
            {menuId && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-md rounded-full px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base"
                onClick={() => navigate(`/payment/${menuId}`)}
              >
                Proceed to Payment
              </Button>
            )}
          </div>
        </DrawerHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto flex-1 py-3 sm:gap-6 sm:py-4">
          <div className="order-2 lg:order-1">
            <div className="text-xs sm:text-sm text-muted-foreground mb-1.5 sm:mb-2 sticky top-0 bg-white py-1.5 sm:py-2">Your Orders</div>
            {!hasOrders ? (
              <div className="text-center py-6 sm:py-8 bg-gray-50 rounded-lg border border-gray-100">
                <Clock className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-gray-300 mb-1.5 sm:mb-2" />
                <p className="text-sm sm:text-base text-gray-500">No order history yet</p>
              </div>
            ) : (
              <div className="space-y-0.5 sm:space-y-1 overflow-y-auto">
                {filteredOrders.map(order => (
                  <OrderHistoryItem
                    key={order.id}
                    order={order}
                    isOpen={!!openStates[order.id]}
                    onToggle={() => toggleOrder(order.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {sessionCode && (
            <div className="order-1 lg:order-2">
              <div className="overflow-y-auto">
                <TableOrders />
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default OrderHistory;
