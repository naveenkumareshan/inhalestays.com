import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Search, Crown, CreditCard } from 'lucide-react';

const ALL_FEATURES = [
  { key: 'booking_management', label: 'Booking Management' },
  { key: 'student_list', label: 'Student List' },
  { key: 'basic_dues', label: 'Basic Dues Tracking' },
  { key: 'standard_support', label: 'Standard Support' },
  { key: 'basic_analytics', label: 'Basic Analytics' },
  { key: 'downloadable_reports', label: 'Downloadable Reports' },
  { key: 'sponsored_eligible', label: 'Sponsored Eligible' },
  { key: 'advanced_analytics', label: 'Advanced Analytics' },
  { key: 'monthly_comparison', label: 'Monthly Comparison' },
  { key: 'dues_aging_report', label: 'Dues Aging Report' },
  { key: 'refund_tracking', label: 'Refund Tracking' },
  { key: 'sponsored_priority', label: 'Sponsored Priority' },
  { key: 'priority_support', label: 'Priority Support' },
  { key: 'api_access', label: 'API Access' },
  { key: 'white_label', label: 'White Label' },
  { key: 'top_sponsored', label: 'Top Sponsored' },
  { key: 'dedicated_support', label: 'Dedicated Support' },
  { key: 'early_access', label: 'Early Access' },
  { key: 'custom_reports', label: 'Custom Reports' },
  { key: 'settlement_tracking', label: 'Settlement Tracking' },
];

const defaultForm = {
  name: '', slug: '', price_yearly: 0, price_monthly_display: 0,
  hostel_bed_limit: 0, reading_room_seat_limit: 0, features: [] as string[],
  capacity_upgrade_enabled: false, capacity_upgrade_price: 300,
  capacity_upgrade_slab_beds: 50, capacity_upgrade_slab_seats: 75,
  display_order: 0, description: '', is_active: true,
  discount_percentage: 0, discount_label: '', discount_active: false,
  is_universal: false,
};

