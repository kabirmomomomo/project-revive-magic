
import React from 'react';
import { format } from 'date-fns';
import { useOrders } from '@/contexts/OrderContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Users, Store, FileStack } from 'lucide-react';

const TableOrders = () => {
  const { tableOrders, sessionOrders } = useOrders();
  
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
        if (!groups[order.session_code]) {
          groups[order.session_code] = [];
        }
        groups[order.session_code].push(order);
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
          <span>{calculateTotalItems(displayOrders)} Items</span>
        </div>
      </CardHeader>
      <CardContent className="pt-4 divide-y divide-purple-100">
        {displayOrders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No orders placed at this table yet</p>
            <p className="text-sm mt-2">Orders will appear here in real-time</p>
          </div>
        ) : hasSessionOrders ? (
          // Display by session code
          <div className="space-y-4">
            {Object.entries(ordersBySession).map(([code, sessionOrders]) => {
              const sessionTotal = calculateTotal(sessionOrders);
              const sessionItems = calculateTotalItems(sessionOrders);
              
              return (
                <div key={code} className="pt-2 first:pt-0">
                  <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-1 mb-2">
                    <FileStack className="h-4 w-4" />
                    Session: {code}
                  </h3>
                  
                  {sessionOrders.map((order) => (
                    <div key={order.id} className="py-3 animate-fade-in">
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
                  
                  <div className="pt-3 flex justify-between font-medium border-t border-purple-100 mt-2">
                    <span>Session Total</span>
                    <span className="text-purple-900">${sessionTotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Display by main table and split bills
          <div className="space-y-6">
            {Object.entries(mainAndSplitBills).map(([baseTableId, { main, splits }]) => {
              const hasSplits = Object.keys(splits).length > 0;
              const mainTotal = calculateTotal(main);
              const mainItems = calculateTotalItems(main);
              
              return (
                <div key={baseTableId}>
                  {/* Main Table Section */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-1 mb-2">
                      <FileStack className="h-4 w-4" />
                      Table {baseTableId}
                    </h3>
                    
                    {main.map((order) => (
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
                    
                    {main.length > 0 && (
                      <div className="pt-3 flex justify-between font-medium">
                        <span>Table {baseTableId} Total</span>
                        <span className="text-purple-900">${mainTotal.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Split Bills Section */}
                  {hasSplits && (
                    <div className="pt-2 mt-2">
                      <h3 className="text-sm font-semibold text-purple-900 mb-2">Split Bills for Table {baseTableId}</h3>
                      
                      {Object.entries(splits).map(([suffix, orders]) => {
                        const splitTotal = calculateTotal(orders);
                        const splitItems = calculateTotalItems(orders);
                        
                        return (
                          <div key={suffix} className="mb-4 p-3 bg-purple-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <div className="text-sm font-medium text-purple-800">
                                Table {baseTableId}{suffix}
                              </div>
                              <Badge variant="outline" className="bg-white text-purple-800 border-purple-200">
                                {splitItems} {splitItems === 1 ? 'Item' : 'Items'}
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
                              <span className="text-purple-800">${splitTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Overall Total */}
            <div className="pt-4 flex justify-between font-medium text-lg border-t border-purple-100">
              <span>Table Grand Total</span>
              <span className="text-purple-900">
                ${calculateTotal(displayOrders).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TableOrders;
