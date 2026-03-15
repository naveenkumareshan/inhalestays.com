import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { laundryCloudService } from '@/api/laundryCloudService';
import { isUUID } from '@/utils/idUtils';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import ErrorBoundary from '@/components/ErrorBoundary';
import {
  ArrowLeft, CalendarIcon, Clock, Loader2, MapPin,
  Minus, Plus, Shirt, ShoppingBag, Truck, CheckCircle2, CreditCard,
} from 'lucide-react';

type LaundryItem = { id: string; name: string; icon: string; price: number; category: string };
type PickupSlot = { id: string; slot_name: string; start_time: string; end_time: string };
type CartItem = LaundryItem & { quantity: number };

const CATEGORY_STYLES: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  clothing: { bg: 'bg-primary/5', border: 'border-primary/20', badge: 'bg-primary', text: 'text-primary' },
  bedding: { bg: 'bg-secondary/10', border: 'border-secondary/30', badge: 'bg-secondary', text: 'text-secondary' },
  special: { bg: 'bg-accent/10', border: 'border-accent/30', badge: 'bg-accent', text: 'text-accent-foreground' },
};

const DetailSkeleton = () => (
  <div className="min-h-screen bg-background pb-24">
    <div className="px-3 pt-4 space-y-3 max-w-lg mx-auto">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-[120px] w-full rounded-xl" />
      <Skeleton className="h-[200px] w-full rounded-xl" />
    </div>
  </div>
);

