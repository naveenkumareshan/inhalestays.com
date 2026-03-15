import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { laundryCloudService } from '@/api/laundryCloudService';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';

const ORDER_STATUSES = ['pending', 'confirmed', 'pickup_scheduled', 'picked_up', 'washing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800', confirmed: 'bg-blue-100 text-blue-800',
  pickup_scheduled: 'bg-indigo-100 text-indigo-800', picked_up: 'bg-violet-100 text-violet-800',
  washing: 'bg-cyan-100 text-cyan-800', ready: 'bg-teal-100 text-teal-800',
  out_for_delivery: 'bg-orange-100 text-orange-800', delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function LaundryOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [partners, setPartners] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = async () => {
    setLoading(true);
    try {
      const [o, p] = await Promise.all([
        laundryCloudService.adminGetAllOrders({ status: filter }),
        laundryCloudService.adminGetPartners(),
      ]);
      setOrders(o || []);
      setPartners(p || []);
    } catch { /* empty */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const updateOrder = async (id: string, updates: Record<string, any>) => {
    try {
      await laundryCloudService.adminUpdateOrder(id, updates);
      toast({ title: 'Order updated' });
      load();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const filtered = orders;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          Laundry Orders
          {filtered.length > 0 && <Badge variant="secondary" className="ml-2 text-xs font-normal">{filtered.length}</Badge>}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">View and manage all laundry orders.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={filter} onValueChange={(v) => { setFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">S.No.</TableHead>
                  <TableHead className="text-[11px]">Order #</TableHead>
                  <TableHead className="text-[11px]">Student</TableHead>
                  <TableHead className="text-[11px]">Items</TableHead>
                  <TableHead className="text-[11px]">Total</TableHead>
                  <TableHead className="text-[11px]">Status</TableHead>
                  <TableHead className="text-[11px]">Partner</TableHead>
                  <TableHead className="text-[11px]">Pickup</TableHead>
                  <TableHead className="text-[11px]">Delivery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((o, i) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-[11px]">{getSerialNumber(i, currentPage, pageSize)}</TableCell>
                    <TableCell className="text-[11px] font-medium">{o.serial_number}</TableCell>
                    <TableCell className="text-[11px]">{(o.profiles as any)?.name || '—'}</TableCell>
                    <TableCell className="text-[11px]">{o.laundry_order_items?.length || 0}</TableCell>
                    <TableCell className="text-[11px]">₹{o.total_amount}</TableCell>
                    <TableCell>
                      <Select value={o.status} onValueChange={(v) => updateOrder(o.id, { status: v })}>
                        <SelectTrigger className="h-6 text-[10px] w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={o.partner_id || ''} onValueChange={(v) => updateOrder(o.id, { partner_id: v })}>
                        <SelectTrigger className="h-6 text-[10px] w-[120px]"><SelectValue placeholder="Assign" /></SelectTrigger>
                        <SelectContent>{partners.filter((p: any) => p.status === 'approved' || p.status === 'active').map((p: any) => <SelectItem key={p.id} value={p.id}>{p.business_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-[11px]">
                      <Input type="date" className="h-6 text-[10px] w-[120px]" value={o.pickup_date || ''} onChange={e => updateOrder(o.id, { pickup_date: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input type="date" className="h-6 text-[10px] w-[120px]" value={o.delivery_date || ''} onChange={e => updateOrder(o.id, { delivery_date: e.target.value })} />
                    </TableCell>
                  </TableRow>
                ))}
                {paginated.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No orders</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>

          <AdminTablePagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
          />
        </>
      )}
    </div>
  );
}
