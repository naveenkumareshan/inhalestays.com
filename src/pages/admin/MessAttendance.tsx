import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from '@/hooks/use-toast';
import {
  Loader2, Download, Search, Eye, CalendarIcon,
  Coffee, UtensilsCrossed, Moon, Users, UserCheck, UserX, Activity,
} from 'lucide-react';
import {
  getMyMessPartner, getMessSubscriptions, getMessAttendance, markAttendance,
} from '@/api/messService';
import { generateBrandedQrPng } from '@/utils/brandedQrGenerator';
import { format, isSameDay, isFuture, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const todayStr = format(new Date(), 'yyyy-MM-dd');

const MEALS = ['breakfast', 'lunch', 'dinner'] as const;
const MEAL_LABELS: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const MEAL_ICONS: Record<string, React.ReactNode> = {
  breakfast: <Coffee className="h-5 w-5" />,
  lunch: <UtensilsCrossed className="h-5 w-5" />,
  dinner: <Moon className="h-5 w-5" />,
};

export default function MessAttendance() {
  const { user } = useAuth();
  const userId = user?.role === 'vendor_employee' && user.vendorId ? user.vendorId : user?.id;

  const [loading, setLoading] = useState(true);
  const [mess, setMess] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Date selection for stats
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const isToday = isSameDay(selectedDate, new Date());
  const isFutureDate = isFuture(selectedDate) && !isToday;

  // Attendance data for selected date
  const [dateAttendance, setDateAttendance] = useState<any[]>([]);

  // Manual correction date
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualAttendance, setManualAttendance] = useState<any[]>([]);

  // Load mess partner
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        const m = await getMyMessPartner(userId);
        setMess(m);
        if (m) {
          const subs = await getMessSubscriptions(m.id);
          setSubscriptions(subs);
        }
      } catch {
        toast({ title: 'Error loading data', variant: 'destructive' });
      }
      setLoading(false);
    })();
  }, [userId]);

  // Generate QR
  useEffect(() => {
    if (!mess) return;
    generateBrandedQrPng(mess.id, 'mess', mess.name).then(setQrDataUrl);
  }, [mess]);

  // Load attendance for selected date
  const loadDateAttendance = useCallback(async () => {
    if (!mess?.id || isFutureDate) return;
    const att = await getMessAttendance(mess.id, selectedDateStr);
    setDateAttendance(att);
  }, [mess?.id, selectedDateStr, isFutureDate]);

  useEffect(() => {
    if (mess?.id) {
      if (isFutureDate) {
        setDateAttendance([]);
      } else {
        loadDateAttendance();
      }
    }
  }, [mess?.id, loadDateAttendance, isFutureDate]);

  // Auto-refresh every 30s only for today
  useEffect(() => {
    if (!mess?.id || !isToday) return;
    const interval = setInterval(loadDateAttendance, 30000);
    return () => clearInterval(interval);
  }, [mess?.id, isToday, loadDateAttendance]);

  // Manual date attendance
  useEffect(() => {
    if (!mess?.id) return;
    getMessAttendance(mess.id, manualDate).then(setManualAttendance);
  }, [mess?.id, manualDate]);

  const getCurrentMealType = (): string => {
    const hours = new Date().getHours();
    if (hours < 11) return 'breakfast';
    if (hours < 16) return 'lunch';
    return 'dinner';
  };
  const currentMeal = getCurrentMealType();

  const handleMarkAttendance = async (subId: string, studentId: string, mealType: string) => {
    try {
      await markAttendance({
        subscription_id: subId, user_id: studentId, mess_id: mess.id,
        date: manualDate, meal_type: mealType, status: 'consumed', marked_by: 'manual',
      });
      toast({ title: 'Attendance marked!' });
      if (manualDate === selectedDateStr) loadDateAttendance();
      getMessAttendance(mess.id, manualDate).then(setManualAttendance);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${mess.name}-mess-qr.png`;
    a.click();
  };

  // Date-aware subscription filtering for stats
  const activeSubsForDate = useMemo(() => {
    return subscriptions.filter(s =>
      s.status === 'active' &&
      s.start_date <= selectedDateStr &&
      s.end_date >= selectedDateStr
    );
  }, [subscriptions, selectedDateStr]);

  const uniqueStudentsOnDate = new Set(dateAttendance.map(a => a.user_id)).size;
  const totalSubscribers = activeSubsForDate.length;
  const absentOnDate = Math.max(0, totalSubscribers - uniqueStudentsOnDate);

  // Date-aware filtering for manual correction
  const manualDateSubs = useMemo(() => {
    return subscriptions.filter(s =>
      s.status === 'active' &&
      s.start_date <= manualDate &&
      s.end_date >= manualDate
    );
  }, [subscriptions, manualDate]);

  const isManualDateFuture = manualDate > todayStr;

  const filteredSubs = manualDateSubs.filter(s =>
    !searchQuery || s.profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    || s.profiles?.phone?.includes(searchQuery)
  );

  // Meal stats per meal for selected date
  const mealStats = useMemo(() => {
    return MEALS.map(meal => {
      const total = activeSubsForDate.filter(s =>
        (s.mess_packages?.meal_types as string[])?.includes(meal)
      ).length;
      const consumed = isFutureDate ? 0 : dateAttendance.filter(a => a.meal_type === meal).length;
      const pct = total > 0 ? Math.round((consumed / total) * 100) : 0;
      return { meal, total, consumed, pct };
    });
  }, [activeSubsForDate, dateAttendance, isFutureDate]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  if (!mess) return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <p className="text-sm">No mess profile found. Create one from Manage Mess first.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header with View QR button */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Mess Attendance</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setQrDialogOpen(true)}
        >
          <Eye className="h-4 w-4 mr-1" /> View QR
        </Button>
      </div>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mess QR — {mess.name}</DialogTitle>
          </DialogHeader>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Mess QR" className="w-full max-w-[320px] h-auto rounded-lg mx-auto" />
          ) : (
            <div className="w-full h-[400px] bg-muted rounded-lg animate-pulse" />
          )}
          <Button variant="outline" size="sm" className="w-full" onClick={handleDownloadQr}>
            <Download className="h-4 w-4 mr-1" /> Download QR
          </Button>
        </DialogContent>
      </Dialog>

      {/* Date Selector */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
              <CalendarIcon className="h-4 w-4 mr-1.5" />
              {format(selectedDate, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {isToday && (
          <Badge variant="outline" className="text-[10px]">Today — Live</Badge>
        )}
        {isFutureDate && (
          <Badge variant="secondary" className="text-[10px]">Future — Expected counts</Badge>
        )}
      </div>

      {/* Meal Attendance Cards */}
      <div className="grid grid-cols-3 gap-3">
        {mealStats.map(({ meal, total, consumed, pct }) => {
          const isCurrent = isToday && meal === currentMeal;
          return (
            <Card key={meal} className={isCurrent ? 'border-primary ring-1 ring-primary/30' : ''}>
              <CardContent className="p-3 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5">
                  <span className={isCurrent ? 'text-primary' : 'text-muted-foreground'}>
                    {MEAL_ICONS[meal]}
                  </span>
                  <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                    {MEAL_LABELS[meal]}
                  </span>
                  {isCurrent && (
                    <Badge className="text-[9px] px-1.5 py-0">Now</Badge>
                  )}
                </div>
                {isFutureDate ? (
                  <p className="text-2xl font-bold">{total}<span className="text-sm font-normal text-muted-foreground"> expected</span></p>
                ) : (
                  <>
                    <p className={`text-2xl font-bold ${isCurrent ? 'text-primary' : ''}`}>
                      {consumed}<span className="text-sm font-normal text-muted-foreground">/{total}</span>
                    </p>
                    <Progress value={pct} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">{pct}% attendance</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Subscriber Status Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-[10px] uppercase text-muted-foreground">Total Subscribers</p>
            <p className="text-xl font-bold">{totalSubscribers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <UserCheck className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-[10px] uppercase text-muted-foreground">{isFutureDate ? 'Expected' : 'Present'}</p>
            <p className="text-xl font-bold">{isFutureDate ? totalSubscribers : uniqueStudentsOnDate}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <UserX className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-[10px] uppercase text-muted-foreground">Absent</p>
            <p className="text-xl font-bold">{isFutureDate ? 0 : absentOnDate}</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Attendance Feed (only for today/past) */}
      {!isFutureDate && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              {isToday ? 'Live Attendance Feed' : `Attendance — ${format(selectedDate, 'dd MMM yyyy')}`}
              {isToday && (
                <Badge variant="outline" className="text-[10px] ml-auto">Auto-refreshes</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dateAttendance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {isToday ? 'No attendance entries yet today. Students will appear here when they scan the QR.' : 'No attendance entries for this date.'}
              </p>
            ) : (
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {dateAttendance.slice(0, 50).map((a: any, i: number) => (
                  <div key={a.id || i} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{a.profiles?.name || 'Student'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {a.marked_at ? format(new Date(a.marked_at), 'hh:mm a') : '—'}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {MEAL_LABELS[a.meal_type] || a.meal_type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Attendance Correction */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Manual Attendance Correction</CardTitle>
          <div className="flex gap-2 mt-2">
            <Input
              type="date"
              max={todayStr}
              value={manualDate}
              onChange={e => setManualDate(e.target.value)}
              className="w-44"
            />
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {manualDateSubs.length === 0 ? 'No active subscribers for this date.' : 'No matching students.'}
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredSubs.map((s: any, idx: number) => {
                const studentAtt = manualAttendance.filter(a => a.subscription_id === s.id);
                return (
                  <div key={s.id} className="p-3 border rounded-lg">
                    <p className="font-medium text-sm">
                      <span className="text-[10px] text-muted-foreground mr-1">#{idx + 1}</span>
                      {s.profiles?.name}
                      {s.profiles?.phone && (
                        <span className="text-[10px] text-muted-foreground ml-2">{s.profiles.phone}</span>
                      )}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {((s.mess_packages?.meal_types as string[]) || [...MEALS]).map(meal => {
                        const marked = studentAtt.find(a => a.meal_type === meal);
                        return (
                          <Button
                            key={meal}
                            variant={marked ? 'default' : 'outline'}
                            size="sm"
                            disabled={!!marked || isManualDateFuture}
                            onClick={() => handleMarkAttendance(s.id, s.user_id, meal)}
                          >
                            {MEAL_LABELS[meal]} {marked ? '✓' : ''}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
