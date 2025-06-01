import { supabase } from './supabase';
import { executeSql } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

export const setupDatabase = async () => {
  try {
    console.log('Setting up database tables...');
    
    // Create restaurants table
    const { data: restaurantsData, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('count(*)', { count: 'exact' });

    if (restaurantsError && restaurantsError.code === 'PGRST116') {
      // Table doesn't exist, create it
      const { error: createRestaurantsError } = await supabase.rpc(
        'create_table_if_not_exists',
        {
          table_name: 'restaurants',
          table_definition: `
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            user_id UUID,
            image_url TEXT,
            promo_image_url TEXT,
            orders_enabled BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
          `
        }
      );

      if (createRestaurantsError) {
        console.error('Error creating restaurants table:', createRestaurantsError);
        toast.error('Could not create restaurants table. Some features may not work.');
        return false;
      }
    }

    // Create menu_categories table
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('menu_categories')
      .select('count(*)', { count: 'exact' });

    if (categoriesError && categoriesError.code === 'PGRST116') {
      // Table doesn't exist, create it
      const { error: createCategoriesError } = await supabase.rpc(
        'create_table_if_not_exists',
        {
          table_name: 'menu_categories',
          table_definition: `
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
            "order" INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
          `
        }
      );

      if (createCategoriesError) {
        console.error('Error creating menu_categories table:', createCategoriesError);
        toast.error('Could not create menu_categories table. Some features may not work.');
        return false;
      }
    }

    // Create menu_items table
    const { data: itemsData, error: itemsError } = await supabase
      .from('menu_items')
      .select('count(*)', { count: 'exact' });

    if (itemsError && itemsError.code === 'PGRST116') {
      // Table doesn't exist, create it
      const { error: createItemsError } = await supabase.rpc(
        'create_table_if_not_exists',
        {
          table_name: 'menu_items',
          table_definition: `
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            price TEXT NOT NULL,
            old_price TEXT,
            weight TEXT,
            image_url TEXT,
            is_visible BOOLEAN DEFAULT true,
            is_available BOOLEAN DEFAULT true,
            category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
            dietary_type TEXT,
            "order" INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
          `
        }
      );

      if (createItemsError) {
        console.error('Error creating menu_items table:', createItemsError);
        toast.error('Could not create menu_items table. Some features may not work.');
        return false;
      }
    }

    // Create menu_item_variants table
    const { data: variantsData, error: variantsError } = await supabase
      .from('menu_item_variants')
      .select('count(*)', { count: 'exact' });

    if (variantsError && variantsError.code === 'PGRST116') {
      // Table doesn't exist, create it
      const { error: createVariantsError } = await supabase.rpc(
        'create_table_if_not_exists',
        {
          table_name: 'menu_item_variants',
          table_definition: `
            id UUID PRIMARY KEY,
            menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            price TEXT NOT NULL,
            "order" INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
          `
        }
      );

      if (createVariantsError) {
        console.error('Error creating menu_item_variants table:', createVariantsError);
        toast.error('Could not create menu_item_variants table. Some features may not work.');
        return false;
      }
    }

    // Create tables table using raw SQL via RPC
    const { error: createTablesError } = await supabase.rpc(
      'create_table_if_not_exists',
      {
        table_name: 'tables',
        table_definition: `
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
          table_number INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          UNIQUE(restaurant_id, table_number)
        `
      }
    );

    if (createTablesError) {
      console.error('Error creating tables table:', createTablesError);
      toast.error('Could not create tables table. Some features may not work.');
      return false;
    }

    // Create orders table with restaurant_id reference and table_id reference
    const { error: createOrdersError } = await supabase.rpc(
      'create_table_if_not_exists',
      {
        table_name: 'orders',
        table_definition: `
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
          table_id TEXT,
          device_id TEXT NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          status TEXT NOT NULL DEFAULT 'placed',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          user_id UUID,
          user_name TEXT
        `
      }
    );

    if (createOrdersError) {
      console.error('Error creating orders table:', createOrdersError);
      toast.error('Could not create orders table. Some features may not work.');
      return false;
    }

    // Create order_items table with restaurant_id reference
    const { data: orderItemsData, error: orderItemsError } = await supabase
      .from('order_items')
      .select('count(*)', { count: 'exact' });

    if (orderItemsError && orderItemsError.code === 'PGRST116') {
      // Table doesn't exist, create it
      const { error: createOrderItemsError } = await supabase.rpc(
        'create_table_if_not_exists',
        {
          table_name: 'order_items',
          table_definition: `
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            restaurant_id UUID NOT NULL,
            item_id UUID,
            item_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            variant_name TEXT,
            variant_id UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
          `
        }
      );

      if (createOrderItemsError) {
        console.error('Error creating order_items table:', createOrderItemsError);
        toast.error('Could not create order_items table. Some features may not work.');
        return false;
      }
    }

    // Create analytics_orders table
    await supabase.rpc('create_analytics_orders_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS analytics_orders (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          original_order_id UUID NOT NULL,
          restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
          table_id UUID,
          session_code TEXT,
          user_name TEXT,
          total_amount DECIMAL(10,2) NOT NULL,
          items JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          printed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT fk_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        );
      `
    });

    // Create function to copy order data to analytics_orders
    await supabase.rpc('create_copy_order_to_analytics_function', {
      sql: `
        CREATE OR REPLACE FUNCTION copy_order_to_analytics(order_id UUID)
        RETURNS void AS $$
        DECLARE
          order_data RECORD;
          order_items JSONB;
          existing_order RECORD;
        BEGIN
          -- Get order data
          SELECT 
            o.id as original_order_id,
            o.restaurant_id,
            o.table_id,
            o.session_code,
            o.user_name,
            o.total_amount,
            o.created_at
          INTO order_data
          FROM orders o
          WHERE o.id = order_id;

          -- Get order items as JSONB
          SELECT jsonb_agg(
            jsonb_build_object(
              'item_name', oi.item_name,
              'quantity', oi.quantity,
              'price', oi.price,
              'variant_name', oi.variant_name
            )
          ) INTO order_items
          FROM order_items oi
          WHERE oi.order_id = order_id;

          -- Check if an identical order already exists
          SELECT * INTO existing_order
          FROM analytics_orders
          WHERE original_order_id = order_data.original_order_id
            AND restaurant_id = order_data.restaurant_id
            AND table_id IS NOT DISTINCT FROM order_data.table_id
            AND session_code IS NOT DISTINCT FROM order_data.session_code
            AND user_name IS NOT DISTINCT FROM order_data.user_name
            AND total_amount = order_data.total_amount
            AND items = order_items
          LIMIT 1;

          -- Only insert if no identical order exists
          IF existing_order IS NULL THEN
            INSERT INTO analytics_orders (
              original_order_id,
              restaurant_id,
              table_id,
              session_code,
              user_name,
              total_amount,
              items,
              created_at,
              printed_at
            ) VALUES (
              order_data.original_order_id,
              order_data.restaurant_id,
              order_data.table_id,
              order_data.session_code,
              order_data.user_name,
              order_data.total_amount,
              order_items,
              order_data.created_at,
              NOW()
            );
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    console.log('Database tables setup complete!');
    return true;
  } catch (error) {
    console.error('Error setting up database:', error);
    toast.error('Database setup failed. Please try again.');
    return false;
  }
};

export const handleRelationDoesNotExistError = async (error: any): Promise<boolean> => {
  if (error?.message?.includes("relation") && error?.message?.includes("does not exist")) {
    console.log("Detected missing table error, attempting database setup...");
    return await setupDatabase();
  }
  return false;
};

export const handleTableConstraints = async () => {
  try {
    // First create the tables table if it doesn't exist
    const { error: createError } = await supabase.rpc(
      'create_table_if_not_exists',
      {
        table_name: 'tables',
        table_definition: `
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
          table_number INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
        `
      }
    );

    if (createError) {
      console.error('Error creating tables table:', createError);
      return false;
    }

    // Instead of using supabase client for tables_temp, use the executeSql function
    const { error: tempTableError } = await executeSql(`
      CREATE TABLE IF NOT EXISTS tables_temp (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        restaurant_id UUID NOT NULL,
        table_number INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
      );
    `);

    if (tempTableError) {
      console.error('Error creating temporary table:', tempTableError);
      return false;
    }

    // Create a test entry using raw SQL via executeSql
    const { error: insertError } = await executeSql(`
      INSERT INTO tables_temp (restaurant_id, table_number) 
      VALUES ('00000000-0000-0000-0000-000000000000', 0)
      ON CONFLICT DO NOTHING
    `);

    if (insertError && !insertError.message.includes('does not exist')) {
      console.error('Error with temporary operation:', insertError);
      return false;
    }

    // Drop the old table and recreate it with correct constraints
    const { error: recreateError } = await supabase.rpc(
      'create_table_if_not_exists',
      {
        table_name: 'tables',
        table_definition: `
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
          table_number INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          UNIQUE(restaurant_id, table_number)
        `
      }
    );

    if (recreateError) {
      console.error('Error recreating tables table:', recreateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error handling table constraints:', error);
    return false;
  }
};
