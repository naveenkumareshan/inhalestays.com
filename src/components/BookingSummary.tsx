import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface BookingSummaryProps {
  cabin: any;
  selectedSeat: any;
  bookingDate: Date | null;
  endDate: Date | null;
  onBookingDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  totalPrice: number;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  cabin,
  selectedSeat,
  bookingDate,
  endDate,
  totalPrice,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Booking Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {cabin && <p><strong>Room:</strong> {cabin.name}</p>}
        {selectedSeat && <p><strong>Seat:</strong> #{selectedSeat.number}</p>}
        {bookingDate && <p><strong>Start:</strong> {format(bookingDate, 'dd MMM yyyy')}</p>}
        {endDate && <p><strong>End:</strong> {format(endDate, 'dd MMM yyyy')}</p>}
        <p className="text-base font-semibold mt-2">Total: ₹{totalPrice}</p>
      </CardContent>
    </Card>
  );
};
