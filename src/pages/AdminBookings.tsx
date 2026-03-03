import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { adminBookingsService } from "../api/adminBookingsService";
import { useToast } from "@/hooks/use-toast";
import { BookingFilters } from "@/types/BookingTypes";
import { Eye, Search, Filter, BookOpen } from "lucide-react";
import { AdminTablePagination, getSerialNumber } from "@/components/admin/AdminTablePagination";
import { useIsMobile } from "@/hooks/use-mobile";

type BookingStatus = "pending" | "completed" | "failed";

const fmtDate = (d: string) => {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};

const fmtDateTime = (d: string) => {
  if (!d) return "-";
  const dt = new Date(d);
  const date = dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  const time = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" });
  return `${date}, ${time}`;
};

const fmtRange = (s: string, e: string) => {
  if (!s || !e) return "-";
  return `${fmtDate(s)} – ${fmtDate(e)}`;
};

const badgeCls = (s: string) => {
  switch (s) {
    case "completed": case "paid": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "failed": case "cancelled": return "bg-red-50 text-red-700 border border-red-200";
    case "pending": return "bg-amber-50 text-amber-700 border border-amber-200";
    case "refunded": return "bg-blue-50 text-blue-700 border border-blue-200";
    default: return "bg-muted text-muted-foreground border border-border";
  }
};

const AdminBookings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState<BookingStatus | "">("");

  useEffect(() => { fetchBookings(); }, [currentPage, pageSize, searchQuery, status]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const filters: BookingFilters = { page: currentPage, limit: pageSize, search: searchQuery };
      if (status) filters.status = status as BookingStatus;
      const response = await adminBookingsService.getAllBookings(filters);
      if (response.success) {
        setBookings(response.data || []);
        const count = response.count || 0;
        setTotalCount(count);
        setTotalPages(response.totalPages || Math.ceil(count / pageSize) || 1);
      } else {
        toast({ title: "Error fetching bookings", description: response.error || "Failed to load bookings", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to load bookings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setCurrentPage(1); };
  const handleStatusChange = (v: string) => { setStatus(v === "all" ? "" : v as BookingStatus); setCurrentPage(1); };

  const renderMobileCard = (b: any, idx: number) => (
    <div key={b._id} className="border rounded-lg p-3 bg-card space-y-2">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="font-medium text-xs truncate">{b.userId?.name || "N/A"}</p>
          <p className="text-[10px] text-muted-foreground truncate">{b.userId?.email || ""}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${badgeCls(b.status || "pending")}`}>
          {b.status || "pending"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <span className="text-muted-foreground">Room/Seat: </span>
          <span>{b.cabinId?.name && b.seatId?.number ? `${b.cabinId.name} / S${b.seatId.number}` : b.roomNumber || "-"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Category: </span>
          <span>{b.seatCategory || "—"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Duration: </span>
          <span>{fmtRange(b.startDate, b.endDate)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Booked: </span>
          <span>{fmtDateTime(b.createdAt)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 border-t">
        <div className="text-[11px]">
          <span className="font-semibold">₹{(b.seatPrice || 0).toLocaleString()}</span>
          <span className="text-muted-foreground ml-2">Paid: ₹{(b.totalPaid || 0).toLocaleString()}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/admin/bookings/${b.bookingId || b._id}/cabin`)}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">All Transactions</h1>
        <p className="text-muted-foreground text-xs mt-0.5">View and manage all seat reservations across reading rooms.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="py-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search by name, email or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8 text-xs" />
              </div>
              <Button type="submit" size="sm" className="h-8 text-xs">Search</Button>
            </form>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={status || "all"} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-7 w-7 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <BookOpen className="h-8 w-8 opacity-30" /><p className="text-xs">No bookings found.</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-3 p-3">
              {bookings.map((b, idx) => renderMobileCard(b, idx))}
            </div>
          ) : (
            <TooltipProvider delayDuration={200}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      {["S.No.", "Booking ID", "Student", "Category", "Room / Seat", "Slot", "Booked On", "Duration", "Amount", "Status", "Actions"].map(h => (
                        <TableHead key={h} className={`text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2 px-2 ${h === "Actions" ? "text-right" : ""}`}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b, idx) => (
                      <TableRow key={b._id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <TableCell className="py-1 px-2 text-[11px] text-muted-foreground">{getSerialNumber(idx, currentPage, pageSize)}</TableCell>
                        <TableCell className="py-1 px-2 font-mono text-[10px]">{b.bookingId || b._id}</TableCell>
                        <TableCell className="py-1 px-2 text-[11px] whitespace-nowrap">
                          <span className="font-medium">{b.userId?.name || "N/A"}</span>
                          {b.userId?.email && <span className="text-muted-foreground ml-1 max-w-[140px] truncate inline-block align-bottom">({b.userId.email})</span>}
                        </TableCell>
                        <TableCell className="py-1 px-2"><Badge variant="outline" className="text-[10px] px-1.5 py-0 leading-none">{b.seatCategory || "—"}</Badge></TableCell>
                        <TableCell className="py-1 px-2 text-[10px] whitespace-nowrap">
                          {b.roomNumber || (b.cabinId?.name && b.seatId?.number ? `${b.cabinId.name} / S${b.seatId.number}` : "-")}
                        </TableCell>
                        <TableCell className="py-1 px-2 text-[11px] whitespace-nowrap">{b.slotName || "-"}</TableCell>
                        <TableCell className="py-1 px-2 text-[11px] whitespace-nowrap">{fmtDateTime(b.createdAt)}</TableCell>
                        <TableCell className="py-1 px-2 text-[11px] whitespace-nowrap">
                          <div>{fmtRange(b.startDate, b.endDate)}</div>
                          {b.bookingDuration && <div className="text-[10px] text-muted-foreground capitalize">{b.durationCount ? `${b.durationCount} ` : ''}{b.bookingDuration}</div>}
                        </TableCell>
                        <TableCell className="py-1 px-2 text-[11px]">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0 min-w-[140px]">
                            <div className="font-semibold whitespace-nowrap">Seat: ₹{(b.seatPrice || 0).toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground whitespace-nowrap">Locker: {(b.lockerPrice || 0) > 0 ? `₹${(b.lockerPrice || 0).toLocaleString()}` : '-'}</div>
                            {(b.discountAmount || 0) > 0 && <div className="text-[10px] text-destructive whitespace-nowrap">Discount: -₹{(b.discountAmount || 0).toLocaleString()}</div>}
                            <div className="text-[10px] text-emerald-600 whitespace-nowrap">Paid: ₹{(b.totalPaid || 0).toLocaleString()}</div>
                            <div className="text-[10px] text-amber-600 whitespace-nowrap">Due: ₹{(b.duePending || 0).toLocaleString()}</div>
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium capitalize ${badgeCls(b.status || "pending")}`}>{b.status || "pending"}</span>
                        </TableCell>
                        <TableCell className="py-1 px-2 text-right">
                          <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(`/admin/bookings/${b.bookingId || b._id}/cabin`)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger><TooltipContent>Details</TooltipContent></Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TooltipProvider>
          )}

          <div className="border-t">
            <AdminTablePagination
              currentPage={currentPage}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBookings;
