
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronsUpDown } from "lucide-react"; // Changed from ChevronUpDown to ChevronsUpDown
import { useIsMobile } from "@/hooks/use-mobile";
import TabsVisibilityManager from "./TabsVisibilityManager";
import { Restaurant, CategoryType } from "@/types/menu";

interface RestaurantFormProps {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant>>;
}

const RestaurantForm: React.FC<RestaurantFormProps> = ({ restaurant, setRestaurant }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRestaurant(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVisibleTabsChange = (tabs: CategoryType[]) => {
    setRestaurant(prev => ({
      ...prev,
      visible_tabs: tabs
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-x-0">
        <CardTitle className="text-base md:text-lg font-semibold">Restaurant Details</CardTitle>
        <CollapsibleTrigger
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-md border p-1.5 hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronsUpDown className="h-4 w-4" />
          <span className="sr-only">Toggle</span>
        </CollapsibleTrigger>
      </CardHeader>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Restaurant Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={restaurant.name}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={restaurant.description}
                  onChange={handleChange}
                  className="w-full min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    value={restaurant.location || ""}
                    onChange={handleChange}
                    placeholder="Restaurant address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={restaurant.phone || ""}
                    onChange={handleChange}
                    placeholder="Contact number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="opening_time">Opening Time</Label>
                  <Input
                    id="opening_time"
                    name="opening_time"
                    value={restaurant.opening_time || ""}
                    onChange={handleChange}
                    placeholder="e.g., 9:00 AM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closing_time">Closing Time</Label>
                  <Input
                    id="closing_time"
                    name="closing_time"
                    value={restaurant.closing_time || ""}
                    onChange={handleChange}
                    placeholder="e.g., 10:00 PM"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="google_review_link">Google Review Link</Label>
                <Input
                  id="google_review_link"
                  name="google_review_link"
                  value={restaurant.google_review_link || ""}
                  onChange={handleChange}
                  placeholder="Link to your Google reviews"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wifi_password">Wi-Fi Password</Label>
                <Input
                  id="wifi_password"
                  name="wifi_password"
                  value={restaurant.wifi_password || ""}
                  onChange={handleChange}
                  placeholder="Password for customer Wi-Fi"
                />
              </div>

              <TabsVisibilityManager 
                visibleTabs={restaurant.visible_tabs || []}
                onVisibleTabsChange={handleVisibleTabsChange}
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default RestaurantForm;
