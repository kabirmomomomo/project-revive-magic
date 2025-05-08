import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';
import { useCart } from './CartContext';
import { getDeviceId } from '@/utils/deviceId';
import { useSearchParams } from 'react-router-dom';
import { isSessionExpired, clearExpiredSession, cleanupExpiredSessions } from '@/utils/sessionCleanup';

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
  user_name?: string;
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
  fetchOrders: (restaurantId: string) => Promise<void>;
  fetchTableOrders: (restaurantId: string, tableId: string) => Promise<void>;
  fetchSessionOrders: (restaurantId: string, sessionId: string) => Promise<void>;
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
    // Clean up expired sessions periodically
    const cleanupInterval = setInterval(() => {
      cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Run every 5 minutes

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

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
      // Check if session is expired
      if (isSessionExpired()) {
        clearExpiredSession();
        toast.error("Your session has expired. Please start a new bill.");
        return;
      }

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
      
      // Get the current session code
      const currentSessionCode = localStorage.getItem("billSessionCode");
      
      // Only fetch orders for this table with the current session code
      const { data: tableOrders, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('restaurant_id', restaurantId)
        .eq('table_id', tableId)
        .eq('session_code', currentSessionCode)  // Only get orders with the current session code
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching table orders:', error);
        throw error;
      }
      
      console.log('Table orders fetched:', tableOrders?.length || 0);
      setTableOrders(tableOrders || []);
    } catch (error) {
      console.error('Error in fetchTableOrders:', error);
      toast.error('Failed to load table orders');
    }
  };
  
  const fetchSessionOrders = async (restaurantId: string, sessionId: string) => {
    try {
      console.log('Fetching orders for restaurant:', restaurantId, 'session:', sessionId);
      
      // Get the current session code
      const currentSessionCode = localStorage.getItem("billSessionCode");
      
      // Fetch orders for the current session
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('restaurant_id', restaurantId)
        .eq('session_id', sessionId)
        .eq('session_code', currentSessionCode)  // Only get orders with the current session code
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
      const isSessionOwner = localStorage.getItem("billSessionOwner") === "true";
      const isSplitBill = sessionId && isSessionOwner;
      
      let finalTableId = tableId || '';
      
      if (sessionId) {
        // For any session (new or joined), check if there's an existing table for this session
        if (sessionCode) {
          // First check if there are any existing orders with this session code
          const { data: existingOrders } = await supabase
            .from('orders')
            .select('table_id')
            .eq('restaurant_id', restaurantId)
            .eq('session_code', sessionCode)
            .not('table_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1);

          if (existingOrders && existingOrders.length > 0) {
            // If orders exist with this session code, use the same table ID
            finalTableId = existingOrders[0].table_id;
          } else {
            // This is a new session, create a new table ID
            const { data: existingSplitBills } = await supabase
              .from('orders')
              .select('table_id')
              .eq('restaurant_id', restaurantId)
              .like('table_id', `${tableId}.%`)
              .order('table_id', { ascending: false });

            // Get all possible decimal numbers from 1 to the highest used number
            const usedSuffixes = new Set<number>();
            let highestSuffix = 0;

            if (existingSplitBills && existingSplitBills.length > 0) {
              existingSplitBills.forEach(order => {
                const parts = order.table_id?.split('.');
                if (parts && parts.length > 1) {
                  const suffix = parseFloat(parts[1]);
                  if (!isNaN(suffix)) {
                    usedSuffixes.add(suffix);
                    highestSuffix = Math.max(highestSuffix, suffix);
                  }
                }
              });
            }

            // Find the first available number
            let nextSuffix = 1;
            while (nextSuffix <= highestSuffix && usedSuffixes.has(nextSuffix)) {
              nextSuffix++;
            }

            // Create new table ID with decimal suffix
            finalTableId = `${tableId}.${nextSuffix}`;
          }
          
          // Store the table ID with the session so future orders use the same table ID
          await supabase
            .from('bill_sessions')
            .update({ table_id: finalTableId })
            .eq('id', sessionId);
        }
      } else if (isSplitBill && tableId) {
        // This is a split bill without a session, use decimal suffix logic
        const { data: existingSplitBills } = await supabase
          .from('orders')
          .select('table_id')
          .eq('restaurant_id', restaurantId)
          .like('table_id', `${tableId}.%`)
          .order('table_id', { ascending: false });
          
        // Get all possible decimal numbers from 1 to the highest used number
        const usedSuffixes = new Set<number>();
        let highestSuffix = 0;

        if (existingSplitBills && existingSplitBills.length > 0) {
          existingSplitBills.forEach(order => {
            const parts = order.table_id?.split('.');
            if (parts && parts.length > 1) {
              const suffix = parseFloat(parts[1]);
              if (!isNaN(suffix)) {
                usedSuffixes.add(suffix);
                highestSuffix = Math.max(highestSuffix, suffix);
              }
            }
          });
        }

        // Find the first available number
        let nextSuffix = 1;
        while (nextSuffix <= highestSuffix && usedSuffixes.has(nextSuffix)) {
          nextSuffix++;
        }
        
        finalTableId = `${tableId}.${nextSuffix}`;
      }
      
      // Prepare order data
      const cartTotal = getCartTotal();
      const orderData: {
        restaurant_id: string;
        device_id: string;
        total_amount: number;
        status: string;
        user_name?: string;
        table_id?: string;
        session_id?: string;
        session_code?: string;
        is_split_bill?: boolean;
      } = {
        restaurant_id: restaurantId,
        device_id: deviceId,
        total_amount: cartTotal,
        status: 'placed',
        user_name: localStorage.getItem("userName") || undefined
      };
      
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
      console.log('Cart total:', cartTotal);
      console.log('Device ID:', deviceId);
      console.log('Restaurant ID:', restaurantId);
      console.log('Session ID:', sessionId);
      console.log('Session Code:', sessionCode);
      console.log('Table ID:', finalTableId);
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Error inserting order:', orderError);
        console.error('Error details:', {
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
          code: orderError.code
        });
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
    isLoading,
    fetchOrders,
    fetchTableOrders,
    fetchSessionOrders
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
