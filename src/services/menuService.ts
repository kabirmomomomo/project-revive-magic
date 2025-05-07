import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/sonner';
import { handleRelationDoesNotExistError } from '@/lib/setupDatabase';
import { createClient } from '@supabase/supabase-js';
import { optimizeImage } from '@/lib/imageOptimization';
import { CategoryType } from '@/types/menu';

// Type definitions for UI
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
  variants?: MenuItemVariantUI[];
  addons?: MenuItemAddonUI[];
  dietary_type?: 'veg' | 'non-veg' | null;
}

export interface MenuItemVariantUI {
  id: string;
  name: string;
  price: string;
}

export interface MenuItemAddonUI {
  id: string;
  title: string;
  type: 'Single choice' | 'Multiple choice';
  options: MenuAddonOptionUI[];
}

export interface MenuAddonOptionUI {
  id: string;
  name: string;
  price: string;
}

export interface MenuCategoryUI {
  id: string;
  name: string;
  items: MenuItemUI[];
  type?: CategoryType;
}

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
  ordersEnabled?: boolean;
  payment_qr_code?: string;
  upi_id?: string;
}

// Add cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

// Add cache helper functions
const getFromCache = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCache = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const removeFromCache = (key: string) => {
  cache.delete(key);
};

export const generateStableRestaurantId = (userId: string | undefined) => {
  if (!userId) {
    return uuidv4();
  }
  
  return userId;
};

