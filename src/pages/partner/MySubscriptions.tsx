import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Crown, Building, Hotel, Check, ArrowRight, CreditCard, Calendar, Loader2 } from 'lucide-react';

const PLAN_ICONS: Record<string, string> = { silver: '🥈', gold: '🥇', platinum: '💎', diamond: '👑' };

export default function MySubscriptions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [capacityUpgrades, setCapacityUpgrades] = useState(0);
  const [step, setStep] = useState(0); // 0=closed, 1=select plan, 2=capacity, 3=summary
  const [processing, setProcessing] = useState(false);

  // Get partner
  const { data: partner } = useQuery({
    queryKey: ['my-partner', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('partners').select('id').eq('user_id', user?.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Get properties
  const { data: cabins = [] } = useQuery({
    queryKey: ['my-cabins', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('cabins').select('id, name, capacity').eq('created_by', user?.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: hostels = [] } = useQuery({
    queryKey: ['my-hostels', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('hostels').select('id, name').eq('created_by', user?.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Get all subscriptions
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['my-subscriptions', partner?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('property_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('partner_id', partner!.id)
        .in('status', ['active', 'pending_payment'])
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!partner?.id,
  });

  // Get plans
  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      return data || [];
    },
  });

  const getPropertySub = (propertyId: string) =>
    subscriptions.find((s: any) => s.property_id === propertyId && s.status === 'active');

  const allProperties = [
    ...cabins.map((c: any) => ({ ...c, type: 'reading_room' as const, icon: Building })),
    ...hostels.map((h: any) => ({ ...h, type: 'hostel' as const, icon: Hotel })),
  ];

  const openSubscribe = (property: any) => {
    setSelectedProperty(property);
    setSelectedPlan(null);
    setCapacityUpgrades(0);
    setStep(1);
  };

  const currentPlanOrder = () => {
    const sub = getPropertySub(selectedProperty?.id);
    return (sub as any)?.subscription_plans?.display_order || 0;
  };

  const availablePlans = plans.filter((p: any) => p.display_order > currentPlanOrder());

  const handlePayment = async () => {
    if (!selectedPlan || !selectedProperty) return;
    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('subscription-create-order', {
        body: {
          planId: selectedPlan.id,
          propertyId: selectedProperty.id,
          propertyType: selectedProperty.type,
          capacityUpgrades,
        },
      });

      if (error) throw error;

      if (data.testMode) {
        // Test mode: directly verify
        const { error: verifyError } = await supabase.functions.invoke('subscription-verify-payment', {
          body: { subscriptionId: data.subscriptionId, testMode: true },
        });
        if (verifyError) throw verifyError;
        toast({ title: '✅ Subscription Activated (Test Mode)', description: `${selectedPlan.name} plan activated for ${selectedProperty.name}` });
        queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
        setStep(0);
        setProcessing(false);
        return;
      }

      // Real Razorpay flow
      const options = {
        key: data.KEY_ID,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'InhaleStays',
        description: `${selectedPlan.name} Plan - ${selectedProperty.name}`,
        order_id: data.id,
        handler: async (response: any) => {
          try {
            const { error: verifyError } = await supabase.functions.invoke('subscription-verify-payment', {
              body: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                subscriptionId: data.subscriptionId,
              },
            });
            if (verifyError) throw verifyError;
            toast({ title: '✅ Subscription Activated!', description: `${selectedPlan.name} plan activated` });
            queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
            setStep(0);
          } catch (e: any) {
            toast({ title: 'Verification failed', description: e.message, variant: 'destructive' });
          }
        },
        theme: { color: '#6366f1' },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        throw new Error('Razorpay SDK not loaded');
      }
    } catch (e: any) {
      toast({ title: 'Payment Error', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const totalAmount = selectedPlan
    ? selectedPlan.price_yearly + (capacityUpgrades > 0 && selectedPlan.capacity_upgrade_enabled ? capacityUpgrades * selectedPlan.capacity_upgrade_price : 0)
    : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2"><Crown className="h-5 w-5" /> My Subscriptions</h1>

      {allProperties.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No properties found. Add a Reading Room or Hostel first.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {allProperties.map((property) => {
            const sub = getPropertySub(property.id);
            const plan = (sub as any)?.subscription_plans;
            const endDate = sub?.end_date ? new Date(sub.end_date) : null;
            const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000)) : 0;

            return (
              <Card key={property.id} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <property.icon className="h-4 w-4 text-muted-foreground" />
                      {property.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] capitalize">{property.type.replace('_', ' ')}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {plan ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{PLAN_ICONS[plan.slug] || '📋'}</span>
                        <span className="font-semibold text-sm">{plan.name} Plan</span>
                        <Badge className="text-[10px]">Active</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Expires: {sub?.end_date}</span>
                        <Badge variant={daysLeft > 30 ? 'default' : 'destructive'} className="text-[10px]">{daysLeft} days left</Badge>
                      </div>
                      {sub?.capacity_upgrades > 0 && (
                        <p className="text-xs text-muted-foreground">+{sub.capacity_upgrades} capacity upgrade slab(s)</p>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openSubscribe(property)} className="text-xs mt-1">
                        <ArrowRight className="h-3 w-3 mr-1" />Upgrade
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">No active plan</p>
                      <Button size="sm" onClick={() => openSubscribe(property)} className="text-xs">
                        <CreditCard className="h-3 w-3 mr-1" />Subscribe Now
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Subscribe/Upgrade Dialog */}
      <Dialog open={step > 0} onOpenChange={() => setStep(0)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {step === 1 && 'Select Plan'}
              {step === 2 && 'Capacity Upgrades'}
              {step === 3 && 'Order Summary'}
            </DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="grid gap-3 md:grid-cols-2">
              {availablePlans.length === 0 ? (
                <p className="col-span-2 text-center text-sm text-muted-foreground py-6">You are on the highest plan. No upgrades available.</p>
              ) : availablePlans.map((plan: any) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all hover:border-primary ${selectedPlan?.id === plan.id ? 'border-primary ring-2 ring-primary/20' : ''}`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{PLAN_ICONS[plan.slug] || '📋'}</span>
                      <div>
                        <p className="font-semibold text-sm">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">₹{plan.price_monthly_display}/mo (billed yearly)</p>
                      </div>
                    </div>
                    <p className="text-xs font-medium">₹{plan.price_yearly}/year</p>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Hostel: {plan.hostel_bed_limit === 0 ? 'Unlimited' : `Up to ${plan.hostel_bed_limit} beds`}</p>
                      <p>Reading Room: {plan.reading_room_seat_limit === 0 ? 'Unlimited' : `Up to ${plan.reading_room_seat_limit} seats`}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(Array.isArray(plan.features) ? plan.features : []).slice(0, 5).map((f: string) => (
                        <Badge key={f} variant="secondary" className="text-[9px]">{f.replace(/_/g, ' ')}</Badge>
                      ))}
                      {(Array.isArray(plan.features) ? plan.features : []).length > 5 && (
                        <Badge variant="secondary" className="text-[9px]">+{plan.features.length - 5} more</Badge>
                      )}
                    </div>
                    {selectedPlan?.id === plan.id && (
                      <div className="flex items-center gap-1 text-primary text-xs font-medium"><Check className="h-3 w-3" />Selected</div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {selectedPlan && (
                <div className="col-span-full flex justify-end">
                  <Button onClick={() => setStep(selectedPlan.capacity_upgrade_enabled ? 2 : 3)}>
                    Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 2 && selectedPlan && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Need more capacity? Add upgrade slabs at ₹{selectedPlan.capacity_upgrade_price} each.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-xs text-muted-foreground">
                  <p>Per slab: +{selectedPlan.capacity_upgrade_slab_beds} beds / +{selectedPlan.capacity_upgrade_slab_seats} seats</p>
                </div>
                <div>
                  <Label className="text-xs">Number of Slabs</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={capacityUpgrades}
                    onChange={e => setCapacityUpgrades(Math.max(0, Number(e.target.value)))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              {capacityUpgrades > 0 && (
                <p className="text-xs font-medium">
                  Extra capacity: +{capacityUpgrades * selectedPlan.capacity_upgrade_slab_beds} beds / +{capacityUpgrades * selectedPlan.capacity_upgrade_slab_seats} seats = ₹{capacityUpgrades * selectedPlan.capacity_upgrade_price}
                </p>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)}>Next <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
              </div>
            </div>
          )}

          {step === 3 && selectedPlan && selectedProperty && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Property</span>
                  <span className="font-medium">{selectedProperty.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Plan</span>
                  <span className="font-medium">{PLAN_ICONS[selectedPlan.slug]} {selectedPlan.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Plan Price (Yearly)</span>
                  <span>₹{selectedPlan.price_yearly}</span>
                </div>
                {capacityUpgrades > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Capacity Upgrades ({capacityUpgrades} slabs)</span>
                    <span>₹{capacityUpgrades * selectedPlan.capacity_upgrade_price}</span>
                  </div>
                )}
                <hr />
                <div className="flex justify-between text-sm font-bold">
                  <span>Total (Yearly)</span>
                  <span>₹{totalAmount}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">No refunds. No downgrades. Billed yearly.</p>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(selectedPlan.capacity_upgrade_enabled ? 2 : 1)}>Back</Button>
                <Button onClick={handlePayment} disabled={processing}>
                  {processing ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Processing...</> : <>Pay ₹{totalAmount}</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