export default function LaundryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LaundryItem[]>([]);
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [address, setAddress] = useState({ room: '', block: '', floor: '', landmark: '' });
  const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  useEffect(() => {
    if (id) loadDetail();
  }, [id]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const found = isUUID(id!)
        ? await laundryCloudService.getPartnerById(id!)
        : await laundryCloudService.getPartnerBySerialNumber(id!);
      if (!found) { navigate('/laundry'); return; }
      setPartner(found);

      const [itemsData, slotsData] = await Promise.all([
        laundryCloudService.getItems(found.id),
        laundryCloudService.getPickupSlots(found.id),
      ]);
      setItems(itemsData || []);
      setSlots(slotsData || []);
    } catch {
      toast({ title: 'Failed to load laundry details', variant: 'destructive' });
      navigate('/laundry');
    }
    setLoading(false);
  };

  const updateQty = (item: LaundryItem, delta: number) => {
    setCart(prev => {
      const cur = prev[item.id]?.quantity || 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) { const { [item.id]: _, ...rest } = prev; return rest; }
      return { ...prev, [item.id]: { ...item, quantity: next } };
    });
  };

  const cartItems = Object.values(cart);
  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);

  const canSubmit = totalItems > 0 && address.room && address.block && address.floor && pickupDate && selectedSlot;

  const handleSubmit = async () => {
    if (!user || !partner) return;
    if (!isAuthenticated) {
      navigate('/student/login', { state: { from: location.pathname } });
      return;
    }
    setSubmitting(true);
    try {
      const order = await laundryCloudService.createOrder({
        user_id: user.id,
        pickup_address: address,
        pickup_date: format(pickupDate!, 'yyyy-MM-dd'),
        pickup_time_slot: selectedSlot,
        total_amount: total,
        payment_method: 'online',
        notes,
        partner_id: partner.id,
        items: cartItems.map(i => ({
          item_id: i.id, item_name: i.name, item_price: i.price, quantity: i.quantity, subtotal: i.price * i.quantity,
        })),
      });

      const res = await supabase.functions.invoke('razorpay-create-order', {
        body: { amount: total, bookingId: order.id, bookingType: 'laundry' },
      });

      if (res.data?.testMode) {
        await supabase.functions.invoke('razorpay-verify-payment', {
          body: { bookingId: order.id, bookingType: 'laundry', testMode: true },
        });
        const updated = await laundryCloudService.getOrderById(order.id);
        setCreatedOrder(updated || order);
        toast({ title: 'Order placed!', description: 'Test mode — payment auto-confirmed.' });
      } else if (res.data?.id) {
        const options = {
          key: res.data.KEY_ID,
          amount: res.data.amount,
          currency: res.data.currency,
          name: 'InhaleStays Laundry',
          description: 'Laundry Order',
          order_id: res.data.id,
          handler: async (response: any) => {
            await supabase.functions.invoke('razorpay-verify-payment', {
              body: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: order.id,
                bookingType: 'laundry',
              },
            });
            const updated = await laundryCloudService.getOrderById(order.id);
            setCreatedOrder(updated || order);
            toast({ title: 'Payment successful!', description: 'Your laundry order has been placed.' });
          },
          prefill: { name: user.name || '', email: user.email || '' },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  if (loading) return <DetailSkeleton />;
  if (!partner) return null;

  // ── Confirmation Screen ──
  if (createdOrder) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-3 py-6 space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/80 p-8 text-primary-foreground shadow-lg text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-3 drop-shadow" />
            <h2 className="text-xl font-bold mb-1">Order Placed!</h2>
            <p className="text-sm opacity-90">Your laundry will be picked up soon</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Pickup OTP</p>
              <p className="text-3xl font-bold tracking-widest bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {createdOrder.pickup_otp || '----'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Share this with the pickup agent</p>
            </div>
            <Separator />
            <p className="text-sm text-muted-foreground">Order: {createdOrder.serial_number || createdOrder.id?.slice(0, 8)}</p>
            <p className="text-sm font-semibold text-secondary">Total: ₹{total}</p>
          </div>
          <Button className="w-full" onClick={() => navigate('/student/bookings')}>
            View My Bookings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-lg mx-auto">
          {/* ── Header ── */}
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-3 py-2 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-foreground truncate">{partner.business_name}</span>
          </div>

          {/* ── Partner Info ── */}
          <div className="px-3 pt-3 pb-2">
            <div className="bg-muted/30 rounded-xl p-3 border border-border/50 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shirt className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-base font-bold text-foreground truncate">{partner.business_name}</h1>
                  {partner.service_area && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{partner.service_area}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {partner.delivery_time_hours && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Truck className="h-2.5 w-2.5" /> {partner.delivery_time_hours}h delivery
                  </Badge>
                )}
                {partner.operating_hours && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Clock className="h-2.5 w-2.5" /> {(partner.operating_hours as any)?.start} - {(partner.operating_hours as any)?.end}
                  </Badge>
                )}
              </div>
              {partner.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{partner.description}</p>
              )}
            </div>
          </div>

          {/* ── Items Selection ── */}
          <div className="px-3 pt-2">
            <h2 className="text-sm font-semibold text-foreground mb-2">Select Items</h2>
            <div className="space-y-4">
              {['clothing', 'bedding', 'special'].map(cat => {
                const catItems = items.filter(i => i.category === cat);
                if (!catItems.length) return null;
                const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.clothing;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-block w-2 h-2 rounded-full ${style.badge}`} />
                      <h3 className={`text-xs font-bold uppercase tracking-wider ${style.text}`}>{cat}</h3>
                    </div>
                    <div className="space-y-1.5">
                      {catItems.map(item => {
                        const qty = cart[item.id]?.quantity || 0;
                        return (
                          <div key={item.id} className={`flex items-center justify-between p-2.5 rounded-xl border ${qty > 0 ? `${style.border} ${style.bg}` : 'border-border'} transition-all`}>
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">{item.icon}</span>
                              <div>
                                <p className="text-sm font-medium text-foreground">{item.name}</p>
                                <p className={`text-xs font-semibold ${style.text}`}>₹{item.price}/pc</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {qty > 0 && (
                                <>
                                  <Button size="icon" variant="outline" className={`h-7 w-7 border-2 ${style.border} ${style.text}`} onClick={() => updateQty(item, -1)}>
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className={`text-sm font-bold w-5 text-center ${style.text}`}>{qty}</span>
                                </>
                              )}
                              <Button size="icon" className={`h-7 w-7 ${style.badge} text-white hover:opacity-90 border-0`} onClick={() => updateQty(item, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">No items available</p>}
            </div>
          </div>

          {/* ── Pickup Schedule ── */}
          {totalItems > 0 && (
            <div className="px-3 pt-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">Pickup Schedule</h2>
              <div className="bg-muted/30 rounded-xl p-3 border border-border/50 space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-foreground mb-1 block">Pickup Date</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !pickupDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {pickupDate ? format(pickupDate, 'PPP') : 'Select pickup date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={pickupDate}
                        onSelect={(d) => { setPickupDate(d); setCalendarOpen(false); }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-foreground mb-1.5 block">Time Slot</Label>
                  <div className="flex flex-wrap gap-2">
                    {slots.map(s => (
                      <Button
                        key={s.id}
                        variant={selectedSlot === s.slot_name ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={() => setSelectedSlot(s.slot_name)}
                      >
                        {s.slot_name} ({s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)})
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Special Notes</Label>
                  <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special instructions..." className="mt-1" />
                </div>
              </div>
            </div>
          )}

          {/* ── Address ── */}
          {totalItems > 0 && (
            <div className="px-3 pt-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">Pickup Address</h2>
              <div className="bg-muted/30 rounded-xl p-3 border border-border/50 space-y-2.5">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Room Number *</Label>
                  <Input value={address.room} onChange={e => setAddress(p => ({ ...p, room: e.target.value }))} placeholder="e.g. 201" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-foreground">Block/Building *</Label>
                  <Input value={address.block} onChange={e => setAddress(p => ({ ...p, block: e.target.value }))} placeholder="e.g. Block A" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-foreground">Floor *</Label>
                  <Input value={address.floor} onChange={e => setAddress(p => ({ ...p, floor: e.target.value }))} placeholder="e.g. 2nd Floor" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Landmark</Label>
                  <Input value={address.landmark} onChange={e => setAddress(p => ({ ...p, landmark: e.target.value }))} placeholder="Near entrance gate" className="mt-1" />
                </div>
              </div>
            </div>
          )}

          <div className="h-24" />
        </div>

        {/* ── Bottom Bar ── */}
        {totalItems > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 flex items-center gap-3 max-w-lg mx-auto z-10 shadow-lg">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
              <p className="text-base font-bold text-foreground">₹{total}</p>
            </div>
            <Button
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              className="px-6"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Pay ₹{total}
            </Button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
