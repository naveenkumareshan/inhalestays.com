import { supabase } from '@/integrations/supabase/client';

export interface RazorpayOrderParams {
  amount: number;
  currency: string;
  bookingId: string;
  bookingType: 'cabin' | 'hostel' | 'laundry' | 'mess';
  bookingDuration?: 'daily' | 'weekly' | 'monthly';
  durationCount?: number;
  notes?: Record<string, any>;
}

export interface RazorpayVerifyParams {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  bookingId: string;
  bookingType: string;
  bookingDuration?: 'daily' | 'weekly' | 'monthly';
  durationCount?: number;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const razorpayService = {
  createOrder: async (params: RazorpayOrderParams) => {
    try {
      const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
        body: params,
      });

      if (error) throw error;

      return {
        success: true,
        data: data,
      };
    } catch (error: any) {
      console.error('Razorpay create order error:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to create Razorpay order',
        },
      };
    }
  },

  verifyPayment: async (params: RazorpayVerifyParams) => {
    try {
      const { data, error } = await supabase.functions.invoke('razorpay-verify-payment', {
        body: params,
      });

      if (error) throw error;

      return {
        success: true,
        data: data,
      };
    } catch (error: any) {
      console.error('Razorpay verify payment error:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to verify payment',
        },
      };
    }
  },

  verifyTransactionPayment: async (params: RazorpayVerifyParams) => {
    return razorpayService.verifyPayment(params);
  },
};
