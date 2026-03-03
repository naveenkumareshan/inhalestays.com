import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { laundryCloudService } from '@/api/laundryCloudService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Minus, Plus, ShoppingBag, MapPin, Clock, CreditCard, CheckCircle2, ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

type LaundryItem = { id: string; name: string; icon: string; price: number; category: string };
type PickupSlot = { id: string; slot_name: string; start_time: string; end_time: string };
type CartItem = LaundryItem & { quantity: number };

const STEPS = ['Items', 'Address', 'Schedule', 'Review', 'Payment'];

const CATEGORY_STYLES: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  clothing: { bg: 'bg-primary/5', border: 'border-primary/20', badge: 'bg-primary', text: 'text-primary' },
  bedding: { bg: 'bg-secondary/10', border: 'border-secondary/30', badge: 'bg-secondary', text: 'text-secondary' },
  special: { bg: 'bg-accent/10', border: 'border-accent/30', badge: 'bg-accent', text: 'text-accent-foreground' },
};

const Laundry = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<LaundryItem[]>([]);
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState({ room: '', block: '', floor: '', landmark: '' });
  const [pickupDate, setPickupDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [itemsData, slotsData] = await Promise.all([
          laundryCloudService.getItems(),
          laundryCloudService.getPickupSlots(),
        ]);
        setItems(itemsData || []);
        setSlots(slotsData || []);
      } catch { /* empty */ } finally { setLoading(false); }
    };
    load();
  }, []);

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

  const canProceed = () => {
    if (step === 0) return totalItems > 0;
    if (step === 1) return address.room && address.block && address.floor;
    if (step === 2) return pickupDate && selectedSlot;
    return true;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const order = await laundryCloudService.createOrder({
        user_id: user.id,
        pickup_address: address,
        pickup_date: pickupDate,
        pickup_time_slot: selectedSlot,
        total_amount: total,
        payment_method: 'online',
        notes,
        items: cartItems.map(i => ({
          item_id: i.id,
          item_name: i.name,
          item_price: i.price,
          quantity: i.quantity,
          subtotal: i.price * i.quantity,
        })),
      });

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await supabase.functions.invoke('razorpay-create-order', {
        body: { amount: total, bookingId: order.id, bookingType: 'laundry' },
      });

      if (res.data?.testMode) {
        await supabase.functions.invoke('razorpay-verify-payment', {
          body: { bookingId: order.id, bookingType: 'laundry', testMode: true },
        });
        setCreatedOrder(order);
        setStep(4);
        toast({ title: 'Order placed!', description: 'Test mode — payment auto-confirmed.' });
      } else if (res.data?.id) {
        const options = {
          key: res.data.KEY_ID,
          amount: res.data.amount,
          currency: res.data.currency,
          name: 'InhaleStays Laundry',
          description: `Laundry Order`,
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
            setCreatedOrder(order);
            setStep(4);
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

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md text-center">
        <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/80 p-8 text-primary-foreground shadow-lg">
          <ShoppingBag className="h-16 w-16 mx-auto mb-4 opacity-90" />
          <h1 className="text-2xl font-bold mb-2">Laundry Service</h1>
          <p className="opacity-90 mb-6">Login to use our convenient laundry pickup & delivery service</p>
          <Button asChild className="w-full bg-white text-primary hover:bg-white/90 font-semibold">
            <Link to="/student/login">Login to Continue</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-0 max-w-lg">
      {/* Gradient Hero Header */}
      <div className="rounded-b-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/80 px-5 py-5 -mx-4 mb-5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Laundry Service
            </h1>
            <p className="text-xs opacity-80 mt-0.5">Professional pickup & delivery</p>
          </div>
          <Button variant="secondary" size="sm" asChild className="bg-white/20 text-primary-foreground border-0 hover:bg-white/30 backdrop-blur-sm text-xs">
            <Link to="/student/laundry-orders">My Orders</Link>
          </Button>
        </div>
      </div>

      {/* Step indicator */}
      {step < 4 && (
        <div className="flex items-center gap-1.5 mb-5">
          {STEPS.slice(0, 4).map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-2 w-full rounded-full transition-all ${
                i < step ? 'bg-gradient-to-r from-primary to-accent' :
                i === step ? 'bg-gradient-to-r from-accent to-secondary' :
                'bg-muted'
              }`} />
              <span className={`text-[10px] font-medium ${
                i < step ? 'text-primary' :
                i === step ? 'text-accent-foreground' :
                'text-muted-foreground'
              }`}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Step 0: Items */}
      {step === 0 && (
        <div className="space-y-4">
          {['clothing', 'bedding', 'special'].map(cat => {
            const catItems = items.filter(i => i.category === cat);
            if (!catItems.length) return null;
            const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.clothing;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${style.badge}`} />
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${style.text}`}>{cat}</h3>
                </div>
                <div className="space-y-2">
                  {catItems.map(item => {
                    const qty = cart[item.id]?.quantity || 0;
                    return (
                      <Card key={item.id} className={`border ${qty > 0 ? style.border : 'border-border'} ${qty > 0 ? style.bg : ''} shadow-sm transition-all`}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{item.icon}</span>
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className={`text-xs font-semibold ${style.text}`}>₹{item.price}/pc</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {qty > 0 && (
                              <>
                                <Button size="icon" variant="outline" className={`h-7 w-7 border-2 ${style.border} ${style.text}`} onClick={() => updateQty(item, -1)}>
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className={`text-sm font-bold w-6 text-center ${style.text}`}>{qty}</span>
                              </>
                            )}
                            <Button size="icon" className={`h-7 w-7 ${style.badge} text-white hover:opacity-90 border-0`} onClick={() => updateQty(item, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {items.length === 0 && <p className="text-center text-muted-foreground py-8">No items available at the moment</p>}
        </div>
      )}

      {/* Step 1: Address */}
      {step === 1 && (
        <div className="space-y-4">
          <Card className="border-2 border-primary/20 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-primary/5">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <MapPin className="h-4 w-4" /> Pickup Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div><Label className="text-xs font-semibold text-primary">Room Number *</Label><Input value={address.room} onChange={e => setAddress(p => ({ ...p, room: e.target.value }))} placeholder="e.g. 201" className="border-primary/20 focus-visible:ring-primary" /></div>
              <div><Label className="text-xs font-semibold text-primary">Block/Building *</Label><Input value={address.block} onChange={e => setAddress(p => ({ ...p, block: e.target.value }))} placeholder="e.g. Block A" className="border-primary/20 focus-visible:ring-primary" /></div>
              <div><Label className="text-xs font-semibold text-primary">Floor *</Label><Input value={address.floor} onChange={e => setAddress(p => ({ ...p, floor: e.target.value }))} placeholder="e.g. 2nd Floor" className="border-primary/20 focus-visible:ring-primary" /></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Landmark</Label><Input value={address.landmark} onChange={e => setAddress(p => ({ ...p, landmark: e.target.value }))} placeholder="Near entrance gate" /></div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Schedule */}
      {step === 2 && (
        <div className="space-y-4">
          <Card className="border-2 border-accent/30 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-accent/10">
              <CardTitle className="text-base flex items-center gap-2 text-accent-foreground">
                <Clock className="h-4 w-4" /> Pickup Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <Label className="text-xs font-semibold text-accent-foreground">Pickup Date *</Label>
                <Input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} className="border-accent/30 focus-visible:ring-accent" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-accent-foreground mb-2 block">Time Slot *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {slots.map(s => (
                    <Button key={s.id} variant={selectedSlot === s.slot_name ? 'default' : 'outline'} size="sm"
                      className={`text-xs ${selectedSlot === s.slot_name ? 'bg-gradient-to-r from-primary to-accent border-0 text-primary-foreground' : 'border-accent/30 text-accent-foreground'}`}
                      onClick={() => setSelectedSlot(s.slot_name)}>
                      {s.slot_name} ({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Special Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special instructions..." />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <Card className="border-2 border-secondary/30 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-secondary/10">
              <CardTitle className="text-base text-secondary">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {cartItems.map(i => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span>{i.icon} {i.name} × {i.quantity}</span>
                  <span className="font-semibold text-secondary">₹{i.price * i.quantity}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span><span className="text-secondary">₹{total}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-primary/20 shadow-sm">
            <CardContent className="p-4 space-y-2 text-sm">
              <p><span className="text-muted-foreground">Pickup:</span> Room {address.room}, {address.block}, {address.floor}</p>
              <p><span className="text-muted-foreground">Date:</span> {pickupDate}</p>
              <p><span className="text-muted-foreground">Slot:</span> {selectedSlot}</p>
              {notes && <p><span className="text-muted-foreground">Notes:</span> {notes}</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && createdOrder && (
        <div className="text-center space-y-6 py-4">
          <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/80 p-8 text-primary-foreground shadow-lg">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-3 drop-shadow" />
            <h2 className="text-xl font-bold mb-1">Order Placed!</h2>
            <p className="text-sm opacity-90">Your laundry will be picked up soon</p>
          </div>
          <Card className="border-2 border-primary/20 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Pickup OTP</p>
                <p className="text-3xl font-bold tracking-widest bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{createdOrder.pickup_otp}</p>
                <p className="text-xs text-muted-foreground mt-1">Share this with the pickup agent</p>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">Order: {createdOrder.serial_number || createdOrder.id.slice(0, 8)}</p>
              <p className="text-sm font-semibold text-secondary">Total: ₹{total}</p>
            </CardContent>
          </Card>
          <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground border-0" asChild>
            <Link to="/student/laundry-orders">View My Orders</Link>
          </Button>
        </div>
      )}

      {/* Bottom bar */}
      {step < 4 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-primary via-primary/90 to-accent/80 p-4 flex items-center gap-3 max-w-lg mx-auto z-10 shadow-[0_-4px_20px_hsl(var(--primary)/0.3)]">
          {step > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setStep(s => s - 1)} className="bg-white/20 text-primary-foreground border-0 hover:bg-white/30 backdrop-blur-sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          <div className="flex-1 text-right">
            {totalItems > 0 && <span className="text-sm font-semibold text-primary-foreground">{totalItems} items • ₹{total}</span>}
          </div>
          {step < 3 ? (
            <Button size="sm" disabled={!canProceed()} onClick={() => setStep(s => s + 1)} className="bg-white text-primary hover:bg-white/90 border-0 font-semibold disabled:opacity-50">
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" disabled={submitting} onClick={handleSubmit} className="bg-white text-primary hover:bg-white/90 border-0 font-semibold disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CreditCard className="h-4 w-4 mr-1" />}
              Pay ₹{total}
            </Button>
          )}
        </div>
      )}
      {step < 4 && <div className="h-20" />}
    </div>
  );
};

export default Laundry;
