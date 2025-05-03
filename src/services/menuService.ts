import { supabase } from '@/integrations/supabase/client';
import { Restaurant, MenuCategory, MenuItem, MenuItemVariant, MenuItemAddon, MenuAddonOption } from '@/types/menu';
import { v4 as uuidv4 } from 'uuid';

// UI types
export interface MenuItemUI extends MenuItem {}
export interface MenuItemVariantUI extends MenuItemVariant {}
export interface MenuItemAddonUI extends MenuItemAddon {}
export interface MenuAddonOptionUI extends MenuAddonOption {}
export interface MenuCategoryUI extends Omit<MenuCategory, 'items'> {
  items: MenuItemUI[];
}
export interface RestaurantUI extends Omit<Restaurant, 'categories'> {
  categories: MenuCategoryUI[];
}

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  try {
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !restaurant) {
      console.error('Error fetching restaurant:', error);
      return null;
    }

    const { data: categories } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', id)
      .order('order', { ascending: true });

    if (!categories) {
      return {
        ...restaurant,
        categories: []
      };
    }

    // Get all menu items for this restaurant's categories
    const categoryIds = categories.map(c => c.id);
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('*, menu_item_variants(*)')
      .in('category_id', categoryIds)
      .order('order', { ascending: true });

    const processedCategories = await Promise.all(
      categories.map(async (category) => {
        const categoryItems = menuItems?.filter(item => item.category_id === category.id) || [];
        
        // Process each item to include its variants and addons
        const processedItems = await Promise.all(
          categoryItems.map(async (item) => {
            // Get variants
            const variants = item.menu_item_variants || [];

            // Get addons for this item
            const { data: addonMappings } = await supabase
              .from('menu_item_addon_mapping')
              .select('addon_id')
              .eq('menu_item_id', item.id);

            let addons: MenuItemAddon[] = [];
            
            if (addonMappings && addonMappings.length > 0) {
              const addonIds = addonMappings.map(mapping => mapping.addon_id);
              
              const { data: addonsData } = await supabase
                .from('menu_item_addons')
                .select('*')
                .in('id', addonIds);

              if (addonsData) {
                addons = await Promise.all(
                  addonsData.map(async (addon) => {
                    // Get options for this addon
                    const { data: optionsData } = await supabase
                      .from('menu_addon_options')
                      .select('*')
                      .eq('addon_id', addon.id)
                      .order('order', { ascending: true });

                    return {
                      ...addon,
                      options: optionsData || []
                    };
                  })
                );
              }
            }

            // Return the processed item with variants and addons
            return {
              ...item,
              variants,
              addons
            };
          })
        );

        // Return the category with its processed items
        return {
          ...category,
          items: processedItems
        };
      })
    );

    return {
      ...restaurant,
      categories: processedCategories
    };
  } catch (error) {
    console.error('Error in getRestaurantById:', error);
    return null;
  }
}

