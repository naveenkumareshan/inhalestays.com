import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getMessPartnerById, getMessPartnerBySerialNumber,
  getMealTimings, getMessPackages, getWeeklyMenu,
  createMessSubscription, getMyMessSubscriptions,
} from '@/api/messService';
import { reviewsService } from '@/api/reviewsService';
import { calculateBookingEndDate } from '@/utils/dateCalculations';
import { formatCurrency } from '@/utils/currency';
import { getImageUrl } from '@/lib/utils';
import { isUUID } from '@/utils/idUtils';
import { CabinImageSlider } from '@/components/CabinImageSlider';
import { ShareButton } from '@/components/ShareButton';
import { generateMessShareText } from '@/utils/shareUtils';
import { cn } from '@/lib/utils';
import ErrorBoundary from '@/components/ErrorBoundary';
import { MessageCircle } from 'lucide-react';
import { whatsappLeadService } from '@/api/whatsappLeadService';
import { supabase } from '@/integrations/supabase/client';
import { RazorpayCheckout } from '@/components/payment/RazorpayCheckout';
import {
  ArrowLeft, CalendarIcon, CheckCircle, Clock, IndianRupee, Loader2,
  MapPin, Star, UtensilsCrossed, Users,
} from 'lucide-react';

const MEAL_LABELS: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const FOOD_LABELS: Record<string, string> = { veg: '🟢 Veg', non_veg: '🔴 Non-Veg', both: '🟡 Veg & Non-Veg' };
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

type MealPlan = 'breakfast' | 'lunch' | 'dinner' | 'lunch_dinner' | 'full_day';
const MEAL_PLAN_OPTIONS: { id: MealPlan; label: string; meals: string[] }[] = [
  { id: 'breakfast', label: 'Breakfast', meals: ['breakfast'] },
  { id: 'lunch', label: 'Lunch', meals: ['lunch'] },
  { id: 'dinner', label: 'Dinner', meals: ['dinner'] },
  { id: 'lunch_dinner', label: 'Lunch + Dinner', meals: ['lunch', 'dinner'] },
  { id: 'full_day', label: 'Full Day', meals: ['breakfast', 'lunch', 'dinner'] },
];

const MessDetailSkeleton = () => (
  <div className="min-h-screen bg-background pb-24">
    <Skeleton className="w-full aspect-[4/3]" />
    <div className="px-3 pt-3 space-y-2">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <div className="px-3 pt-3 flex gap-2">
      <Skeleton className="h-8 w-24 rounded-full" />
      <Skeleton className="h-8 w-20 rounded-full" />
    </div>
    <div className="px-3 pt-4 space-y-3">
      <Skeleton className="h-[120px] w-full rounded-xl" />
      <Skeleton className="h-[200px] w-full rounded-xl" />
    </div>
  </div>
);

