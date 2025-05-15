import React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import { 
  getRestaurantBasicInfo, 
  getRestaurantCategories, 
  getCategoryItems,
  getAllRestaurantItems 
} from "@/services/menuService";
import { setupDatabase, handleRelationDoesNotExistError } from "@/lib/setupDatabase";
import { supabase } from "@/integrations/supabase/client";
import { CategoryType, Restaurant } from "@/types/menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDatabaseConnection } from "@/hooks/use-database-connection";

// Component imports
import LoadingState from "@/components/menu/LoadingState";
import ErrorState from "@/components/menu/ErrorState";
import PageHeader from "@/components/menu/PageHeader";
import DatabaseWarning from "@/components/menu/DatabaseWarning";
import RestaurantHeader from "@/components/menu/RestaurantHeader";
import MenuList from "@/components/menu/MenuList";
import MenuFooter from "@/components/menu/MenuFooter";
import Cart from "@/components/menu/Cart";
import SearchBar from "@/components/menu/SearchBar";
import CategoryTabs from "@/components/menu/CategoryTabs";
import { CartProvider } from "@/contexts/CartContext";
import { Toaster } from "@/components/ui/toaster";
import LoadingAnimation from "@/components/LoadingAnimation";
import { OrderProvider } from '@/contexts/OrderContext';
import OrderHistory from '@/components/menu/OrderHistory';
import WaiterCallButton from '@/components/menu/WaiterCallButton';
import CategoryNavigationDialog from '@/components/menu/CategoryNavigationDialog';
import BillSelectionDialog from "@/components/menu/BillSelectionDialog";
import SessionCodeDisplay from "@/components/menu/SessionCodeDisplay";

// Sample data as fallback when API call fails or is loading
const sampleData: Restaurant = {
  id: "sample-restaurant",
  name: "Sample Restaurant",
  description: "This is a sample restaurant menu",
  categories: [
    {
      id: "sample-category-1",
      name: "Appetizers",
      items: [
        {
          id: "sample-item-1",
          name: "Garlic Bread",
          description: "Toasted bread with garlic butter",
          price: "5.99",
        },
        {
          id: "sample-item-2",
          name: "Mozzarella Sticks",
          description: "Breaded mozzarella with marinara sauce",
          price: "7.99",
        },
      ],
    },
  ],
  ordersEnabled: true,
};

