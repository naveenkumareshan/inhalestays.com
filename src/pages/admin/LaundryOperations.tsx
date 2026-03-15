import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { laundryCloudService } from '@/api/laundryCloudService';
import { Package, Truck, Clock, CheckCircle, Search, RefreshCw, Loader2, KeyRound } from 'lucide-react';
import { format } from 'date-fns';
import ErrorBoundary from '@/components/ErrorBoundary';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  pickup_scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  picked_up: 'bg-purple-50 text-purple-700 border-purple-200',
  processing: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  ready: 'bg-teal-50 text-teal-700 border-teal-200',
  out_for_delivery: 'bg-orange-50 text-orange-700 border-orange-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

export default function LaundryOperations() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pickup');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [otpDialog, setOtpDialog] = useState<{ order: any; type: 'pickup' | 'delivery' } | null>(null);
  const [otpValue, setOtpValue] = useState('');
  const [verifying, setVerifying] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await laundryCloudService.partnerGetOrders();
      setOrders(data || []);
    } catch (err) {
      console.error(err);
      setOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const today = format(new Date(), 'yyyy-MM-dd');

  const pickupOrders = orders.filter(o => ['pending', 'confirmed', 'pickup_scheduled'].includes(o.status));
  const deliveryOrders = orders.filter(o => ['ready', 'out_for_delivery'].includes(o.status));
  const todayPickups = pickupOrders.filter(o => o.pickup_date === today);
  const todayDeliveries = deliveryOrders.filter(o => true); // all active deliveries

  const getFiltered = () => {
    let list = orders;
    if (tab === 'pickup') list = pickupOrders;
    else if (tab === 'delivery') list = deliveryOrders;

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(o =>
        o.serial_number?.toLowerCase().includes(s) ||
        (o.profiles as any)?.name?.toLowerCase().includes(s) ||
        (o.profiles as any)?.phone?.toLowerCase().includes(s)
      );
    }
    return list;
  };

  const filtered = getFiltered();
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await laundryCloudService.adminUpdateOrder(orderId, { status: newStatus });
      toast({ title: `Order status updated to ${newStatus}` });
      fetchOrders();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpDialog || !otpValue) return;
    setVerifying(true);
    try {
      await laundryCloudService.partnerVerifyOtp(otpDialog.order.id, otpValue, otpDialog.type);
      toast({ title: `${otpDialog.type === 'pickup' ? 'Pickup' : 'Delivery'} OTP verified` });
      setOtpDialog(null);
      setOtpValue('');
      fetchOrders();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setVerifying(false);
  };

  const getItemCount = (order: any) => {
    return (order.laundry_order_items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Laundry Operations</h1>
            <p className="text-xs text-muted-foreground">Manage daily pickups, deliveries, and order status</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={fetchOrders}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-3 flex items-center gap-2.5">
            <Package className="h-5 w-5 text-amber-500" />
            <div><p className="text-xl font-bold">{todayPickups.length}</p><p className="text-[10px] text-muted-foreground">Today's Pickups</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2.5">
            <Truck className="h-5 w-5 text-blue-500" />
            <div><p className="text-xl font-bold">{todayDeliveries.length}</p><p className="text-[10px] text-muted-foreground">Active Deliveries</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-purple-500" />
            <div><p className="text-xl font-bold">{orders.filter(o => o.status === 'processing').length}</p><p className="text-[10px] text-muted-foreground">Processing</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2.5">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <div><p className="text-xl font-bold">{orders.filter(o => o.status === 'delivered').length}</p><p className="text-[10px] text-muted-foreground">Delivered</p></div>
          </CardContent></Card>
        </div>

        <Tabs value={tab} onValueChange={v => { setTab(v); setPage(1); }}>
          <div className="flex items-center gap-2 flex-wrap">
            <TabsList className="h-8">
              <TabsTrigger value="pickup" className="text-xs">Pickup ({pickupOrders.length})</TabsTrigger>
              <TabsTrigger value="delivery" className="text-xs">Delivery ({deliveryOrders.length})</TabsTrigger>
              <TabsTrigger value="all" className="text-xs">All ({orders.length})</TabsTrigger>
            </TabsList>
            <div className="relative ml-auto">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input className="h-8 pl-7 text-xs w-[200px]" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>

          <div className="border rounded-md mt-3">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">No orders found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-12">S.No.</TableHead>
                    <TableHead className="text-xs">Order ID</TableHead>
                    <TableHead className="text-xs">Student</TableHead>
                    <TableHead className="text-xs">Items</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Pickup</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((o, idx) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-[11px] text-muted-foreground">{getSerialNumber(idx, page, pageSize)}</TableCell>
                      <TableCell className="text-[11px] font-mono">{o.serial_number || o.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-[11px]">
                        <div>{(o.profiles as any)?.name || '—'}</div>
                        <div className="text-[10px] text-muted-foreground">{(o.profiles as any)?.phone || ''}</div>
                      </TableCell>
                      <TableCell className="text-[11px]">{getItemCount(o)} items</TableCell>
                      <TableCell className="text-[11px]">₹{o.total_amount || 0}</TableCell>
                      <TableCell className="text-[11px]">
                        <div>{o.pickup_date || '—'}</div>
                        <div className="text-[10px] text-muted-foreground">{o.pickup_time_slot || ''}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[o.status] || 'bg-muted text-muted-foreground'} border text-[10px]`}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {['pending', 'confirmed', 'pickup_scheduled'].includes(o.status) && (
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => setOtpDialog({ order: o, type: 'pickup' })}>
                              <KeyRound className="h-3 w-3 mr-1" /> Pickup OTP
                            </Button>
                          )}
                          {['ready', 'out_for_delivery'].includes(o.status) && (
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => setOtpDialog({ order: o, type: 'delivery' })}>
                              <KeyRound className="h-3 w-3 mr-1" /> Delivery OTP
                            </Button>
                          )}
                          <Select value="" onValueChange={v => handleStatusUpdate(o.id, v)}>
                            <SelectTrigger className="h-6 w-[100px] text-[10px]"><SelectValue placeholder="Update" /></SelectTrigger>
                            <SelectContent>
                              {['confirmed', 'pickup_scheduled', 'picked_up', 'processing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'].map(s => (
                                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Tabs>

        <AdminTablePagination
          currentPage={page}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={s => { setPageSize(s); setPage(1); }}
        />

        {/* OTP Dialog */}
        <Dialog open={!!otpDialog} onOpenChange={() => { setOtpDialog(null); setOtpValue(''); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">
                Verify {otpDialog?.type === 'pickup' ? 'Pickup' : 'Delivery'} OTP
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Order: <strong>{otpDialog?.order?.serial_number || otpDialog?.order?.id?.slice(0, 8)}</strong>
              </p>
              <Input
                placeholder="Enter OTP"
                value={otpValue}
                onChange={e => setOtpValue(e.target.value)}
                className="h-10 text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setOtpDialog(null); setOtpValue(''); }}>Cancel</Button>
              <Button size="sm" onClick={handleVerifyOtp} disabled={verifying || !otpValue}>
                {verifying && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Verify
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
}
