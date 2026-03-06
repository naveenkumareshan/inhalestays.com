
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { razorpayService, RazorpayOrderParams } from '@/api/razorpayService';
import { useAuth } from '@/hooks/use-auth';

export interface RazorpayCheckoutProps {
  amount: number;
  appliedCoupon?:any;
  bookingId: string;
  endDate: Date,
  bookingType: 'cabin' | 'hostel' | 'laundry' | 'mess';
  bookingDuration?: 'daily' | 'weekly' | 'monthly';
  durationCount?: number;
  onSuccess: (response: any) => void;
  onError?: (error: any) => void;
  onFailure?: (error: any) => void;  // Add backward compatibility
  buttonText?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  buttonDisabled?: boolean;
  className?: string;
  createOrder?: () => Promise<any>;  // New prop for custom order creation
  buttonProps?: Record<string, any>; // For additional button props
}

export function RazorpayCheckout({
  amount,
  appliedCoupon,
  bookingId,
  bookingType,
  endDate,
  bookingDuration = 'monthly',
  durationCount = 1,
  onSuccess,
  onError,
  onFailure,
  buttonText = "Pay Now",
  buttonVariant = "default",
  buttonDisabled = false,
  className = '',
  createOrder,
  buttonProps = {},
}: RazorpayCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
  
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please login to continue with payment",
        variant: "destructive"
      });
      return;
    }
  
    setIsLoading(true);
  
    try {
      // Load the Razorpay script first
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        toast({
          title: "Payment Failed",
          description: "Unable to load Razorpay SDK. Please try again later.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Create order - use custom function if provided, otherwise use default
      let order;
      if (createOrder) {
        order = await createOrder();
        if (!order) throw new Error('Failed to create order');
      } else {
        const orderParams: RazorpayOrderParams = {
          amount,
          currency: 'INR',
          bookingId,
          bookingType,
          bookingDuration,
          durationCount,
        };
        const response = await razorpayService.createOrder(orderParams);
        if (!response.success || !response.data) {
          throw new Error(response.error?.message || 'Failed to create order');
        }
        order = response.data;
      }

      // TEST MODE: skip Razorpay SDK, directly confirm
      if (order.testMode) {
        const verifyResponse = await razorpayService.verifyPayment({
          razorpay_payment_id: `test_pay_${Date.now()}`,
          razorpay_order_id: order.id,
          razorpay_signature: 'test_signature',
          bookingId,
          bookingType,
          bookingDuration,
          durationCount,
          testMode: true,
        } as any);

        if (verifyResponse.success) {
          toast({
            title: "Test Payment Successful",
            description: "Booking confirmed (test mode - no real payment charged)",
          });
          onSuccess({ testMode: true, bookingId });
        } else {
          throw new Error(verifyResponse.error?.message || 'Test payment failed');
        }
        setIsLoading(false);
        return;
      }

      // REAL MODE: open Razorpay checkout
      const options = {
        key: order.KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Inhalestays",
        description: `Payment for ${bookingType} booking (${getDurationText(bookingDuration, durationCount)})`,
        order_id: order.id,
        prefill: {
          name: user.name || '',
          email: user.email || '',
          contact: user.phone || ''
        },
        theme: { color: "#1fa763" },
        config: {
          display: {
            blocks: {
              utib: { name: "Pay using UPI", instruments: [{ method: "upi" }] },
              other: { name: "Other Methods", instruments: [{ method: "card" }, { method: "netbanking" }, { method: "wallet" }] },
            },
            sequence: ["block.utib", "block.other"],
            preferences: { show_default_blocks: true },
          },
        },
        handler: async (paymentResponse: any) => {
          try {
            const verifyResponse = await razorpayService.verifyPayment({
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_signature: paymentResponse.razorpay_signature,
              bookingId,
              bookingType,
              bookingDuration,
              durationCount
            });
            if (verifyResponse.success) {
              toast({ title: "Payment successful", description: "Your booking has been confirmed!" });
              onSuccess(paymentResponse);
            } else {
              throw new Error(verifyResponse.error?.message || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast({
              title: "Payment verification failed",
              description: "Your payment was successful but we couldn't verify it. Please contact support.",
              variant: "destructive"
            });
            if (onError) onError(error);
            else if (onFailure) onFailure(error);
          } finally {
            setIsLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            toast({ title: "Payment Cancelled", description: "You cancelled the payment", variant: "destructive" });
          },
          animation: false,
          backdropclose: false,
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
  
    } catch (error) {
      console.error("Payment initialization error:", error);
      toast({
        title: "Payment initialization failed",
        description: error instanceof Error ? error.message : "Could not start the payment process",
        variant: "destructive"
      });
      if (onError) onError(error);
      else if (onFailure) onFailure(error);
      setIsLoading(false);
    }
  };

  const getDurationText = (duration: string, count: number) => {
    if (duration === 'daily') {
      return `${count} day${count > 1 ? 's' : ''}`;
    } else if (duration === 'weekly') {
      return `${count} week${count > 1 ? 's' : ''}`;
    } else {
      return `${count} month${count > 1 ? 's' : ''}`;
    }
  };
  
  return (
    <Button 
      variant={buttonVariant} 
      onClick={handlePayment} 
      disabled={isLoading || buttonDisabled}
      className={className}
      {...buttonProps}
    >
      {isLoading ? "Processing..." : buttonText}
    </Button>
  );
}
