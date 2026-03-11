import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Wallet, Download, Search, RefreshCw, DollarSign, Image } from 'lucide-react';
import { depositRefundService, DepositRefund, DepositRefundFilters } from '@/api/depositRefundService';
import { uploadService } from '@/api/uploadService';
import { useToast } from '@/hooks/use-toast';
import { DateFilterSelector } from '@/components/common/DateFilterSelector';
import { format } from "date-fns";
import { formatCurrency } from '@/utils/currency';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';

type DateFilterType = 'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom';

interface ReportDateRangePickerProps {
  type?: string;
  status?: string;
}

export const RefundManagement: React.FC<ReportDateRangePickerProps> = ({ type, status }) => {
  const [deposits, setDeposits] = useState<DepositRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeposits, setSelectedDeposits] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

  const [statusFilter, setStatusFilter] = useState(status);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

  // Refund dialog state
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [selectedDepositForRefund, setSelectedDepositForRefund] = useState<DepositRefund | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [transactionImage, setTransactionImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [transactionImageUrl, setTransactionImageUrl] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    fetchDeposits();
  }, [pagination.page, pagination.limit, statusFilter, searchTerm, dateFilter, customStartDate, customEndDate]);

  const fetchDeposits = async () => {
    setLoading(true);
    const filters: DepositRefundFilters = {
      status: statusFilter,
      type,
      search: searchTerm,
      dateFilter,
      startDate: dateFilter === 'custom' && customStartDate ? customStartDate.toISOString() : undefined,
      endDate: dateFilter === 'custom' && customEndDate ? customEndDate.toISOString() : undefined,
    };
    const result = await depositRefundService.getRefunds(pagination.page, pagination.limit, filters);
    if (result.success && result.data) {
      setDeposits(result.data.data);
      setPagination(result.data.pagination);
    } else {
      toast({ title: 'Error', description: 'Failed to fetch deposits', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleProcessRefund = (deposit?: DepositRefund) => {
    if (deposit) {
      setSelectedDepositForRefund(deposit);
      setSelectedDeposits([deposit._id]);
      setRefundAmount(deposit.keyDeposit.toString());
    } else {
      if (selectedDeposits.length === 0) {
        toast({ title: 'Error', description: 'Please select deposits to refund', variant: 'destructive' });
        return;
      }
      setSelectedDepositForRefund(null);
    }
    setShowRefundDialog(true);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setTransactionImage(file);
    setUploadingImage(true);
    try {
      const result = await uploadService.uploadImage(file);
      if (result.success) {
        setTransactionImageUrl(result.data.url);
        toast({ title: 'Success', description: 'Transaction image uploaded successfully' });
      } else {
        toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRefundSubmit = async () => {
    setProcessing(true);
    const refundData = {
      refundAmount: parseFloat(refundAmount),
      refundReason,
      refundMethod,
      transactionId,
      transactionImageUrl,
    };
    let result;
    if (selectedDepositForRefund) {
      result = await depositRefundService.processRefund(selectedDepositForRefund._id, refundData);
    } else {
      result = await depositRefundService.bulkProcessRefunds(selectedDeposits, refundData);
    }
    if (result.success) {
      const count = selectedDepositForRefund ? 1 : selectedDeposits.length;
      toast({ title: 'Success', description: `${count} deposit${count > 1 ? 's' : ''} refunded successfully` });
      resetRefundForm();
      fetchDeposits();
    } else {
      toast({ title: 'Error', description: 'Failed to process refund', variant: 'destructive' });
    }
    setProcessing(false);
  };

  const resetRefundForm = () => {
    setShowRefundDialog(false);
    setSelectedDeposits([]);
    setSelectedDepositForRefund(null);
    setRefundAmount('');
    setRefundReason('');
    setRefundMethod('');
    setTransactionId('');
    setTransactionImage(null);
    setTransactionImageUrl('');
  };

  const handleExportReport = async () => {
    setExporting(true);
    const filters: DepositRefundFilters = {
      status: statusFilter,
      search: searchTerm,
      dateFilter,
      startDate: dateFilter === 'custom' && customStartDate ? customStartDate.toISOString() : undefined,
      endDate: dateFilter === 'custom' && customEndDate ? customEndDate.toISOString() : undefined,
    };
    const result = await depositRefundService.exportDepositsReport(filters, 'excel');
    if (result.success) {
      toast({ title: 'Success', description: 'Report exported successfully' });
    } else {
      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' });
    }
    setExporting(false);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input className="h-8 pl-7 text-xs w-[200px]" placeholder="Search name, booking#..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <DateFilterSelector
          dateFilter={dateFilter}
          startDate={customStartDate}
          endDate={customEndDate}
          onDateFilterChange={(filter) => setDateFilter(filter as DateFilterType)}
          onStartDateChange={setCustomStartDate}
          onEndDateChange={setCustomEndDate}
        />
        <div className="ml-auto flex items-center gap-2">
          {searchTerm && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSearchTerm('')}>
              Clear
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" disabled={exporting} onClick={handleExportReport}>
            {exporting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Export
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={fetchDeposits}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">S.No.</TableHead>
              <TableHead className="text-xs">Booking ID</TableHead>
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs">Reading Room</TableHead>
              <TableHead className="text-xs">Seat</TableHead>
              <TableHead className="text-xs">Deposit</TableHead>
              <TableHead className="text-xs">Due Amount</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-xs">Loading...</TableCell></TableRow>
            ) : deposits.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-xs">No deposits found</TableCell></TableRow>
            ) : (
              deposits.map((deposit, index) => (
                <TableRow key={deposit._id}>
                  <TableCell className="text-xs text-muted-foreground">{getSerialNumber(index, pagination.page, pagination.limit)}</TableCell>
                  <TableCell className="text-xs">
                    <span className="font-mono">{deposit.booking?.bookingId || 'N/A'}</span>
                    {deposit.transactionId && <div className="text-muted-foreground text-[10px]">TR: {deposit.transactionId}</div>}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium">{deposit.user?.name || 'N/A'}</div>
                    {deposit.user?.phone && <div className="text-muted-foreground text-[10px]">{deposit.user.phone}</div>}
                  </TableCell>
                  <TableCell className="text-xs">{deposit.cabin?.name || 'N/A'}</TableCell>
                  <TableCell className="text-xs">{deposit.seat?.number || 'N/A'}</TableCell>
                  <TableCell className="text-xs font-semibold">{formatCurrency(deposit.keyDeposit)}</TableCell>
                  <TableCell className="text-xs">
                    {deposit.dueAmount > 0 ? (
                      <span className="text-destructive font-semibold">{formatCurrency(deposit.dueAmount)}</span>
                    ) : (
                      <span className="text-muted-foreground">No Dues</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>End: {format(new Date(deposit.endDate), "dd MMM yyyy")}</div>
                    {deposit.keyDepositRefundDate && <div>Refund: {format(new Date(deposit.keyDepositRefundDate), "dd MMM yyyy")}</div>}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={deposit.keyDepositRefunded ? 'default' : 'secondary'} className="text-[10px]">
                      {deposit.keyDepositRefunded ? 'Refunded' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {!deposit.keyDepositRefunded && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleProcessRefund(deposit)}>
                        Refund
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <AdminTablePagination
        currentPage={pagination.page}
        totalItems={pagination.total}
        pageSize={pagination.limit}
        onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
        onPageSizeChange={(s) => setPagination(prev => ({ ...prev, limit: s, page: 1 }))}
      />

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDepositForRefund ? 'Process Single Refund' : `Process Bulk Refund (${selectedDeposits.length} items)`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="refundAmount" className="text-right">Amount</Label>
              <Input type="number" id="refundAmount" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} className="col-span-3" placeholder="Enter refund amount" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="refundReason" className="text-right">Reason</Label>
              <Input type="text" id="refundReason" value={refundReason} onChange={e => setRefundReason(e.target.value)} className="col-span-3" placeholder="Refund reason" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="refundMethod" className="text-right">Method</Label>
              <Select value={refundMethod} onValueChange={setRefundMethod}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select refund method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transactionId" className="text-right">Transaction ID</Label>
              <Input type="text" id="transactionId" value={transactionId} onChange={e => setTransactionId(e.target.value)} className="col-span-3" placeholder="Transaction ID" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Receipt</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={uploadingImage} onClick={() => document.getElementById('refund-file-input')?.click()}>
                    <Upload className="h-3.5 w-3.5" /> Gallery
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={uploadingImage} onClick={() => document.getElementById('refund-camera-input')?.click()}>
                    <Camera className="h-3.5 w-3.5" /> Capture
                  </Button>
                </div>
                <input id="refund-file-input" type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="hidden" />
                <input id="refund-camera-input" type="file" accept="image/*" capture="environment" onChange={handleImageUpload} disabled={uploadingImage} className="hidden" />
                {uploadingImage && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                  </div>
                )}
                {transactionImageUrl && (
                  <div className="flex items-center text-sm text-primary">
                    <Image className="mr-2 h-4 w-4" /> Image uploaded successfully
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={resetRefundForm}>Cancel</Button>
            <Button disabled={processing || !refundAmount} onClick={handleRefundSubmit}>
              {processing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
              Process Refund
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
