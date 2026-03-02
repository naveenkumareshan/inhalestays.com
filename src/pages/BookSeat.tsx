import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cabinsService } from "@/api/cabinsService";
import { ArrowLeft, Users, IndianRupee, Layers, Armchair, Lock, Star, CheckCircle2, Clock, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { CabinImageSlider } from "@/components/CabinImageSlider";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ShareButton } from "@/components/ShareButton";
import { generateCabinShareText } from "@/utils/shareUtils";
import { useAuth } from "@/hooks/use-auth";

const SeatBookingForm = lazy(() =>
  import("@/components/seats/SeatBookingForm").then((m) => ({
    default: m.SeatBookingForm,
  }))
);

export interface Seat {
  _id: string;
  id: string;
  number: number;
  cabinId: string;
  price: number;
  category?: string;
  position: { x: number; y: number };
  isAvailable: boolean;
  unavailableUntil?: string;
}

export interface Cabin {
  id: string;
  _id: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  amenities: string[];
  images: string[];
  imageUrl: string;
  imageSrc: string;
  category: "standard" | "premium" | "luxury";
  isActive?: boolean;
  isBookingActive?: boolean;
  serialNumber?: string;
  averageRating?: number;
  reviewCount?: number;
  floors?: { id: string; number: number }[];
  lockerPrice?: number;
  lockerMandatory?: boolean;
  advanceBookingEnabled?: boolean;
  advancePercentage?: number;
  advanceFlatAmount?: number | null;
  advanceUseFlat?: boolean;
  advanceValidityDays?: number;
  advanceAutoCancel?: boolean;
  openingTime?: string;
  closingTime?: string;
  workingDays?: string[];
  is24Hours?: boolean;
  slotsEnabled?: boolean;
  fullAddress?: string;
}

export interface RoomElement {
  id: string;
  type: string;
  position: { x: number; y: number };
}

const BookSeatSkeleton = () => (
  <div className="min-h-screen bg-background pb-24">
    <Skeleton className="w-full aspect-[16/9]" />
    <div className="px-3 pt-3 space-y-2">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <div className="px-3 pt-3 flex gap-2">
      <Skeleton className="h-8 w-24 rounded-full" />
      <Skeleton className="h-8 w-20 rounded-full" />
    </div>
    <div className="px-3 pt-4">
      <Skeleton className="h-[300px] w-full rounded-xl" />
    </div>
  </div>
);

