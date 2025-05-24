import React, { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImagePlus, ChevronDown, ImageIcon, Trash } from "lucide-react";
import { RestaurantUI } from "@/services/menuService";
import { uploadRestaurantImage } from "@/utils/restaurantImageUpload";
import { uploadPaymentQR } from "@/utils/paymentQrUpload";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { supabase } from "@/lib/supabase";
import { optimizeImage } from "@/lib/imageOptimization";

interface RestaurantFormProps {
  restaurant: RestaurantUI;
  setRestaurant: React.Dispatch<React.SetStateAction<RestaurantUI>>;
}

const RestaurantForm: React.FC<RestaurantFormProps> = ({ restaurant, setRestaurant }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const [promoImagePreview, setPromoImagePreview] = useState<string | null>(restaurant.promo_image_url || null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadRestaurantImage(file);
    if (url) {
      setRestaurant({ ...restaurant, image_url: url });
      toast.success("Restaurant image updated successfully");
    }
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadPaymentQR(file);
    if (url) {
      setRestaurant({ ...restaurant, payment_qr_code: url });
      toast.success("Payment QR code updated successfully");
    }
  };

  const handlePromoImageChange = async (file: File) => {
    try {
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPromoImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Optimize the image before uploading
      const optimizedFile = await optimizeImage(file);
      
      const fileExt = optimizedFile.name.split('.').pop();
      const fileName = `promo_${restaurant.id}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('menu-images')
        .upload(filePath, optimizedFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error('Error uploading promotional image:', error);
        toast.error('Failed to upload promotional image');
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(filePath);
      
      setRestaurant({
        ...restaurant,
        promo_image_url: publicUrl
      });
      
      toast.success('Promotional image uploaded successfully');
    } catch (error) {
      console.error('Error uploading promotional image:', error);
      toast.error('Failed to upload promotional image');
    }
  };

  return (
    <div className="space-y-4">
      <div 
        className="flex items-center justify-between p-2 bg-blue-100 rounded-lg cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
      >
        <h2 className="text-xl font-semibold">Restaurant Details</h2>
        <ChevronDown className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      {isExpanded && (
        <div className="space-y-4 animate-in fade-in-50">
          <div className="grid gap-4 md:grid-cols-2 md:gap-8">
            {/* Restaurant Image Section */}
            <div className="space-y-2">
              <Label>Restaurant Image</Label>
              <div className="flex items-center gap-4">
                {restaurant.image_url ? (
                  <div className="relative group w-full aspect-square">
                    <img 
                      src={restaurant.image_url} 
                      alt={restaurant.name} 
                      className="w-full h-full object-cover rounded-lg border" 
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 bg-white/80 hover:bg-red-100 text-red-600"
                      onClick={() => setRestaurant({ ...restaurant, image_url: null })}
                      title="Remove photo"
                    >
                      <Trash className="w-5 h-5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full aspect-square flex flex-col items-center justify-center gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="w-8 h-8" />
                    <span className="text-sm">Upload Image</span>
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            {/* QR Code Section */}
            <div className="space-y-2">
              <Label>Payment QR Code</Label>
              <div className="flex items-center gap-4">
                {restaurant.payment_qr_code ? (
                  <div className="relative group w-full aspect-square">
                    <img 
                      src={restaurant.payment_qr_code} 
                      alt="Payment QR" 
                      className="w-full h-full object-cover rounded-lg border" 
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => qrInputRef.current?.click()}
                    >
                      Change
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 bg-white/80 hover:bg-red-100 text-red-600"
                      onClick={() => setRestaurant({ ...restaurant, payment_qr_code: null })}
                      title="Remove QR"
                    >
                      <Trash className="w-5 h-5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full aspect-square flex flex-col items-center justify-center gap-2"
                    onClick={() => qrInputRef.current?.click()}
                  >
                    <ImagePlus className="w-8 h-8" />
                    <span className="text-sm">Upload QR</span>
                  </Button>
                )}
                <input
                  ref={qrInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleQRUpload}
                />
              </div>
            </div>
          </div>

          {/* UPI ID Section */}
          <div className="space-y-2">
            <Label>UPI ID</Label>
            <Input
              value={restaurant.upi_id || ''}
              onChange={(e) => setRestaurant({ ...restaurant, upi_id: e.target.value })}
              placeholder="Enter your UPI id."
            />
          </div>

          {/* Order Dashboard PIN Section */}
          <div className="space-y-2">
            <Label>Order Dashboard PIN</Label>
            <Input
              type="password"
              maxLength={4}
              pattern="[0-9]{4}"
              value={restaurant.order_dashboard_pin || ''}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                setRestaurant({ ...restaurant, order_dashboard_pin: val });
              }}
              placeholder="Set 4-digit PIN for order dashboard"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">Required to access the order dashboard. Leave blank to disable PIN protection.</p>
          </div>

          <div>
            <Label>Promotional Image</Label>
            <div className="mt-2 relative">
              <ImageUpload
                currentImage={promoImagePreview}
                onImageChange={handlePromoImageChange}
                aspectRatio={16/9}
                className="w-full h-48"
                icon={<ImageIcon className="w-8 h-8" />}
                label="Upload promotional image"
              />
              {promoImagePreview && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-white/80 hover:bg-red-100 text-red-600 z-10"
                  onClick={() => {
                    setPromoImagePreview(null);
                    setRestaurant({ ...restaurant, promo_image_url: null });
                  }}
                  title="Remove promotional image"
                >
                  <Trash className="w-5 h-5" />
                </Button>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Upload an image to display special offers and discounts to customers
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantForm;
