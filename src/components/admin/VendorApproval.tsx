
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Eye, Check, X, AlertTriangle, User, Download, Search, RefreshCw, Power, Link2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { vendorApprovalService, Vendor, VendorFilters, VendorsResponse } from '@/api/vendorApprovalService';
import { VendorDetailsDialog } from './VendorDetailsDialog';
import { VendorStatsCards } from './VendorStatsCards';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { getPublicAppUrl } from '@/utils/appUrl';

const VendorApproval: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBusinessType, setFilterBusinessType] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    const filters: VendorFilters = {
      status: filterStatus === 'all' ? 'all' : filterStatus as any,
      search: searchTerm,
      businessType: filterBusinessType === 'all' ? '' : filterBusinessType,
    };
    const result = await vendorApprovalService.getVendors(
      { page: 1, limit: 500 },
      filters
    );
    if (result.success) {
      const data: VendorsResponse = result.data.data;
      setVendors(data.vendors);
      setTotalCount(data.totalCount);
    }
    setLoading(false);
  }, [filterStatus, searchTerm, filterBusinessType]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const filtered = useMemo(() => vendors, [vendors]);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleStatusUpdate = async (vendorId: string, action: 'approve' | 'reject' | 'suspend', additionalData?: any) => {
    const data = {
      action,
      rejectionReason: action === 'reject' ? rejectionReason : undefined,
      ...additionalData
    };

    // If suspending, also cascade to properties
    if (action === 'suspend') {
      const vendor = vendors.find(v => v.id === vendorId);
      if (vendor) {
        await supabase.from('cabins').update({ is_booking_active: false }).eq('created_by', vendor.user_id);
        await supabase.from('hostels').update({ is_booking_active: false }).eq('created_by', vendor.user_id);
      }
    }

    // If approving (reactivating), restore properties
    if (action === 'approve') {
      const vendor = vendors.find(v => v.id === vendorId);
      if (vendor && (vendor.status === 'suspended' || vendor.status === 'rejected')) {
        await supabase.from('cabins').update({ is_booking_active: true }).eq('created_by', vendor.user_id);
        await supabase.from('hostels').update({ is_booking_active: true }).eq('created_by', vendor.user_id);
      }
    }

    const result = await vendorApprovalService.updateVendorStatus(vendorId, data);
    if (result.success) {
      toast({ title: "Success", description: `Partner ${action}ed successfully` });
      fetchVendors();
      setRejectionReason('');
    } else {
      toast({ title: "Error", description: result.error?.message || `Failed to ${action} Partner`, variant: "destructive" });
    }
  };

  const handleVendorUpdate = async (vendorId: string, updatedData: Partial<Vendor>) => {
    const result = await vendorApprovalService.updateVendorDetails(vendorId, updatedData);
    if (result.success) {
      toast({ title: "Success", description: "Partner details updated" });
      fetchVendors();
      setSelectedVendor(result.data.data);
    } else {
      toast({ title: "Error", description: result.error?.message || "Failed to update", variant: "destructive" });
    }
  };

  const handleExport = async () => {
    const result = await vendorApprovalService.exportVendors({ status: filterStatus as any, search: searchTerm });
    if (result.success) {
      const url = window.URL.createObjectURL(new Blob([result.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Partners_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
      suspended: 'bg-orange-50 text-orange-700 border-orange-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return <Badge className={`${styles[status] || 'bg-muted text-muted-foreground'} border text-[10px]`}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold">Partner Management</h1>
          <p className="text-xs text-muted-foreground">Review and manage partner applications</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline" size="sm" className="h-8 text-xs gap-1"
            onClick={() => {
              const url = `${getPublicAppUrl()}/partner/register`;
              navigator.clipboard.writeText(url);
              toast({ title: "Copied!", description: "Partner onboarding link copied to clipboard" });
            }}
          >
            <Link2 className="h-3 w-3" /> Onboarding Link
            <Copy className="h-3 w-3 ml-0.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={fetchVendors}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleExport}>
            <Download className="h-3 w-3" /> Export
          </Button>
        </div>
      </div>

      <VendorStatsCards />

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input className="h-8 pl-7 text-xs w-[200px]" placeholder="Search name, email, phone..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
        </div>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            <SelectItem value="pending" className="text-xs">Pending</SelectItem>
            <SelectItem value="approved" className="text-xs">Approved</SelectItem>
            <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
            <SelectItem value="suspended" className="text-xs">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBusinessType} onValueChange={(v) => { setFilterBusinessType(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Business Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Types</SelectItem>
            <SelectItem value="individual" className="text-xs">Individual</SelectItem>
            <SelectItem value="company" className="text-xs">Company</SelectItem>
            <SelectItem value="partnership" className="text-xs">Partnership</SelectItem>
          </SelectContent>
        </Select>
        {(searchTerm || filterStatus !== 'all' || filterBusinessType !== 'all') && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterBusinessType('all'); setPage(1); }}>
            Clear
          </Button>
        )}
        <Badge variant="secondary" className="text-xs ml-auto">{totalCount} partners</Badge>
      </div>

      {/* Table / Cards */}
      <div className="border rounded-md">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-xs">Loading...</div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <User className="h-6 w-6 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No partners found</p>
          </div>
        ) : isMobile ? (
          <div className="space-y-3 p-3">
            {paginated.map((v, index) => (
              <div key={v.id} className="border rounded-lg p-3 bg-card space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-xs">{v.business_name}</p>
                    <p className="text-[10px] text-muted-foreground">{v.contact_person}</p>
                  </div>
                  {getStatusBadge(v.status)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-muted-foreground">Email: </span>{v.email}</div>
                  <div><span className="text-muted-foreground">Phone: </span>{v.phone}</div>
                  <div><span className="text-muted-foreground">Type: </span><span className="capitalize">{v.business_type}</span></div>
                  <div><span className="text-muted-foreground">City: </span>{v.address?.city || '-'}</div>
                </div>
                <div className="flex gap-1 pt-1">
                  <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => { setSelectedVendor(v); setShowDetailsDialog(true); }}>
                    <Eye className="h-3 w-3 mr-1" /> View
                  </Button>
                  {v.status === 'pending' && (
                    <>
                      <Button variant="outline" size="sm" className="h-6 text-[10px] text-emerald-600" onClick={() => handleStatusUpdate(v.id, 'approve')}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-6 text-[10px] text-red-600" onClick={() => handleStatusUpdate(v.id, 'reject')}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {(v.status === 'suspended' || v.status === 'rejected') && (
                    <Button variant="outline" size="sm" className="h-6 text-[10px] text-emerald-600" onClick={() => handleStatusUpdate(v.id, 'approve')}>
                      <Power className="h-3 w-3 mr-1" /> Activate
                    </Button>
                  )}
                  {v.status === 'approved' && (
                    <Button variant="outline" size="sm" className="h-6 text-[10px] text-orange-600" onClick={() => handleStatusUpdate(v.id, 'suspend')}>
                      <AlertTriangle className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-12">S.No.</TableHead>
                <TableHead className="text-xs">Partner ID</TableHead>
                <TableHead className="text-xs">Business Name</TableHead>
                <TableHead className="text-xs">Contact</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Location</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((v, index) => (
                <TableRow key={v.id}>
                  <TableCell className="text-[11px] text-muted-foreground">{getSerialNumber(index, page, pageSize)}</TableCell>
                  <TableCell className="text-[11px] font-mono">{v.serial_number || v.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-[11px]">
                    <div className="font-medium">{v.business_name}</div>
                    <div className="text-[10px] text-muted-foreground">{v.contact_person}</div>
                  </TableCell>
                  <TableCell className="text-[11px]">
                    <div>{v.email}</div>
                    <div className="text-[10px] text-muted-foreground">{v.phone}</div>
                  </TableCell>
                  <TableCell className="text-[11px] capitalize">{v.business_type}</TableCell>
                  <TableCell className="text-[11px]">
                    {v.address?.city && <span>{v.address.city}, {v.address?.state}</span>}
                  </TableCell>
                  <TableCell>{getStatusBadge(v.status)}</TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">{new Date(v.created_at).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => { setSelectedVendor(v); setShowDetailsDialog(true); }}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      {v.status === 'pending' && (
                        <>
                          <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700" onClick={() => handleStatusUpdate(v.id, 'approve')}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-red-600 hover:text-red-700">
                                <X className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle className="text-sm">Reject Partner</DialogTitle></DialogHeader>
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-xs">Reason</Label>
                                  <Textarea className="text-xs" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Reason for rejection..." />
                                </div>
                                <Button variant="destructive" size="sm" className="w-full text-xs" onClick={() => handleStatusUpdate(v.id, 'reject')}>Reject</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                      {(v.status === 'suspended' || v.status === 'rejected') && (
                        <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700" onClick={() => handleStatusUpdate(v.id, 'approve')}>
                          <Power className="h-3 w-3 mr-1" /> Activate
                        </Button>
                      )}
                      {v.status === 'approved' && (
                        <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700" onClick={() => handleStatusUpdate(v.id, 'suspend')}>
                          <AlertTriangle className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AdminTablePagination
        currentPage={page}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
      />

      {selectedVendor && (
        <VendorDetailsDialog
          vendor={selectedVendor}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          onStatusUpdate={handleStatusUpdate}
          onVendorUpdate={handleVendorUpdate}
        />
      )}
    </div>
  );
};

export default VendorApproval;
