import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React, { lazy, Suspense, useEffect } from "react";
import { hideSplashScreen } from "./utils/splashScreen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminForgotPassword = lazy(() => import("./pages/AdminForgotPassword"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminHostels = lazy(() => import("./pages/hotelManager/HostelManagement"));
const SeatManagement = lazy(() => import("./pages/SeatManagement"));
import PageNotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
const AdminLayout = lazy(() => import("./components/AdminLayout"));
const MobileAppLayout = lazy(() => import("./components/student/MobileAppLayout"));
import { AuthProvider } from "./contexts/AuthContext";
import HostelDetails from "./pages/HostelRoomDetails";
import HostelRooms from "./pages/HostelRooms";
import HostelRoomView from "./pages/HostelRoomView";
import BookSharedRoom from "./pages/BookSharedRoom";
import HostelBooking from "./pages/HostelBooking";
import LaundryAgentPage from "./pages/LaundryAgentPage";


const BookingReportsPage = lazy(() => import("./components/admin/reports/BookingReportsPage"));

const EmailJobManagement = lazy(() => import("./components/admin/email_reports/EmailJobManagement"));
const EmailTemplatesManagement = lazy(() => import("./components/admin/EmailTemplatesManagement"));
const AdminCoupons = lazy(() => import("./pages/AdminCoupons"));
const AdminSettingsNew = lazy(() => import("./pages/admin/AdminSettingsNew"));
const AdminBookings = lazy(() => import("./pages/AdminBookings"));
const StudentExcelImport = lazy(() => import("./components/admin/StudentExcelImport"));
const CreateStudentForm = lazy(() => import("./components/admin/CreateStudentForm"));
const VendorLogin = lazy(() => import("./pages/vendor/VendorLogin"));
const VendorRegister = lazy(() => import("./pages/vendor/VendorRegister"));
const VendorEmployees = lazy(() => import("./pages/vendor/VendorEmployees"));
const VendorPayouts = lazy(() => import("./components/vendor/VendorPayouts"));
const AdminPayouts = lazy(() => import("./pages/admin/AdminPayouts"));
const PartnerSettlements = lazy(() => import("./pages/admin/PartnerSettlements"));
const PartnerEarnings = lazy(() => import("./pages/partner/PartnerEarnings"));
const VendorApproval = lazy(() => import("./components/admin/VendorApproval"));

