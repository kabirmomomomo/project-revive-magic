import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/lib/supabase";
import { CategoryType, MenuCategory, MenuItem, Restaurant } from '@/types/menu';

export interface RestaurantUI {
  id: string;
  name: string;
  description: string;
  categories: MenuCategoryUI[];
  image_url?: string;
  google_review_link?: string;
  location?: string;
  phone?: string;
  wifi_password?: string;
  opening_time?: string;
  closing_time?: string;
  payment_qr_code?: string;
  upi_id?: string;
}

export interface MenuCategoryUI {
  id: string;
  name: string;
  items: MenuItemUI[];
  icon?: string;
  type?: CategoryType;
}

export interface MenuItemUI {
  id: string;
  name: string;
  description: string;
  price: string;
  old_price?: string;
  weight?: string;
  image_url?: string;
  is_visible: boolean;
  is_available: boolean;
  is_vegetarian: boolean | null;
  variants?: MenuItemVariantUI[];
  addons?: MenuItemAddonUI[];
}

export interface MenuItemVariantUI {
  id: string;
  name: string;
  price: string;
}

export interface MenuItemAddonUI {
  id: string;
  title: string;
  type: string;
  options: MenuAddonOptionUI[];
}

export interface MenuAddonOptionUI {
  id: string;
  name: string;
  price: string;
}

export const generateStableRestaurantId = (userId: string): string => {
  const baseString = `restaurant-${userId}`;
  let hash = 0;
  for (let i = 0; i < baseString.length; i++) {
    const char = baseString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const stableId = `stable-${Math.abs(hash).toString(16)}`;
  return stableId;
};

export const getUserRestaurant = async (): Promise<RestaurantUI | null> => {
  if (!supabase) {
    console.error("Supabase client is not initialized.");
    return null;
  }

  try {
    const { data: user, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error("Error fetching user:", userError);
      return null;
    }

    if (!user?.user?.id) {
      console.warn("No user ID found, meaning no user is logged in.");
      return null;
    }

    const userId = user.user.id;
    const stableId = generateStableRestaurantId(userId);

    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', stableId)
      .single();

    if (restaurantError) {
      console.error("Error fetching restaurant:", restaurantError);
      return null;
    }

    if (!restaurantData) {
      console.log("No restaurant found for the current user, returning null.");
      return null;
    }

    const { data: categoriesData, error: categoriesError } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurantData.id)
      .order('order');

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError);
      return null;
    }

    const transformDatabaseItem = (dbItem: any): MenuItemUI => ({
      id: dbItem.id,
      name: dbItem.name,
      description: dbItem.description || '',
      price: dbItem.price,
      old_price: dbItem.old_price || '',
      weight: dbItem.weight || '',
      image_url: dbItem.image_url || '',
      is_visible: dbItem.is_visible ?? true,
      is_available: dbItem.is_available ?? true,
      is_vegetarian: dbItem.is_vegetarian,
      variants: [],
      addons: [],
    });

    const categories = await Promise.all(
      categoriesData.map(async (category) => {
        const { data: itemsData, error: itemsError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('category_id', category.id)
          .order('order');

        if (itemsError) {
          console.error("Error fetching menu items:", itemsError);
          return {
            id: category.id,
            name: category.name,
            items: [],
          };
        }

        const items: MenuItemUI[] = itemsData.map(transformDatabaseItem);

        return {
          id: category.id,
          name: category.name,
          items: items,
          type: category.type as CategoryType | undefined,
        };
      })
    );

    const restaurant: RestaurantUI = {
      id: restaurantData.id,
      name: restaurantData.name,
      description: restaurantData.description || '',
      categories: categories,
      image_url: restaurantData.image_url || '',
      google_review_link: restaurantData.google_review_link || '',
      location: restaurantData.location || '',
      phone: restaurantData.phone || '',
      wifi_password: restaurantData.wifi_password || '',
      opening_time: restaurantData.opening_time || '',
      closing_time: restaurantData.closing_time || '',
      payment_qr_code: restaurantData.payment_qr_code || '',
      upi_id: restaurantData.upi_id || '',
    };

    return restaurant;
  } catch (error) {
    console.error("Error in getUserRestaurant:", error);
    return null;
  }
};

