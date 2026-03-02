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
import { Minus, Plus, ShoppingBag, MapPin, Clock, CreditCard, CheckCircle2, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type LaundryItem = { id: string; name: string; icon: string; price: number; category: string };
type PickupSlot = { id: string; slot_name: string; start_time: string; end_time: string };
type CartItem = LaundryItem & { quantity: number };

const STEPS = ['Items', 'Address', 'Schedule', 'Review', 'Payment'];

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

      // Razorpay payment
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
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Laundry Service</h1>
        <p className="text-muted-foreground mb-6">Login to use our convenient laundry pickup & delivery service</p>
        <Button asChild className="w-full"><Link to="/student/login">Login to Continue</Link></Button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Laundry Service</h1>
          <p className="text-sm text-muted-foreground">Professional pickup & delivery</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/student/laundry-orders">My Orders</Link>
        </Button>
      </div>

      {/* Step indicator */}
      {step < 4 && (
        <div className="flex items-center gap-1 mb-6">
          {STEPS.slice(0, 4).map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
              <span className={`text-[10px] ${i <= step ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Step 0: Items */}
      {step === 0 && (
        <div className="space-y-3">
          {['clothing', 'bedding', 'special'].map(cat => {
            const catItems = items.filter(i => i.category === cat);
            if (!catItems.length) return null;
            return (
              <div key={cat}>
                <h3 className="text-sm font-semibold capitalize mb-2 text-muted-foreground">{cat}</h3>
                <div className="space-y-2">
                  {catItems.map(item => (
                    <Card key={item.id} className="border-0 shadow-sm">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{item.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">₹{item.price}/pc</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(cart[item.id]?.quantity || 0) > 0 && (
                            <>
                              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-semibold w-6 text-center">{cart[item.id]?.quantity}</span>
                            </>
                          )}
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Pickup Address</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label className="text-xs">Room Number *</Label><Input value={address.room} onChange={e => setAddress(p => ({ ...p, room: e.target.value }))} placeholder="e.g. 201" /></div>
              <div><Label className="text-xs">Block/Building *</Label><Input value={address.block} onChange={e => setAddress(p => ({ ...p, block: e.target.value }))} placeholder="e.g. Block A" /></div>
              <div><Label className="text-xs">Floor *</Label><Input value={address.floor} onChange={e => setAddress(p => ({ ...p, floor: e.target.value }))} placeholder="e.g. 2nd Floor" /></div>
              <div><Label className="text-xs">Landmark</Label><Input value={address.landmark} onChange={e => setAddress(p => ({ ...p, landmark: e.target.value }))} placeholder="Near entrance gate" /></div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Schedule */}
      {step === 2 && (
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Pickup Schedule</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Pickup Date *</Label>
                <Input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} />
              </div>
              <div>
                <Label className="text-xs mb-2 block">Time Slot *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {slots.map(s => (
                    <Button key={s.id} variant={selectedSlot === s.slot_name ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setSelectedSlot(s.slot_name)}>
                      {s.slot_name} ({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Special Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special instructions..." />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {cartItems.map(i => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span>{i.icon} {i.name} × {i.quantity}</span>
                  <span className="font-medium">₹{i.price * i.quantity}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span><span>₹{total}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
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
        <div className="text-center space-y-6 py-8">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <div>
            <h2 className="text-xl font-bold mb-1">Order Placed!</h2>
            <p className="text-muted-foreground text-sm">Your laundry will be picked up soon</p>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Pickup OTP</p>
                <p className="text-3xl font-bold tracking-widest text-primary">{createdOrder.pickup_otp}</p>
                <p className="text-xs text-muted-foreground mt-1">Share this with the pickup agent</p>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">Order: {createdOrder.serial_number || createdOrder.id.slice(0, 8)}</p>
              <p className="text-sm font-medium">Total: ₹{total}</p>
            </CardContent>
          </Card>
          <Button className="w-full" asChild><Link to="/student/laundry-orders">View My Orders</Link></Button>
        </div>
      )}

      {/* Bottom bar */}
      {step < 4 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex items-center gap-3 max-w-lg mx-auto z-10">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          <div className="flex-1 text-right">
            {totalItems > 0 && <span className="text-sm font-medium">{totalItems} items • ₹{total}</span>}
          </div>
          {step < 3 ? (
            <Button size="sm" disabled={!canProceed()} onClick={() => setStep(s => s + 1)}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" disabled={submitting} onClick={handleSubmit}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CreditCard className="h-4 w-4 mr-1" />}
              Pay ₹{total}
            </Button>
          )}
        </div>
      )}
      {/* Spacer for fixed bottom bar */}
      {step < 4 && <div className="h-20" />}
    </div>
  );
};

export default Laundry;