const BookSeat = () => {
  const { cabinId } = useParams<{ cabinId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const bookingFormRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const [cabin, setCabin] = useState<Cabin | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomElements, setRoomElements] = useState<RoomElement[]>([]);
  const [hideSeats, setHideSeats] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  
  const [layoutImage, setLayoutImage] = useState<string | null>(null);
  const [roomWidth, setRoomWidth] = useState(800);
  const [roomHeight, setRoomHeight] = useState(600);

  useEffect(() => {
    if (cabinId) fetchCabinDetails();
  }, [cabinId]);

  // Collapse details when seat is selected
  useEffect(() => {
    if (selectedSeat) {
      setShowDetails(false);
    }
  }, [selectedSeat]);

  // IntersectionObserver: show details again when hero scrolls into view
  useEffect(() => {
    if (!heroRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !showDetails) {
          setShowDetails(true);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [showDetails]);

  const isUUID = (s: string) => /^[0-9a-f]{8}-/.test(s);

  const fetchCabinDetails = async () => {
    try {
      setLoading(true);
      if (!cabinId) { setError("Invalid cabin ID"); return; }

      const response = isUUID(cabinId)
        ? await cabinsService.getCabinById(cabinId)
        : await cabinsService.getCabinBySerialNumber(cabinId);
      if (response.success && response.data) {
        const d = response.data;
        setCabin({
          _id: d.id,
          id: d.id,
          name: d.name,
          description: d.description || '',
          price: d.price || 0,
          amenities: d.amenities || [],
          capacity: d.capacity || 1,
          images: d.images?.length ? d.images : (d.image_url ? [d.image_url] : []),
          imageSrc: d.image_url || '',
          floors: Array.isArray(d.floors) ? (d.floors as any[]) : [],
          lockerPrice: (d as any).locker_available ? ((d as any).locker_price || 0) : 0,
          lockerMandatory: (d as any).locker_mandatory ?? true,
          isBookingActive: (d as any).is_booking_active !== false,
          isActive: d.is_active !== false,
          category: (d.category as 'standard' | 'premium' | 'luxury') || 'standard',
          imageUrl: d.image_url || 'https://images.unsplash.com/photo-1626948683838-3be9a4e90737?q=80&w=1470&auto=format&fit=crop',
          advanceBookingEnabled: (d as any).advance_booking_enabled || false,
          advancePercentage: (d as any).advance_percentage || 50,
          advanceFlatAmount: (d as any).advance_flat_amount || null,
          advanceUseFlat: (d as any).advance_use_flat || false,
          advanceValidityDays: (d as any).advance_validity_days || 3,
          advanceAutoCancel: (d as any).advance_auto_cancel || true,
          openingTime: (d as any).opening_time || undefined,
          closingTime: (d as any).closing_time || undefined,
          workingDays: Array.isArray((d as any).working_days) ? (d as any).working_days : undefined,
          is24Hours: (d as any).is_24_hours || false,
          slotsEnabled: (d as any).slots_enabled || false,
          fullAddress: (d as any).full_address || undefined,
        });
        setLayoutImage((d as any).layout_image || null);
        setRoomWidth((d as any).room_width || 800);
        setRoomHeight((d as any).room_height || 600);
      } else {
        toast({ title: "Error", description: "Failed to load cabin details", variant: "destructive" });
      }
    } catch (err) {
      console.error("Error fetching cabin details:", err);
      setError("Failed to load cabin details");
    } finally {
      setLoading(false);
    }
  };

  const handleSeatSelect = (seat: Seat) => {
    setSelectedSeat(seat);
  };

  const handleGoBack = () => navigate("/cabins");

  const handleBookingComplete = (bookingId: string) => {
    toast({ title: "Booking Successful", description: "Your seat has been booked successfully!" });
    navigate("/book-confirmation/" + bookingId);
  };

  const hideSeatSelection = (_bookingId: string, status: boolean) => {
    if (!status) setSelectedSeat(null);
    setHideSeats(status);
  };

  const cabinImages = cabin ? (cabin.images?.length ? cabin.images : (cabin.imageSrc ? [cabin.imageSrc] : [cabin.imageUrl])) : [];

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'premium': return 'bg-purple-500/90 text-white';
      case 'luxury': return 'bg-amber-500/90 text-white';
      default: return 'bg-primary/90 text-primary-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-3xl mx-auto">
      {loading ? (
        <BookSeatSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <p className="text-center text-destructive text-sm mb-4">{error}</p>
          <Button onClick={handleGoBack} size="sm">Go Back</Button>
        </div>
      ) : cabin && (
        <>
          {/* Collapsible Hero + Details section */}
          <div
            ref={heroRef}
            className="transition-all duration-500 ease-in-out overflow-hidden"
            style={{
              maxHeight: showDetails ? '1200px' : '0px',
              opacity: showDetails ? 1 : 0,
            }}
          >
            {/* Hero Image - Auto-sliding carousel */}
            <div className="relative">
              <div className="w-full overflow-hidden bg-muted">
                <CabinImageSlider images={cabinImages} autoPlay hideThumbnails />
              </div>
              {/* Subtle gradient for back button visibility */}
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
              {/* Back button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGoBack}
                className="absolute top-3 left-3 h-9 w-9 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 border border-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {/* Category badge */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <ShareButton
                  {...generateCabinShareText({
                    id: cabin.id,
                    name: cabin.name,
                    price: cabin.price,
                    fullAddress: cabin.fullAddress,
                    averageRating: cabin.averageRating,
                    serialNumber: cabin.serialNumber,
                  }, user?.id)}
                />
                <Badge className={`${getCategoryColor(cabin.category)} border-0 text-xs shadow-lg`}>
                  {cabin.category.charAt(0).toUpperCase() + cabin.category.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Name, Rating & Address - Below the image */}
            <div className="px-3 pt-2 pb-1">
              <h1 className="text-lg font-bold text-foreground leading-tight">{cabin.name}</h1>
              {cabin.averageRating && cabin.averageRating > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-medium text-foreground">{cabin.averageRating.toFixed(1)}</span>
                  {cabin.reviewCount && cabin.reviewCount > 0 && (
                    <span className="text-xs text-muted-foreground">({cabin.reviewCount} reviews)</span>
                  )}
                </div>
              )}
              {cabin.fullAddress && (
                <div className="flex items-start gap-1.5 mt-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground leading-relaxed">{cabin.fullAddress}</span>
                </div>
              )}
            </div>

            {/* Info Chips */}
            <div className="px-3 pt-0.5 pb-0.5">
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold whitespace-nowrap shadow-sm border border-emerald-500/20">
                  <IndianRupee className="h-3.5 w-3.5" />
                  ₹{cabin.price}/mo
                </div>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-semibold whitespace-nowrap shadow-sm border border-blue-500/20">
                  <Users className="h-3.5 w-3.5" />
                  {cabin.capacity} seats
                </div>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-semibold whitespace-nowrap shadow-sm border border-purple-500/20">
                  <Layers className="h-3.5 w-3.5" />
                  {cabin.floors?.length || 1} floor{(cabin.floors?.length || 1) > 1 ? 's' : ''}
                </div>
                {cabin.lockerPrice !== undefined && cabin.lockerPrice > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold whitespace-nowrap shadow-sm border border-amber-500/20">
                    <Lock className="h-3.5 w-3.5" />
                    Locker ₹{cabin.lockerPrice}
                  </div>
                )}
                {cabin.is24Hours && (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold whitespace-nowrap shadow-sm border border-emerald-500/20">
                    <Clock className="h-3.5 w-3.5" />
                    Open 24/7
                  </div>
                )}
                {cabin.slotsEnabled && (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-400 text-xs font-semibold whitespace-nowrap shadow-sm border border-violet-500/20">
                    <Clock className="h-3.5 w-3.5" />
                    Slot Booking
                  </div>
                )}
              </div>
            </div>

            {/* Details & Amenities */}
            <div className="px-3 pt-1 pb-0.5">
              <div className="bg-muted/30 rounded-xl p-2.5 border border-border/50">
                <h3 className="text-sm font-semibold text-foreground mb-2">Details & Amenities</h3>
                {cabin.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{cabin.description}</p>
                )}
                {cabin.description && cabin.amenities?.length > 0 && (
                  <Separator className="my-2.5 opacity-50" />
                )}
                {cabin.amenities?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {cabin.amenities.map((amenity) => (
                      <span key={amenity} className="inline-flex items-center gap-1 text-xs bg-primary/5 text-foreground border border-primary/10 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                        {amenity}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Back button visible when hero is collapsed */}
          {!showDetails && (
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-3 py-2 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGoBack}
                className="h-8 w-8 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold text-foreground truncate">{cabin.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs text-primary"
                onClick={() => {
                  setShowDetails(true);
                  heroRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                View Details
              </Button>
            </div>
          )}

          {/* Booking Form */}
          <div className="px-3 pt-2" ref={bookingFormRef}>
            <Suspense fallback={
              <div className="space-y-3 p-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-[200px] w-full rounded-xl" />
              </div>
            }>
              <SeatBookingForm
                cabin={cabin}
                selectedSeat={selectedSeat}
                onBookingComplete={handleBookingComplete}
                hideSeatSelection={hideSeatSelection}
                roomElements={roomElements}
                layoutImage={layoutImage}
                roomWidth={roomWidth}
                roomHeight={roomHeight}
              />
            </Suspense>
          </div>

          {/* Sticky Bottom Seat Info Card */}
          {selectedSeat && cabin.isBookingActive && (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background via-background to-background/95 border-t border-border shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.15)] backdrop-blur-sm">
              <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Armchair className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">Seat #{selectedSeat.number}</span>
                    {selectedSeat.category && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary">
                        {selectedSeat.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">₹{selectedSeat.price}/mo</p>
                </div>
                <Button
                  size="sm"
                  className="text-xs h-9 px-5 rounded-xl shadow-md bg-primary hover:bg-primary/90 animate-pulse"
                  onClick={() => bookingFormRef.current?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Book Now
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
};

export default BookSeat;