export const saveRestaurantMenu = async (restaurant: RestaurantUI): Promise<void> => {
  if (!supabase) {
    throw new Error("Supabase client is not initialized.");
  }

  try {
    // Get current user ID for the restaurant user_id field
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw new Error("Failed to get current user ID");
    }

    const userId = userData.user?.id;
    if (!userId) {
      throw new Error("No user ID available");
    }

    // Upsert restaurant
    const { error: restaurantError } = await supabase
      .from('restaurants')
      .upsert({
        id: restaurant.id,
        name: restaurant.name,
        description: restaurant.description,
        image_url: restaurant.image_url || null,
        google_review_link: restaurant.google_review_link || null,
        location: restaurant.location || null,
        phone: restaurant.phone || null,
        wifi_password: restaurant.wifi_password || null,
        opening_time: restaurant.opening_time || null,
        closing_time: restaurant.closing_time || null,
        payment_qr_code: restaurant.payment_qr_code || null,
        upi_id: restaurant.upi_id || null,
        user_id: userId
      }, { onConflict: 'id' });

    if (restaurantError) {
      console.error("Error upserting restaurant:", restaurantError);
      throw restaurantError;
    }

    // Loop through categories
    for (const category of restaurant.categories) {
      // Upsert category
      const { error: categoryError } = await supabase
        .from('menu_categories')
        .upsert({
          id: category.id,
          restaurant_id: restaurant.id,
          name: category.name,
          type: category.type || null,
        }, { onConflict: 'id' });

      if (categoryError) {
        console.error("Error upserting category:", categoryError);
        throw categoryError;
      }

      // Loop through items
      for (const [index, item] of category.items.entries()) {
        // Insert or update menu item
        const { error: itemError } = await supabase
          .from('menu_items')
          .upsert({
            id: item.id,
            category_id: category.id,
            name: item.name,
            description: item.description,
            price: item.price,
            old_price: item.old_price || null,
            weight: item.weight || null,
            image_url: item.image_url || null,
            is_visible: item.is_visible,
            is_available: item.is_available,
            is_vegetarian: item.is_vegetarian,
            order: index,
          }, { onConflict: 'id' });

        if (itemError) {
          console.error("Error upserting menu item:", itemError);
          throw itemError;
        }
      }
    }
  } catch (error) {
    console.error("Error in saveRestaurantMenu:", error);
    throw error;
  }
};

export const uploadItemImage = async (file: File, itemId: string): Promise<string | null> => {
  try {
    const filePath = `item-images/${itemId}/${file.name}`;

    const { data, error } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error("Error uploading image:", error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);
      
    return publicUrl;
  } catch (error) {
    console.error("Error during image upload:", error);
    return null;
  }
};

export const getRestaurantById = async (id: string): Promise<Restaurant | null> => {
  try {
    if (!supabase) {
      console.error("Supabase client is not initialized.");
      return null;
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (restaurantError) {
      console.error('Error fetching restaurant:', restaurantError);
      return null;
    }

    if (!restaurant) {
      console.log('Restaurant not found');
      return null;
    }

    const { data: dbCategories, error: categoriesError } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', id)
      .order('order');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return null;
    }

    const categories = await Promise.all(
      dbCategories.map(async (category) => {
        const { data: items, error: itemsError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('category_id', category.id)
          .order('order');

        if (itemsError) {
          console.error('Error fetching menu items:', itemsError);
          return {
            id: category.id,
            name: category.name,
            type: category.type as CategoryType | undefined,
            items: [],
          };
        }

        const populatedItems = items.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          price: item.price,
          old_price: item.old_price || '',
          weight: item.weight || '',
          image_url: item.image_url || '',
          is_visible: item.is_visible ?? true,
          is_available: item.is_available ?? true,
          is_vegetarian: item.is_vegetarian,
          variants: [],
          addons: [],
        }));

        return {
          id: category.id,
          name: category.name,
          type: category.type as CategoryType | undefined,
          items: populatedItems,
        };
      })
    );

    return {
      id: restaurant.id,
      name: restaurant.name,
      description: restaurant.description || '',
      categories: categories,
      image_url: restaurant.image_url || '',
      google_review_link: restaurant.google_review_link || '',
      location: restaurant.location || '',
      phone: restaurant.phone || '',
      wifi_password: restaurant.wifi_password || '',
      opening_time: restaurant.opening_time || '',
      closing_time: restaurant.closing_time || '',
    };
  } catch (error) {
    console.error('Error in getRestaurantById:', error);
    return null;
  }
};
