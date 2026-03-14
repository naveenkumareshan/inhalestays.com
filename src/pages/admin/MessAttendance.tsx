import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  Loader2, Maximize2, Download, Printer, Search,
  Coffee, UtensilsCrossed, Moon, Users, UserCheck, UserX, Activity,
} from 'lucide-react';
import {
  getMyMessPartner, getMessSubscriptions, getMessAttendance, markAttendance,
} from '@/api/messService';
import { generateBrandedQrPng } from '@/utils/brandedQrGenerator';
import { format } from 'date-fns';

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
  const [attendance, setAttendance] = useState<any[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrFullscreen, setQrFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const todayStr = format(new Date(), 'yyyy-MM-dd');

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

  // Load attendance for today (live feed) + manual date
  const loadTodayAttendance = useCallback(async () => {
    if (!mess?.id) return;
    const att = await getMessAttendance(mess.id, todayStr);
    setAttendance(att);
  }, [mess?.id, todayStr]);

  useEffect(() => {
    if (mess?.id) loadTodayAttendance();
  }, [mess?.id, loadTodayAttendance]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!mess?.id) return;
    const interval = setInterval(loadTodayAttendance, 30000);
    return () => clearInterval(interval);
  }, [mess?.id, loadTodayAttendance]);

  // Manual date attendance
  const [manualAttendance, setManualAttendance] = useState<any[]>([]);
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
      if (manualDate === todayStr) loadTodayAttendance();
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

  const handlePrintQr = () => {
    if (!qrDataUrl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0"><img src="${qrDataUrl}" style="max-width:480px;width:100%" onload="window.print();window.close()" /></body></html>`);
    w.document.close();
  };

  // Derived stats
  const activeSubsForAttendance = subscriptions.filter(s => s.status === 'active');
  const todayAttendance = attendance;
  const uniqueStudentsToday = new Set(todayAttendance.map(a => a.user_id)).size;
  const totalSubscribers = activeSubsForAttendance.length;
  const absentToday = Math.max(0, totalSubscribers - uniqueStudentsToday);

  // Filtered subscribers for manual correction
  const filteredSubs = activeSubsForAttendance.filter(s =>
    !searchQuery || s.profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    || s.profiles?.phone?.includes(searchQuery)
  );

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
      <h1 className="text-lg font-semibold tracking-tight">Mess Attendance</h1>

      {/* 1. Mess QR Code Section */}
      <Card className="border-teal-200 bg-teal-50/30">
        <CardHeader className="py-3 pb-0">
          <CardTitle className="text-base text-teal-800 flex items-center gap-2">
            Mess QR Code
            <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-[10px]">
              Students scan this
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Mess QR Code"
                className="w-full max-w-[240px] h-auto rounded-lg border border-teal-200 shadow-sm"
              />
            ) : (
              <div className="w-[240px] h-[320px] bg-teal-100/50 rounded-lg animate-pulse" />
            )}
            <div className="flex sm:flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-teal-300 text-teal-700 hover:bg-teal-50"
                onClick={() => setQrFullscreen(true)}
              >
                <Maximize2 className="h-4 w-4 mr-1" /> Fullscreen
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-teal-300 text-teal-700 hover:bg-teal-50"
                onClick={handleDownloadQr}
              >
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-teal-300 text-teal-700 hover:bg-teal-50"
                onClick={handlePrintQr}
              >
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Fullscreen Dialog */}
      <Dialog open={qrFullscreen} onOpenChange={setQrFullscreen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mess QR Code — {mess.name}</DialogTitle>
          </DialogHeader>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="Mess QR" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Meal Attendance Cards */}
      <div className="grid grid-cols-3 gap-3">
        {MEALS.map(meal => {
          const consumed = todayAttendance.filter(a => a.meal_type === meal).length;
          const total = activeSubsForAttendance.filter(s =>
            (s.mess_packages?.meal_types as string[])?.includes(meal)
          ).length;
          const pct = total > 0 ? Math.round((consumed / total) * 100) : 0;
          const isCurrent = meal === currentMeal;

          return (
            <Card key={meal} className={isCurrent ? 'border-teal-300 bg-teal-50/50 ring-1 ring-teal-200' : ''}>
              <CardContent className="p-3 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5">
                  <span className={isCurrent ? 'text-teal-600' : 'text-muted-foreground'}>
                    {MEAL_ICONS[meal]}
                  </span>
                  <span className={`text-xs font-medium ${isCurrent ? 'text-teal-700' : 'text-muted-foreground'}`}>
                    {MEAL_LABELS[meal]}
                  </span>
                  {isCurrent && (
                    <Badge className="bg-teal-600 text-white text-[9px] px-1.5 py-0">Now</Badge>
                  )}
                </div>
                <p className={`text-2xl font-bold ${isCurrent ? 'text-teal-700' : 'text-foreground'}`}>
                  {consumed}<span className="text-sm font-normal text-muted-foreground">/{total}</span>
                </p>
                <Progress value={pct} className="h-2 bg-teal-100" />
                <p className="text-[10px] text-muted-foreground">{pct}% attendance</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 3. Subscriber Status Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-teal-50/40 border-teal-100">
          <CardContent className="p-3 text-center">
            <Users className="h-4 w-4 mx-auto text-teal-600 mb-1" />
            <p className="text-[10px] uppercase text-muted-foreground">Total Subscribers</p>
            <p className="text-xl font-bold text-teal-700">{totalSubscribers}</p>
          </CardContent>
        </Card>
        <Card className="bg-teal-50/40 border-teal-100">
          <CardContent className="p-3 text-center">
            <UserCheck className="h-4 w-4 mx-auto text-teal-600 mb-1" />
            <p className="text-[10px] uppercase text-muted-foreground">Present Today</p>
            <p className="text-xl font-bold text-teal-700">{uniqueStudentsToday}</p>
          </CardContent>
        </Card>
        <Card className="bg-teal-50/40 border-teal-100">
          <CardContent className="p-3 text-center">
            <UserX className="h-4 w-4 mx-auto text-teal-600 mb-1" />
            <p className="text-[10px] uppercase text-muted-foreground">Absent Today</p>
            <p className="text-xl font-bold text-teal-700">{absentToday}</p>
          </CardContent>
        </Card>
      </div>

      {/* 4. Live Attendance Feed */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-600" />
            Live Attendance Feed
            <Badge variant="outline" className="text-[10px] border-teal-200 text-teal-600 ml-auto">
              Auto-refreshes
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAttendance.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No attendance entries yet today. Students will appear here when they scan the QR.
            </p>
          ) : (
            <div className="divide-y max-h-[300px] overflow-y-auto">
              {todayAttendance.slice(0, 50).map((a: any, i: number) => (
                <div key={a.id || i} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{a.profiles?.name || 'Student'}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {a.marked_at ? format(new Date(a.marked_at), 'hh:mm a') : '—'}
                    </p>
                  </div>
                  <Badge
                    className={
                      a.meal_type === 'breakfast'
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : a.meal_type === 'lunch'
                        ? 'bg-teal-100 text-teal-700 border-teal-200'
                        : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    }
                  >
                    {MEAL_LABELS[a.meal_type] || a.meal_type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Manual Attendance Correction */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Manual Attendance Correction</CardTitle>
          <div className="flex gap-2 mt-2">
            <Input
              type="date"
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
              {activeSubsForAttendance.length === 0 ? 'No active subscribers.' : 'No matching students.'}
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
                            disabled={!!marked}
                            className={marked ? 'bg-teal-600 hover:bg-teal-700' : 'border-teal-300 text-teal-700 hover:bg-teal-50'}
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