export default function SubscriptionPlans() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editPlan, setEditPlan] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: subscriptions = [], isLoading: subsLoading } = useQuery({
    queryKey: ['all-property-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_subscriptions')
        .select('*, subscription_plans(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: typeof form & { id?: string }) => {
      const payload = { ...formData };
      delete (payload as any).id;
      if (formData.id) {
        const { error } = await supabase.from('subscription_plans').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subscription_plans').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      setDialogOpen(false);
      setEditPlan(null);
      setForm(defaultForm);
      toast({ title: 'Plan saved successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openEdit = (plan: any) => {
    setEditPlan(plan);
    setForm({
      name: plan.name, slug: plan.slug, price_yearly: plan.price_yearly,
      price_monthly_display: plan.price_monthly_display,
      hostel_bed_limit: plan.hostel_bed_limit, reading_room_seat_limit: plan.reading_room_seat_limit,
      features: Array.isArray(plan.features) ? plan.features : [],
      capacity_upgrade_enabled: plan.capacity_upgrade_enabled,
      capacity_upgrade_price: plan.capacity_upgrade_price,
      capacity_upgrade_slab_beds: plan.capacity_upgrade_slab_beds,
      capacity_upgrade_slab_seats: plan.capacity_upgrade_slab_seats,
      display_order: plan.display_order, description: plan.description,
      is_active: plan.is_active,
      discount_percentage: plan.discount_percentage || 0,
      discount_label: plan.discount_label || '',
      discount_active: plan.discount_active || false,
      is_universal: plan.is_universal || false,
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditPlan(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const toggleFeature = (key: string) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(key)
        ? prev.features.filter(f => f !== key)
        : [...prev.features, key],
    }));
  };

  const filteredPlans = plans.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><Crown className="h-5 w-5" /> Subscription Plans</h1>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="subscriptions">Active Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">All Plans</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 w-48 text-xs" />
                  </div>
                  <Button size="sm" onClick={openCreate}><Plus className="h-3.5 w-3.5 mr-1" />Add Plan</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">S.No</TableHead>
                    <TableHead className="text-xs">Serial</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Monthly ₹</TableHead>
                    <TableHead className="text-xs">Yearly ₹</TableHead>
                    <TableHead className="text-xs">Bed Limit</TableHead>
                    <TableHead className="text-xs">Seat Limit</TableHead>
                    <TableHead className="text-xs">Features</TableHead>
                    <TableHead className="text-xs">Discount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plansLoading ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-sm text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filteredPlans.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-sm text-muted-foreground">No plans found</TableCell></TableRow>
                  ) : filteredPlans.map((plan: any, i: number) => (
                    <TableRow key={plan.id}>
                      <TableCell className="text-xs">{i + 1}</TableCell>
                      <TableCell className="text-xs font-mono">{plan.serial_number}</TableCell>
                      <TableCell className="text-xs font-medium">{plan.name}</TableCell>
                      <TableCell className="text-xs">₹{plan.price_monthly_display}</TableCell>
                      <TableCell className="text-xs">₹{plan.price_yearly}</TableCell>
                      <TableCell className="text-xs">{plan.hostel_bed_limit === 0 ? '∞' : plan.hostel_bed_limit}</TableCell>
                      <TableCell className="text-xs">{plan.reading_room_seat_limit === 0 ? '∞' : plan.reading_room_seat_limit}</TableCell>
                      <TableCell className="text-xs">{Array.isArray(plan.features) ? plan.features.length : 0}</TableCell>
                      <TableCell className="text-xs">
                        {plan.discount_active ? (
                          <Badge variant="destructive" className="text-[9px]">{plan.discount_percentage}% {plan.discount_label && `- ${plan.discount_label}`}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell><Badge variant={plan.is_active ? 'default' : 'secondary'} className="text-[10px]">{plan.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell><Button variant="ghost" size="sm" onClick={() => openEdit(plan)}><Edit className="h-3.5 w-3.5" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><CreditCard className="h-4 w-4" />All Property Subscriptions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">S.No</TableHead>
                    <TableHead className="text-xs">Serial</TableHead>
                    <TableHead className="text-xs">Property Type</TableHead>
                    <TableHead className="text-xs">Plan</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Start</TableHead>
                    <TableHead className="text-xs">End</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Upgrades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subsLoading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : subscriptions.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">No subscriptions yet</TableCell></TableRow>
                  ) : subscriptions.map((sub: any, i: number) => (
                    <TableRow key={sub.id}>
                      <TableCell className="text-xs">{i + 1}</TableCell>
                      <TableCell className="text-xs font-mono">{sub.serial_number}</TableCell>
                      <TableCell className="text-xs capitalize">{sub.property_type?.replace('_', ' ')}</TableCell>
                      <TableCell className="text-xs">{(sub as any).subscription_plans?.name || '—'}</TableCell>
                      <TableCell><Badge variant={sub.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{sub.status}</Badge></TableCell>
                      <TableCell className="text-xs">{sub.start_date}</TableCell>
                      <TableCell className="text-xs">{sub.end_date}</TableCell>
                      <TableCell className="text-xs">₹{sub.amount_paid}</TableCell>
                      <TableCell className="text-xs">{sub.capacity_upgrades || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plan Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Slug</Label>
                <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Monthly Display Price (₹)</Label>
                <Input type="number" value={form.price_monthly_display} onChange={e => setForm(p => ({ ...p, price_monthly_display: Number(e.target.value) }))} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Yearly Price (₹)</Label>
                <Input type="number" value={form.price_yearly} onChange={e => setForm(p => ({ ...p, price_yearly: Number(e.target.value) }))} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Hostel Bed Limit (0=unlimited)</Label>
                <Input type="number" value={form.hostel_bed_limit} onChange={e => setForm(p => ({ ...p, hostel_bed_limit: Number(e.target.value) }))} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Reading Room Seat Limit (0=unlimited)</Label>
                <Input type="number" value={form.reading_room_seat_limit} onChange={e => setForm(p => ({ ...p, reading_room_seat_limit: Number(e.target.value) }))} className="h-8 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Features</Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border rounded-md p-2">
                {ALL_FEATURES.map(f => (
                  <label key={f.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox checked={form.features.includes(f.key)} onCheckedChange={() => toggleFeature(f.key)} />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_universal} onCheckedChange={v => setForm(p => ({ ...p, is_universal: v }))} />
              <Label className="text-xs">Universal Package (covers all partner properties)</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.capacity_upgrade_enabled} onCheckedChange={v => setForm(p => ({ ...p, capacity_upgrade_enabled: v }))} />
              <Label className="text-xs">Enable Capacity Upgrades</Label>
            </div>
            {form.capacity_upgrade_enabled && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Price per Slab/Month (₹)</Label>
                  <Input type="number" value={form.capacity_upgrade_price} onChange={e => setForm(p => ({ ...p, capacity_upgrade_price: Number(e.target.value) }))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Beds per Slab</Label>
                  <Input type="number" value={form.capacity_upgrade_slab_beds} onChange={e => setForm(p => ({ ...p, capacity_upgrade_slab_beds: Number(e.target.value) }))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Seats per Slab</Label>
                  <Input type="number" value={form.capacity_upgrade_slab_seats} onChange={e => setForm(p => ({ ...p, capacity_upgrade_slab_seats: Number(e.target.value) }))} className="h-8 text-sm" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Display Order</Label>
                <Input type="number" value={form.display_order} onChange={e => setForm(p => ({ ...p, display_order: Number(e.target.value) }))} className="h-8 text-sm" />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                <Label className="text-xs">Active</Label>
              </div>
            </div>
            <div className="border rounded-lg p-3 space-y-3">
              <Label className="text-xs font-semibold">Discount Settings</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Discount %</Label>
                  <Input type="number" min={0} max={100} value={form.discount_percentage} onChange={e => setForm(p => ({ ...p, discount_percentage: Number(e.target.value) }))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Discount Label</Label>
                  <Input value={form.discount_label} onChange={e => setForm(p => ({ ...p, discount_label: e.target.value }))} className="h-8 text-sm" placeholder="e.g. Launch Offer" />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <Switch checked={form.discount_active} onCheckedChange={v => setForm(p => ({ ...p, discount_active: v }))} />
                  <Label className="text-xs">Active</Label>
                </div>
              </div>
              {form.discount_active && form.discount_percentage > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Discounted yearly price: ₹{Math.round(form.price_yearly - (form.price_yearly * form.discount_percentage / 100))}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="text-sm" rows={2} />
            </div>
            <Button onClick={() => saveMutation.mutate({ ...form, id: editPlan?.id })} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
