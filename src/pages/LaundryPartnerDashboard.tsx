import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { laundryCloudService } from '@/api/laundryCloudService';
import { toast } from '@/hooks/use-toast';
import { Loader2, Package, CheckCircle2, Phone } from 'lucide-react';

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-800', pickup_scheduled: 'bg-indigo-100 text-indigo-800',
  picked_up: 'bg-violet-100 text-violet-800', washing: 'bg-cyan-100 text-cyan-800',
  ready: 'bg-teal-100 text-teal-800', out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
};

const PARTNER_STATUSES = ['pickup_scheduled', 'picked_up', 'washing', 'ready', 'out_for_delivery', 'delivered'];

interface LaundryPartnerDashboardProps {
  autoCreateNew?: boolean;
  onTriggerConsumed?: () => void;
}

const LaundryPartnerDashboard: React.FC<LaundryPartnerDashboardProps> = ({ autoCreateNew, onTriggerConsumed } = {}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setOrders(await laundryCloudService.partnerGetOrders() || []); } catch { /* empty */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Auto-create: show setup prompt when triggered with no orders
  useEffect(() => {
    if (autoCreateNew) {
      onTriggerConsumed?.();
      // The dashboard will render and show the empty state with setup options
    }
  }, [autoCreateNew]);

  const verifyOtp = async (orderId: string, type: 'pickup' | 'delivery') => {
    const otp = otpInputs[`${orderId}_${type}`];
    if (!otp || otp.length !== 4) {
      toast({ title: 'Enter 4-digit OTP', variant: 'destructive' });
      return;
    }
    setVerifying(orderId);
    try {
      await laundryCloudService.partnerVerifyOtp(orderId, otp, type);
      toast({ title: `${type === 'pickup' ? 'Pickup' : 'Delivery'} OTP verified!` });
      load();
    } catch (e: any) {
      toast({ title: 'Invalid OTP', description: e.message, variant: 'destructive' });
    } finally { setVerifying(null); }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await laundryCloudService.adminUpdateOrder(orderId, { status });
      toast({ title: 'Status updated' });
      load();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Partner Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage your assigned laundry orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}</p>
          <p className="text-[10px] text-muted-foreground">Active</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{orders.filter(o => o.status === 'delivered').length}</p>
          <p className="text-[10px] text-muted-foreground">Completed</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">₹{orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total_amount || 0), 0)}</p>
          <p className="text-[10px] text-muted-foreground">Earnings</p>
        </CardContent></Card>
      </div>

      <div className="space-y-3">
        {orders.map(o => (
          <Card key={o.id} className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{o.serial_number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] ${statusColors[o.status] || 'bg-muted'}`}>{o.status?.replace(/_/g, ' ')}</Badge>
                  <span className="text-sm font-medium">₹{o.total_amount}</span>
                </div>
              </div>

              {/* Student info */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{(o.profiles as any)?.name}</span>
                {(o.profiles as any)?.phone && (
                  <a href={`tel:${(o.profiles as any).phone}`} className="flex items-center gap-1 text-primary">
                    <Phone className="h-3 w-3" /> {(o.profiles as any).phone}
                  </a>
                )}
              </div>

              {/* Address */}
              {o.pickup_address && (
                <p className="text-xs bg-muted/50 rounded p-2">
                  📍 Room {(o.pickup_address as any)?.room}, {(o.pickup_address as any)?.block}, {(o.pickup_address as any)?.floor}
                  {(o.pickup_address as any)?.landmark ? ` • ${(o.pickup_address as any).landmark}` : ''}
                </p>
              )}

              {/* Items */}
              <div className="text-xs space-y-1">
                {o.laundry_order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.item_name} × {item.quantity}</span>
                    <span>₹{item.subtotal}</span>
                  </div>
                ))}
              </div>

              {/* OTP verification for pickup */}
              {!o.pickup_otp_verified && o.status !== 'delivered' && o.status !== 'cancelled' && (
                <div className="flex gap-2">
                  <Input placeholder="Pickup OTP" className="h-8 text-xs flex-1" maxLength={4}
                    value={otpInputs[`${o.id}_pickup`] || ''}
                    onChange={e => setOtpInputs(p => ({ ...p, [`${o.id}_pickup`]: e.target.value }))} />
                  <Button size="sm" className="h-8 text-xs" onClick={() => verifyOtp(o.id, 'pickup')} disabled={verifying === o.id}>
                    {verifying === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                    Verify Pickup
                  </Button>
                </div>
              )}

              {/* OTP verification for delivery */}
              {o.pickup_otp_verified && !o.delivery_otp_verified && o.status !== 'delivered' && (
                <div className="flex gap-2">
                  <Input placeholder="Delivery OTP" className="h-8 text-xs flex-1" maxLength={4}
                    value={otpInputs[`${o.id}_delivery`] || ''}
                    onChange={e => setOtpInputs(p => ({ ...p, [`${o.id}_delivery`]: e.target.value }))} />
                  <Button size="sm" className="h-8 text-xs" onClick={() => verifyOtp(o.id, 'delivery')} disabled={verifying === o.id}>
                    {verifying === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                    Verify Delivery
                  </Button>
                </div>
              )}

              {/* Status update */}
              {o.status !== 'delivered' && o.status !== 'cancelled' && (
                <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{PARTNER_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No orders assigned to you yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LaundryPartnerDashboard;
