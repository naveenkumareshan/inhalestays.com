import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { Crown, Building, Hotel, Check, ArrowRight, CreditCard, Calendar, Loader2, Tag, X, MoreVertical, Search, RefreshCw, FileText, TrendingUp, XCircle, Eye, Download, IndianRupee } from 'lucide-react';
import { couponService } from '@/api/couponService';
import { formatCurrency } from '@/utils/currency';

const PLAN_ICONS: Record<string, string> = { silver: '🥈', gold: '🥇', platinum: '💎', diamond: '👑' };

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const statusVariant = (status: string) => {
  switch (status) {
    case 'active': return 'default';
    case 'cancelled': return 'destructive';
    case 'expired': return 'secondary';
    case 'pending_payment': return 'outline';
    default: return 'secondary';
  }
};

export default function MySubscriptions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Dialog state (subscribe/upgrade flow)
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [capacityUpgrades, setCapacityUpgrades] = useState(0);
  const [step, setStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponValidation, setCouponValidation] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // View details dialog
  const [detailSub, setDetailSub] = useState<any>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [nameFilter, setNameFilter] = useState('');

  const { data: partner } = useQuery({
    queryKey: ['my-partner', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('partners').select('id').eq('user_id', user?.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

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

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['my-subscriptions', partner?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('property_subscriptions')
        .select('*, subscription_plans!property_subscriptions_plan_id_fkey(*)')
        .eq('partner_id', partner!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!partner?.id,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans-active'],
    queryFn: async () => {
      const { data } = await supabase.from('subscription_plans').select('*').eq('is_active', true).order('display_order');
      return data || [];
    },
  });

  // Property name map
  const propertyNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    cabins.forEach((c: any) => { map[c.id] = c.name; });
    hostels.forEach((h: any) => { map[h.id] = h.name; });
    return map;
  }, [cabins, hostels]);

  const getPropertyName = (sub: any) => {
    if (sub.property_type === 'universal') return 'All Properties';
    return propertyNameMap[sub.property_id] || sub.property_id?.slice(0, 8) || '—';
  };

  const getPropertyTypeLabel = (type: string) => {
    switch (type) {
      case 'reading_room': return 'Reading Room';
      case 'hostel': return 'Hostel';
      case 'universal': return 'Universal';
      default: return type;
    }
  };

  // Summary computations
  const activeSubs = useMemo(() => subscriptions.filter((s: any) => s.status === 'active'), [subscriptions]);
  const activeCount = activeSubs.length;
  const totalYearly = useMemo(() => activeSubs.reduce((acc: number, s: any) => acc + (s.amount_paid || 0), 0), [activeSubs]);
  const totalMonthly = Math.round(totalYearly / 12);
  const nextRenewalDate = useMemo(() => {
    if (activeSubs.length === 0) return null;
    const dates = activeSubs.map((s: any) => new Date(s.end_date).getTime()).filter(Boolean);
    if (dates.length === 0) return null;
    return new Date(Math.min(...dates));
  }, [activeSubs]);

  // Filtered subscriptions
  const filteredSubs = useMemo(() => {
    return subscriptions.filter((s: any) => {
      if (typeFilter !== 'all' && s.property_type !== typeFilter) return false;
      if (nameFilter) {
        const name = getPropertyName(s).toLowerCase();
        if (!name.includes(nameFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [subscriptions, typeFilter, nameFilter, propertyNameMap]);

  // Existing helpers
  const allProperties = [
    ...cabins.map((c: any) => ({ ...c, type: 'reading_room' as const, icon: Building })),
    ...hostels.map((h: any) => ({ ...h, type: 'hostel' as const, icon: Hotel })),
  ];

  const getPropertySub = (propertyId: string) =>
    subscriptions.find((s: any) => s.property_id === propertyId && s.status === 'active');

  const universalSub = subscriptions.find((s: any) => s.property_type === 'universal' && s.status === 'active');

  const openSubscribe = (property: any) => {
    setSelectedProperty(property);
    setSelectedPlan(null);
    setCapacityUpgrades(0);
    setCouponCode('');
    setCouponValidation(null);
    setStep(1);
  };

  const openUniversalSubscribe = () => {
    setSelectedProperty({ id: null, name: 'All Properties', type: 'universal', icon: Crown });
    setSelectedPlan(null);
    setCapacityUpgrades(0);
    setCouponCode('');
    setCouponValidation(null);
    setStep(1);
  };

  const openUpgrade = (sub: any) => {
    const prop = sub.property_type === 'universal'
      ? { id: null, name: 'All Properties', type: 'universal', icon: Crown }
      : allProperties.find(p => p.id === sub.property_id) || { id: sub.property_id, name: getPropertyName(sub), type: sub.property_type, icon: Building };
    openSubscribe(prop);
  };

  const openRenew = (sub: any) => {
    openUpgrade(sub);
  };

  const currentPlanOrder = () => {
    const sub = selectedProperty?.id ? getPropertySub(selectedProperty.id) : universalSub;
    return (sub as any)?.subscription_plans?.display_order || 0;
  };

  const availablePlans = selectedProperty?.type === 'universal'
    ? plans.filter((p: any) => (p as any).is_universal)
    : plans.filter((p: any) => p.display_order > currentPlanOrder() && !(p as any).is_universal);

  const getDiscountedPrice = (plan: any) => {
    if (plan.discount_active && plan.discount_percentage > 0) {
      return plan.price_yearly - (plan.price_yearly * plan.discount_percentage / 100);
    }
    return plan.price_yearly;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !selectedPlan) return;
    setCouponLoading(true);
    try {
      const preTotal = getDiscountedPrice(selectedPlan) + (capacityUpgrades > 0 && selectedPlan?.capacity_upgrade_enabled ? capacityUpgrades * (selectedPlan?.capacity_upgrade_price || 0) * 12 : 0);
      const result = await couponService.validateCoupon(couponCode, 'subscription', preTotal);
      if (result.success && result.data) {
        setCouponValidation(result.data);
        toast({ title: '✅ Coupon Applied', description: `You save ₹${Math.round(result.data.discountAmount)}` });
      } else {
        toast({ title: 'Invalid Coupon', description: result.message || 'Could not apply coupon', variant: 'destructive' });
        setCouponValidation(null);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to validate coupon', variant: 'destructive' });
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => { setCouponCode(''); setCouponValidation(null); };

  const handlePayment = async () => {
    if (!selectedPlan || !selectedProperty) return;
    setProcessing(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error('Failed to load payment SDK.');
      const { data, error } = await supabase.functions.invoke('subscription-create-order', {
        body: {
          planId: selectedPlan.id,
          propertyId: selectedProperty.type === 'universal' ? null : selectedProperty.id,
          propertyType: selectedProperty.type === 'universal' ? 'universal' : selectedProperty.type,
          capacityUpgrades,
          couponCode: couponValidation ? couponCode.toUpperCase() : undefined,
        },
      });
      if (error) throw error;
      if (data.testMode) {
        const { error: verifyError } = await supabase.functions.invoke('subscription-verify-payment', {
          body: { subscriptionId: data.subscriptionId, testMode: true },
        });
        if (verifyError) throw verifyError;
        toast({ title: '✅ Subscription Activated (Test Mode)' });
        queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
        setStep(0);
        setProcessing(false);
        return;
      }
      const options = {
        key: data.KEY_ID, amount: data.amount, currency: data.currency || 'INR',
        name: 'InhaleStays', description: `${selectedPlan.name} Plan - ${selectedProperty.name}`, order_id: data.id,
        handler: async (response: any) => {
          try {
            const { error: verifyError } = await supabase.functions.invoke('subscription-verify-payment', {
              body: { razorpay_payment_id: response.razorpay_payment_id, razorpay_order_id: response.razorpay_order_id, razorpay_signature: response.razorpay_signature, subscriptionId: data.subscriptionId },
            });
            if (verifyError) throw verifyError;
            toast({ title: '✅ Subscription Activated!' });
            queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
            setStep(0);
          } catch (e: any) {
            toast({ title: 'Verification failed', description: e.message, variant: 'destructive' });
          }
        },
        theme: { color: '#3b7b8a' },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      toast({ title: 'Payment Error', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async (sub: any) => {
    const endDate = new Date(sub.end_date);
    if (endDate <= new Date()) {
      toast({ title: 'Cannot Cancel', description: 'This subscription has already expired.', variant: 'destructive' });
      return;
    }
    if (!confirm(`Cancel future renewal for this subscription? Your current plan will remain active until ${endDate.toLocaleDateString('en-IN')}.`)) return;
    const { error } = await supabase.from('property_subscriptions').update({ status: 'cancelled' }).eq('id', sub.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Subscription Cancelled', description: 'Future renewal has been cancelled. Current plan remains active until expiry.' });
      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
    }
  };

  const handleDownloadInvoice = (sub: any) => {
    const plan = sub.subscription_plans;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice - ${sub.serial_number || sub.id.slice(0, 8)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;color:#1a1a1a;background:#fff}.invoice{max-width:800px;margin:0 auto;padding:40px}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;border-bottom:3px solid #1a1a1a;padding-bottom:20px}.company{font-size:28px;font-weight:800}.company-sub{font-size:11px;color:#666;margin-top:4px}.invoice-meta{text-align:right}.invoice-meta h2{font-size:20px;font-weight:700}.invoice-meta p{font-size:12px;color:#666;margin-top:2px}.section{margin-bottom:24px}.section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#999;margin-bottom:8px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.info-box{background:#f8f8f8;border-radius:8px;padding:16px}.info-label{font-size:10px;text-transform:uppercase;color:#999;letter-spacing:.5px}.info-value{font-size:14px;font-weight:600;margin-top:2px}.info-value-sm{font-size:12px;color:#444;margin-top:2px}table{width:100%;border-collapse:collapse;margin-top:8px}th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;padding:8px 12px;border-bottom:2px solid #eee}td{padding:10px 12px;font-size:13px;border-bottom:1px solid #f0f0f0}td:last-child,th:last-child{text-align:right}.total-row td{font-weight:700;font-size:16px;border-top:2px solid #1a1a1a;border-bottom:none;padding-top:12px}.footer{margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#999}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.invoice{padding:20px}}</style></head><body>
<div class="invoice">
  <div class="header"><div><div class="company">InhaleStays</div><div class="company-sub">Subscription Invoice</div></div><div class="invoice-meta"><h2>INVOICE</h2><p>${sub.serial_number || '—'}</p><p>Date: ${new Date(sub.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div></div>
  <div class="info-grid section"><div class="info-box"><div class="section-title">Subscription Details</div><div class="info-value">${plan?.name || '—'} Plan</div><div class="info-value-sm">Property: ${getPropertyName(sub)}</div><div class="info-value-sm">Type: ${getPropertyTypeLabel(sub.property_type)}</div></div><div class="info-box"><div class="section-title">Billing Period</div><div class="info-value">${new Date(sub.start_date).toLocaleDateString('en-IN')} — ${new Date(sub.end_date).toLocaleDateString('en-IN')}</div><div class="info-value-sm">Billing Cycle: Yearly</div><div class="info-value-sm">Status: ${sub.status}</div></div></div>
  <div class="section"><div class="section-title">Price Breakdown</div><table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody><tr><td>${plan?.name || '—'} Plan (Yearly)</td><td>₹${sub.amount_paid || 0}</td></tr>${sub.capacity_upgrades > 0 ? `<tr><td>Capacity Upgrades (${sub.capacity_upgrades} slabs)</td><td>Included</td></tr>` : ''}<tr class="total-row"><td>Total Paid</td><td>₹${sub.amount_paid || 0}</td></tr></tbody></table></div>
  <div class="info-grid section"><div class="info-box"><div class="info-label">Payment Method</div><div class="info-value">Online (Razorpay)</div>${sub.razorpay_payment_id ? `<div class="info-label" style="margin-top:8px">Payment ID</div><div class="info-value-sm">${sub.razorpay_payment_id}</div>` : ''}</div><div class="info-box"><div class="info-label">Order ID</div><div class="info-value-sm">${sub.razorpay_order_id || '—'}</div></div></div>
  <div class="footer"><p>Thank you for choosing InhaleStays! This is a computer-generated invoice.</p></div>
</div></body></html>`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const planYearlyPrice = selectedPlan ? getDiscountedPrice(selectedPlan) : 0;
  const capacityUpgradeYearly = capacityUpgrades > 0 && selectedPlan?.capacity_upgrade_enabled ? capacityUpgrades * (selectedPlan?.capacity_upgrade_price || 0) * 12 : 0;
  const couponDiscount = couponValidation ? Math.round(couponValidation.discountAmount) : 0;
  const totalAmount = selectedPlan ? Math.max(0, planYearlyPrice + capacityUpgradeYearly - couponDiscount) : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2"><Crown className="h-5 w-5" /> My Subscriptions</h1>

      {/* Universal Package Banner */}
      {!universalSub && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/10">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Universal Package</p>
                <p className="text-xs text-muted-foreground">One plan for all your properties — Reading Rooms, Hostels & more</p>
              </div>
            </div>
            <Button size="sm" className="text-xs gap-1 shrink-0" onClick={openUniversalSubscribe}>
              <Crown className="h-3 w-3" /> Subscribe
            </Button>
          </CardContent>
        </Card>
      )}
      {universalSub && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/10">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {(universalSub as any).subscription_plans?.name || 'Universal'} Plan — All Properties
                </p>
                <p className="text-xs text-muted-foreground">
                  Active until {new Date(universalSub.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
            <Badge variant="default" className="text-[10px]">Active</Badge>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Active Plans</span>
            </div>
            <p className="text-2xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <IndianRupee className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Monthly Cost</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalMonthly)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Yearly Billing</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalYearly)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Next Renewal</span>
            </div>
            {nextRenewalDate ? (
              <div>
                <p className="text-sm font-bold">{nextRenewalDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <Button size="sm" variant="outline" className="text-[10px] h-6 mt-1 px-2" onClick={() => {
                  const sub = activeSubs.reduce((a: any, b: any) => new Date(a.end_date) < new Date(b.end_date) ? a : b);
                  openRenew(sub);
                }}>
                  <RefreshCw className="h-2.5 w-2.5 mr-1" />Renew
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active plans</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-xs w-full sm:w-44">
            <SelectValue placeholder="Property Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="reading_room">Reading Room</SelectItem>
            <SelectItem value="hostel">Hostel</SelectItem>
            <SelectItem value="universal">Universal</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search property name..." value={nameFilter} onChange={e => setNameFilter(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[10px] uppercase tracking-wider">Property</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Plan</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider hidden sm:table-cell">Cycle</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider hidden md:table-cell">Renewal</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : filteredSubs.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">No subscriptions found</TableCell></TableRow>
                ) : (
                  filteredSubs.map((sub: any) => {
                    const plan = sub.subscription_plans;
                    const endDate = new Date(sub.end_date);
                    const isFuture = endDate > new Date();
                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="py-2">
                          <div>
                            <p className="text-sm font-medium">{getPropertyName(sub)}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{getPropertyTypeLabel(sub.property_type)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-sm">{PLAN_ICONS[plan?.slug] || '📋'} {plan?.name || '—'}</span>
                        </TableCell>
                        <TableCell className="py-2 hidden sm:table-cell text-xs text-muted-foreground">Yearly</TableCell>
                        <TableCell className="py-2 text-sm font-medium">{formatCurrency(sub.amount_paid || 0)}</TableCell>
                        <TableCell className="py-2">
                          <Badge variant={statusVariant(sub.status)} className="text-[10px] capitalize">{sub.status?.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="py-2 hidden md:table-cell text-xs text-muted-foreground">
                          {endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailSub(sub)}>
                                <Eye className="h-3.5 w-3.5 mr-2" />View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadInvoice(sub)}>
                                <Download className="h-3.5 w-3.5 mr-2" />Download Invoice
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {sub.status === 'active' && (
                                <DropdownMenuItem onClick={() => openUpgrade(sub)}>
                                  <TrendingUp className="h-3.5 w-3.5 mr-2" />Upgrade Plan
                                </DropdownMenuItem>
                              )}
                              {sub.status === 'active' && isFuture && (
                                <DropdownMenuItem onClick={() => handleCancelSubscription(sub)} className="text-destructive">
                                  <XCircle className="h-3.5 w-3.5 mr-2" />Cancel Renewal
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={!!detailSub} onOpenChange={() => setDetailSub(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Subscription Details</DialogTitle>
            <DialogDescription className="text-xs">{detailSub?.serial_number || ''}</DialogDescription>
          </DialogHeader>
          {detailSub && (() => {
            const plan = detailSub.subscription_plans;
            return (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-[10px] text-muted-foreground uppercase">Property</p><p className="font-medium">{getPropertyName(detailSub)}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Type</p><p className="font-medium capitalize">{getPropertyTypeLabel(detailSub.property_type)}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Plan</p><p className="font-medium">{PLAN_ICONS[plan?.slug] || ''} {plan?.name || '—'}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Status</p><Badge variant={statusVariant(detailSub.status)} className="text-[10px] capitalize">{detailSub.status?.replace('_', ' ')}</Badge></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Start Date</p><p>{new Date(detailSub.start_date).toLocaleDateString('en-IN')}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">End Date</p><p>{new Date(detailSub.end_date).toLocaleDateString('en-IN')}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Amount Paid</p><p className="font-medium">{formatCurrency(detailSub.amount_paid || 0)}</p></div>
                  {detailSub.capacity_upgrades > 0 && (
                    <div><p className="text-[10px] text-muted-foreground uppercase">Capacity Slabs</p><p>{detailSub.capacity_upgrades}</p></div>
                  )}
                </div>
                {plan?.features && Array.isArray(plan.features) && plan.features.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Features</p>
                    <div className="flex flex-wrap gap-1">
                      {plan.features.map((f: string) => (
                        <Badge key={f} variant="secondary" className="text-[9px]">{f.replace(/_/g, ' ')}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(detailSub.razorpay_payment_id || detailSub.razorpay_order_id) && (
                  <div className="border-t pt-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Payment Info</p>
                    {detailSub.razorpay_payment_id && <p className="text-xs">Payment ID: {detailSub.razorpay_payment_id}</p>}
                    {detailSub.razorpay_order_id && <p className="text-xs">Order ID: {detailSub.razorpay_order_id}</p>}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Subscribe/Upgrade Dialog (existing flow preserved) */}
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
              ) : availablePlans.map((plan: any) => {
                const hasDiscount = plan.discount_active && plan.discount_percentage > 0;
                const discountedPrice = getDiscountedPrice(plan);
                return (
                  <Card key={plan.id} className={`cursor-pointer transition-all hover:border-primary ${selectedPlan?.id === plan.id ? 'border-primary ring-2 ring-primary/20' : ''}`} onClick={() => setSelectedPlan(plan)}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{PLAN_ICONS[plan.slug] || '📋'}</span>
                        <div><p className="font-semibold text-sm">{plan.name}</p><p className="text-xs text-muted-foreground">₹{plan.price_monthly_display}/mo (billed yearly)</p></div>
                        {hasDiscount && <Badge variant="destructive" className="text-[9px] ml-auto">{plan.discount_label || `${plan.discount_percentage}% OFF`}</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasDiscount ? (<><p className="text-xs line-through text-muted-foreground">₹{plan.price_yearly}</p><p className="text-xs font-bold text-primary">₹{Math.round(discountedPrice)}/year</p></>) : (<p className="text-xs font-medium">₹{plan.price_yearly}/year</p>)}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Hostel: {plan.hostel_bed_limit === 0 ? 'Unlimited' : `Up to ${plan.hostel_bed_limit} beds`}</p>
                        <p>Reading Room: {plan.reading_room_seat_limit === 0 ? 'Unlimited' : `Up to ${plan.reading_room_seat_limit} seats`}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(Array.isArray(plan.features) ? plan.features : []).slice(0, 5).map((f: string) => (<Badge key={f} variant="secondary" className="text-[9px]">{f.replace(/_/g, ' ')}</Badge>))}
                        {(Array.isArray(plan.features) ? plan.features : []).length > 5 && (<Badge variant="secondary" className="text-[9px]">+{plan.features.length - 5} more</Badge>)}
                      </div>
                      {selectedPlan?.id === plan.id && (<div className="flex items-center gap-1 text-primary text-xs font-medium"><Check className="h-3 w-3" />Selected</div>)}
                    </CardContent>
                  </Card>
                );
              })}
              {selectedPlan && (<div className="col-span-full flex justify-end"><Button onClick={() => setStep(selectedPlan.capacity_upgrade_enabled ? 2 : 3)}>Next <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></div>)}
            </div>
          )}

          {step === 2 && selectedPlan && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Need more capacity? Add upgrade slabs at ₹{selectedPlan.capacity_upgrade_price}/month each (billed yearly: ₹{selectedPlan.capacity_upgrade_price * 12}/slab).</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-xs text-muted-foreground"><p>Per slab: +{selectedPlan.capacity_upgrade_slab_beds} beds / +{selectedPlan.capacity_upgrade_slab_seats} seats</p></div>
                <div><Label className="text-xs">Number of Slabs</Label><Input type="number" min={0} max={20} value={capacityUpgrades} onChange={e => setCapacityUpgrades(Math.max(0, Number(e.target.value)))} className="h-8 text-sm" /></div>
              </div>
              {capacityUpgrades > 0 && (<p className="text-xs font-medium">Extra capacity: +{capacityUpgrades * selectedPlan.capacity_upgrade_slab_beds} beds / +{capacityUpgrades * selectedPlan.capacity_upgrade_slab_seats} seats = ₹{capacityUpgrades * selectedPlan.capacity_upgrade_price}/month (₹{capacityUpgrades * selectedPlan.capacity_upgrade_price * 12}/year)</p>)}
              <div className="flex justify-between"><Button variant="outline" onClick={() => setStep(1)}>Back</Button><Button onClick={() => setStep(3)}>Next <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></div>
            </div>
          )}

          {step === 3 && selectedPlan && selectedProperty && (() => {
            const hasDiscount = selectedPlan.discount_active && selectedPlan.discount_percentage > 0;
            const discountedYearly = getDiscountedPrice(selectedPlan);
            return (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm"><span>Property</span><span className="font-medium">{selectedProperty.name}</span></div>
                  <div className="flex justify-between text-sm"><span>Plan</span><span className="font-medium">{PLAN_ICONS[selectedPlan.slug]} {selectedPlan.name}</span></div>
                  <div className="flex justify-between text-sm">
                    <span>Plan Price (Yearly)</span>
                    {hasDiscount ? (<span><span className="line-through text-muted-foreground mr-2">₹{selectedPlan.price_yearly}</span><span className="font-medium text-primary">₹{Math.round(discountedYearly)}</span></span>) : (<span>₹{selectedPlan.price_yearly}</span>)}
                  </div>
                  {hasDiscount && (<div className="flex justify-between text-sm text-primary"><span>Discount ({selectedPlan.discount_percentage}%)</span><Badge variant="destructive" className="text-[9px]">{selectedPlan.discount_label || 'Discount Applied'}</Badge></div>)}
                  {capacityUpgrades > 0 && (<div className="flex justify-between text-sm"><span>Capacity Upgrades ({capacityUpgrades} slabs × ₹{selectedPlan.capacity_upgrade_price}/mo × 12)</span><span>₹{capacityUpgradeYearly}</span></div>)}
                  <div className="border rounded-md p-3 bg-muted/30 space-y-2">
                    <p className="text-xs font-medium flex items-center gap-1"><Tag className="h-3 w-3" /> Have a coupon?</p>
                    {couponValidation ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><Badge variant="secondary" className="text-xs">{couponCode.toUpperCase()}</Badge><span className="text-xs text-secondary font-medium">-₹{couponDiscount}</span></div>
                        <Button variant="ghost" size="sm" onClick={removeCoupon} className="h-6 w-6 p-0"><X className="h-3 w-3" /></Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input placeholder="Enter coupon code" value={couponCode} onChange={e => setCouponCode(e.target.value)} className="h-8 text-sm flex-1" />
                        <Button size="sm" variant="outline" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()} className="h-8 text-xs">{couponLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Apply'}</Button>
                      </div>
                    )}
                  </div>
                  <hr />
                  {couponDiscount > 0 && (<div className="flex justify-between text-sm text-secondary"><span>Coupon Discount</span><span>-₹{couponDiscount}</span></div>)}
                  <div className="flex justify-between text-sm font-bold"><span>Total (Yearly)</span><span>₹{Math.round(totalAmount)}</span></div>
                  <p className="text-[10px] text-muted-foreground">No refunds. No downgrades. Billed yearly.</p>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(selectedPlan.capacity_upgrade_enabled ? 2 : 1)}>Back</Button>
                  <Button onClick={handlePayment} disabled={processing}>{processing ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Processing...</> : <>Pay ₹{Math.round(totalAmount)}</>}</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
