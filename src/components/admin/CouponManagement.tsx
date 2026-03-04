
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Search, TicketPercent, Users } from 'lucide-react';
import { couponService, CouponData } from '@/api/couponService';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserSelectionDialog } from './UserSelectionDialog';
import { AdminTablePagination, getSerialNumber } from './AdminTablePagination';

interface PartnerOption {
  id: string;
  business_name: string;
}

export function CouponManagement() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<CouponData[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterScope, setFilterScope] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponData | null>(null);
  const [formData, setFormData] = useState<Partial<CouponData>>({
    code: '',
    name: '',
    description: '',
    type: 'percentage',
    value: 0,
    max_discount_amount: 0,
    min_order_amount: 0,
    applicable_for: ['cabin'],
    scope: user?.role === 'admin' ? 'global' : 'vendor',
    partner_id: '',
    usage_limit: undefined,
    user_usage_limit: 1,
    start_date: '',
    end_date: '',
    is_active: true,
    first_time_user_only: false,
    is_referral_coupon: false,
    referral_type: undefined,
    specific_users: [],
    exclude_users: [],
    applies_to: 'fees_only' as any,
  });

  useEffect(() => {
    fetchCoupons();
    if (user?.role === 'admin') {
      fetchPartners();
    }
  }, [searchTerm, filterType, filterScope]);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('id, business_name')
        .eq('is_active', true)
        .order('business_name');
      if (!error && data) {
        setPartners(data);
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
    }
  };

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await couponService.getCoupons({
        search: searchTerm || undefined,
        type: filterType || undefined,
        scope: filterScope || undefined,
        createdBy: user?.role === 'vendor' ? user.id : undefined,
      });
      if (response.success) {
        setCoupons((response.data || []) as CouponData[]);
      } else {
        toast({ title: "Error", description: "Failed to fetch coupons", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast({ title: "Error", description: "Failed to fetch coupons", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering by tab (applicable_for)
  const filteredCoupons = useMemo(() => {
    let filtered = coupons;
    if (activeTab !== 'all') {
      filtered = filtered.filter(c => c.applicable_for?.includes(activeTab));
    }
    return filtered;
  }, [coupons, activeTab]);

  const paginatedCoupons = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCoupons.slice(start, start + pageSize);
  }, [filteredCoupons, currentPage, pageSize]);

  // Reset page when tab/filters change
  useEffect(() => { setCurrentPage(1); }, [activeTab, searchTerm, filterType, filterScope]);

  const handleCreateCoupon = async () => {
    try {
      if (!formData.code || !formData.name || !formData.start_date || !formData.end_date) {
        toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
        return;
      }
      if (formData.scope === 'vendor' && user?.role === 'admin' && !formData.partner_id) {
        toast({ title: "Error", description: "Please select a partner for partner-specific coupons", variant: "destructive" });
        return;
      }
      const response = await couponService.createCoupon(formData as any);
      if (response.success) {
        toast({ title: "Success", description: "Coupon created successfully" });
        setIsDialogOpen(false);
        resetForm();
        fetchCoupons();
      } else {
        toast({ title: "Error", description: response.message || "Failed to create coupon", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error creating coupon:', error);
      toast({ title: "Error", description: "Failed to create coupon", variant: "destructive" });
    }
  };

  const handleUpdateCoupon = async () => {
    try {
      if (!editingCoupon) return;
      const response = await couponService.updateCoupon(editingCoupon.id!, formData);
      if (response.success) {
        toast({ title: "Success", description: "Coupon updated successfully" });
        setIsDialogOpen(false);
        setEditingCoupon(null);
        resetForm();
        fetchCoupons();
      } else {
        toast({ title: "Error", description: response.message || "Failed to update coupon", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error updating coupon:', error);
      toast({ title: "Error", description: "Failed to update coupon", variant: "destructive" });
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const response = await couponService.deleteCoupon(id);
      if (response.success) {
        toast({ title: "Success", description: "Coupon deleted successfully" });
        fetchCoupons();
      } else {
        toast({ title: "Error", description: "Failed to delete coupon", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast({ title: "Error", description: "Failed to delete coupon", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      code: '', name: '', description: '', type: 'percentage', value: 0,
      max_discount_amount: 0, min_order_amount: 0, applicable_for: ['cabin'],
      scope: user?.role === 'admin' ? 'global' : 'vendor',
      partner_id: '',
      usage_limit: undefined, user_usage_limit: 1, start_date: '', end_date: '',
      is_active: true, first_time_user_only: false, is_referral_coupon: false,
      referral_type: undefined, specific_users: [], exclude_users: [],
      applies_to: 'fees_only' as any,
    });
  };

  const openEditDialog = (coupon: CouponData) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code, name: coupon.name, description: coupon.description,
      type: coupon.type, value: coupon.value, max_discount_amount: coupon.max_discount_amount,
      min_order_amount: coupon.min_order_amount, applicable_for: coupon.applicable_for,
      scope: coupon.scope, partner_id: coupon.partner_id, usage_limit: coupon.usage_limit,
      user_usage_limit: coupon.user_usage_limit, start_date: coupon.start_date?.split('T')[0],
      end_date: coupon.end_date?.split('T')[0], is_active: coupon.is_active,
      first_time_user_only: coupon.first_time_user_only, is_referral_coupon: coupon.is_referral_coupon,
      referral_type: coupon.referral_type, specific_users: coupon.specific_users,
      exclude_users: coupon.exclude_users,
      applies_to: (coupon as any).applies_to || 'fees_only',
    });
    setIsDialogOpen(true);
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const getPartnerName = (partnerId: string) => {
    const partner = partners.find(p => p.id === partnerId);
    return partner ? partner.business_name : partnerId;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TicketPercent className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">Coupon Management</h1>
          <Badge variant="secondary" className="text-[10px] h-5">{filteredCoupons.length} coupons</Badge>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 text-xs" onClick={() => { resetForm(); setEditingCoupon(null); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm">{editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Coupon Code *</Label>
                <Input className="h-8 text-xs" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="SAVE20" disabled={!!editingCoupon} />
              </div>
              <div>
                <Label className="text-xs">Coupon Name *</Label>
                <Input className="h-8 text-xs" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Save 20% Off" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Description</Label>
                <Textarea className="text-xs min-h-[60px]" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description of the coupon" />
              </div>
              <div>
                <Label className="text-xs">Scope</Label>
                <Select value={formData.scope} onValueChange={(v) => setFormData({ ...formData, scope: v as any })} disabled={user?.role !== 'admin'}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {user?.role === 'admin' && <SelectItem value="global" className="text-xs">Global</SelectItem>}
                    <SelectItem value="vendor" className="text-xs">Partner Specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {user?.role === 'admin' && formData.scope === 'vendor' && (
                <div>
                  <Label className="text-xs">Select Partner *</Label>
                  <Select value={formData.partner_id} onValueChange={(v) => setFormData({ ...formData, partner_id: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select a partner" /></SelectTrigger>
                    <SelectContent>
                      {partners.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.business_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs">Discount Type *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as 'percentage' | 'fixed' })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage" className="text-xs">Percentage</SelectItem>
                    <SelectItem value="fixed" className="text-xs">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{formData.type === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'} *</Label>
                <Input className="h-8 text-xs" type="number" min="0" max={formData.type === 'percentage' ? "100" : undefined} value={formData.value} onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })} />
              </div>
              {formData.type === 'percentage' && (
                <div>
                  <Label className="text-xs">Max Discount (₹)</Label>
                  <Input className="h-8 text-xs" type="number" min="0" value={formData.max_discount_amount} onChange={(e) => setFormData({ ...formData, max_discount_amount: parseFloat(e.target.value) || 0 })} />
                </div>
              )}
              <div>
                <Label className="text-xs">Min Order Amount (₹)</Label>
                <Input className="h-8 text-xs" type="number" min="0" value={formData.min_order_amount} onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="text-xs">Applicable For *</Label>
                <Select value={formData.applicable_for?.[0]} onValueChange={(v) => setFormData({ ...formData, applicable_for: [v] })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All (Reading Room + Hostel)</SelectItem>
                    <SelectItem value="cabin" className="text-xs">Reading Room</SelectItem>
                    <SelectItem value="hostel" className="text-xs">Hostel</SelectItem>
                    {user?.role === 'admin' && <SelectItem value="subscription" className="text-xs">Subscription</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Applies To</Label>
                <Select value={(formData as any).applies_to || 'fees_only'} onValueChange={(v) => setFormData({ ...formData, applies_to: v as any })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fees_only" className="text-xs">Fees Only</SelectItem>
                    <SelectItem value="locker_only" className="text-xs">Locker/Deposit Only</SelectItem>
                    <SelectItem value="both" className="text-xs">Both (Fees + Locker)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Total Usage Limit</Label>
                <Input className="h-8 text-xs" type="number" min="0" value={formData.usage_limit || ''} onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="Unlimited" />
              </div>
              <div>
                <Label className="text-xs">Per User Limit</Label>
                <Input className="h-8 text-xs" type="number" min="1" value={formData.user_usage_limit} onChange={(e) => setFormData({ ...formData, user_usage_limit: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <Label className="text-xs">Start Date *</Label>
                <Input className="h-8 text-xs" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">End Date *</Label>
                <Input className="h-8 text-xs" type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
              </div>

              {/* User Assignment */}
              <div className="col-span-2 border-t pt-3">
                <h4 className="text-xs font-medium mb-2">User Assignment (Optional)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Specific Users Only</Label>
                    <p className="text-[10px] text-muted-foreground mb-1">Only selected users can use this coupon</p>
                    <UserSelectionDialog
                      selectedUsers={formData.specific_users || []}
                      onUsersChange={(ids) => setFormData({ ...formData, specific_users: ids })}
                      trigger={
                        <Button variant="outline" type="button" size="sm" className="w-full h-7 text-xs">
                          <Users className="h-3 w-3 mr-1" /> Select Users ({(formData.specific_users || []).length})
                        </Button>
                      }
                      title="Select Specific Users"
                      description="Choose users who can use this coupon"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Exclude Users</Label>
                    <p className="text-[10px] text-muted-foreground mb-1">Selected users cannot use this coupon</p>
                    <UserSelectionDialog
                      selectedUsers={formData.exclude_users || []}
                      onUsersChange={(ids) => setFormData({ ...formData, exclude_users: ids })}
                      trigger={
                        <Button variant="outline" type="button" size="sm" className="w-full h-7 text-xs">
                          <Users className="h-3 w-3 mr-1" /> Exclude Users ({(formData.exclude_users || []).length})
                        </Button>
                      }
                      title="Exclude Users"
                      description="Choose users who cannot use this coupon"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-2">
                <Switch id="isActive" checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} />
                <Label htmlFor="isActive" className="text-xs">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="firstTimeUserOnly" checked={formData.first_time_user_only} onCheckedChange={(c) => setFormData({ ...formData, first_time_user_only: c })} />
                <Label htmlFor="firstTimeUserOnly" className="text-xs">First-time users only</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs" onClick={editingCoupon ? handleUpdateCoupon : handleCreateCoupon}>
                {editingCoupon ? 'Update' : 'Create'} Coupon
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8">
          <TabsTrigger value="all" className="text-xs px-3 py-1">All</TabsTrigger>
          <TabsTrigger value="cabin" className="text-xs px-3 py-1">Reading Room</TabsTrigger>
          <TabsTrigger value="hostel" className="text-xs px-3 py-1">Hostel</TabsTrigger>
          {user?.role === 'admin' && <TabsTrigger value="subscription" className="text-xs px-3 py-1">Subscription</TabsTrigger>}
        </TabsList>
      </Tabs>

      {/* Compact filter row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="h-8 text-xs pl-7" placeholder="Search by code or name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterScope} onValueChange={setFilterScope}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="All Scopes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Scopes</SelectItem>
            <SelectItem value="global" className="text-xs">Global</SelectItem>
            <SelectItem value="vendor" className="text-xs">Partner</SelectItem>
            <SelectItem value="user_referral" className="text-xs">Referral</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Types</SelectItem>
            <SelectItem value="percentage" className="text-xs">Percentage</SelectItem>
            <SelectItem value="fixed" className="text-xs">Fixed Amount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="text-center py-12">
          <TicketPercent className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs font-medium">No coupons found</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Create your first coupon to get started</p>
        </div>
      ) : (
        <>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3 w-12">S.No.</TableHead>
                  <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">Code</TableHead>
                  <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">Name</TableHead>
                  <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">Scope</TableHead>
                  {user?.role === 'admin' && <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">Partner</TableHead>}
                  <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">Type</TableHead>
                  <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">Value</TableHead>
                  <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">For</TableHead>
                  <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">Usage</TableHead>
                  <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">Valid Until</TableHead>
                  <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">Status</TableHead>
                  <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCoupons.map((coupon, idx) => (
                  <TableRow key={coupon.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                    <TableCell className="text-[11px] py-1.5 px-3 text-muted-foreground">{getSerialNumber(idx, currentPage, pageSize)}</TableCell>
                    <TableCell className="py-1.5 px-3">
                      <span className="font-mono font-semibold text-[11px]">{coupon.code}</span>
                      {coupon.is_referral_coupon && (
                        <Badge variant="secondary" className="ml-1 text-[9px] h-4 px-1">Ref</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] py-1.5 px-3 max-w-[120px] truncate">{coupon.name}</TableCell>
                    <TableCell className="py-1.5 px-3">
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                        {coupon.scope === 'global' ? 'Global' : coupon.scope === 'vendor' ? 'Partner' : 'Referral'}
                      </Badge>
                    </TableCell>
                    {user?.role === 'admin' && (
                      <TableCell className="text-[11px] py-1.5 px-3 text-muted-foreground max-w-[100px] truncate">
                        {coupon.scope === 'vendor' && coupon.partner_id ? getPartnerName(coupon.partner_id) : '-'}
                      </TableCell>
                    )}
                    <TableCell className="py-1.5 px-3">
                      <span className="text-[11px]">{coupon.type === 'percentage' ? '%' : '₹'}</span>
                    </TableCell>
                    <TableCell className="text-[11px] py-1.5 px-3">
                      {coupon.type === 'percentage' ? `${coupon.value}%` : `₹${coupon.value}`}
                      {coupon.type === 'percentage' && coupon.max_discount_amount ? (
                        <span className="text-[9px] text-muted-foreground block">max ₹{coupon.max_discount_amount}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                        {coupon.applicable_for?.includes('all') ? 'All' : coupon.applicable_for?.includes('subscription') ? 'Subscription' : coupon.applicable_for?.includes('hostel') ? 'Hostel' : 'Room'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[11px] py-1.5 px-3">
                      {coupon.usage_count || 0}{coupon.usage_limit ? `/${coupon.usage_limit}` : ''}
                    </TableCell>
                    <TableCell className="text-[11px] py-1.5 px-3 text-muted-foreground">{formatDate(coupon.end_date!)}</TableCell>
                    <TableCell className="py-1.5 px-3">
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border ${coupon.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'}`}>
                        {coupon.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => openEditDialog(coupon)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="destructive" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteCoupon(coupon.id!)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <AdminTablePagination
            currentPage={currentPage}
            totalItems={filteredCoupons.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
          />
        </>
      )}
    </div>
  );
}
