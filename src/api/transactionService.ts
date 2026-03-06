import { supabase } from '@/integrations/supabase/client';

interface TransactionData {
  bookingId: string;
  bookingType: 'cabin' | 'hostel' | 'laundry' | 'mess';
  transactionType: 'booking' | 'renewal' | 'cancellation';
  amount: number;
  currency: string;
  additionalMonths?: number;
  newEndDate?: string;
  paymentMethod?: string;
  appliedCoupon?: any;
}

export const transactionService = {
  createTransaction: async (data: TransactionData) => {
    try {
      // Store transaction info directly on the booking
      const { data: booking, error } = await supabase
        .from('bookings')
        .update({
          total_price: data.amount,
          payment_status: 'pending',
        })
        .eq('id', data.bookingId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          data: {
            _id: booking.id,
            transactionId: booking.id,
          },
        },
      };
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      return { success: false, error: error.message };
    }
  },

  createTransactionByAdmin: async (data: TransactionData) => {
    return transactionService.createTransaction(data);
  },

  getTransaction: async (transactionId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', transactionId)
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  updateTransactionStatus: async (bookingId: string, status: string, paymentData?: any) => {
    try {
      const updateData: any = { payment_status: status };
      if (paymentData?.razorpay_order_id) updateData.razorpay_order_id = paymentData.razorpay_order_id;
      if (paymentData?.razorpay_payment_id) updateData.razorpay_payment_id = paymentData.razorpay_payment_id;
      if (paymentData?.razorpay_signature) updateData.razorpay_signature = paymentData.razorpay_signature;

      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating transaction status:', error);
      return { success: false, error: error.message };
    }
  },

  processRenewal: async (transactionId: string, paymentData: unknown) => {
    return transactionService.updateTransactionStatus(transactionId, 'completed', paymentData);
  },

  getUserTransactions: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  getBookingTransactions: async (bookingId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId);

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};