export const uploadItemImage = async (file: File, itemId: string): Promise<string | null> => {
  try {
    // Optimize the image before uploading
    const optimizedFile = await optimizeImage(file);
    
    const fileExt = optimizedFile.name.split('.').pop();
    const fileName = `${itemId}.${fileExt}`;
    const filePath = `${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('menu-images')
      .upload(filePath, optimizedFile, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);
    
    return publicUrl;
  } catch (error) {
    console.error('Error in uploadItemImage:', error);
    toast.error('Failed to upload image');
    return null;
  }
};

export const createRestaurant = async (name: string, description: string) => {
  try {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    
    const newRestaurant = {
      id: generateStableRestaurantId(userId),
      name,
      description,
      user_id: userId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('restaurants')
      .upsert(newRestaurant)
      .select()
      .single();

    if (error) {
      if (await handleRelationDoesNotExistError(error)) {
        return createRestaurant(name, description);
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating restaurant:', error);
    toast.error('Failed to create restaurant in database');
    throw error;
  }
};

export const getRestaurantById = async (id: string): Promise<RestaurantUI | null> => {
  const cacheKey = `restaurant_${id}`;
  const cachedData = getFromCache(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  if (!restaurant) {
    return null;
  }

  // Fetch categories with pagination
  const { data: categories, error: categoriesError } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', id)
    .order('order', { ascending: true });

  if (categoriesError) {
    throw categoriesError;
  }

  const categoriesWithItems: MenuCategoryUI[] = [];

  // Fetch items for each category with pagination
  for (const category of categories || []) {
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('category_id', category.id)
      .order('order', { ascending: true });

    if (itemsError) {
      if (itemsError.code === 'PGRST116') {
        const success = await handleRelationDoesNotExistError(itemsError);
        if (!success) throw itemsError;
        
        categoriesWithItems.push({
          id: category.id,
          name: category.name,
          type: category.type as CategoryType | undefined,
          items: [],
        });
        continue;
      }
      throw itemsError;
    }

    const menuItems: MenuItemUI[] = [];

    // Fetch variants and addons in parallel for better performance
    for (const item of items || []) {
      const [variantsResult, addonMappingsResult] = await Promise.all([
        supabase
          .from('menu_item_variants')
          .select('*')
          .eq('menu_item_id', item.id)
          .order('order', { ascending: true }),
        supabase
          .from('menu_item_addon_mapping')
          .select('addon_id')
          .eq('menu_item_id', item.id)
      ]);

      if (variantsResult.error && variantsResult.error.code !== 'PGRST116') {
        throw variantsResult.error;
      }

      if (addonMappingsResult.error && 'code' in addonMappingsResult.error && addonMappingsResult.error.code !== 'PGRST116') {
        throw addonMappingsResult.error;
      }

      const addons: MenuItemAddonUI[] = [];
      
      // Fetch addon details in parallel
      if (addonMappingsResult.data?.length) {
        for (const mapping of addonMappingsResult.data) {
          try {
            // Use direct query with menu_item_addons instead of menu_addons
            const { data: addon, error: addonError } = await supabase
              .from('menu_item_addons')
              .select('*')
              .eq('id', mapping.addon_id)
              .single();

            if (addonError) {
              if (addonError.code !== 'PGRST116') {
                throw addonError;
              }
              continue;
            }

            if (addon) {
              const { data: options, error: optionsError } = await supabase
                .from('menu_addon_options')
                .select('*')
                .eq('addon_id', addon.id)
                .order('order', { ascending: true });

              if (optionsError && optionsError.code !== 'PGRST116') {
                throw optionsError;
              }

              addons.push({
                id: addon.id,
                title: addon.title,
                type: addon.type as 'Single choice' | 'Multiple choice',
                options: options || [],
              });
            }
          } catch (error) {
            console.error('Error fetching addon details:', error);
          }
        }
      }

      menuItems.push({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        old_price: item.old_price,
        weight: item.weight,
        image_url: item.image_url,
        is_visible: item.is_visible,
        is_available: item.is_available,
        variants: variantsResult.data || [],
        addons,
        dietary_type: item.dietary_type as "veg" | "non-veg" | null,
      });
    }

    categoriesWithItems.push({
      id: category.id,
      name: category.name,
      type: category.type as CategoryType | undefined,
      items: menuItems,
    });
  }

  const result = {
    ...restaurant,
    categories: categoriesWithItems,
    // Map the database column name to our interface property
    ordersEnabled: restaurant.orders_enabled
  };

  // Cache the result
  setCache(cacheKey, result);

  return result;
};

export const getUserRestaurant = async (): Promise<RestaurantUI | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No authenticated user');
      return null;
    }
    
    const stableId = generateStableRestaurantId(user.id);
    
    const restaurant = await getRestaurantById(stableId);
    
    return restaurant;
  } catch (error) {
    console.error('Error getting user restaurant:', error);
    return null;
  }
};

export const getUserRestaurants = async () => {
  try {
    const user = await supabase.auth.getUser();
    
    if (!user.data.user) {
      console.log('No authenticated user, returning empty restaurants list');
      return [];
    }

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', user.data.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      if (await handleRelationDoesNotExistError(error)) {
        return getUserRestaurants();
      }
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error getting user restaurants:', error);
    toast.error('Failed to fetch your restaurants');
    return [];
  }
};

export const saveRestaurantMenu = async (restaurant: RestaurantUI) => {
  // Invalidate cache
  cache.delete(`restaurant_${restaurant.id}`);

  const { id, name, description, categories, image_url, google_review_link, location, phone, wifi_password, opening_time, closing_time, ordersEnabled, payment_qr_code, upi_id } = restaurant;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;
    
    // Check if we're only saving a single item
    const isSingleItemUpdate = categories.length === 1 && categories[0].items.length === 1;
    const isOrdersOnlyUpdate = categories.length === 0 && ordersEnabled !== undefined;
    
    if (!isSingleItemUpdate && !isOrdersOnlyUpdate) {
      // Map our interface property to the database column name
      const { error: restaurantError } = await supabase
        .from('restaurants')
        .upsert({
          id,
          name,
          description,
          image_url,
          google_review_link,
          location,
          phone,
          wifi_password,
          opening_time,
          closing_time,
          orders_enabled: ordersEnabled,
          payment_qr_code,
          upi_id,
          user_id: userId,
          updated_at: new Date().toISOString()
        });
      
      if (restaurantError) {
        console.error("Restaurant update error:", restaurantError);
        if (await handleRelationDoesNotExistError(restaurantError)) {
          return saveRestaurantMenu(restaurant);
        }
        throw restaurantError;
      }
    } else if (isOrdersOnlyUpdate) {
      // Only update the orders_enabled field
      const { error: restaurantError } = await supabase
        .from('restaurants')
        .update({
          orders_enabled: ordersEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (restaurantError) {
        console.error("Restaurant orders update error:", restaurantError);
        throw restaurantError;
      }
      
      return { success: true, isLocalOnly: false };
    }
    
    // For single item updates, we only need to update that specific item
    if (isSingleItemUpdate) {
      const category = categories[0];
      const item = category.items[0];
      
      console.log(`Saving single item ${item.id} with dietary_type: ${item.dietary_type}`);
      
      // Only update the dietary_type field for single item updates
      const { error: itemError } = await supabase
        .from('menu_items')
        .update({
          dietary_type: item.dietary_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
      
      if (itemError) {
        console.error("Error updating menu item:", itemError, {
          item_id: item.id,
          dietary_type: item.dietary_type
        });
        
        if (await handleRelationDoesNotExistError(itemError)) {
          const { error: retryError } = await supabase
            .from('menu_items')
            .update({
              dietary_type: item.dietary_type,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);
          
          if (retryError) throw retryError;
        } else {
          throw itemError;
        }
      }
      
      return { success: true, isLocalOnly: false };
    }
    
    // For full menu updates, process all categories and items
    for (let [index, category] of categories.entries()) {
      const { error: categoryError } = await supabase
        .from('menu_categories')
        .upsert({
          id: category.id,
          name: category.name,
          restaurant_id: id,
          order: index,
          type: category.type || null,
          updated_at: new Date().toISOString()
        });
      
      if (categoryError) {
        if (await handleRelationDoesNotExistError(categoryError)) {
          const { error: retryError } = await supabase
            .from('menu_categories')
            .upsert({
              id: category.id,
              name: category.name,
              restaurant_id: id,
              order: index,
              type: category.type || null,
              updated_at: new Date().toISOString()
            });
          
          if (retryError) throw retryError;
        } else {
          throw categoryError;
        }
      }
      
      for (let [itemIndex, item] of category.items.entries()) {
        const { error: itemError } = await supabase
          .from('menu_items')
          .upsert({
            id: item.id,
            name: item.name,
            description: item.description || null,
            price: item.price,
            old_price: item.old_price || null,
            weight: item.weight || null,
            image_url: item.image_url || null,
            is_visible: item.is_visible !== false,
            is_available: item.is_available !== false,
            category_id: category.id,
            order: itemIndex,
            dietary_type: item.dietary_type || null,
            updated_at: new Date().toISOString()
          });
        
        if (itemError) {
          console.error("Error updating menu item:", itemError, {
            item_id: item.id,
            dietary_type: item.dietary_type
          });
          
          if (await handleRelationDoesNotExistError(itemError)) {
            const { error: retryError } = await supabase
              .from('menu_items')
              .upsert({
                id: item.id,
                name: item.name,
                description: item.description || null,
                price: item.price,
                old_price: item.old_price || null,
                weight: item.weight || null,
                image_url: item.image_url || null,
                is_visible: item.is_visible !== false,
                is_available: item.is_available !== false,
                category_id: category.id,
                order: itemIndex,
                dietary_type: item.dietary_type || null,
                updated_at: new Date().toISOString()
              });
            
            if (retryError) throw retryError;
          } else {
            throw itemError;
          }
        }

        // Process variants and addons
        if (item.variants && item.variants.length > 0) {
          // Fetch current variants to compare
          const { data: existingVariants, error: getVariantsError } = await supabase
            .from('menu_item_variants')
            .select('id')
            .eq('menu_item_id', item.id);
          
          if (getVariantsError && getVariantsError.code !== 'PGRST116') {
            throw getVariantsError;
          }
          
          const newVariantIds = item.variants.map(v => v.id);
          const variantsToDelete = existingVariants
            ?.filter(v => !newVariantIds.includes(v.id))
            .map(v => v.id) || [];
          
          if (variantsToDelete.length > 0) {
            const { error: deleteVariantsError } = await supabase
              .from('menu_item_variants')
              .delete()
              .in('id', variantsToDelete);
            
            if (deleteVariantsError && deleteVariantsError.code !== 'PGRST116') {
              throw deleteVariantsError;
            }
          }
          
          for (let [variantIndex, variant] of item.variants.entries()) {
            const { error: variantError } = await supabase
              .from('menu_item_variants')
              .upsert({
                id: variant.id,
                menu_item_id: item.id,
                name: variant.name,
                price: variant.price,
                order: variantIndex,
                updated_at: new Date().toISOString()
              });
            
            if (variantError && variantError.code !== 'PGRST116') {
              throw variantError;
            }
          }
        }

        if (item.addons && item.addons.length > 0) {
          const { data: existingMappings, error: getMappingsError } = await supabase
            .from('menu_item_addon_mapping')
            .select('addon_id')
            .eq('menu_item_id', item.id);
          
          if (getMappingsError && getMappingsError.code !== 'PGRST116') {
            throw getMappingsError;
          }
          
          const existingAddonIds = existingMappings?.map(m => m.addon_id) || [];
          const newAddonIds = item.addons.map(a => a.id);
          
          const addonMappingsToDelete = existingAddonIds.filter(id => !newAddonIds.includes(id));
          
          if (addonMappingsToDelete.length > 0) {
            const { error: deleteMappingsError } = await supabase
              .from('menu_item_addon_mapping')
              .delete()
              .eq('menu_item_id', item.id)
              .in('addon_id', addonMappingsToDelete);
            
            if (deleteMappingsError && deleteMappingsError.code !== 'PGRST116') {
              throw deleteMappingsError;
            }
          }
          
          for (const addon of item.addons) {
            const { error: addonError } = await supabase
              .from('menu_item_addons')
              .upsert({
                id: addon.id,
                title: addon.title,
                type: addon.type,
                updated_at: new Date().toISOString()
              });
            
            if (addonError && addonError.code !== 'PGRST116') {
              throw addonError;
            }
            
            if (!existingAddonIds.includes(addon.id)) {
              const { error: mappingError } = await supabase
                .from('menu_item_addon_mapping')
                .upsert({
                  id: uuidv4(),
                  menu_item_id: item.id,
                  addon_id: addon.id
                });
              
              if (mappingError && mappingError.code !== 'PGRST116') {
                throw mappingError;
              }
            }
            
            if (addon.options && addon.options.length > 0) {
              const { data: existingOptions, error: getOptionsError } = await supabase
                .from('menu_addon_options')
                .select('id')
                .eq('addon_id', addon.id);
              
              if (getOptionsError && getOptionsError.code !== 'PGRST116') {
                throw getOptionsError;
              }
              
              const existingOptionIds = existingOptions?.map(o => o.id) || [];
              const newOptionIds = addon.options.map(o => o.id);
              
              const optionsToDelete = existingOptionIds.filter(id => !newOptionIds.includes(id));
              
              if (optionsToDelete.length > 0) {
                const { error: deleteOptionsError } = await supabase
                  .from('menu_addon_options')
                  .delete()
                  .in('id', optionsToDelete);
                
                if (deleteOptionsError && deleteOptionsError.code !== 'PGRST116') {
                  throw deleteOptionsError;
                }
              }
              
              for (let [optionIndex, option] of addon.options.entries()) {
                const { error: optionError } = await supabase
                  .from('menu_addon_options')
                  .upsert({
                    id: option.id,
                    addon_id: addon.id,
                    name: option.name,
                    price: option.price,
                    order: optionIndex,
                    updated_at: new Date().toISOString()
                  });
                
                if (optionError && optionError.code !== 'PGRST116') {
                  throw optionError;
                }
              }
            } else {
              const { error: deleteAllOptionsError } = await supabase
                .from('menu_addon_options')
                .delete()
                .eq('addon_id', addon.id);
              
              if (deleteAllOptionsError && deleteAllOptionsError.code !== 'PGRST116') {
                throw deleteAllOptionsError;
              }
            }
          }
        }
      }
    }
    
    return { success: true, isLocalOnly: false };
  } catch (error) {
    console.error('Error saving restaurant menu:', error);
    
    const setupSucceeded = await handleRelationDoesNotExistError(error);
    
    if (setupSucceeded) {
      toast.info('Created database tables, retrying save operation...');
      return saveRestaurantMenu(restaurant);
    }
    
    toast.error('Failed to save menu to database', {
      description: 'Please try again or check your connection.'
    });
    
    throw error;
  }
};

export const updateOrderSettings = async (restaurantId: string, ordersEnabled: boolean) => {
  try {
    const { error } = await supabase
      .from('restaurants')
      .update({
        orders_enabled: ordersEnabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurantId);

    if (error) {
      console.error('Error updating order settings:', error);
      throw error;
    }

    // Invalidate cache for this restaurant
    const cacheKey = `restaurant_${restaurantId}`;
    removeFromCache(cacheKey);

    return { success: true };
  } catch (error) {
    console.error('Error in updateOrderSettings:', error);
    throw error;
  }
};

export const updateMenuItemDietaryType = async (itemId: string, dietaryType: 'veg' | 'non-veg' | null, restaurantId: string) => {
  try {
    // Update the dietary type in a single database call
    const { error } = await supabase
      .from('menu_items')
      .update({
        dietary_type: dietaryType,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) {
      console.error('Error updating dietary type:', error);
      throw error;
    }

    // Invalidate cache for this restaurant directly using the provided restaurantId
    const cacheKey = `restaurant_${restaurantId}`;
    removeFromCache(cacheKey);

    return { success: true };
  } catch (error) {
    console.error('Error in updateMenuItemDietaryType:', error);
    throw error;
  }
};

export const updateMenuItemField = async (
  itemId: string,
  categoryId: string,
  field: string,
  value: string | boolean | null,
  restaurantId: string
) => {
  try {
    // Update only the specific field in a single database call
    const { error } = await supabase
      .from('menu_items')
      .update({
        [field]: value,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) {
      console.error('Error updating menu item field:', error);
      throw error;
    }

    // Invalidate cache for this restaurant
    const cacheKey = `restaurant_${restaurantId}`;
    removeFromCache(cacheKey);

    return { success: true };
  } catch (error) {
    console.error('Error in updateMenuItemField:', error);
    throw error;
  }
};