const DepositAndRestrictionManagement = lazy(() => import("./pages/admin/DepositAndRestrictionManagement"));
const LocationManagement = lazy(() => import("./components/admin/LocationManagement"));
const NotificationManagement = lazy(() => import("./components/admin/NotificationManagement"));
const AdminRooms = lazy(() => import("./pages/RoomManagement"));
const VendorProfilePage = lazy(() => import("./pages/vendor/VendorProfile"));
const AdminHostelBookings = lazy(() => import("./pages/hotelManager/AdminHostelBookings"));
const VendorAutoPayoutSettings = lazy(() => import("./components/admin/VendorAutoPayoutSettings"));
const VendorSeats = lazy(() => import("./pages/vendor/VendorSeats"));
const AdminBookingDetail = lazy(() => import("./pages/AdminBookingDetail"));
const AdminStudents = lazy(() => import("./pages/AdminStudents"));
const ReviewsManagement = lazy(() => import("./pages/admin/ReviewsManagement"));
const ErrorLogManagement = lazy(() => import("./components/admin/ErrorLogManagement"));
const BannerManagementPage = lazy(() => import("./pages/admin/BannerManagement"));
const ComplaintsManagement = lazy(() => import("./components/admin/ComplaintsManagement"));
const SupportTicketsManagement = lazy(() => import("./components/admin/SupportTicketsManagement"));
const DueManagement = lazy(() => import("./pages/admin/DueManagement"));
const Receipts = lazy(() => import("./pages/admin/Receipts"));
const HostelApprovals = lazy(() => import("./pages/admin/HostelApprovals"));
const PropertyApprovals = lazy(() => import("./pages/admin/PropertyApprovals"));
const HostelReceipts = lazy(() => import("./pages/admin/HostelReceipts"));
const HostelDeposits = lazy(() => import("./pages/admin/HostelDeposits"));
const HostelBedManagementPage = lazy(() => import("./pages/admin/HostelBedManagementPage"));
const HostelBedMap = lazy(() => import("./pages/admin/HostelBedMap"));
const HostelDueManagement = lazy(() => import("./pages/admin/HostelDueManagement"));
const OperationsHub = lazy(() => import("./pages/admin/OperationsHub"));
const ManageProperties = lazy(() => import("./pages/partner/ManageProperties"));
const PartnerReviews = lazy(() => import("./pages/partner/PartnerReviews"));
const SponsoredListings = lazy(() => import("./pages/admin/SponsoredListings"));
const MyPromotions = lazy(() => import("./pages/partner/MyPromotions"));
const BusinessPerformance = lazy(() => import("./pages/partner/BusinessPerformance"));
const SubscriptionPlans = lazy(() => import("./pages/admin/SubscriptionPlans"));
const MySubscriptions = lazy(() => import("./pages/partner/MySubscriptions"));
const AdminLaundry = lazy(() => import("./pages/admin/AdminLaundry"));
const StudentLaundryOrders = lazy(() => import("./pages/StudentLaundryOrders"));
const LaundryPartnerDashboard = lazy(() => import("./pages/LaundryPartnerDashboard"));
// Student / public pages
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const HomePage = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const Login = lazy(() => import("./pages/StudentLogin"));
const Register = lazy(() => import("./pages/StudentRegister"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const BookConfirmation = lazy(() => import("./pages/Confirmation"));
const HostelBookConfirmation = lazy(() => import("./pages/HostelConfirmation"));
const CabinDetails = lazy(() => import("./pages/Cabins"));
const Hostels = lazy(() => import("./pages/Hostels"));
const Booking = lazy(() => import("./pages/Booking"));
const BookSeat = lazy(() => import("./pages/BookSeat"));
const CabinSearch = lazy(() => import("./pages/CabinSearch"));
const StudentBookings = lazy(() => import("./pages/StudentBookings"));
const StudentBookingView = lazy(() => import("./pages/students/StudentBookingView"));
const BookingTransactions = lazy(() => import("./pages/students/BookingTransactions"));
const Profile = lazy(() => import("./pages/Profile"));
const Laundry = lazy(() => import("./pages/Laundry"));
const LaundryRequest = lazy(() => import("./pages/LaundryRequest"));
const ComplaintsPage = lazy(() => import("./components/profile/ComplaintsPage"));
const SupportPage = lazy(() => import("./components/profile/SupportPage"));

import ScrollToTop from "./components/ScrollToTop";
import { LazyWrapper } from './components/LazyWrapper';
import ErrorBoundary from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { useReferralCapture } from './hooks/useReferralCapture';

const StudentSuspense = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

const queryClient = new QueryClient();

const ReferralCaptureWrapper = () => { useReferralCapture(); return null; };

function App() {
  useEffect(() => {
    hideSplashScreen();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LazyWrapper>
        <Router>
          <ReferralCaptureWrapper />
          <ScrollToTop />
          <Routes>
            {/* ── Admin routes (kept separate, untouched) ── */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/forgot-password" element={<Suspense fallback={<div className="p-6 text-center">Loading...</div>}><AdminForgotPassword /></Suspense>} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin" redirectPath="/admin/login">
                  <Suspense fallback={<div className="p-6 text-center">Loading admin panel...</div>}>
                    <AdminLayout />
                  </Suspense>
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="bookings/:bookingId/:type" element={<AdminBookingDetail />} />
              
              <Route path="hostel-bookings" element={<AdminHostelBookings />} />
              <Route path="rooms" element={<AdminRooms />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="students-create" element={<CreateStudentForm />} />
              <Route path="students-import" element={<StudentExcelImport />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="settings" element={<AdminSettingsNew />} />
              <Route path="cabins/:cabinId/seats" element={<SeatManagement />} />
              <Route path="rooms/:cabinId/seats" element={<SeatManagement />} />
              <Route path="hostels" element={<AdminHostels />} />
              <Route path="employees" element={<VendorEmployees />} />
              <Route path="payouts" element={<AdminPayouts />} />
              <Route path="settlements" element={<PartnerSettlements />} />
              <Route path="vendorpayouts" element={<VendorPayouts />} />
              <Route path="vendors" element={<VendorApproval />} />
              <Route path="deposits-restrictions" element={<DepositAndRestrictionManagement />} />
              <Route path="locations" element={<LocationManagement />} />
              <Route path="vendor-auto-payout" element={<VendorAutoPayoutSettings />} />
              <Route path="seats-available-map" element={<VendorSeats />} />
              <Route path="hostels/:hostelId/rooms" element={<HostelRoomView />} />
              
              <Route path="reports" element={<BookingReportsPage />} />
              <Route path="email-reports" element={<EmailJobManagement />} />
              <Route path="email-templates" element={<EmailTemplatesManagement />} />
              <Route path="notifications" element={<NotificationManagement />} />
              <Route path="reviews" element={<ReviewsManagement />} />
              <Route path="error-logs" element={<ErrorLogManagement />} />
              <Route path="profile" element={<VendorProfilePage />} />
              <Route path="banners" element={<BannerManagementPage />} />
              <Route path="complaints" element={<ComplaintsManagement />} />
              <Route path="support-tickets" element={<SupportTicketsManagement />} />
              <Route path="due-management" element={<DueManagement />} />
              <Route path="receipts" element={<Receipts />} />
              <Route path="hostel-approvals" element={<PropertyApprovals />} />
              <Route path="property-approvals" element={<PropertyApprovals />} />
              <Route path="hostel-receipts" element={<HostelReceipts />} />
              <Route path="hostel-deposits" element={<HostelDeposits />} />
              <Route path="hostels/:hostelId/beds" element={<HostelBedManagementPage />} />
              <Route path="hostel-bed-map" element={<HostelBedMap />} />
              <Route path="hostel-due-management" element={<HostelDueManagement />} />
              <Route path="operations" element={<OperationsHub />} />
              <Route path="sponsored-listings" element={<SponsoredListings />} />
              <Route path="business-performance" element={<BusinessPerformance />} />
              <Route path="subscription-plans" element={<SubscriptionPlans />} />
              <Route path="laundry" element={<AdminLaundry />} />
            </Route>

            {/* ── Partner routes (alias for vendor/host admin panel) ── */}
            <Route
              path="/partner"
              element={
                <ProtectedRoute requiredRole="admin" redirectPath="/partner/login">
                  <Suspense fallback={<div className="p-6 text-center">Loading partner panel...</div>}>
                    <AdminLayout />
                  </Suspense>
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="bookings/:bookingId/:type" element={<AdminBookingDetail />} />
              <Route path="hostel-bookings" element={<AdminHostelBookings />} />
              <Route path="rooms" element={<AdminRooms />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="students-create" element={<CreateStudentForm />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="hostels" element={<AdminHostels />} />
              <Route path="employees" element={<VendorEmployees />} />
              <Route path="vendorpayouts" element={<VendorPayouts />} />
              <Route path="earnings" element={<PartnerEarnings />} />
              <Route path="deposits-restrictions" element={<DepositAndRestrictionManagement />} />
              <Route path="seats-available-map" element={<VendorSeats />} />
              <Route path="hostels/:hostelId/rooms" element={<HostelRoomView />} />
              <Route path="reports" element={<BookingReportsPage />} />
              <Route path="reviews" element={<PartnerReviews />} />
              <Route path="profile" element={<VendorProfilePage />} />
              <Route path="complaints" element={<ComplaintsManagement />} />
              <Route path="due-management" element={<DueManagement />} />
              <Route path="receipts" element={<Receipts />} />
              <Route path="hostel-receipts" element={<HostelReceipts />} />
              <Route path="hostel-deposits" element={<HostelDeposits />} />
              <Route path="hostel-bed-map" element={<HostelBedMap />} />
              <Route path="hostel-due-management" element={<HostelDueManagement />} />
              <Route path="operations" element={<OperationsHub />} />
              <Route path="manage-properties" element={<ManageProperties />} />
              <Route path="cabins/:cabinId/seats" element={<SeatManagement />} />
              <Route path="rooms/:cabinId/seats" element={<SeatManagement />} />
              <Route path="hostels/:hostelId/beds" element={<HostelBedManagementPage />} />
              <Route path="promotions" element={<MyPromotions />} />
              <Route path="business-performance" element={<BusinessPerformance />} />
              <Route path="my-subscriptions" element={<MySubscriptions />} />
              <Route path="laundry" element={<AdminLaundry />} />
            </Route>

            {/* ── Partner routes (formerly vendor/host) ── */}
            <Route path="/partner/login" element={<VendorLogin />} />
            <Route path="/partner/register" element={<VendorRegister />} />
            <Route path="/vendor/login" element={<VendorLogin />} />
            <Route path="/vendor/register" element={<VendorRegister />} />
            <Route path="/host/login" element={<VendorLogin />} />
            <Route path="/host/register" element={<VendorRegister />} />

            {/* ── Laundry agent ── */}
            <Route
              path="/laundry-agent"
              element={
                <ProtectedRoute requiredRole="admin">
                  <LaundryAgentPage />
                </ProtectedRoute>
              }
            />

            {/* ── Mobile App Layout — all student/public pages ── */}
            <Route
              element={
                <Suspense fallback={<div className="min-h-screen bg-background" />}>
                  <MobileAppLayout />
                </Suspense>
              }
            >
              {/* Public pages */}
              <Route path="/" element={<StudentSuspense><HomePage /></StudentSuspense>} />
              <Route path="/about" element={<StudentSuspense><About /></StudentSuspense>} />
              <Route path="/cabins" element={<StudentSuspense><CabinSearch /></StudentSuspense>} />
              <Route path="/cabin/:id" element={<StudentSuspense><CabinDetails /></StudentSuspense>} />
              <Route path="/hostels" element={<StudentSuspense><Hostels /></StudentSuspense>} />
              <Route path="/hostels/:roomId" element={<HostelDetails />} />
              <Route path="/hostels/:id/rooms" element={<HostelRooms />} />
              <Route path="/book-shared-room/:roomId" element={<BookSharedRoom />} />
              <Route path="/hostel-booking/:hostelId/:roomId" element={<HostelBooking />} />
              <Route path="/booking-confirmation/:bookingId" element={<StudentSuspense><HostelBookConfirmation /></StudentSuspense>} />
              <Route path="/laundry" element={<StudentSuspense><Laundry /></StudentSuspense>} />
              <Route path="/laundry-request" element={<StudentSuspense><Laundry /></StudentSuspense>} />
              <Route path="/privacy-policy" element={<StudentSuspense><PrivacyPolicy /></StudentSuspense>} />
              <Route path="/terms" element={<StudentSuspense><TermsAndConditions /></StudentSuspense>} />
              <Route path="/booking/:cabinId" element={<StudentSuspense><Booking /></StudentSuspense>} />
              <Route path="/book-seat/:cabinId" element={<StudentSuspense><BookSeat /></StudentSuspense>} />
              <Route path="/book-confirmation/:bookingId" element={<StudentSuspense><BookConfirmation /></StudentSuspense>} />

              {/* Auth pages */}
              <Route path="/login" element={<StudentSuspense><Login /></StudentSuspense>} />

              {/* Student nested routes */}
              <Route path="/student/login" element={<StudentSuspense><Login /></StudentSuspense>} />
              <Route path="/student/register" element={<StudentSuspense><Register /></StudentSuspense>} />
              <Route path="/student/forgot-password" element={<StudentSuspense><ForgotPassword /></StudentSuspense>} />
              <Route path="/student/reset-password/:token" element={<StudentSuspense><ResetPassword /></StudentSuspense>} />
              <Route path="/reset-password" element={<StudentSuspense><ResetPassword /></StudentSuspense>} />
              <Route
                path="/student/dashboard"
                element={<ProtectedRoute><StudentSuspense><StudentBookings /></StudentSuspense></ProtectedRoute>}
              />
              <Route
                path="/student/profile"
                element={<ProtectedRoute><StudentSuspense><Profile /></StudentSuspense></ProtectedRoute>}
              />
              <Route
                path="/student/bookings"
                element={<ProtectedRoute><StudentSuspense><StudentBookings /></StudentSuspense></ProtectedRoute>}
              />
              <Route
                path="/student/bookings/:bookingId/transactions/:bookingType"
                element={<ProtectedRoute><StudentSuspense><BookingTransactions /></StudentSuspense></ProtectedRoute>}
              />
              <Route
                path="/student/bookings/:bookingId"
                element={<ProtectedRoute><StudentSuspense><StudentBookingView /></StudentSuspense></ProtectedRoute>}
              />
              <Route
                path="/student/complaints"
                element={<ProtectedRoute><StudentSuspense><ComplaintsPage /></StudentSuspense></ProtectedRoute>}
              />
              <Route
                path="/student/laundry-orders"
                element={<ProtectedRoute><StudentSuspense><StudentLaundryOrders /></StudentSuspense></ProtectedRoute>}
              />
              <Route
                path="/student/support"
                element={<ProtectedRoute><StudentSuspense><SupportPage /></StudentSuspense></ProtectedRoute>}
              />
            </Route>

            {/* ── Laundry Partner Dashboard ── */}
            <Route
              path="/laundry-partner/dashboard"
              element={<ProtectedRoute><StudentSuspense><LaundryPartnerDashboard /></StudentSuspense></ProtectedRoute>}
            />

            <Route path="*" element={<PageNotFound />} />
          </Routes>
          <Toaster />
        </Router>
      </LazyWrapper>
    </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
