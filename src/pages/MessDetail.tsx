import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Loader2, UtensilsCrossed, MapPin, Clock, Star, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getMessPartners, getMealTimings, getMessPackages, getWeeklyMenu, createMessSubscription, createMessReceipt, getMyMessSubscriptions } from '@/api/messService';
import { reviewsService } from '@/api/reviewsService';
import { calculateBookingEndDate } from '@/utils/dateCalculations';
import { formatCurrency } from '@/utils/currency';
import { getImageUrl } from '@/lib/utils';
import { format, addDays } from 'date-fns';

const MEAL_LABELS: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const FOOD_LABELS: Record<string, string> = { veg: '🟢 Veg', non_veg: '🔴 Non-Veg', both: '🟡 Veg & Non-Veg' };
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function MessDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [mess, setMess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messTimings, setMessTimings] = useState<any[]>([]);
  const [messPackages, setMessPackages] = useState<any[]>([]);
  const [messMenu, setMessMenu] = useState<any[]>([]);
  const [messReviews, setMessReviews] = useState<any[]>([]);

  // Subscribe form
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [startDate, setStartDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [subscribing, setSubscribing] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubId, setReviewSubId] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userSubs, setUserSubs] = useState<any[]>([]);

  useEffect(() => {
    if (id) loadDetail();
  }, [id]);

  useEffect(() => {
    if (user?.id && mess) {
      getMyMessSubscriptions(user.id).then(subs => {
        setUserSubs(subs.filter((s: any) => s.mess_id === mess.id && s.payment_status === 'completed'));
      }).catch(() => {});
    }
  }, [user?.id, mess?.id]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const all = await getMessPartners({ approved: true, active: true });
      const found = all.find((m: any) => m.id === id);
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

  const handleSubscribe = async () => {
    if (!user || !selectedPackage || !mess) return;
    setSubscribing(true);
    try {
      const start = new Date(startDate);
      const end = calculateBookingEndDate(start, selectedPackage.duration_type, selectedPackage.duration_count);
      const sub = await createMessSubscription({
        user_id: user.id, mess_id: mess.id, package_id: selectedPackage.id,
        start_date: format(start, 'yyyy-MM-dd'), end_date: format(end, 'yyyy-MM-dd'),
        price_paid: selectedPackage.price, payment_status: 'completed', payment_method: 'cash', status: 'active',
      });
      await createMessReceipt({
        subscription_id: (sub as any).id, user_id: user.id, mess_id: mess.id,
        amount: selectedPackage.price, payment_method: 'cash', transaction_id: `MESS-${Date.now()}`,
      });
      toast({ title: 'Subscribed successfully!', description: `${selectedPackage.name} from ${startDate}` });
      setShowSubscribe(false);
      setSelectedPackage(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSubscribing(false);
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim() || !reviewSubId) return;
    setSubmittingReview(true);
    try {
      await reviewsService.createReview({
        booking_id: reviewSubId,
        mess_id: mess.id,
        rating: reviewRating,
        title: reviewTitle || undefined,
        comment: reviewComment,
      });
      toast({ title: 'Review submitted!', description: 'It will be visible after approval.' });
      setShowReviewForm(false);
      setReviewComment(''); setReviewTitle(''); setReviewRating(5);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSubmittingReview(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!mess) return null;

  const mainImage = mess.logo_image || (mess.images && mess.images[0]) || '/placeholder.svg';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-3 py-4 space-y-4">
        {/* Back + Header */}
        <button onClick={() => navigate('/mess')} className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Mess
        </button>

        {/* Hero image */}
        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-muted">
          <img src={getImageUrl(mainImage)} alt={mess.name} className="w-full h-full object-cover" />
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-foreground">{mess.name}</h1>
            <span className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-md">
              {FOOD_LABELS[mess.food_type] || mess.food_type}
            </span>
          </div>
          {mess.location && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[12px] text-muted-foreground">{mess.location}</span>
            </div>
          )}
          {mess.description && <p className="text-[12px] text-muted-foreground mt-2">{mess.description}</p>}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="menu">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="timings">Timings</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="menu" className="mt-3">
            {messMenu.length === 0 ? (
              <p className="text-sm text-muted-foreground">Menu not yet uploaded.</p>
            ) : (
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
            )}
          </TabsContent>

          <TabsContent value="packages" className="mt-3 space-y-3">
            {messPackages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No packages available.</p>
            ) : (
              messPackages.map(p => (
                <Card key={p.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(p.meal_types as string[])?.map(m => MEAL_LABELS[m]).join(', ')} · {p.duration_count} {p.duration_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{formatCurrency(p.price)}</span>
                      {isAuthenticated && (
                        <Button size="sm" onClick={() => { setSelectedPackage(p); setShowSubscribe(true); }}>Subscribe</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="timings" className="mt-3 space-y-2">
            {messTimings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Timings not set yet.</p>
            ) : (
              messTimings.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-2 border rounded">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">{MEAL_LABELS[t.meal_type]}</Badge>
                  <span className="text-sm">{t.start_time} – {t.end_time}</span>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-3 space-y-3">
            {isAuthenticated && userSubs.length > 0 && !showReviewForm && (
              <Button variant="outline" size="sm" onClick={() => { setShowReviewForm(true); setReviewSubId(userSubs[0].id); }}>
                <Star className="h-4 w-4 mr-1" /> Write a Review
              </Button>
            )}

            {showReviewForm && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold">Write a Review</p>
                  <div>
                    <Label className="text-xs">Rating</Label>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setReviewRating(n)} className="p-0.5">
                          <Star className={`h-5 w-5 ${n <= reviewRating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Title (optional)</Label>
                    <Input value={reviewTitle} onChange={e => setReviewTitle(e.target.value)} placeholder="Brief title" />
                  </div>
                  <div>
                    <Label className="text-xs">Comment</Label>
                    <Textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={3} placeholder="Share your experience..." />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSubmitReview} disabled={submittingReview || !reviewComment.trim()} size="sm">
                      {submittingReview ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Submit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowReviewForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {messReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              messReviews.map((r: any) => (
                <div key={r.id} className="p-3 border rounded space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{r.profiles?.name || 'Student'}</span>
                  </div>
                  {r.title && <p className="text-sm font-medium">{r.title}</p>}
                  <p className="text-sm text-muted-foreground">{r.comment}</p>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Subscribe Dialog */}
      <Dialog open={showSubscribe} onOpenChange={setShowSubscribe}>
        <DialogContent>
          <DialogHeader><DialogTitle>Subscribe to {selectedPackage?.name}</DialogTitle></DialogHeader>
          {selectedPackage && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded">
                <p className="font-medium">{selectedPackage.name}</p>
                <p className="text-sm text-muted-foreground">{(selectedPackage.meal_types as string[])?.map((m: string) => MEAL_LABELS[m]).join(', ')}</p>
                <p className="text-lg font-bold mt-1">{formatCurrency(selectedPackage.price)}</p>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} />
              </div>
              {startDate && (
                <p className="text-sm text-muted-foreground">
                  End Date: {format(calculateBookingEndDate(new Date(startDate), selectedPackage.duration_type, selectedPackage.duration_count), 'dd MMM yyyy')}
                </p>
              )}
              <Button onClick={handleSubscribe} disabled={subscribing} className="w-full">
                {subscribing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm & Pay {formatCurrency(selectedPackage.price)}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
