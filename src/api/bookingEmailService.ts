import { supabase } from '@/integrations/supabase/client';

interface ReceiptEmailPayload {
  to: string;
  studentName: string;
  serialNumber?: string;
  propertyName?: string;
  seatOrBedNumber?: string | number;
  startDate?: string;
  endDate?: string;
  duration?: string;
  amount: number;
  discountAmount?: number;
  totalAmount: number;
  paymentMethod?: string;
  transactionId?: string;
  collectedByName?: string;
  advancePaid?: number;
  remainingDue?: number;
  bookingType: 'reading_room' | 'hostel' | 'renewal' | 'due_collection';
  securityDeposit?: number;
  lockerPrice?: number;
}

const sendReceiptEmail = async (payload: ReceiptEmailPayload): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!payload.to || !payload.to.includes('@')) {
      console.log('No valid email for receipt, skipping:', payload.studentName);
      return { success: false, error: 'No valid email' };
    }

    const { data, error } = await supabase.functions.invoke('send-booking-receipt', {
      body: payload,
    });

    if (error) {
      console.error('Error sending receipt email:', error);
      return { success: false, error: error.message };
    }

    return data || { success: true };
  } catch (err: any) {
    console.error('Receipt email failed:', err);
    return { success: false, error: err.message };
  }
};

export const bookingEmailService = {
  sendReceiptEmail,

  // Reading room booking receipt
  sendReadingRoomReceipt: (params: {
    email: string;
    studentName: string;
    serialNumber: string;
    cabinName: string;
    seatNumber: number;
    startDate: string;
    endDate: string;
    duration: string;
    seatAmount: number;
    discountAmount: number;
    lockerPrice: number;
    totalAmount: number;
    paymentMethod: string;
    transactionId: string;
    collectedByName: string;
    advancePaid?: number;
    remainingDue?: number;
  }) => sendReceiptEmail({
    to: params.email,
    studentName: params.studentName,
    serialNumber: params.serialNumber,
    propertyName: params.cabinName,
    seatOrBedNumber: params.seatNumber,
    startDate: params.startDate,
    endDate: params.endDate,
    duration: params.duration,
    amount: params.seatAmount,
    discountAmount: params.discountAmount,
    lockerPrice: params.lockerPrice,
    totalAmount: params.totalAmount,
    paymentMethod: params.paymentMethod,
    transactionId: params.transactionId,
    collectedByName: params.collectedByName,
    advancePaid: params.advancePaid,
    remainingDue: params.remainingDue,
    bookingType: 'reading_room',
  }),

  // Hostel booking receipt
  sendHostelReceipt: (params: {
    email: string;
    studentName: string;
    serialNumber: string;
    hostelName: string;
    bedNumber: number;
    roomNumber: string;
    startDate: string;
    endDate: string;
    duration: string;
    bedAmount: number;
    discountAmount: number;
    securityDeposit: number;
    totalAmount: number;
    paymentMethod: string;
    transactionId: string;
    collectedByName: string;
    advancePaid?: number;
    remainingDue?: number;
  }) => sendReceiptEmail({
    to: params.email,
    studentName: params.studentName,
    serialNumber: params.serialNumber,
    propertyName: `${params.hostelName} - Room ${params.roomNumber}`,
    seatOrBedNumber: params.bedNumber,
    startDate: params.startDate,
    endDate: params.endDate,
    duration: params.duration,
    amount: params.bedAmount,
    discountAmount: params.discountAmount,
    securityDeposit: params.securityDeposit,
    totalAmount: params.totalAmount,
    paymentMethod: params.paymentMethod,
    transactionId: params.transactionId,
    collectedByName: params.collectedByName,
    advancePaid: params.advancePaid,
    remainingDue: params.remainingDue,
    bookingType: 'hostel',
  }),

  // Due collection receipt
  sendDueCollectionReceipt: (params: {
    email: string;
    studentName: string;
    propertyName: string;
    amount: number;
    paymentMethod: string;
    transactionId?: string;
    collectedByName: string;
  }) => sendReceiptEmail({
    to: params.email,
    studentName: params.studentName,
    propertyName: params.propertyName,
    amount: params.amount,
    totalAmount: params.amount,
    paymentMethod: params.paymentMethod,
    transactionId: params.transactionId,
    collectedByName: params.collectedByName,
    bookingType: 'due_collection',
  }),

  // Renewal receipt
  sendRenewalReceipt: (params: {
    email: string;
    studentName: string;
    serialNumber: string;
    cabinName: string;
    seatNumber: number;
    startDate: string;
    endDate: string;
    duration: string;
    seatAmount: number;
    discountAmount: number;
    totalAmount: number;
    paymentMethod: string;
    transactionId: string;
    collectedByName: string;
  }) => sendReceiptEmail({
    to: params.email,
    studentName: params.studentName,
    serialNumber: params.serialNumber,
    propertyName: params.cabinName,
    seatOrBedNumber: params.seatNumber,
    startDate: params.startDate,
    endDate: params.endDate,
    duration: params.duration,
    amount: params.seatAmount,
    discountAmount: params.discountAmount,
    totalAmount: params.totalAmount,
    paymentMethod: params.paymentMethod,
    transactionId: params.transactionId,
    collectedByName: params.collectedByName,
    bookingType: 'renewal',
  }),
};
