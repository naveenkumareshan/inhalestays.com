import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { bookingsService } from "@/api/bookingsService";

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
      // Try to get booking details from localStorage if not in location state
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
      console.error("Error fetching cabin details:", error);
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

  const getEndDate = (
    startDate: string | undefined,
    months: number | undefined
  ) => {
    if (!startDate || !months) return "Not specified";

    const date = new Date(startDate);
    date.setMonth(date.getMonth() + months);
    return formatDate(date.toISOString());
  };

  return (
    <div className="bg-accent/30">

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div
            className={`p-6 text-white text-center ${
              booking?.paymentStatus === "completed"
                ? "bg-green-600"
                : "bg-amber-500"
            }`}
          >
            {booking?.paymentStatus === "completed" ? (
              <>
                <svg
                  className="w-16 h-16 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <h1 className="text-3xl font-serif font-bold">
                  Booking  Confirmed!
                </h1>
                <p className="mt-2">
                  Your reading room has been successfully reserved.
                </p>
              </>
            ) : (
              <>
                <svg
                  className="w-16 h-16 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <h1 className="text-3xl font-serif font-bold">
                  Subscription Pending
                </h1>
                <p className="mt-2">
                  Your payment was not completed. Please try again later.
                </p>
              </>
            )}
          </div>

          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-serif font-semibold mb-4 text-cabin-dark">
                Booking Details
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-cabin-light/20 p-4 rounded-md">
                  <p className="text-sm text-cabin-dark/60 mb-1">Reading Room</p>
                  <p className="font-medium text-cabin-dark">{booking?.cabinId?.name || 'Not specified'}</p>
                </div>
                <div className="bg-cabin-light/20 p-4 rounded-md">
                  <p className="text-sm text-cabin-dark/60 mb-1">Room Code</p>
                  <p className="font-medium text-cabin-dark">{booking?.cabinId.cabinCode}</p>
                </div>
                <div className="bg-cabin-light/20 p-4 rounded-md">
                  <p className="text-sm text-cabin-dark/60 mb-1">Booking Id</p>
                  <p className="font-medium text-cabin-dark">{booking?.bookingId}</p>
                </div>
                <div className="bg-cabin-light/20 p-4 rounded-md">
                  <p className="text-sm text-cabin-dark/60 mb-1">Seat Number</p>
                  <p className="font-medium text-cabin-dark">
                    {booking?.seatId ? `#${booking?.seatId.number}` : "Not specified"}
                  </p>
                </div>

                <div className="bg-cabin-light/20 p-4 rounded-md">
                  <p className="text-sm text-cabin-dark/60 mb-1">
                    Subscription Plan
                  </p>
                  <p className="font-medium text-cabin-dark">
                    {booking ? booking.bookingDuration : "Monthly"}
                  </p>
                </div>

                <div className="bg-cabin-light/20 p-4 rounded-md">
                  <p className="text-sm text-cabin-dark/60 mb-1">Duration</p>
                  <p className="font-medium text-cabin-dark">
                    {booking?.duration_count || booking?.durationCount || 1}{" "}
                    {(() => {
                      const dur = booking?.booking_duration || booking?.bookingDuration || 'monthly';
                      const count = Number(booking?.duration_count || booking?.durationCount || 1);
                      if (dur === 'daily') return count === 1 ? 'day' : 'days';
                      if (dur === 'weekly') return count === 1 ? 'week' : 'weeks';
                      return count === 1 ? 'month' : 'months';
                    })()}
                  </p>
                </div>

                <div className="bg-cabin-light/20 p-4 rounded-md">
                  <p className="text-sm text-cabin-dark/60 mb-1">Start Date</p>
                  <p className="font-medium text-cabin-dark">
                    {formatDate(
                      booking?.startDate || booking?.createdAt || ""
                    )}
                  </p>
                </div>

                <div className="bg-cabin-light/20 p-4 rounded-md">
                  <p className="text-sm text-cabin-dark/60 mb-1">End Date</p>
                  <p className="font-medium text-cabin-dark">
                    {booking?.endDate
                      ? formatDate(booking.endDate)
                      : getEndDate(
                          booking?.date || booking?.startDate,
                          booking?.months || booking?.durationCount || 1
                        )}
                  </p>
                </div>

                <div
                  className={`p-4 rounded-md ${
                    booking?.paymentStatus === "completed"
                      ? "bg-green-100"
                      : booking?.paymentStatus === "failed"
                      ? "bg-red-100"
                      : "bg-yellow-100"
                  }`}
                >
                  <p className="text-sm text-cabin-dark/60 mb-1">
                    Payment Status
                  </p>
                  <p className="font-medium text-cabin-dark">
                    {(booking?.paymentStatus &&
                      booking.paymentStatus.charAt(0).toUpperCase() +
                        booking.paymentStatus.slice(1)) ||
                      "Pending"}
                  </p>
                </div>

                {(booking?.paymentMethod || booking?.paymentMethod) && (
                  <div className="bg-cabin-light/20 p-4 rounded-md">
                    <p className="text-sm text-cabin-dark/60 mb-1">
                      Payment Method
                    </p>
                    <p className="font-medium text-cabin-dark">
                      {booking?.paymentMethod || booking?.paymentMethod}
                      {booking?.lastFourDigits &&
                        ` (**** **** **** ${booking.lastFourDigits})`}
                    </p>
                  </div>
                )}

                {(booking?.keyDeposit || booking?.keyDeposit) && (
                  <div className="bg-cabin-light/20 p-4 rounded-md">
                    <p className="text-sm text-cabin-dark/60 mb-1">
                      Key Deposit
                    </p>
                    <p className="font-medium text-cabin-dark">
                      {booking?.keyDeposit || booking?.keyDeposit}
                    </p>
                  </div>
                )}
                {(booking?.seatPrice || booking?.seatPrice) && (
                  <div className="bg-cabin-light/20 p-4 rounded-md">
                    <p className="text-sm text-cabin-dark/60 mb-1">
                      Seat Price
                    </p>
                    <p className="font-medium text-cabin-dark">
                      {booking?.seatPrice || booking?.seatPrice}
                    </p>
                  </div>
                )}
                {(booking?.totalPrice || booking?.totalPrice) && (
                  <div className="bg-cabin-light/20 p-4 rounded-md">
                    <p className="text-sm text-cabin-dark/60 mb-1">
                      Total Amount
                    </p>
                    <p className="font-medium text-cabin-dark">
                      {booking?.totalPrice || booking?.totalPrice}
                    </p>
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
