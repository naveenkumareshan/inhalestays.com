
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Filter, Search, Download, FileSpreadsheet } from 'lucide-react';
import { ReportSkeleton } from './ReportSkeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { adminBookingsService } from '@/api/adminBookingsService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminTablePagination } from '@/components/admin/AdminTablePagination';
import ExcelJS from 'exceljs';

interface BookingTransactionsProps {
  dateRange?: DateRange;
  partnerUserId?: string;
}

export const BookingTransactions: React.FC<BookingTransactionsProps> = ({ dateRange, partnerUserId }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();
  const { toast } = useToast();

  const columns = [
    {
      accessorKey: 'bookingId',
      header: 'Booking ID',
      cell: ({ row }: any) => (
        <div className="font-medium text-xs">{row.original.bookingId}</div>
      ),
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium text-sm">{row.original.userId?.name || 'N/A'}</div>
          <div className="text-xs text-muted-foreground">{row.original.userId?.email}</div>
          {row.original.userId?.phone && <div className="text-xs text-muted-foreground">{row.original.userId.phone}</div>}
        </div>
      ),
    },
    {
      accessorKey: 'cabin',
      header: 'Property',
      cell: ({ row }: any) => (
        <div className="text-sm">
          <div className="font-medium">{row.original.cabinId?.name || 'N/A'}</div>
          {row.original.seatId && (
            <div className="text-xs text-muted-foreground">Seat: {row.original.seatId.number}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Payment Method',
      cell: ({ row }: any) => (
        <Badge variant="outline" className="capitalize text-xs">
          {row.original.paymentMethod || 'N/A'}
        </Badge>
      ),
    },
    {
      accessorKey: 'totalPrice',
      header: 'Amount',
      cell: ({ row }: any) => (
        <div className="font-medium">₹{(row.original.totalPrice || 0).toLocaleString('en-IN')}</div>
      ),
    },
    {
      accessorKey: 'paymentStatus',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.original.paymentStatus;
        return (
          <Badge variant={
            status === 'completed' ? 'default' : 
            status === 'pending' ? 'outline' : 
            'destructive'
          } className={status === 'completed' ? 'bg-green-500 hover:bg-green-600' : undefined}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'transactionId',
      header: 'Transaction ID',
      cell: ({ row }: any) => (
        <div className="text-xs text-muted-foreground">{row.original.transactionId || '-'}</div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }: any) => (
        <div className="text-sm">
          {row.original.createdAt ? format(new Date(row.original.createdAt), 'dd MMM yyyy') : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/admin/bookings/${row.original._id}/cabin`)}
        >
          View
        </Button>
      ),
    }
  ];

  useEffect(() => {
    fetchTransactions();
  }, [page, pageSize, statusFilter, dateRange]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const filters: any = {
        page,
        limit: pageSize,
      };
      
      if (statusFilter && statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      if (dateRange?.from) {
        filters.startDate = format(dateRange.from, 'yyyy-MM-dd');
      }
      if (dateRange?.to) {
        filters.endDate = format(dateRange.to, 'yyyy-MM-dd');
      }
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }
      
      const response = await adminBookingsService.getAllBookings(filters, partnerUserId);
      
      if (response.success && response.data) {
        setTransactions(response.data);
        setTotalCount(response.totalDocs || 0);
        setTotalPages(response.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transaction data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchTransactions();
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      // Fetch all data without pagination
      const filters: any = {};
      if (statusFilter && statusFilter !== 'all') filters.status = statusFilter;
      if (dateRange?.from) filters.startDate = format(dateRange.from, 'yyyy-MM-dd');
      if (dateRange?.to) filters.endDate = format(dateRange.to, 'yyyy-MM-dd');
      if (searchQuery.trim()) filters.search = searchQuery.trim();
      filters.page = 1;
      filters.limit = 1000;

      const response = await adminBookingsService.getAllBookings(filters, partnerUserId);
      if (!response.success || !response.data) throw new Error('Failed to fetch data');

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Transactions');

      sheet.columns = [
        { header: 'Booking ID', key: 'bookingId', width: 20 },
        { header: 'Customer Name', key: 'customerName', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 18 },
        { header: 'Property', key: 'property', width: 25 },
        { header: 'Seat', key: 'seat', width: 10 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Payment Method', key: 'paymentMethod', width: 18 },
        { header: 'Transaction ID', key: 'transactionId', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Date', key: 'date', width: 15 },
      ];

      response.data.forEach((t: any) => {
        sheet.addRow({
          bookingId: t.bookingId,
          customerName: t.userId?.name || 'N/A',
          email: t.userId?.email || '',
          phone: t.userId?.phone || '',
          property: t.cabinId?.name || 'N/A',
          seat: t.seatId?.number || '',
          amount: t.totalPrice || 0,
          paymentMethod: t.paymentMethod || '',
          transactionId: t.transactionId || '',
          status: t.paymentStatus || '',
          date: t.createdAt ? format(new Date(t.createdAt), 'dd MMM yyyy') : '',
        });
      });

      // Style header
      sheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Success", description: "Transactions exported as Excel successfully" });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: "Export Failed", description: "Failed to export transactions", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <ReportSkeleton type="table" />;
  }

  return (
    <Card className="overflow-hidden border-border/50 shadow-md">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 bg-muted/30">
        <div>
          <CardTitle className="text-lg font-medium text-foreground/90 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Transaction Reports
          </CardTitle>
          <CardDescription>
            Detailed transaction history with booking information
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="w-[180px] pl-8 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          
          <div className="flex items-center gap-1 bg-muted/30 px-2 py-1 rounded-md">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select 
              value={statusFilter}
              onValueChange={(value) => { setStatusFilter(value); setPage(1); }}
            >
              <SelectTrigger className="w-[110px] border-none bg-transparent focus:ring-0 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting}>
                <Download className="h-4 w-4 mr-1" />
                {exporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="border border-border/50 rounded-md overflow-hidden">
          <DataTable 
            columns={columns} 
            data={transactions} 
            pagination={false}
          />
        </div>
        
        {transactions.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-1">No transactions found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
          </div>
        )}
        
        {transactions.length > 0 && (
          <div className="mt-4">
            <AdminTablePagination
              currentPage={page}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
