import React from 'react';
import { format } from 'date-fns';
import { useOrders } from '@/contexts/OrderContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Users, Store, FileStack, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

const TableOrders = () => {
  const { tableOrders, sessionOrders, printBill } = useOrders();
  
  // Use session orders if available, otherwise use table orders
  const displayOrders = sessionOrders.length > 0 ? sessionOrders : tableOrders;
  
  // Group orders by their table_id (including letter suffixes)
  const ordersByTable = React.useMemo(() => {
    const groups: Record<string, typeof displayOrders> = {};
    
    displayOrders.forEach(order => {
      if (order.table_id) {
        // If this order has a table ID, add it to that group
        if (!groups[order.table_id]) {
          groups[order.table_id] = [];
        }
        groups[order.table_id].push(order);
      }
    });
    
    return groups;
  }, [displayOrders]);
  
  // Group orders by session code
  const ordersBySession = React.useMemo(() => {
    const groups: Record<string, typeof displayOrders> = {};
    
    displayOrders.forEach(order => {
      if (order.session_code) {
        // Create a unique key for each session code
        const sessionKey = `session_${order.session_code}`;
        if (!groups[sessionKey]) {
          groups[sessionKey] = [];
        }
        groups[sessionKey].push(order);
      } else if (order.table_id) {
        // For orders without session code, group by table
        const key = `table_${order.table_id}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(order);
      }
    });
    
    return groups;
  }, [displayOrders]);
  
  // Determine whether to display by session or by table
  const hasSessionOrders = Object.keys(ordersBySession).length > 0;
  
  // Get the primary table ID (without letter suffix)
  const getBaseTableId = (tableId: string) => {
    return tableId.replace(/[A-Z]$/, '');
  };
  
  // Group split bills by their table_id base (without letter suffix)
  const mainAndSplitBills = React.useMemo(() => {
    const result: Record<string, {
      main: typeof displayOrders,
      splits: Record<string, typeof displayOrders>
    }> = {};
    
    // First, organize orders into their base table groups
    Object.entries(ordersByTable).forEach(([tableId, orders]) => {
      const baseTableId = getBaseTableId(tableId);
      
      if (!result[baseTableId]) {
        result[baseTableId] = {
          main: [],
          splits: {}
        };
      }
      
      // Check if this is a split bill (has letter suffix)
      if (tableId.length > baseTableId.length) {
        const suffix = tableId.substring(baseTableId.length);
        result[baseTableId].splits[suffix] = orders;
      } else {
        // This is the main bill without suffix
        result[baseTableId].main = orders;
      }
    });
    
    return result;
  }, [ordersByTable]);
  
  // Calculate totals for main bill
  const calculateTotal = (orders: typeof displayOrders) => {
    return orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
  };
  
  const calculateTotalItems = (orders: typeof displayOrders) => {
    return orders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  };
  
  // Get restaurant ID (assuming all table orders have the same restaurant_id)
  const restaurantId = displayOrders.length > 0 ? displayOrders[0].restaurant_id : '';
  
  // Get session code if available
  const sessionCode = displayOrders.length > 0 ? displayOrders[0].session_code : '';
  
  // Debug information
  console.log('TableOrders component - orders:', displayOrders);
  console.log('TableOrders component - orders by table:', ordersByTable);
  console.log('TableOrders component - orders by session:', ordersBySession);
  console.log('TableOrders component - main and split bills:', mainAndSplitBills);
  
  // Calculate session total
  const calculateSessionTotal = (orders: typeof displayOrders) => {
    return orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
  };
  
  // Handle print bill
  const handlePrintBill = async (orders: typeof displayOrders) => {
    if (orders.length === 0) return;

    try {
      // Use the first order's ID to print the bill
      await printBill(orders[0].id);
    } catch (error) {
      console.error('Error printing bill:', error);
      toast.error('Failed to print bill');
    }
  };
  
  return (
    <Card className="w-full bg-gradient-to-br from-purple-50 to-white shadow-md border-purple-100">
      <CardHeader className="bg-gradient-to-r from-purple-100 to-indigo-50 rounded-t-lg px-2 py-2">
        <div className="flex items-center justify-between w-full gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-4 w-4 text-purple-500" />
            <span className="font-bold text-xl text-purple-800 whitespace-nowrap">Table Orders</span>
            {sessionCode && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-100 text-xs text-purple-700 font-medium whitespace-nowrap">
                Phone: <span className="font-semibold">{sessionCode}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="px-2 py-0.5 rounded-full bg-purple-200 text-xs text-purple-800 font-semibold">
              {displayOrders.length} Order{displayOrders.length !== 1 && 's'}
            </span>
            <span className="text-xs text-gray-500">{calculateTotalItems(displayOrders)} Item{calculateTotalItems(displayOrders) !== 1 && 's'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {Object.entries(ordersBySession).map(([codeOrKey, sessionOrders]) => {
          const isSessionCode = codeOrKey.startsWith('session_');
          const sessionTotal = calculateSessionTotal(sessionOrders);
          
          return (
            <div key={codeOrKey} className="pt-2 first:pt-0">
              {/* Summary Row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileStack className="h-3 w-3" />
                  <h3 className="text-sm font-semibold text-purple-900">
                    {isSessionCode ? (
                      `Phone: ${sessionCode}`
                    ) : (
                      `Table ${codeOrKey.replace('table_', '')}`
                    )}
                  </h3>
                  <span className="text-xs text-gray-500 ml-2">
                    {calculateTotalItems(sessionOrders)} items · ₹{sessionTotal.toFixed(2)} total
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-xs text-purple-700 font-semibold">
                    {sessionOrders.length} Orders
                  </span>
                  {/* <Button
                    variant="outline"
                    size="icon"
                    className="text-purple-700 border-purple-200"
                    onClick={() => handlePrintBill(sessionOrders)}
                  >
                    <Printer className="h-4 w-4" />
                  </Button> */}
                  {/* Place your delete icon/button here if needed */}
                </div>
              </div>
              {/* Expanded details (existing code) */}
              {sessionOrders.map((order) => (
                <div key={order.id} className="py-3 animate-fade-in">
                  <div className="flex justify-between mb-1">
                    <div className="text-sm font-medium text-purple-900 flex items-center gap-2">
                      <Smartphone className="h-3 w-3" />
                      {order.user_name ? (
                        <span className="font-semibold">{order.user_name}</span>
                      ) : (
                        <span className="text-gray-500">Guest ({order.device_id.substring(0, 6)}...)</span>
                      )}
                      <Badge
                        className={`text-xs ${
                          order.status === 'placed' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          order.status === 'preparing' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          order.status === 'ready' ? 'bg-green-100 text-green-800 border-green-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }`}
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), 'h:mm a')}
                    </div>
                  </div>
                  
                  {order.items && order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.quantity}× {item.item_name}
                        {item.variant_name && (
                          <span className="text-gray-500 text-xs"> ({item.variant_name})</span>
                        )}
                      </span>
                      <span className="text-gray-900 font-medium">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="pt-3 flex justify-between font-medium border-t border-purple-100 mt-2">
                <span>{isSessionCode ? 'Session Total' : `Table ${codeOrKey.replace('table_', '')} Total`}</span>
                <span className="text-purple-900">₹{sessionTotal.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
        
        {/* Overall Total */}
        <div className="pt-4 flex justify-between font-medium text-lg border-t border-purple-100">
          <span>Grand Total</span>
          <span className="text-purple-900">
            ₹{calculateTotal(displayOrders).toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TableOrders;