export async function saveMenuItem(categoryId: string, item: MenuItemUI): Promise<string | null> {
  try {
    // Save the basic item data
    const { data, error } = await supabase
      .from('menu_items')
      .upsert({
        id: item.id,
        category_id: categoryId,
        name: item.name,
        description: item.description,
        price: item.price,
        old_price: item.old_price,
        weight: item.weight,
        is_visible: item.is_visible,
        is_available: item.is_available,
        image_url: item.image_url,
        dietary_type: item.dietary_type,
      })
      .select();

    if (error) {
      console.error('Error saving menu item:', error);
      return null;
    }

    const itemId = data[0].id;

    // Handle variants
    if (item.variants && item.variants.length > 0) {
      // First, get existing variants to detect deletions
      const { data: existingVariants } = await supabase
        .from('menu_item_variants')
        .select('id')
        .eq('menu_item_id', itemId);

      const existingVariantIds = existingVariants?.map(v => v.id) || [];
      const newVariantIds = item.variants.map(v => v.id);
      
      // Find variants to delete
      const variantsToDelete = existingVariantIds.filter(id => !newVariantIds.includes(id));
      
      if (variantsToDelete.length > 0) {
        await supabase
          .from('menu_item_variants')
          .delete()
          .in('id', variantsToDelete);
      }

      // Upsert all current variants
      for (const variant of item.variants) {
        await supabase
          .from('menu_item_variants')
          .upsert({
            id: variant.id,
            menu_item_id: itemId,
            name: variant.name,
            price: variant.price,
            order: item.variants.indexOf(variant)
          });
      }
    } else {
      // If no variants, delete all existing variants
      await supabase
        .from('menu_item_variants')
        .delete()
        .eq('menu_item_id', itemId);
    }

    // Handle addons in a similar way
    if (item.addons && item.addons.length > 0) {
      // Process each addon
      for (const addon of item.addons) {
        // Save or update the addon
        const { data: addonData, error: addonError } = await supabase
          .from('menu_item_addons')
          .upsert({
            id: addon.id,
            title: addon.title,
            type: addon.type
          })
          .select();

        if (addonError) {
          console.error('Error saving addon:', addonError);
          continue;
        }

        const addonId = addonData[0].id;

        // Ensure the mapping between item and addon exists
        await supabase
          .from('menu_item_addon_mapping')
          .upsert({
            id: `${itemId}-${addonId}`,
            menu_item_id: itemId,
            addon_id: addonId
          });

        // Handle addon options
        if (addon.options && addon.options.length > 0) {
          // First, get existing options to detect deletions
          const { data: existingOptions } = await supabase
            .from('menu_addon_options')
            .select('id')
            .eq('addon_id', addonId);

          const existingOptionIds = existingOptions?.map(o => o.id) || [];
          const newOptionIds = addon.options.map(o => o.id);
          
          // Find options to delete
          const optionsToDelete = existingOptionIds.filter(id => !newOptionIds.includes(id));
          
          if (optionsToDelete.length > 0) {
            await supabase
              .from('menu_addon_options')
              .delete()
              .in('id', optionsToDelete);
          }

          // Upsert all current options
          for (const option of addon.options) {
            await supabase
              .from('menu_addon_options')
              .upsert({
                id: option.id,
                addon_id: addonId,
                name: option.name,
                price: option.price,
                order: addon.options.indexOf(option)
              });
          }
        } else {
          // If no options, delete all existing options
          await supabase
            .from('menu_addon_options')
            .delete()
            .eq('addon_id', addonId);
        }
      }

      // Clean up addon mappings that no longer exist
      const addonIds = item.addons.map(a => a.id);
      
      const { data: existingMappings } = await supabase
        .from('menu_item_addon_mapping')
        .select('addon_id')
        .eq('menu_item_id', itemId);

      if (existingMappings) {
        const existingAddonIds = existingMappings.map(m => m.addon_id);
        const addonIdsToDelete = existingAddonIds.filter(id => !addonIds.includes(id));

        if (addonIdsToDelete.length > 0) {
          await supabase
            .from('menu_item_addon_mapping')
            .delete()
            .eq('menu_item_id', itemId)
            .in('addon_id', addonIdsToDelete);
        }
      }
    } else {
      // If no addons, clean up all related data
      const { data: existingMappings } = await supabase
        .from('menu_item_addon_mapping')
        .select('addon_id')
        .eq('menu_item_id', itemId);

      if (existingMappings && existingMappings.length > 0) {
        const addonIds = existingMappings.map(m => m.addon_id);
        
        // Delete all mappings
        await supabase
          .from('menu_item_addon_mapping')
          .delete()
          .eq('menu_item_id', itemId);
          
        // For each addon that was mapped to this item, check if it's used elsewhere
        for (const addonId of addonIds) {
          const { data: otherMappings } = await supabase
            .from('menu_item_addon_mapping')
            .select('id')
            .eq('addon_id', addonId);
            
          if (!otherMappings || otherMappings.length === 0) {
            // This addon is no longer used anywhere, delete it and its options
            await supabase
              .from('menu_addon_options')
              .delete()
              .eq('addon_id', addonId);
              
            await supabase
              .from('menu_item_addons')
              .delete()
              .eq('id', addonId);
          }
        }
      }
    }

    return itemId;
  } catch (error) {
    console.error('Error in saveMenuItem:', error);
    return null;
  }
}

export async function createNewMenuItem(categoryId: string): Promise<MenuItemUI | null> {
  const newItem: MenuItemUI = {
    id: uuidv4(),
    name: "New Item",
    description: "",
    price: "0.00",
    is_visible: true,
    is_available: true,
    variants: [],
    addons: [],
    dietary_type: null
  };

  const itemId = await saveMenuItem(categoryId, newItem);
  
  if (!itemId) {
    return null;
  }
  
  return {
    ...newItem,
    id: itemId
  };
}
