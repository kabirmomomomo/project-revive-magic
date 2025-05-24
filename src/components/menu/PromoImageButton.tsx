import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromoImageButtonProps {
  imageUrl: string | undefined;
  className?: string;
}

const PromoImageButton: React.FC<PromoImageButtonProps> = ({ imageUrl, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!imageUrl) return null;

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className={cn(
          "fixed top-1 right-4 z-50 bg-white/80 backdrop-blur-sm hover:bg-white flex items-center gap-2 px-4 py-2 font-semibold shadow-lg border border-purple-200 text-purple-900 text-base",
          className
        )}
        onClick={() => setIsOpen(true)}
      >
        <Gift className="h-5 w-5 mr-1 text-purple-700" />
        <span>Today's Offers</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <div className="relative w-full h-full">
            <img
              src={imageUrl}
              alt="Promotional offer"
              className="w-full h-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PromoImageButton; 