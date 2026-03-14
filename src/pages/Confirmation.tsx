import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { bookingsService } from "@/api/bookingsService";
import { getMethodLabel } from "@/utils/paymentMethodLabels";

const Confirmation = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      if (bookingId) {
        const response = await bookingsService.getBookingById(bookingId);
        if (response.success && response.data) {
          setBooking(response.data);
        } else {
          toast({
            title: "Error",
            description: "Failed to load booking details",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching booking details:", error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not specified";
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const paymentStatus = booking?.payment_status;
  const isCompleted = paymentStatus === "completed" || paymentStatus === "advance_paid";

  const getDurationLabel = () => {
    const dur = booking?.booking_duration || 'monthly';
    const count = Number(booking?.duration_count || 1);
    if (dur === 'daily') return count === 1 ? '1 day' : `${count} days`;
    if (dur === 'weekly') return count === 1 ? '1 week' : `${count} weeks`;
    return count === 1 ? '1 month' : `${count} months`;
  };

  return (
    <div className="bg-accent/30">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div
            className={`p-6 text-white text-center ${
              isCompleted ? "bg-green-600" : "bg-amber-500"
            }`}
          >
            {isCompleted ? (
              <>
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h1 className="text-3xl font-serif font-bold">Booking Confirmed!</h1>
                <p className="mt-2">Your reading room has been successfully reserved.</p>
              </>
            ) : (
              <>
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h1 className="text-3xl font-serif font-bold">Subscription Pending</h1>
                <p className="mt-2">Your payment was not completed. Please try again later.</p>
              </>
            )}
          </div>

          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-serif font-semibold mb-4 text-cabin-dark">Booking Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-cabin-light/20 p-4 rounded-md">
                  <p className="text-sm text-cabin-dark/60 mb-1">Reading Room</p>
                  <p className="font-medium text-cabin-dark">{booking?.cabins?.name || 'Not specified'}</p>
                </div>
                <div className="bg-cabin-light/20 p-4 rounded-md">
                  <p className="text-sm text-cabin-dark/60 mb-1">Booking ID</p>
                  <p className="font-medium text-cabin-dark">{booking?.serial_number || booking?.id || 'N/A'}</p>
                </div>
                <div className="bg-cabin-light/20 p-4 rounded-md">
                  <p className="text-sm text-cabin-dark/60 mb-1">Seat Number</p>
                  <p className="font-medium text-cabin-dark">
                    {booking?.seats?.number ? `#${booking.seats.number}` : (booking?.seat_number ? `#${booking.seat_number}` : "Not specified")}
                  </p>
                </div>
                <div className="bg-cabin-light/20 p-4 rounded-md">
                  <p className="text-sm text-cabin-dark/60 mb-1">Subscription Plan</p>
                  <p className="font-medium text-cabin-dark capitalize">
                    {booking?.booking_duration || "Monthly"}
                  </p>
                </div>
                <div className="bg-cabin-light/20 p-4 rounded-md">
                  <p className="text-sm text-cabin-dark/60 mb-1">Duration</p>
                  <p className="font-medium text-cabin-dark">{getDurationLabel()}</p>
                </div>
                <div className="bg-cabin-light/20 p-4 rounded-md">
                  <p className="text-sm text-cabin-dark/60 mb-1">Start Date</p>
                  <p className="font-medium text-cabin-dark">
                    {formatDate(booking?.start_date || booking?.created_at || "")}
                  </p>
                </div>
                <div className="bg-cabin-light/20 p-4 rounded-md">
                  <p className="text-sm text-cabin-dark/60 mb-1">End Date</p>
                  <p className="font-medium text-cabin-dark">
                    {booking?.end_date ? formatDate(booking.end_date) : "Not specified"}
                  </p>
                </div>
                <div className={`p-4 rounded-md ${isCompleted ? "bg-green-100" : paymentStatus === "failed" ? "bg-red-100" : "bg-yellow-100"}`}>
                  <p className="text-sm text-cabin-dark/60 mb-1">Payment Status</p>
                  <p className="font-medium text-cabin-dark capitalize">
                    {paymentStatus?.replace('_', ' ') || "Pending"}
                  </p>
                </div>
                {booking?.payment_method && (
                  <div className="bg-cabin-light/20 p-4 rounded-md">
                    <p className="text-sm text-cabin-dark/60 mb-1">Payment Method</p>
                    <p className="font-medium text-cabin-dark capitalize">{getMethodLabel(booking.payment_method)}</p>
                  </div>
                )}
                {booking?.locker_included && (
                  <div className="bg-cabin-light/20 p-4 rounded-md">
                    <p className="text-sm text-cabin-dark/60 mb-1">Locker Deposit</p>
                    <p className="font-medium text-cabin-dark">₹{booking.locker_price || 0}</p>
                  </div>
                )}
                {booking?.total_price != null && (
                  <div className="bg-cabin-light/20 p-4 rounded-md">
                    <p className="text-sm text-cabin-dark/60 mb-1">Total Amount</p>
                    <p className="font-medium text-cabin-dark">₹{booking.total_price}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Link
                to="/"
                className="bg-cabin-wood text-white px-6 py-3 rounded-md font-medium hover:bg-cabin-dark transition-colors text-center"
              >
                Back to Home
              </Link>
              <Link
                to="/student/dashboard"
                className="bg-cabin-dark text-white px-6 py-3 rounded-md font-medium hover:bg-black transition-colors text-center"
              >
                Go to Dashboard
              </Link>
              <button
                onClick={() => window.print()}
                className="bg-white border border-cabin-wood text-cabin-dark px-6 py-3 rounded-md font-medium hover:bg-cabin-light transition-colors"
              >
                Print Confirmation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;
