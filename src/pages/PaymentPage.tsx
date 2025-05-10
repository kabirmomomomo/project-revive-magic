import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LoadingAnimation from '@/components/LoadingAnimation';
import OrderBill from '@/components/menu/OrderBill';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Download, Copy } from 'lucide-react';
import { useOrders } from '@/contexts/OrderContext';
import { toast } from '@/components/ui/sonner';

const PaymentPage = () => {
  const { menuId } = useParams();
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(false);
  const { sessionOrders, tableOrders } = useOrders();

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ['restaurant-payment', menuId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('name, payment_qr_code, upi_id')
        .eq('id', menuId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  if (isLoading) return <LoadingAnimation />;

  if (!restaurant?.payment_qr_code && !restaurant?.upi_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl text-purple-900">Payment Not Configured</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              The restaurant hasn't configured their payment details yet.
            </p>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="mt-4"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-purple-50 to-white p-4 pt-8">
      <div className="w-full max-w-md mb-6">
        <Accordion
          type="single"
          collapsible
          value={orderSummaryOpen ? "order-summary" : undefined}
          onValueChange={(val) => setOrderSummaryOpen(val === "order-summary")}
        >
          <AccordionItem value="order-summary">
            <AccordionTrigger className="text-xl text-purple-900 bg-white rounded-md px-4 py-3 border border-purple-100 mb-0 font-semibold">
              Order Summary
            </AccordionTrigger>
            <AccordionContent>
              <OrderBill hideCardWrapper showDownloadButton className="mt-2" orders={sessionOrders.length > 0 ? sessionOrders : tableOrders} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl text-purple-900">Complete Payment</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {restaurant.payment_qr_code && (
            <div className="space-y-4">
              <h3 className="font-medium">Scan QR Code to Pay</h3>
              <div className="flex justify-center">
                <img 
                  src={restaurant.payment_qr_code} 
                  alt="Payment QR Code" 
                  className="max-w-[200px] h-auto border rounded-lg shadow-sm"
                  loading="eager"
                />
              </div>
            </div>
          )}
          
          {restaurant.upi_id && (
            <div className="flex justify-center items-center gap-2 w-full mt-1 mb-2">
              <p className="text-lg font-mono bg-gray-50 p-2 rounded border select-all mb-0 text-center break-all max-w-xs sm:max-w-sm">
                {restaurant.upi_id}
              </p>
              <button
                type="button"
                className="p-1 rounded hover:bg-purple-100 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(restaurant.upi_id);
                  toast.success('UPI ID copied to clipboard');
                }}
                aria-label="Copy UPI ID"
              >
                <Copy className="h-5 w-5 text-purple-600" />
              </button>
            </div>
          )}

          {/* <Button
            onClick={() => window.location.href = '/thank-you'}
            className="w-full mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
          >
            Confirm Payment
          </Button> */}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentPage;
