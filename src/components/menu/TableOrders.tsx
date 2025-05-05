
import React from 'react';
import { format } from 'date-fns';
import { useOrders } from '@/contexts/OrderContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Users, Store, FileStack } from 'lucide-react';

const TableOrders = () => {
  const { tableOrders, sessionOrders } = useOrders();
  
  // Group orders by session if available, otherwise use all table orders
  const displayOrders = sessionOrders.length > 0 ? sessionOrders : tableOrders;
  
  // Group split bills by their table_id suffix (A, B, C, etc.)
  const splitBills = React.useMemo(() => {
    const groups: Record<string, typeof displayOrders> = {};
    
    displayOrders.forEach(order => {
      if (order.table_id && order.table_id.length > 1) {
        // Check if this is a split bill (has a letter suffix)
        const numericPart = order.table_id.match(/^\d+/)?.[0] || order.table_id;
        const suffix = order.table_id.replace(numericPart, '');
        
        if (suffix) {
          const key = suffix;
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(order);
        }
      }
    });
    
    return groups;
  }, [displayOrders]);
  
  // Get orders that are NOT split bills (regular table orders)
  const mainBillOrders = React.useMemo(() => {
    return displayOrders.filter(order => {
      if (!order.table_id) return true;
      
      const numericPart = order.table_id.match(/^\d+/)?.[0] || order.table_id;
      const suffix = order.table_id.replace(numericPart, '');
      
      return !suffix; // No suffix means it's a main order
    });
  }, [displayOrders]);
  
  // Calculate totals for main bill
  const mainTotalAmount = mainBillOrders.length > 0 
    ? mainBillOrders.reduce((sum, order) => sum + Number(order.total_amount), 0)
    : 0;
    
  const mainTotalItems = mainBillOrders.length > 0
    ? mainBillOrders.reduce((sum, order) => 
        sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)
    : 0;
  
  // Get restaurant ID (assuming all table orders have the same restaurant_id)
  const restaurantId = displayOrders.length > 0 ? displayOrders[0].restaurant_id : '';
  
  // Get session code if available
  const sessionCode = displayOrders.length > 0 ? displayOrders[0].session_code : '';
  
  // Debug information
  console.log('TableOrders component - table orders:', displayOrders);
  console.log('TableOrders component - split bills:', splitBills);
  console.log('TableOrders component - main bill orders:', mainBillOrders);
  
  return (
    <Card className="w-full bg-gradient-to-br from-purple-50 to-white shadow-md border-purple-100">
      <CardHeader className="bg-gradient-to-r from-purple-100 to-indigo-50 rounded-t-lg">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold text-purple-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Table Orders
            {sessionCode && (
              <Badge variant="outline" className="ml-2 bg-purple-100 text-purple-700 border-purple-200">
                {sessionCode}
              </Badge>
            )}
          </CardTitle>
          <Badge variant="outline" className="bg-white text-purple-900 border-purple-200">
            {displayOrders.length} {displayOrders.length === 1 ? 'Order' : 'Orders'}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground flex justify-between mt-2">
          <span className="flex items-center gap-1">
            <Store className="h-3 w-3" /> Restaurant: {restaurantId ? restaurantId.substring(0, 8) : 'N/A'}
          </span>
          <span>{mainTotalItems} Items</span>
        </div>
      </CardHeader>
      <CardContent className="pt-4 divide-y divide-purple-100">
        {displayOrders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No orders placed at this table yet</p>
            <p className="text-sm mt-2">Orders will appear here in real-time</p>
          </div>
        ) : (
          <>
            {/* Main Bill Section */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-1 mb-2">
                <FileStack className="h-4 w-4" />
                Main Bill
              </h3>
              
              {mainBillOrders.map((order) => (
                <div key={order.id} className="py-3 first:pt-0 animate-fade-in">
                  <div className="flex justify-between mb-1">
                    <div className="text-sm font-medium text-purple-900 flex items-center gap-1">
                      <Smartphone className="h-3 w-3" />
                      {order.device_id.substring(0, 6)}...
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), 'h:mm a')}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {order.items && order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.quantity}× {item.item_name}
                          {item.variant_name && (
                            <span className="text-gray-500 text-xs"> ({item.variant_name})</span>
                          )}
                        </span>
                        <span className="text-gray-900 font-medium">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="pt-3 flex justify-between font-medium">
                <span>Main Bill Total</span>
                <span className="text-purple-900">${mainTotalAmount.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Split Bills Section */}
            {Object.keys(splitBills).length > 0 && (
              <div className="pt-4 mt-2">
                <h3 className="text-sm font-semibold text-purple-900 mb-2">Separate Bills</h3>
                
                {Object.entries(splitBills).map(([suffix, orders]) => {
                  const splitTotalAmount = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
                  const splitTotalItems = orders.reduce((sum, order) => 
                    sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
                    
                  return (
                    <div key={suffix} className="mb-4 p-3 bg-purple-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium text-purple-800">
                          Split Bill {suffix}
                        </div>
                        <Badge variant="outline" className="bg-white text-purple-800 border-purple-200">
                          {splitTotalItems} {splitTotalItems === 1 ? 'Item' : 'Items'}
                        </Badge>
                      </div>
                      
                      {orders.map((order) => (
                        <div key={order.id} className="py-2 first:pt-0 text-sm">
                          <div className="flex items-center gap-1 text-xs text-purple-700 mb-1">
                            <Smartphone className="h-3 w-3" />
                            {order.device_id.substring(0, 6)}...
                            <span className="ml-auto">
                              {format(new Date(order.created_at), 'h:mm a')}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            {order.items && order.items.map((item) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  {item.quantity}× {item.item_name}
                                  {item.variant_name && (
                                    <span className="text-gray-500 text-xs"> ({item.variant_name})</span>
                                  )}
                                </span>
                                <span className="text-gray-900 font-medium">
                                  ${(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      <div className="pt-2 flex justify-between font-medium text-sm border-t border-purple-200 mt-2">
                        <span>Split Bill Total</span>
                        <span className="text-purple-800">${splitTotalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Overall Total */}
            <div className="pt-4 flex justify-between font-medium text-lg">
              <span>Table Grand Total</span>
              <span className="text-purple-900">
                ${(mainTotalAmount + Object.values(splitBills).reduce(
                  (sum, orders) => sum + orders.reduce((orderSum, order) => orderSum + Number(order.total_amount), 0),
                  0
                )).toFixed(2)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TableOrders;
