import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, ScanLine, BarChart3 } from 'lucide-react';
import {
  getMyMessPartner, getMessSubscriptions, getMessAttendance, markAttendance, getMessReceipts,
} from '@/api/messService';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { formatCurrency } from '@/utils/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MEALS = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABELS: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

export default function MessAttendance() {
  const { user } = useAuth();
  const userId = user?.role === 'vendor_employee' && user.vendorId ? user.vendorId : user?.id;
  const [loading, setLoading] = useState(true);
  const [mess, setMess] = useState<any>(null);

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receipts, setReceipts] = useState<any[]>([]);

  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { loadMess(); }, [userId]);

  const loadMess = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const m = await getMyMessPartner(userId);
      setMess(m);
      if (m) {
        const [s, r] = await Promise.all([getMessSubscriptions(m.id), getMessReceipts(m.id)]);
        setSubscriptions(s);
        setReceipts(r);
      }
    } catch { toast({ title: 'Error loading data', variant: 'destructive' }); }
    setLoading(false);
  };

  const loadAttendance = async () => {
    if (!mess?.id) return;
    setAttendance(await getMessAttendance(mess.id, attendanceDate));
  };
  useEffect(() => { if (mess?.id) loadAttendance(); }, [attendanceDate, mess?.id]);

  const handleMarkAttendance = async (subId: string, studentId: string, mealType: string) => {
    try {
      await markAttendance({ subscription_id: subId, user_id: studentId, mess_id: mess.id, date: attendanceDate, meal_type: mealType, status: 'consumed', marked_by: 'manual' });
      toast({ title: 'Attendance marked!' });
      loadAttendance();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const getCurrentMealType = (): string => {
    const hours = new Date().getHours();
    if (hours < 11) return 'breakfast';
    if (hours < 16) return 'lunch';
    return 'dinner';
  };

  const stopScanner = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setScanning(false);
  }, []);

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setScanning(true);
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); detectQR(); }
      }, 300);
    } catch { toast({ title: 'Camera access denied', variant: 'destructive' }); }
  };

  const detectQR = async () => {
    if (!videoRef.current || !streamRef.current) return;
    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) { handleQRResult(barcodes[0].rawValue); return; }
        } catch {}
        if (streamRef.current) requestAnimationFrame(scan);
      };
      scan();
    } else {
      toast({ title: 'QR scanning not supported', variant: 'destructive' });
      stopScanner();
    }
  };

  const handleQRResult = async (raw: string) => {
    stopScanner();
    try {
      const data = JSON.parse(raw);
      if (!data.subscription_id || !data.user_id) throw new Error('Invalid QR');
      const mealType = getCurrentMealType();
      await markAttendance({
        subscription_id: data.subscription_id, user_id: data.user_id,
        mess_id: mess.id, date: format(new Date(), 'yyyy-MM-dd'),
        meal_type: mealType, status: 'consumed', marked_by: 'qr',
      });
      toast({ title: 'Attendance marked via QR!', description: `${MEAL_LABELS[mealType]} marked as consumed` });
      loadAttendance();
    } catch (e: any) { toast({ title: 'QR Error', description: e.message, variant: 'destructive' }); }
  };

  // Revenue
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
  const todayRevenue = receipts.filter(r => r.created_at?.startsWith(todayStr)).reduce((s, r) => s + (r.amount || 0), 0);
  const weekRevenue = receipts.filter(r => r.created_at >= weekStart && r.created_at <= weekEnd + 'T23:59:59').reduce((s, r) => s + (r.amount || 0), 0);
  const monthRevenue = receipts.filter(r => r.created_at >= monthStart && r.created_at <= monthEnd + 'T23:59:59').reduce((s, r) => s + (r.amount || 0), 0);
  const activeSubs = subscriptions.filter(s => s.status === 'active').length;
  const todayAttendance = attendance.filter(a => a.date === todayStr);
  const activeSubsForAttendance = subscriptions.filter(s => s.status === 'active');

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i));
    const ds = format(d, 'yyyy-MM-dd');
    return { day: format(d, 'dd MMM'), revenue: receipts.filter(r => r.created_at?.startsWith(ds)).reduce((s, r) => s + (r.amount || 0), 0) };
  });

  if (loading) return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!mess) return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <p className="text-sm">No mess profile found. Create one from Manage Mess first.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">Mess Attendance & Revenue</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-[10px] uppercase text-muted-foreground">Active Subs</p><p className="text-xl font-bold text-primary">{activeSubs}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-[10px] uppercase text-muted-foreground">Today Revenue</p><p className="text-xl font-bold text-primary">{formatCurrency(todayRevenue)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-[10px] uppercase text-muted-foreground">This Week</p><p className="text-xl font-bold">{formatCurrency(weekRevenue)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-[10px] uppercase text-muted-foreground">This Month</p><p className="text-xl font-bold">{formatCurrency(monthRevenue)}</p></CardContent></Card>
      </div>

      {/* QR Scanner */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><ScanLine className="h-4 w-4" /> QR Attendance</CardTitle></CardHeader>
        <CardContent>
          {scanning ? (
            <div className="space-y-3">
              <video ref={videoRef} className="w-full max-w-sm mx-auto rounded-lg border" playsInline muted />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Current meal: <strong>{MEAL_LABELS[getCurrentMealType()]}</strong></p>
                <Button variant="outline" onClick={stopScanner} className="mt-2">Stop</Button>
              </div>
            </div>
          ) : (
            <Button onClick={startScanner}><ScanLine className="h-4 w-4 mr-2" /> Scan QR Code</Button>
          )}
        </CardContent>
      </Card>

      {/* Today's Attendance Summary */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Today's Attendance</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {MEALS.map(meal => {
              const consumed = todayAttendance.filter(a => a.meal_type === meal).length;
              const total = activeSubsForAttendance.filter(s => (s.mess_packages?.meal_types as string[])?.includes(meal)).length;
              return (
                <div key={meal} className="text-center p-3 border rounded">
                  <p className="text-xs text-muted-foreground">{MEAL_LABELS[meal]}</p>
                  <p className="text-2xl font-bold text-primary">{consumed}</p>
                  <p className="text-xs text-muted-foreground">of {total}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Manual Attendance */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Manual Attendance</CardTitle>
          <Input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="w-48 mt-2" />
        </CardHeader>
        <CardContent>
          {activeSubsForAttendance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active subscribers.</p>
          ) : (
            <div className="space-y-2">
              {activeSubsForAttendance.map((s: any, idx: number) => {
                const studentAtt = attendance.filter(a => a.subscription_id === s.id);
                return (
                  <div key={s.id} className="p-3 border rounded">
                    <p className="font-medium text-sm">
                      <span className="text-[10px] text-muted-foreground mr-1">#{idx + 1}</span>
                      {s.profiles?.name}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {((s.mess_packages?.meal_types as string[]) || MEALS).map(meal => {
                        const marked = studentAtt.find(a => a.meal_type === meal);
                        return (
                          <Button key={meal} variant={marked ? 'default' : 'outline'} size="sm" disabled={!!marked}
                            onClick={() => handleMarkAttendance(s.id, s.user_id, meal)}>
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

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Last 7 Days Revenue</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
