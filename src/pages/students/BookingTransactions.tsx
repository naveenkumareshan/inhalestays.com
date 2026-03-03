
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookingTransactionView } from '@/components/booking/BookingTransactionView';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const BookingTransactions = () => {
  const { bookingId, bookingType } = useParams<{ 
    bookingId: string; 
    bookingType: 'cabin' | 'hostel' 
  }>();
  const navigate = useNavigate();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolve = async () => {
      if (!bookingId || !bookingType) { setLoading(false); return; }
      const table = bookingType === 'hostel' ? 'hostel_bookings' : 'bookings';
      // Try serial_number first
      const { data } = await supabase.from(table).select('id').eq('serial_number', bookingId).maybeSingle();
      setResolvedId(data?.id || bookingId);
      setLoading(false);
    };
    resolve();
  }, [bookingId, bookingType]);

  if (!bookingId || !bookingType) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Invalid Booking</h1>
            <p className="text-muted-foreground mb-4">
              The booking information is missing or invalid.
            </p>
            <Button onClick={() => navigate('/student/bookings')}>
              Go to Bookings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Transaction History</h1>
            <p className="text-muted-foreground">
              View payment history and validity information for this booking
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/student/bookings')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Bookings
          </Button>
        </div>

        <BookingTransactionView 
          bookingId={resolvedId || bookingId} 
          bookingType={bookingType}
          booking={null}
        />
      </div>
    </div>
  );
};

export default BookingTransactions;
