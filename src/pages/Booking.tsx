import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SeatMap } from '../components/SeatMap';
import { CabinDetails } from '../components/CabinDetails';
import { BookingSummary } from '../components/BookingSummary';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Seat } from '../components/SeatMap';
import { toast } from '@/hooks/use-toast';
import { cabinsService } from '@/api/cabinsService';
import { PaymentTimer } from '@/components/booking/PaymentTimer';
import { bookingsService } from '@/api/bookingsService';

interface BookingParams {
  cabinId: string;
  [key: string]: string; // Add index signature to satisfy Record<string, string>
}

interface PaymentInfo {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  nameOnCard: string;
}

const Booking = () => {
  const { cabinId } = useParams<BookingParams>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [cabin, setCabin] = useState<any | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: ''
  });
  const [bookingCreated, setBookingCreated] = useState(false);
  const [bookingCreatedAt, setBookingCreatedAt] = useState<string | null>(null);
  
  useEffect(() => {
    if (cabinId) {
      fetchCabinDetails()
    }
  }, [cabinId]);

  const fetchCabinDetails = async () => {
      try {        
        const response = await cabinsService.getCabinById(cabinId);
        
        if (response.success && response.data) {
          console.log("Cabin data received:", response.data);
          
          const d = response.data;
          setCabin({
            _id: d.id,
            id: d.id,
            name: d.name,
            description: d.description || '',
            price: d.price || 0,
            amenities: d.amenities || [],
            capacity: d.capacity || 1,
            category: d.category || 'standard',
            imageSrc: d.image_url || 'https://images.unsplash.com/photo-1626948683838-3be9a4e90737?q=80&w=1470&auto=format&fit=crop'
          });
        } else {
          console.error("Error in cabin response:", response);
          toast({
            title: "Error",
            description: "Failed to load cabin details",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error fetching cabin details:", error);
      }
    };
  
  useEffect(() => {
    if (cabin && selectedSeat) {
      setTotalPrice(cabin.price);
    }
  }, [selectedSeat, cabin]);
  
  const handleSeatSelect = (seat: Seat) => {
    setSelectedSeat(seat);
  };
  
  const handleBookingDateChange = (date: Date) => {
    setBookingDate(date);
  };
  
  const handleEndDateChange = (date: Date) => {
    setEndDate(date);
  };
  
  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleConfirmBooking = async () => {
    if (!isAuthenticated) {
      const loginPath = `/student/login?from=${encodeURIComponent(
        location.pathname
      )}`;
      navigate(loginPath);
      return;
    }
    
    if (!selectedSeat || !cabin || !bookingDate || !endDate) {
      toast({
        title: "Missing Information",
        description: "Please select a seat and booking dates.",
        variant: "destructive"
      });
      return;
    }
    
    // Create the booking first
    try {
      const bookingData = {
        cabin_id: cabin.id.toString(),
        seat_number: selectedSeat.number,
        start_date: format(bookingDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        total_price: totalPrice,
        payment_status: 'pending',
        booking_duration: 'monthly',
        duration_count: '1',
      };
      
      const response = await bookingsService.createBooking(bookingData);
      
      if (response.success) {
        setBookingCreated(true);
        setBookingCreatedAt(new Date().toISOString());
        toast({
          title: "Booking Created",
          description: "Please complete payment within 5 minutes to confirm your booking.",
          variant: "default"
        });
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking",
        variant: "destructive"
      });
    }
  };

  const handleBookingExpiry = () => {
    setBookingCreated(false);
    setBookingCreatedAt(null);
    toast({
      title: "Booking Expired",
      description: "Your booking has expired. Please try again.",
      variant: "destructive"
    });
  };
  
  const handlePayment = () => {
    // Validate payment info
    if (!paymentInfo.cardNumber || !paymentInfo.expiryDate || !paymentInfo.cvv || !paymentInfo.nameOnCard) {
      toast({
        title: "Missing Payment Information",
        description: "Please fill in all payment fields.",
        variant: "destructive"
      });
      return;
    }
    
    setProcessingPayment(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessingPayment(false);
      
      // Format dates to string
      const formattedBookingDate = format(bookingDate!, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate!, 'yyyy-MM-dd');
      
      // Store booking details in local storage
      localStorage.setItem('bookingDetails', JSON.stringify({
        cabinId: cabin.id,
        cabinName: cabin.name,
        seatNumber: selectedSeat!.number,
        bookingDate: formattedBookingDate,
        endDate: formattedEndDate,
        totalPrice: totalPrice,
        userName: user?.name || 'Guest',
        userEmail: user?.email || '',
        paymentMethod: "Credit Card",
        paymentStatus: "completed",
        lastFourDigits: paymentInfo.cardNumber.slice(-4)
      }));
      
      // Close modal and navigate to confirmation
      setPaymentModalOpen(false);
      navigate('/confirmation');
    }, 2000);
  };
  
  if (!cabin) {
    return (
      <div className="bg-accent/30">
        <Card className="container mx-auto px-4 py-12">
          <CardContent className="text-center">
            <p className="text-lg text-cabin-dark/70">Loading cabin details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="bg-accent/30">
      
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <h1 className="text-xl sm:text-3xl font-serif font-bold text-cabin-dark mb-4 sm:mb-8 text-center">
          Book Your Reading Room
        </h1>

        {/* Booking Timer - Show when booking is created but payment pending */}
        {bookingCreated && bookingCreatedAt && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <PaymentTimer 
                createdAt={bookingCreatedAt}
                onExpiry={handleBookingExpiry}
                variant="full"
              />
              <p className="text-sm text-amber-700 mt-2">
                Your seat is temporarily reserved. Complete payment to confirm your booking.
              </p>
            </CardContent>
          </Card>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div>
            <CabinDetails cabin={cabin} />
            
            <Card className="mt-8">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-cabin-dark">Select a Seat</h3>
                <SeatMap
                  cabinId={cabinId}
                  onSeatSelect={handleSeatSelect}
                  selectedSeat={selectedSeat}
                  startDate={bookingDate ? format(bookingDate, 'yyyy-MM-dd') : undefined}
                  endDate={endDate ? format(endDate, 'yyyy-MM-dd') : undefined}
                />
              </CardContent>
            </Card>
          </div>
          
          <div>
            <BookingSummary
              cabin={cabin}
              selectedSeat={selectedSeat}
              bookingDate={bookingDate}
              endDate={endDate}
              onBookingDateChange={handleBookingDateChange}
              onEndDateChange={handleEndDateChange}
              totalPrice={totalPrice}
            />
            
            <Button
              className="w-full mt-6 bg-cabin-wood hover:bg-cabin-dark text-white"
              onClick={handleConfirmBooking}
              disabled={!selectedSeat || !bookingDate || !endDate}
            >
              Confirm Booking
            </Button>
          </div>
        </div>
      </div>
      
      {/* Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-serif font-bold text-cabin-dark mb-4">
              Payment Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cabin-dark mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  name="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  className="w-full p-2 border rounded"
                  value={paymentInfo.cardNumber}
                  onChange={handlePaymentChange}
                  maxLength={16}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cabin-dark mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    name="expiryDate"
                    placeholder="MM/YY"
                    className="w-full p-2 border rounded"
                    value={paymentInfo.expiryDate}
                    onChange={handlePaymentChange}
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cabin-dark mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    name="cvv"
                    placeholder="123"
                    className="w-full p-2 border rounded"
                    value={paymentInfo.cvv}
                    onChange={handlePaymentChange}
                    maxLength={3}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-cabin-dark mb-1">
                  Name on Card
                </label>
                <input
                  type="text"
                  name="nameOnCard"
                  placeholder="John Doe"
                  className="w-full p-2 border rounded"
                  value={paymentInfo.nameOnCard}
                  onChange={handlePaymentChange}
                />
              </div>
              
              <div className="pt-4 flex gap-4">
                <Button
                  className="flex-1 bg-cabin-dark hover:bg-black text-white"
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={processingPayment}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-cabin-wood hover:bg-cabin-dark text-white"
                  onClick={handlePayment}
                  disabled={processingPayment}
                >
                  {processingPayment ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    `Pay ₹${totalPrice}`
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default Booking;
