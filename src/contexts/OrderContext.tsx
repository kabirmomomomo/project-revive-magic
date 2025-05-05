import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';
import { useCart } from './CartContext';
import { getDeviceId } from '@/utils/deviceId';
import { useSearchParams } from 'react-router-dom';

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  price: number;
  variant_name?: string;
  restaurant_id: string;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  restaurant_id: string;
  table_id?: string;
  device_id: string;
  items: OrderItem[];
  session_id?: string;
  session_code?: string;
  is_split_bill?: boolean;
}

interface OrderContextType {
  orders: Order[];
  placeOrder: (restaurantId: string, tableId?: string, sessionId?: string) => Promise<void>;
  isLoading: boolean;
  tableOrders: Order[];
  sessionOrders: Order[];
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tableOrders, setTableOrders] = useState<Order[]>([]);
  const [sessionOrders, setSessionOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { cartItems, getCartTotal, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const deviceId = getDeviceId();
  const tableId = searchParams.get('table');
  const restaurantIdFromUrl = searchParams.get('restaurantId') || window.location.pathname.split('/')[2];
  const sessionId = localStorage.getItem("billSessionId");
  const sessionCode = localStorage.getItem("billSessionCode");

  useEffect(() => {
    if (restaurantIdFromUrl) {
      console.log('Restaurant ID detected:', restaurantIdFromUrl);
      fetchOrders(restaurantIdFromUrl);
    }
    
    if (tableId && restaurantIdFromUrl) {
      console.log('Table ID detected:', tableId);
      fetchTableOrders(restaurantIdFromUrl, tableId);
      subscribeToTableOrders(restaurantIdFromUrl, tableId);
    }
    
    if (sessionId && restaurantIdFromUrl) {
      console.log('Session ID detected:', sessionId);
      fetchSessionOrders(restaurantIdFromUrl, sessionId);
      subscribeToSessionOrders(restaurantIdFromUrl, sessionId);
    }
    
    return () => {
      supabase.removeAllChannels();
    };
  }, [tableId, restaurantIdFromUrl, sessionId]);

  const fetchOrders = async (restaurantId: string) => {
    try {
      console.log('Fetching orders for restaurant:', restaurantId, 'device:', deviceId);
      
      const { data: deviceOrders, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('device_id', deviceId)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Device orders fetched:', deviceOrders?.length || 0);
      setOrders(deviceOrders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    }
  };

  const fetchTableOrders = async (restaurantId: string, tableId: string) => {
    try {
      console.log('Fetching orders for restaurant:', restaurantId, 'table:', tableId);
      
      // First try to get exact match orders
      const { data: exactMatches, error: exactError } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('restaurant_id', restaurantId)
        .eq('table_id', tableId)
        .order('created_at', { ascending: false });
        
      if (exactError) {
        console.error('Error fetching exact match table orders:', exactError);
        throw exactError;
      }
      
      // Then get orders with table ID as prefix (like Table1A, Table1B)
      const { data: prefixMatches, error: prefixError } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('restaurant_id', restaurantId)
        .like('table_id', `${tableId}%`)
        .not('table_id', 'eq', tableId)
        .order('created_at', { ascending: false });
        
      if (prefixError) {
        console.error('Error fetching prefix match table orders:', prefixError);
        throw prefixError;
      }
      
      // Combine results with exact matches first
      const allTableOrders = [...(exactMatches || []), ...(prefixMatches || [])];
      
      console.log('Table orders fetched:', allTableOrders.length || 0);
      setTableOrders(allTableOrders || []);
    } catch (error) {
      console.error('Error in fetchTableOrders:', error);
      toast.error('Failed to load table orders');
    }
  };
  
  const fetchSessionOrders = async (restaurantId: string, sessionId: string) => {
    try {
      console.log('Fetching orders for restaurant:', restaurantId, 'session:', sessionId);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('restaurant_id', restaurantId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching session orders:', error);
        throw error;
      }
      
      console.log('Session orders fetched:', data?.length || 0);
      setSessionOrders(data || []);
    } catch (error) {
      console.error('Error in fetchSessionOrders:', error);
      toast.error('Failed to load session orders');
    }
  };

  const subscribeToTableOrders = (restaurantId: string, tableId: string) => {
    console.log('Setting up subscription for restaurant:', restaurantId, 'table:', tableId);
    const channel = supabase
      .channel(`table-orders-${restaurantId}-${tableId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId} AND table_id=eq.${tableId}`
        },
        async (payload) => {
          console.log('Table orders changed:', payload);
          await fetchTableOrders(restaurantId, tableId);
        }
      )
      .subscribe((status) => {
        console.log('Table orders subscription status:', status);
      });
      
    return channel;
  };
  
  const subscribeToSessionOrders = (restaurantId: string, sessionId: string) => {
    console.log('Setting up subscription for restaurant:', restaurantId, 'session:', sessionId);
    const channel = supabase
      .channel(`session-orders-${restaurantId}-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId} AND session_id=eq.${sessionId}`
        },
        async (payload) => {
          console.log('Session orders changed:', payload);
          await fetchSessionOrders(restaurantId, sessionId);
        }
      )
      .subscribe((status) => {
        console.log('Session orders subscription status:', status);
      });
      
    return channel;
  };

  const placeOrder = async (restaurantId: string, tableId?: string, sessionId?: string) => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Placing order with restaurant ID:', restaurantId);
      console.log('Table ID:', tableId);
      console.log('Session ID:', sessionId);
      console.log('Device ID:', deviceId);
      console.log('Cart items:', cartItems);
      
      // Get session code if available
      const sessionCode = localStorage.getItem("billSessionCode");
      
      // Check if we should use a suffix for the table ID
      // We want to use a suffix if the user has started a new bill
      // We don't want to use a suffix if the user has joined an existing bill
      const isSessionOwner = localStorage.getItem("billSessionOwner") === "true";
      const isSplitBill = sessionId && isSessionOwner;
      
      let finalTableId = tableId || '';
      
      if (isSplitBill) {
        // This is a new bill, so give it a unique letter suffix
        // First, check if there are existing bills for this table
        if (tableId) {
          const { data: existingOrders } = await supabase
            .from('orders')
            .select('table_id')
            .eq('restaurant_id', restaurantId)
            .eq('table_id', tableId)
            .is('session_id', null)  // Look for orders without a session (original table)
            .limit(1);
            
          // If this is the first bill for this table, add 'A' suffix
          if (!existingOrders || existingOrders.length === 0) {
            finalTableId = `${tableId}A`;
          } else {
            // Find the highest letter suffix used so far
            const { data: existingSplitBills } = await supabase
              .from('orders')
              .select('table_id')
              .eq('restaurant_id', restaurantId)
              .like('table_id', `${tableId}%`)
              .not('table_id', 'eq', tableId);
              
            if (existingSplitBills && existingSplitBills.length > 0) {
              // Extract suffixes and find the next letter
              const suffixes = existingSplitBills
                .map(order => {
                  const suffix = order.table_id?.replace(tableId || '', '');
                  return suffix ? suffix.charCodeAt(0) : 0;
                })
                .filter(code => code > 0);
                
              if (suffixes.length > 0) {
                const highestCode = Math.max(...suffixes);
                // Use the next letter in the alphabet
                finalTableId = `${tableId}${String.fromCharCode(highestCode + 1)}`;
              } else {
                finalTableId = `${tableId}A`;
              }
            } else {
              finalTableId = `${tableId}A`;
            }
          }
        }
      } else if (sessionId && !isSessionOwner) {
        // For joined bills, we need to find what table the session is associated with
        const { data: sessionData } = await supabase
          .from('bill_sessions')
          .select('table_id')
          .eq('id', sessionId)
          .single();
          
        if (sessionData && sessionData.table_id) {
          finalTableId = sessionData.table_id;
        }
      }
      
      // Prepare order data
      const orderData = {
        restaurant_id: restaurantId,
        total_amount: getCartTotal(),
        status: 'placed',
        device_id: deviceId
      } as any;
      
      // Only add table_id if it exists
      if (finalTableId) {
        orderData.table_id = finalTableId;
        console.log('Adding table_id to order:', orderData.table_id);
      }
      
      // Add session ID and code if available
      if (sessionId) {
        orderData.session_id = sessionId;
        orderData.session_code = sessionCode;
        orderData.is_split_bill = isSplitBill;
        console.log('Adding session data to order:', { sessionId, sessionCode, isSplitBill });
      }
      
      console.log('Order data to insert:', orderData);
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Error inserting order:', orderError);
        throw orderError;
      }

      console.log('Order inserted successfully:', order);

      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        restaurant_id: restaurantId,
        item_id: item.id,
        item_name: item.name,
        quantity: item.quantity,
        price: parseFloat(item.selectedVariant ? item.selectedVariant.price : item.price),
        variant_name: item.selectedVariant?.name,
        variant_id: item.selectedVariant?.id
      }));

      console.log('Order items to insert:', orderItems);

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error inserting order items:', itemsError);
        throw itemsError;
      }

      console.log('Order items inserted successfully');
      clearCart();
      await fetchOrders(restaurantId);
      if (tableId) {
        await fetchTableOrders(restaurantId, tableId);
      }
      if (sessionId) {
        await fetchSessionOrders(restaurantId, sessionId);
      }
      toast.success('Order placed successfully!');
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = {
    orders,
    tableOrders,
    sessionOrders,
    placeOrder,
    isLoading
  };

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
