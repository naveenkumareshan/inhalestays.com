import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, UtensilsCrossed, CalendarDays, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getMyMessSubscriptions, getMyAttendance, updateMessSubscription } from '@/api/messService';
import { formatCurrency } from '@/utils/currency';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

const MEAL_LABELS: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const STATUS_COLORS: Record<string, string> = { active: 'default', expired: 'secondary', cancelled: 'destructive', paused: 'outline', pending: 'outline' };

export default function MessDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetId = searchParams.get('id');

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pause form
  const [pauseStart, setPauseStart] = useState('');
  const [pauseEnd, setPauseEnd] = useState('');
  const [pausing, setPausing] = useState(false);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const subs = await getMyMessSubscriptions(user!.id);
      setSubscriptions(subs);
    } catch {}
    setLoading(false);
  };

  const loadAttendanceForSub = async (subId: string) => {
    const att = await getMyAttendance(user!.id, subId);
    setAttendance(att);
  };

  // Load attendance when target sub is available
  useEffect(() => {
    if (targetId && subscriptions.length > 0 && user?.id) {
      loadAttendanceForSub(targetId);
    }
  }, [targetId, subscriptions.length]);

  const handlePause = async (subId: string) => {
    if (!pauseStart || !pauseEnd) return;
    setPausing(true);
    try {
      const ps = new Date(pauseStart);
      const pe = new Date(pauseEnd);
      const pauseDays = Math.ceil((pe.getTime() - ps.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const sub = subscriptions.find(s => s.id === subId);
      const newEnd = new Date(sub.end_date);
      newEnd.setDate(newEnd.getDate() + pauseDays);

      await updateMessSubscription(subId, {
        status: 'paused',
        pause_start: pauseStart,
        pause_end: pauseEnd,
        end_date: format(newEnd, 'yyyy-MM-dd'),
      });
      toast({ title: 'Subscription paused', description: `End date extended by ${pauseDays} days` });
      setPauseStart(''); setPauseEnd('');
      loadData();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setPausing(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (subscriptions.length === 0) {
    return (
      <div className="container max-w-lg mx-auto py-8 px-4 text-center space-y-4">
        <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-bold">No Mess Subscriptions</h2>
        <p className="text-muted-foreground">Browse and subscribe to a meal plan from our mess partners.</p>
        <Link to="/mess"><Button>Browse Mess Partners</Button></Link>
      </div>
    );
  }

  // If a specific subscription ID is provided, show only that one
  if (targetId) {
    const sub = subscriptions.find(s => s.id === targetId);
    if (!sub) {
      return (
        <div className="container max-w-lg mx-auto py-8 px-4 text-center space-y-4">
          <h2 className="text-lg font-bold">Subscription not found</h2>
          <Button variant="outline" onClick={() => navigate('/student/mess')}>View All Subscriptions</Button>
        </div>
      );
    }

    return (
      <div className="container max-w-2xl mx-auto py-6 px-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/student/bookings')} className="h-8 w-8 rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">Subscription Details</h1>
        </div>

        {/* Subscription detail card */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-foreground">{sub.mess_partners?.name}</p>
                <p className="text-sm text-muted-foreground">{sub.mess_packages?.name}</p>
                {sub.mess_packages?.meal_types && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Meals: {(sub.mess_packages.meal_types as string[]).map(m => MEAL_LABELS[m] || m).join(', ')}
                  </p>
                )}
              </div>
              <Badge variant={STATUS_COLORS[sub.status] as any}>{sub.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="font-medium">{sub.start_date}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="font-medium">{sub.end_date}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount Paid</p>
                <p className="font-bold text-secondary">{formatCurrency(sub.price_paid)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Status</p>
                <p className="font-medium capitalize">{sub.payment_status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: History & Pause */}
        <Tabs defaultValue="history">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="history">Meal History</TabsTrigger>
            <TabsTrigger value="pause">Pause / Leave</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-3">
            {attendance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance records yet.</p>
            ) : (
              <div className="space-y-1">
                {attendance.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{a.date}</span>
                      <Badge variant="outline" className="text-xs">{MEAL_LABELS[a.meal_type]}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {a.status === 'consumed' ? (
                        <><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-green-600 text-xs">Consumed</span></>
                      ) : (
                        <><XCircle className="h-4 w-4 text-red-500" /><span className="text-red-500 text-xs">Skipped</span></>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pause" className="mt-3">
            {sub.status !== 'active' ? (
              <p className="text-sm text-muted-foreground">
                {sub.status === 'paused' ? `Paused from ${sub.pause_start} to ${sub.pause_end}` : 'This subscription is not active.'}
              </p>
            ) : (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm">Pause your meals for a date range. Your end date will be extended automatically.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>From</Label><Input type="date" value={pauseStart} onChange={e => setPauseStart(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} /></div>
                    <div><Label>To</Label><Input type="date" value={pauseEnd} onChange={e => setPauseEnd(e.target.value)} min={pauseStart || format(new Date(), 'yyyy-MM-dd')} /></div>
                  </div>
                  <Button onClick={() => handlePause(sub.id)} disabled={!pauseStart || !pauseEnd || pausing}>
                    {pausing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Pause Subscription
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Default: show all subscriptions list
  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-4">
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">My Mess Subscriptions</h1>
      </div>

      <div className="space-y-3">
        {subscriptions.map(s => (
          <Card
            key={s.id}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => navigate(`/student/mess?id=${s.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{s.mess_partners?.name}</p>
                  <p className="text-sm text-muted-foreground">{s.mess_packages?.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.start_date} → {s.end_date}</p>
                </div>
                <div className="text-right">
                  <Badge variant={STATUS_COLORS[s.status] as any}>{s.status}</Badge>
                  <p className="text-sm font-bold mt-1">{formatCurrency(s.price_paid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