export default function MessDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);

  const [mess, setMess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messTimings, setMessTimings] = useState<any[]>([]);
  const [messPackages, setMessPackages] = useState<any[]>([]);
  const [messMenu, setMessMenu] = useState<any[]>([]);
  const [messReviews, setMessReviews] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(true);
  const [showMenuDialog, setShowMenuDialog] = useState(false);

  // Step flow
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);
  const [durationType, setDurationType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [durationCount, setDurationCount] = useState(1);
  const [checkInDate, setCheckInDate] = useState<Date>(addDays(new Date(), 1));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [pendingSubId, setPendingSubId] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Reviews
  const [userSubs, setUserSubs] = useState<any[]>([]);

  useEffect(() => {
    if (id) loadDetail();
  }, [id]);

  // Track property view
  useEffect(() => {
    if (!mess) return;
    const key = `pv_mess_${mess.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    supabase.from('property_views' as any).insert({ property_id: mess.id, property_type: 'mess', user_id: user?.id || null }).then(() => {});
  }, [mess?.id]);

  useEffect(() => {
    if (user?.id && mess) {
      getMyMessSubscriptions(user.id).then(subs => {
        setUserSubs(subs.filter((s: any) => s.mess_id === mess.id && s.payment_status === 'completed'));
      }).catch(() => {});
    }
  }, [user?.id, mess?.id]);

  // Collapse hero when meal plan selected
  useEffect(() => {
    if (selectedMealPlan) setShowDetails(false);
  }, [selectedMealPlan]);

  // Re-show hero on scroll to top
  useEffect(() => {
    if (!heroRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !showDetails) setShowDetails(true); },
      { threshold: 0.3 }
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [showDetails]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const found = isUUID(id!)
        ? await getMessPartnerById(id!)
        : await getMessPartnerBySerialNumber(id!);
      if (!found) { navigate('/mess'); return; }
      setMess(found);

      const [t, p, m, r] = await Promise.all([
        getMealTimings(found.id),
        getMessPackages(found.id),
        getWeeklyMenu(found.id),
        reviewsService.getApprovedMessReviews(found.id).catch(() => ({ data: [] })),
      ]);
      setMessTimings(t);
      setMessPackages(p);
      setMessMenu(m);
      setMessReviews(r.data || []);
    } catch {
      toast({ title: 'Failed to load mess details', variant: 'destructive' });
      navigate('/mess');
    }
    setLoading(false);
  };

  // Derived: matching packages for selected meal plan
  const matchingPackages = useMemo(() => {
    if (!selectedMealPlan) return [];
    const plan = MEAL_PLAN_OPTIONS.find(p => p.id === selectedMealPlan);
    if (!plan) return [];
    return messPackages.filter((pkg: any) => {
      const pkgMeals = (pkg.meal_types as string[]) || [];
      return plan.meals.length === pkgMeals.length && plan.meals.every(m => pkgMeals.includes(m));
    });
  }, [selectedMealPlan, messPackages]);

  // Reset duration when meal plan changes
  useEffect(() => {
    setDurationCount(1);
  }, [selectedMealPlan]);

  // Selected package = first matching package for selected meal plan
  const selectedPackage = useMemo(() => {
    return matchingPackages.length > 0 ? matchingPackages[0] : null;
  }, [matchingPackages]);

  const endDate = useMemo(() => {
    return calculateBookingEndDate(checkInDate, durationType, durationCount);
  }, [checkInDate, durationType, durationCount]);

  const totalPrice = selectedPackage ? selectedPackage.price * durationCount : 0;

  // Available meal plans (only those that have packages)
  const availableMealPlans = useMemo(() => {
    return MEAL_PLAN_OPTIONS.filter(plan => {
      return messPackages.some((pkg: any) => {
        const pkgMeals = (pkg.meal_types as string[]) || [];
        return plan.meals.length === pkgMeals.length && plan.meals.every(m => pkgMeals.includes(m));
      });
    });
  }, [messPackages]);

  const handleCreatePendingSub = async () => {
    if (!user || !selectedPackage || !mess) return;
    if (!isAuthenticated) {
      navigate('/student/login', { state: { from: location.pathname } });
      return;
    }
    setSubscribing(true);
    try {
      const sub = await createMessSubscription({
        user_id: user.id, mess_id: mess.id, package_id: selectedPackage.id,
        start_date: format(checkInDate, 'yyyy-MM-dd'), end_date: format(endDate, 'yyyy-MM-dd'),
        price_paid: totalPrice, payment_status: 'pending', payment_method: 'online', status: 'pending',
      });
      setPendingSubId((sub as any).id);
      return (sub as any).id;
    } catch (e: any) {
      toast({ title: 'Error creating subscription', description: e.message, variant: 'destructive' });
      setSubscribing(false);
      return null;
    }
  };

  const handlePaymentSuccess = () => {
    setBookingSuccess(true);
    setSubscribing(false);
  };

  const handlePaymentDismiss = async () => {
    setSubscribing(false);
    if (pendingSubId) {
      try {
        await supabase.from('mess_subscriptions' as any).update({ status: 'cancelled', payment_status: 'cancelled' }).eq('id', pendingSubId);
      } catch {}
      setPendingSubId(null);
    }
  };

  const handleGoBack = () => navigate(-1);

  if (loading) return <MessDetailSkeleton />;
  // Success screen
  if (bookingSuccess && selectedPackage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-lg p-6 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Subscription Confirmed!</h2>
          <p className="text-sm text-muted-foreground">Your mess subscription has been activated.</p>
          <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm text-left">
            <div className="flex justify-between"><span className="text-muted-foreground">Mess</span><span className="font-medium text-foreground">{mess?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Package</span><span className="font-medium text-foreground">{selectedPackage.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Validity</span><span className="font-medium text-foreground">{format(checkInDate, 'dd MMM yyyy')} – {format(endDate, 'dd MMM yyyy')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount Paid</span><span className="font-bold text-secondary">{formatCurrency(totalPrice)}</span></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/student/bookings')}>
              View All Bookings
            </Button>
            <Button className="flex-1" onClick={() => navigate('/mess')}>
              Browse Mess
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!mess) return null;

  const messImages = mess.images?.length ? mess.images : (mess.logo_image ? [mess.logo_image] : []);
  const startingPrice = mess.starting_price || (messPackages.length > 0 ? Math.min(...messPackages.map((p: any) => p.price)) : null);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-3xl mx-auto">
          {/* ═══ Collapsible Hero + Details ═══ */}
          <div
            ref={heroRef}
            className="transition-all duration-500 ease-in-out overflow-hidden"
            style={{ maxHeight: showDetails ? '2000px' : '0px', opacity: showDetails ? 1 : 0 }}
          >
            {/* Hero Image Slider */}
            <div className="relative">
              <div className="w-full overflow-hidden bg-muted">
                <CabinImageSlider images={messImages} autoPlay hideThumbnails />
              </div>
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGoBack}
                className="absolute top-3 left-3 h-9 w-9 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 border border-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {mess.food_type && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-primary text-primary-foreground border-0 text-xs shadow-lg">
                    {mess.food_type === 'veg' ? 'VEG' : mess.food_type === 'non_veg' ? 'NON-VEG' : 'VEG & NON-VEG'}
                  </Badge>
                </div>
              )}
            </div>

            {/* Name, Rating, Share & Location */}
            <div className="px-3 pt-2 pb-1">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold text-foreground leading-tight">{mess.name}</h1>
                <ShareButton
                  {...generateMessShareText({
                    id: mess.id,
                    name: mess.name,
                    food_type: mess.food_type,
                    location: mess.location,
                    serial_number: mess.serial_number,
                  }, startingPrice, user?.id)}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                />
              </div>
              {mess.average_rating > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-medium text-foreground">{Number(mess.average_rating).toFixed(1)}</span>
                  {mess.review_count > 0 && (
                    <span className="text-xs text-muted-foreground">({mess.review_count} reviews)</span>
                  )}
                </div>
              )}
              {mess.location && (
                <div className="flex items-start gap-1.5 mt-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground leading-relaxed">{mess.location}</span>
                </div>
              )}
            </div>

            {/* Info Chips */}
            <div className="px-3 pt-0.5 pb-0.5">
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {startingPrice && (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold whitespace-nowrap shadow-sm border border-emerald-500/20">
                    <IndianRupee className="h-3.5 w-3.5" />
                    From {formatCurrency(startingPrice)}
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-semibold whitespace-nowrap shadow-sm border border-orange-500/20">
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  {FOOD_LABELS[mess.food_type] || mess.food_type}
                </div>
                {mess.capacity && (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-semibold whitespace-nowrap shadow-sm border border-blue-500/20">
                    <Users className="h-3.5 w-3.5" />
                    {mess.capacity} capacity
                  </div>
                )}
              </div>
            </div>

            {/* Details & Timings Card */}
            <div className="px-3 pt-1 pb-0.5">
              <div className="bg-muted/30 rounded-xl p-2.5 border border-border/50">
                <h3 className="text-sm font-semibold text-foreground mb-2">Details</h3>
                {mess.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{mess.description}</p>
                )}
                {messTimings.length > 0 && (
                  <>
                    {mess.description && <Separator className="my-2.5 opacity-50" />}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-foreground">Meal Timings</p>
                      {messTimings.map(t => (
                        <div key={t.id} className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-foreground font-medium">{MEAL_LABELS[t.meal_type]}</span>
                          <span className="text-xs text-muted-foreground">{t.start_time} – {t.end_time}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {messMenu.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => setShowMenuDialog(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20 transition-colors cursor-pointer"
                    >
                      <UtensilsCrossed className="h-3.5 w-3.5" />
                      View Weekly Menu
                    </button>
                  </div>
                )}
                {(mess as any).whatsapp_chat_enabled && (mess as any).whatsapp_number && (
                  <>
                    <Separator className="my-2.5 opacity-50" />
                    <Button
                      className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white"
                      size="sm"
                      onClick={() => {
                        if (mess.user_id) whatsappLeadService.trackClick(mess.user_id, 'mess', mess.id);
                        const cleanNumber = ((mess as any).whatsapp_number || '').replace(/[^0-9]/g, '');
                        const message = `Hi, I'm interested in ${mess.name} (mess). Can you share more details?`;
                        window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" fill="#fff" />
                      Contact Property on WhatsApp
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ═══ Sticky header when hero collapsed ═══ */}
          {!showDetails && (
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-3 py-2 flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleGoBack} className="h-8 w-8 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold text-foreground truncate">{mess.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs text-secondary"
                onClick={() => { setShowDetails(true); heroRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
              >
                View Details
              </Button>
            </div>
          )}

          {/* ═══ Step 1: Select Meal Plan ═══ */}
          <Separator className="my-0" />
          <div className="px-3 pt-2">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-6 w-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[10px] font-bold">1</div>
              <Label className="text-sm font-semibold text-foreground">Select Meal Plan</Label>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
              {availableMealPlans.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No packages available for this mess.</p>
              ) : (
                availableMealPlans.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedMealPlan(plan.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                      selectedMealPlan === plan.id
                        ? 'bg-secondary text-secondary-foreground border-secondary'
                        : 'bg-muted/50 text-muted-foreground border-border hover:border-secondary/50'
                    }`}
                  >
                    {plan.label}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ═══ Step 2: Select Duration ═══ */}
          {selectedMealPlan && selectedPackage && (
            <>
              <Separator className="my-0" />
              <div className="px-3 pt-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[10px] font-bold">2</div>
                  <Label className="text-sm font-semibold text-foreground">Select Duration</Label>
                </div>

                {/* Duration type toggle */}
                <div>
                  <Label className="block mb-1 text-xs font-medium text-muted-foreground">Duration Type</Label>
                  <div className="flex gap-1.5 bg-muted/50 rounded-xl p-1">
                    {(['daily', 'weekly', 'monthly'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => { setDurationType(type); setDurationCount(1); }}
                        className={cn(
                          'flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
                          durationType === type
                            ? 'bg-secondary text-secondary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {type === 'daily' ? 'Daily' : type === 'weekly' ? 'Weekly' : 'Monthly'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration count + Start date */}
                <div className="flex items-end gap-2 bg-muted/20 rounded-xl p-2.5 border border-border/50 mt-2">
                  <div className="w-28">
                    <Label className="block mb-1 text-xs text-muted-foreground">
                      {durationType === 'daily' ? 'Days' : durationType === 'weekly' ? 'Weeks' : 'Months'}
                    </Label>
                    <Select value={String(durationCount)} onValueChange={(val) => setDurationCount(parseInt(val))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-80">
                        {Array.from({ length: durationType === 'daily' ? 30 : 12 }, (_, i) => i + 1).map(v => (
                          <SelectItem key={v} value={String(v)}>
                            {v} {durationType === 'daily' ? (v === 1 ? 'Day' : 'Days') : durationType === 'weekly' ? (v === 1 ? 'Week' : 'Weeks') : (v === 1 ? 'Month' : 'Months')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <Label className="block mb-1 text-xs text-muted-foreground">Start Date</Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn('w-full justify-start text-left font-normal h-9', !checkInDate && 'text-muted-foreground')}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(checkInDate, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkInDate}
                          onSelect={(date) => { if (date) { setCheckInDate(date); setCalendarOpen(false); } }}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className={cn('p-3 pointer-events-auto')}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* End date badge */}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-secondary/10 text-secondary rounded-full px-3 py-1">
                    <CalendarIcon className="h-3 w-3" />
                    Ends: {format(endDate, 'dd MMM yyyy')}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* ═══ Step 3: Review & Pay ═══ */}
          {selectedPackage && (
            <>
              <Separator className="my-0" />
              <div className="px-3 pt-2 pb-6">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[10px] font-bold">3</div>
                  <Label className="text-sm font-semibold text-foreground">Review & Pay</Label>
                </div>

                <div className="bg-muted/30 rounded-xl border border-border/50 divide-y divide-border/50">
                  {/* Booking Summary */}
                  <div className="p-3 space-y-1.5 text-xs">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Booking Summary</h4>
                    <div className="flex justify-between"><span className="text-muted-foreground">Mess</span><span className="font-medium text-foreground">{mess.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Package</span><span className="font-medium text-foreground">{selectedPackage.name}</span></div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Meals</span>
                      <span className="font-medium text-foreground">{(selectedPackage.meal_types as string[])?.map(m => MEAL_LABELS[m]).join(', ')}</span>
                    </div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Start Date</span><span className="font-medium text-foreground">{format(checkInDate, 'dd MMM yyyy')}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">End Date</span><span className="font-medium text-foreground">{format(endDate, 'dd MMM yyyy')}</span></div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium text-foreground">
                        {durationCount} {durationType === 'daily' ? (durationCount === 1 ? 'day' : 'days') : durationType === 'weekly' ? (durationCount === 1 ? 'week' : 'weeks') : (durationCount === 1 ? 'month' : 'months')}
                      </span>
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="p-3 space-y-1.5 text-xs">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Price Breakdown</h4>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Package Price</span>
                      <span className="font-medium text-foreground">{formatCurrency(selectedPackage.price)} × {durationCount}</span>
                    </div>
                    <Separator className="my-1.5 opacity-50" />
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-foreground">Total Amount</span>
                      <span className="font-bold text-secondary">{formatCurrency(totalPrice)}</span>
                    </div>
                  </div>

                  {/* Terms & Pay */}
                  <div className="p-3 space-y-3">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="terms"
                        checked={agreedToTerms}
                        onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                      />
                      <label htmlFor="terms" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                        I agree to the terms & conditions and understand the subscription policy.
                      </label>
                    </div>

                    <RazorpayCheckout
                      amount={totalPrice}
                      bookingId={pendingSubId || ''}
                      bookingType="mess"
                      endDate={endDate}
                      bookingDuration={durationType}
                      durationCount={durationCount}
                      onSuccess={handlePaymentSuccess}
                      onError={() => setSubscribing(false)}
                      onDismiss={handlePaymentDismiss}
                      buttonText={`Pay ${formatCurrency(totalPrice)}`}
                      buttonDisabled={!agreedToTerms || subscribing}
                      className="w-full"
                      createOrder={async () => {
                        const subId = pendingSubId || await handleCreatePendingSub();
                        if (!subId) return null;
                        const { razorpayService } = await import('@/api/razorpayService');
                        const res = await razorpayService.createOrder({
                          amount: totalPrice,
                          currency: 'INR',
                          bookingId: subId,
                          bookingType: 'mess',
                          bookingDuration: durationType,
                          durationCount,
                        });
                        if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed');
                        return res.data;
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══ Reviews Section ═══ */}
          {messReviews.length > 0 && (
            <>
              <Separator className="my-0" />
              <div className="px-3 pt-2 pb-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Reviews</h3>
                <div className="space-y-2">
                  {messReviews.map((r: any) => (
                    <div key={r.id} className="p-3 border border-border rounded-xl space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{r.profiles?.name || 'Student'}</span>
                      </div>
                      {r.title && <p className="text-sm font-medium text-foreground">{r.title}</p>}
                      <p className="text-xs text-muted-foreground">{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Weekly Menu Dialog */}
      <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
        <DialogContent className="max-w-lg mx-auto">
          <DialogHeader><DialogTitle>Weekly Menu</DialogTitle></DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr><th className="text-left p-2">Day</th><th className="p-2">Breakfast</th><th className="p-2">Lunch</th><th className="p-2">Dinner</th></tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day} className="border-t">
                    <td className="p-2 capitalize font-medium">{day}</td>
                    {['breakfast', 'lunch', 'dinner'].map(meal => (
                      <td key={meal} className="p-2 text-xs">
                        {messMenu.find(m => m.day_of_week === day && m.meal_type === meal)?.menu_items || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

    </ErrorBoundary>
  );
}
