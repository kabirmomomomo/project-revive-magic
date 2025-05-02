
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingAnimation from '@/components/LoadingAnimation';
import OrderBill from '@/components/menu/OrderBill';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Download, QrCode, CreditCard, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/contexts/OrderContext';

const PaymentPage = () => {
  const { menuId } = useParams();
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('qr-upi');
  const { toast } = useToast();
  const { orders } = useOrders();
  
  // Check if there are any orders to pay for
  useEffect(() => {
    if (orders.length === 0) {
      toast({
        title: "No orders found",
        description: "You don't have any pending orders to pay for.",
        variant: "destructive",
      });
    }
  }, [orders, toast]);

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ['restaurant-payment', menuId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('name, payment_qr_code, upi_id, use_payment_gateway, payment_gateway_type, payment_gateway_merchant_id, payment_gateway_public_key')
        .eq('id', menuId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Determine available payment methods
  useEffect(() => {
    if (restaurant) {
      // If the restaurant has gateway payments set up, make that the default if QR/UPI is not available
      if (restaurant.use_payment_gateway && (!restaurant.payment_qr_code && !restaurant.upi_id)) {
        setActiveTab('gateway');
      }
    }
  }, [restaurant]);

  // Handler for payment confirmation
  const handleConfirmPayment = (method: string) => {
    // Log the payment method
    console.log(`Payment confirmed with method: ${method}`);
    
    // In a real implementation, we would update the order with the payment method
    toast({
      title: "Payment Confirmed",
      description: "Thank you for your payment. Your order is being processed.",
    });
    
    // Redirect to thank you page
    window.location.href = '/thank-you';
  };

  if (isLoading) return <LoadingAnimation />;

  // Display different UI based on available payment options
  const qrUpiAvailable = restaurant?.payment_qr_code || restaurant?.upi_id;
  const gatewayAvailable = restaurant?.use_payment_gateway;
  
  if (!qrUpiAvailable && !gatewayAvailable) {
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

  // Show tabs only if both payment methods are available
  const showTabs = qrUpiAvailable && gatewayAvailable;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-purple-50 to-white p-4 pt-8">
      {/* Order Summary Accordion */}
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
              <OrderBill hideCardWrapper showDownloadButton className="mt-2" />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Payment Options Card */}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl text-purple-900">Complete Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {showTabs ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qr-upi" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  <span>QR/UPI</span>
                </TabsTrigger>
                <TabsTrigger value="gateway" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Card/Netbanking</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="qr-upi" className="mt-4">
                <QrUpiPayment 
                  restaurant={restaurant} 
                  onConfirmPayment={() => handleConfirmPayment('qr_upi')} 
                />
              </TabsContent>
              
              <TabsContent value="gateway" className="mt-4">
                <GatewayPayment 
                  restaurant={restaurant}
                  onConfirmPayment={() => handleConfirmPayment('gateway')}
                />
              </TabsContent>
            </Tabs>
          ) : qrUpiAvailable ? (
            <QrUpiPayment 
              restaurant={restaurant} 
              onConfirmPayment={() => handleConfirmPayment('qr_upi')} 
            />
          ) : gatewayAvailable ? (
            <GatewayPayment 
              restaurant={restaurant}
              onConfirmPayment={() => handleConfirmPayment('gateway')}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

// Component for QR/UPI Payment method
interface PaymentProps {
  restaurant: any;
  onConfirmPayment: () => void;
}

const QrUpiPayment: React.FC<PaymentProps> = ({ restaurant, onConfirmPayment }) => {
  return (
    <div className="space-y-6">
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
        <div className="space-y-2">
          <h3 className="font-medium">UPI ID</h3>
          <p className="text-lg font-mono bg-gray-50 p-2 rounded border select-all">
            {restaurant.upi_id}
          </p>
        </div>
      )}

      <Button
        onClick={onConfirmPayment}
        className="w-full mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-center gap-2"
      >
        <span>Confirm Payment</span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Component for Gateway Payment method
const GatewayPayment: React.FC<PaymentProps> = ({ restaurant, onConfirmPayment }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentClick = () => {
    setIsProcessing(true);
    
    // Here we would normally integrate with the payment gateway
    // For now, we'll simulate the process with a timeout
    setTimeout(() => {
      setIsProcessing(false);
      onConfirmPayment();
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div className="text-center p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <CreditCard className="h-16 w-16 mx-auto text-purple-600 mb-3" />
        <h3 className="font-medium mb-2">Online Payment</h3>
        <p className="text-sm text-gray-600 mb-2">
          Pay securely using a credit/debit card, net banking, or other online payment methods.
        </p>
      </div>

      <Button
        onClick={handlePaymentClick}
        disabled={isProcessing}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <span className="animate-pulse">Processing...</span>
          </>
        ) : (
          <>
            <span>Proceed to Payment</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
};

export default PaymentPage;