const MenuPreview = () => {
  const { menuId } = useParams<{ menuId: string }>();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table');
  const [attemptedDatabaseSetup, setAttemptedDatabaseSetup] = useState(false);
  const [isDbError, setIsDbError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<CategoryType>("all");
  const isMobile = useIsMobile();
  
  // Performance monitoring
  const [loadStartTime] = useState(() => performance.now());
  
  // New state for bill selection dialog
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [isSessionOwner, setIsSessionOwner] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Use the database connection hook
  const { data: isConnected, isLoading: isCheckingConnection } = useDatabaseConnection();

  // Update isDbError when connection status changes
  useEffect(() => {
    setIsDbError(!isConnected);
  }, [isConnected]);

  // Load basic restaurant info first
  const { data: basicInfo, isLoading: isLoadingBasicInfo } = useQuery({
    queryKey: ['restaurant-basic', menuId],
    queryFn: () => getRestaurantBasicInfo(menuId!),
    enabled: !!menuId && isConnected !== false,
  });

  // Load categories after basic info
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['restaurant-categories', menuId],
    queryFn: () => getRestaurantCategories(menuId!),
    enabled: !!basicInfo && isConnected !== false,
  });

  // Load items for expanded categories
  const categoryQueries = useQueries({
    queries: categories?.map(category => ({
      queryKey: ['category-items', category.id],
      queryFn: () => getCategoryItems(category.id),
      enabled: true,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    })) || [],
  });

  // Load all items for search functionality
  const { data: allItems } = useQuery({
    queryKey: ['all-items', menuId],
    queryFn: () => getAllRestaurantItems(menuId!),
    enabled: !!basicInfo && isConnected !== false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Memoize the complete restaurant data
  const restaurantToDisplay = useMemo(() => {
    if (!basicInfo || !categories) return null;

    return {
      ...basicInfo,
      ordersEnabled: basicInfo.orders_enabled,
      categories: categories.map((category, idx) => {
        const categoryItems = categoryQueries[idx]?.data || [];
        return {
          ...category,
          items: categoryItems.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            image_url: item.image_url,
            is_available: item.is_available,
            is_visible: item.is_visible,
            order: item.order,
            dietary_type: item.dietary_type,
            weight: item.weight,
            old_price: item.old_price,
            variants: item.menu_item_variants || [],
            addons: (item.menu_item_addon_mapping || []).map(mapping => {
              const addon: any = mapping.menu_item_addons;
              if (!addon || Array.isArray(addon)) return null;
              return {
                id: addon.id,
                title: addon.title,
                type: addon.type,
                options: addon.menu_addon_options || []
              };
            }).filter(Boolean)
          }))
        };
      })
    };
  }, [basicInfo, categories, categoryQueries]);

  // Convert Set to Record for compatibility
  const openCategoriesRecord = useMemo(() => {
    const record: Record<string, boolean> = {};
    expandedCategories.forEach(id => {
      record[id] = true;
    });
    return record;
  }, [expandedCategories]);

  // Handle category expansion
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (query.trim() !== "" && categories) {
      // Expand all categories when searching
      setExpandedCategories(new Set(categories.map(c => c.id)));
    }
  }, [categories]);

  // Memoize tab change handler
  const handleTabChange = useCallback((tab: CategoryType) => {
    setActiveTab(tab);
    setSearchQuery("");
  }, []);

  // Memoize QR code value
  const qrCodeValue = useMemo(() => {
    if (!restaurantToDisplay) return '';
    
    const baseUrl = `${window.location.origin}/menu-preview/${restaurantToDisplay.id}`;
    
    if (sessionCode && tableId) {
      return `${baseUrl}?table=${tableId}&sessionCode=${sessionCode}`;
    }
    
    return tableId ? `${baseUrl}?table=${tableId}` : baseUrl;
  }, [restaurantToDisplay, tableId, sessionCode]);

  // Memoize isOrderingEnabled
  const isOrderingEnabled = useMemo(() => 
    restaurantToDisplay?.ordersEnabled !== false,
  [restaurantToDisplay]);

  // Memoize isTableContext
  const isTableContext = useMemo(() => !!tableId, [tableId]);

  // Performance monitoring effect
  useEffect(() => {
    if (!isLoadingBasicInfo && !isLoadingCategories && basicInfo && categories) {
      const loadEndTime = performance.now();
      const totalLoadTime = (loadEndTime - loadStartTime) / 1000;
      console.log(`MenuPreview initial load time: ${totalLoadTime.toFixed(2)} seconds`);
      console.log('Load time breakdown:', {
        totalTime: `${totalLoadTime.toFixed(2)}s`,
        basicInfo: basicInfo ? 'Loaded' : 'Not loaded',
        categories: categories?.length || 0,
        expandedCategories: expandedCategories.size,
        databaseConnection: isConnected ? 'Connected' : 'Not connected'
      });
    }
  }, [isLoadingBasicInfo, isLoadingCategories, basicInfo, categories, loadStartTime, isConnected, expandedCategories]);

  // Check for existing session or initialize bill selection
  useEffect(() => {
    if (tableId && restaurantToDisplay) {
      const urlSessionCode = searchParams.get('sessionCode');
      
      if (urlSessionCode) {
        supabase
          .from("bill_sessions")
          .select("*")
          .eq("code", urlSessionCode)
          .eq("is_active", true)
          .gt("expires_at", new Date().toISOString())
          .single()
          .then(({ data, error }) => {
            if (data && !error) {
              localStorage.setItem("billSessionId", data.id);
              localStorage.setItem("billSessionCode", data.code);
              localStorage.setItem("billSessionOwner", "false");
              localStorage.setItem("billSessionExpiresAt", data.expires_at);
              
              setSessionCode(data.code);
              setIsSessionOwner(false);
            } else {
              setShowBillDialog(true);
            }
          });
      } else {
        setShowBillDialog(true);
      }
    }
  }, [tableId, restaurantToDisplay, searchParams]);

  // Show loading state for initial load
  if (isLoadingBasicInfo || isLoadingCategories) {
    return <LoadingAnimation />;
  }

  // Show not found state
  if (!isLoadingBasicInfo && !basicInfo && menuId !== "sample-restaurant") {
    return (
      <ErrorState 
        message="Menu not found" 
        description="This menu might not exist or has been deleted from the database." 
      />
    );
  }

  // Show error
  if (isDbError && menuId !== "sample-restaurant") {
    return (
      <ErrorState 
        message="Could not load menu from database." 
        description="There was an error connecting to the database. Please try again later." 
      />
    );
  }

  if (!restaurantToDisplay) {
    return null;
  }

  return (
    <CartProvider>
      <OrderProvider>
        <div className="bg-gradient-to-b from-blue-50 to-white min-h-screen font-sans">
          <PageHeader qrCodeValue={qrCodeValue} />
          <DatabaseWarning isDbError={isDbError} />
          <RestaurantHeader 
            name={restaurantToDisplay.name} 
            description={restaurantToDisplay.description}
            image_url={restaurantToDisplay.image_url}
            google_review_link={restaurantToDisplay.google_review_link}
            location={restaurantToDisplay.location}
            phone={restaurantToDisplay.phone}
            wifi_password={restaurantToDisplay.wifi_password}
            opening_time={restaurantToDisplay.opening_time}
            closing_time={restaurantToDisplay.closing_time}
          />
          
          <div className="mb-4">
            <CategoryTabs 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
              ordersEnabled={isOrderingEnabled}
            />
          </div>

          <div className={isMobile ? "px-2" : "px-6"}>
            <SearchBar onSearch={handleSearch} />
            
            <MenuList
              categories={restaurantToDisplay.categories}
              openCategories={openCategoriesRecord}
              toggleCategory={toggleCategory}
              searchQuery={searchQuery}
              activeTab={activeTab}
              ordersEnabled={isOrderingEnabled}
            />
            
            {!isOrderingEnabled && (
              <div className="mt-4 text-center text-muted-foreground">
                <p>Ordering is currently disabled for this restaurant.</p>
              </div>
            )}
          </div>
          
          <MenuFooter />
          {tableId && isOrderingEnabled && (
            <WaiterCallButton 
              tableId={tableId} 
              restaurantId={restaurantToDisplay.id} 
            />
          )}

          <CategoryNavigationDialog
            categories={restaurantToDisplay.categories}
            openCategories={openCategoriesRecord}
            toggleCategory={toggleCategory}
          />
          
          {sessionCode && (
            <SessionCodeDisplay />
          )}
        </div>
        
        {isOrderingEnabled && (
          <Cart 
            tableId={tableId || undefined} 
            sessionId={localStorage.getItem("billSessionId") || undefined}
            sessionCode={sessionCode || undefined}
            isSessionOwner={isSessionOwner}
          />
        )}
        
        {isOrderingEnabled && (
          <OrderHistory 
            tableId={tableId || undefined} 
          />
        )}
        
        {tableId && restaurantToDisplay && isOrderingEnabled && (
          <BillSelectionDialog
            open={showBillDialog}
            onOpenChange={setShowBillDialog}
            restaurantId={restaurantToDisplay.id}
            tableId={tableId}
          />
        )}
        
        <Toaster />
      </OrderProvider>
    </CartProvider>
  );
};

export default MenuPreview;
