import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';
import { format, addDays, addMonths, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  LayoutGrid, List, CalendarIcon, Search, Ban, Lock, Unlock,
  Edit, Save, X, IndianRupee, Users, CheckCircle, Clock, AlertTriangle, RefreshCw, UserPlus, Info, ChevronDown, CreditCard, Banknote, Smartphone, Building2, Download, ArrowLeft, ArrowRightLeft, RotateCcw, Wallet, Bed, LogOut, XCircle, Pencil,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PaymentProofUpload } from '@/components/payment/PaymentProofUpload';
import { PaymentMethodSelector } from '@/components/vendor/PaymentMethodSelector';
import { resolvePaymentMethodLabels, getMethodLabel } from '@/utils/paymentMethodLabels';
import { BookingUpdateDatesDialog } from '@/components/admin/BookingUpdateDatesDialog';

type ViewMode = 'grid' | 'table';
type StatusFilter = 'all' | 'available' | 'booked' | 'expiring_soon' | 'blocked' | 'future_booked';

interface HostelBed {
  id: string;
  bed_number: number;
  is_available: boolean;
  is_blocked: boolean;
  block_reason: string | null;
  category: string | null;
  price_override: number | null;
  room_id: string;
  sharing_option_id: string;
  sharingType: string;
  price: number;
  roomNumber: string;
  roomCategory: string;
  hostelId: string;
  hostelName: string;
  floor: number;
  dateStatus: 'available' | 'booked' | 'expiring_soon' | 'blocked' | 'future_booked';
  currentBooking: any | null;
  allBookings: any[];
}

interface HostelInfo {
  id: string;
  name: string;
  gender: string;
  security_deposit: number;
  advance_booking_enabled: boolean;
  advance_percentage: number;
  advance_flat_amount: number | null;
  advance_use_flat: boolean;
  allowed_durations: string[];
  advance_applicable_durations: string[];
}

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  serial_number: string;
  profile_picture: string | null;
  linked?: boolean;
}

const HostelBedMap: React.FC = () => {
  const [hostels, setHostels] = useState<HostelInfo[]>([]);
  const [beds, setBeds] = useState<HostelBed[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<HostelBed | null>(null);

  // Price edit
  const [editingBedId, setEditingBedId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [updating, setUpdating] = useState(false);

  // Block dialog
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockBed, setBlockBed] = useState<HostelBed | null>(null);
  const [blockReason, setBlockReason] = useState('');

  // Future booking mode
  const [showFutureBooking, setShowFutureBooking] = useState(false);
  const [isRenewMode, setIsRenewMode] = useState(false);

  // Receipts dialog state
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptDialogData, setReceiptDialogData] = useState<any[]>([]);
  const [receiptDialogLoading, setReceiptDialogLoading] = useState(false);

  // Advance booking mode
  const [isAdvanceBooking, setIsAdvanceBooking] = useState(false);
  const [manualAdvanceAmount, setManualAdvanceAmount] = useState('');
  const [manualDueDate, setManualDueDate] = useState<Date | undefined>(undefined);

  // Booking form state
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<StudentProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<{ type: 'daily' | 'weekly' | 'monthly'; count: number }>({ type: 'monthly', count: 1 });
  const [bookingStartDate, setBookingStartDate] = useState<Date>(new Date());
  const [bookingPrice, setBookingPrice] = useState('');
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [transactionId, setTransactionId] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [collectSecurityDeposit, setCollectSecurityDeposit] = useState(true);
  const [securityDepositAmount, setSecurityDepositAmount] = useState('');

  // Two-step booking flow
  const [bookingStep, setBookingStep] = useState<'details' | 'confirm'>('details');

  // Booking success state
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [lastBookingInfo, setLastBookingInfo] = useState<any>(null);

  // New student form
  const [showNewStudent, setShowNewStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [creatingStudent, setCreatingStudent] = useState(false);

  // Transfer bed state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferBookingId, setTransferBookingId] = useState<string>('');
  const [transferTargetBedId, setTransferTargetBedId] = useState<string>('');
  const [transferring, setTransferring] = useState(false);
  const [availableBedsForTransfer, setAvailableBedsForTransfer] = useState<HostelBed[]>([]);

  // Inline due collection state
  const [expandedDueBookingId, setExpandedDueBookingId] = useState<string>('');
  const [dueCollectAmount, setDueCollectAmount] = useState('');
  const [dueCollectMethod, setDueCollectMethod] = useState('cash');
  const [dueCollectTxnId, setDueCollectTxnId] = useState('');
  const [collectingDue, setCollectingDue] = useState(false);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});

  // Release/Cancel booking state
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [actionBookingId, setActionBookingId] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  // Date edit state
  const [dateEditOpen, setDateEditOpen] = useState(false);
  const [dateEditBooking, setDateEditBooking] = useState<any>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch hostels on mount (filtered by ownership for partners)
  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase
        .from('hostels')
        .select('id, name, gender, security_deposit, advance_booking_enabled, advance_percentage, advance_flat_amount, advance_use_flat, allowed_durations, advance_applicable_durations')
        .eq('is_active', true)
        .order('name');

      // Filter for non-admin users (use effective owner for employees)
      if (user?.role && user.role !== 'admin' && user.role !== 'super_admin' && user.id) {
        try {
          const { ownerId } = await getEffectiveOwnerId();
          query = query.eq('created_by', ownerId);
        } catch {
          query = query.eq('created_by', user.id);
        }
      }

      const { data } = await query;
      if (data) {
        setHostels(data.map((h: any) => ({
          ...h,
          allowed_durations: h.allowed_durations || ['daily', 'weekly', 'monthly'],
          advance_applicable_durations: h.advance_applicable_durations || ['daily', 'weekly', 'monthly'],
        })));
      }
      setLoading(false);
    })();
  }, [user]);

  // Fetch beds when hostel or date changes
  const fetchBeds = useCallback(async () => {
    setRefreshing(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // Query beds with joins
    let bedsQuery = supabase
      .from('hostel_beds')
      .select('*, hostel_sharing_options(type, price_monthly, room_id), hostel_rooms!inner(room_number, category, floor, hostel_id, hostels!inner(id, name))');

    if (selectedHostelId !== 'all') {
      bedsQuery = bedsQuery.eq('hostel_rooms.hostel_id', selectedHostelId);
    } else if (hostels.length > 0) {
      // Partner isolation: only show beds from partner's own hostels
      bedsQuery = bedsQuery.in('hostel_rooms.hostel_id', hostels.map(h => h.id));
    }

    const { data: bedsData, error: bedsError } = await bedsQuery.order('bed_number');

    if (bedsError) {
      console.error('Error fetching beds:', bedsError);
      toast({ title: 'Error loading beds', description: bedsError.message, variant: 'destructive' });
      setRefreshing(false);
      return;
    }

    if (!bedsData || bedsData.length === 0) {
      setBeds([]);
      setRefreshing(false);
      return;
    }

    // Fetch all hostel bookings overlapping the selected date
    let bookingsQuery = supabase
      .from('hostel_bookings')
      .select('*, profiles:user_id(name, email, phone, serial_number, profile_picture)')
      .in('status', ['confirmed', 'pending'])
      .lte('start_date', dateStr)
      .gte('end_date', dateStr);

    if (selectedHostelId !== 'all') {
      bookingsQuery = bookingsQuery.eq('hostel_id', selectedHostelId);
    } else if (hostels.length > 0) {
      bookingsQuery = bookingsQuery.in('hostel_id', hostels.map(h => h.id));
    }

    const { data: bookingsData, error: bookingsError } = await bookingsQuery;
    if (bookingsError) console.error('Error fetching bookings:', bookingsError);

    // Also fetch all bookings (current + future) for all these beds
    const bedIds = bedsData.map((b: any) => b.id);
    const { data: allBookingsData, error: allBookingsError } = await supabase
      .from('hostel_bookings')
      .select('*, profiles:user_id(name, email, phone, serial_number, profile_picture)')
      .in('bed_id', bedIds)
      .in('status', ['confirmed', 'pending'])
      .gte('end_date', dateStr)
      .order('start_date');

    // Build booking maps
    const currentBookingMap = new Map<string, any>();
    (bookingsData || []).forEach((b: any) => {
      if (!currentBookingMap.has(b.bed_id)) {
        currentBookingMap.set(b.bed_id, b);
      }
    });

    const allBookingsMap = new Map<string, any[]>();
    (allBookingsData || []).forEach((b: any) => {
      if (!allBookingsMap.has(b.bed_id)) allBookingsMap.set(b.bed_id, []);
      allBookingsMap.get(b.bed_id)!.push(b);
    });

    const mappedBeds: HostelBed[] = bedsData.map((b: any) => {
      const room = b.hostel_rooms;
      const hostel = room?.hostels;
      const sharingOption = b.hostel_sharing_options;
      const price = b.price_override || sharingOption?.price_monthly || 0;
      const currentBooking = currentBookingMap.get(b.id);
      const allBeds = allBookingsMap.get(b.id) || [];

      let dateStatus: HostelBed['dateStatus'] = 'available';
      if (b.is_blocked) {
        dateStatus = 'blocked';
      } else if (currentBooking) {
        const endDate = new Date(currentBooking.end_date);
        const now = new Date();
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        dateStatus = daysLeft <= 5 ? 'expiring_soon' : 'booked';
      } else if (allBeds.length > 0 || !b.is_available) {
        dateStatus = 'future_booked';
      }

      const formatBooking = (bk: any) => ({
        bookingId: bk.id,
        startDate: bk.start_date,
        endDate: bk.end_date,
        totalPrice: Number(bk.total_price),
        advanceAmount: Number(bk.advance_amount),
        remainingAmount: Number(bk.remaining_amount),
        securityDeposit: Number(bk.security_deposit),
        paymentStatus: bk.payment_status,
        paymentMethod: bk.payment_method,
        transactionId: bk.transaction_id,
        bookingDuration: bk.booking_duration,
        durationCount: bk.duration_count,
        serialNumber: bk.serial_number,
        collectedByName: bk.collected_by_name,
        studentName: bk.profiles?.name || 'N/A',
        studentEmail: bk.profiles?.email || '',
        studentPhone: bk.profiles?.phone || '',
        profilePicture: bk.profiles?.profile_picture,
        userId: bk.user_id,
        discountAmount: 0,
        discountReason: '',
        status: bk.status,
      });

      return {
        id: b.id,
        bed_number: b.bed_number,
        is_available: b.is_available,
        is_blocked: b.is_blocked,
        block_reason: b.block_reason,
        category: b.category,
        price_override: b.price_override,
        room_id: b.room_id,
        sharing_option_id: b.sharing_option_id,
        sharingType: sharingOption?.type || '',
        price,
        roomNumber: room?.room_number || '',
        roomCategory: room?.category || '',
        hostelId: hostel?.id || '',
        hostelName: hostel?.name || '',
        floor: room?.floor || 1,
        dateStatus,
        currentBooking: currentBooking ? formatBooking(currentBooking) : null,
        allBookings: allBeds.map(formatBooking),
      };
    });

    setBeds(mappedBeds);
    setRefreshing(false);
  }, [selectedHostelId, selectedDate, hostels]);

  useEffect(() => {
    if (!loading) fetchBeds();
  }, [fetchBeds, loading]);

  // Sync selectedBed with refreshed beds array after price/data changes
  useEffect(() => {
    if (selectedBed && beds.length > 0) {
      const updated = beds.find(b => b.id === selectedBed.id);
      if (updated && updated.price !== selectedBed.price) {
        setSelectedBed(updated);
        setBookingPrice(String(updated.price));
      }
    }
  }, [beds]);

  // Available floors and rooms for filters
  const availableFloors = useMemo(() => {
    if (selectedHostelId === 'all') return [];
    const floors = [...new Set(beds.map(b => b.floor))].sort((a, b) => a - b);
    return floors.map(f => ({ value: String(f), label: `Floor ${f}` }));
  }, [beds, selectedHostelId]);

  const availableRooms = useMemo(() => {
    let filtered = beds;
    if (selectedHostelId !== 'all') {
      filtered = filtered.filter(b => b.hostelId === selectedHostelId);
    }
    if (selectedFloor !== 'all') {
      filtered = filtered.filter(b => String(b.floor) === selectedFloor);
    }
    const rooms = [...new Map(filtered.map(b => [b.room_id, b.roomNumber])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }));
    return rooms.map(([id, name]) => ({ value: id, label: name }));
  }, [beds, selectedHostelId, selectedFloor]);

  // Reset floor/room filters on hostel change
  useEffect(() => { setSelectedFloor('all'); setSelectedRoom('all'); }, [selectedHostelId]);
  useEffect(() => { setSelectedRoom('all'); }, [selectedFloor]);

  // Filtered beds
  const filteredBeds = useMemo(() => {
    let result = beds;
    if (selectedFloor !== 'all') {
      result = result.filter(b => String(b.floor) === selectedFloor);
    }
    if (selectedRoom !== 'all') {
      result = result.filter(b => b.room_id === selectedRoom);
    }
    if (statusFilter !== 'all') {
      result = result.filter(b => b.dateStatus === statusFilter);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(b =>
        String(b.bed_number).includes(q) ||
        (b.category || '').toLowerCase().includes(q) ||
        b.roomNumber.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const roomCmp = a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
      if (roomCmp !== 0) return roomCmp;
      return a.bed_number - b.bed_number;
    });
    return result;
  }, [beds, statusFilter, searchTerm, selectedFloor, selectedRoom]);

  // Stats
  const stats = useMemo(() => {
    const total = beds.length;
    const booked = beds.filter(b => b.dateStatus === 'booked').length;
    const available = beds.filter(b => b.dateStatus === 'available').length;
    const expiring = beds.filter(b => b.dateStatus === 'expiring_soon').length;
    const blocked = beds.filter(b => b.dateStatus === 'blocked').length;
    const futureBooked = beds.filter(b => b.dateStatus === 'future_booked').length;
    const revenue = beds.reduce((sum, b) => {
      if (b.dateStatus === 'booked' || b.dateStatus === 'expiring_soon') {
        return sum + (b.currentBooking?.totalPrice || 0);
      }
      return sum;
    }, 0);
    return { total, booked, available, expiring, blocked, futureBooked, revenue };
  }, [beds]);

  // Get hostel info for selected bed
  const selectedHostelInfo = useMemo(() => {
    if (!selectedBed) return null;
    return hostels.find(h => h.id === selectedBed.hostelId) || null;
  }, [selectedBed, hostels]);

  // Bed click -> open sheet
  const handleBedClick = (bed: HostelBed) => {
    setSelectedBed(bed);
    setSheetOpen(true);
    setSelectedStudent(null);
    setStudentQuery('');
    setStudentResults([]);
    setSelectedDuration({ type: 'monthly', count: 1 });
    setBookingStartDate(selectedDate);
    setBookingPrice(String(bed.price));
    setShowNewStudent(false);
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentPhone('');
    setDiscountAmount('');
    setDiscountReason('');
    setPaymentMethod('cash');
    setTransactionId('');
    setCollectSecurityDeposit(true);
    const hostelInfo = hostels.find(h => h.id === bed.hostelId);
    setSecurityDepositAmount(String(hostelInfo?.security_deposit || 0));
    setBookingSuccess(false);
    setLastBookingInfo(null);
    setShowFutureBooking(false);
    setIsRenewMode(false);
    setIsAdvanceBooking(false);
    setManualAdvanceAmount('');
    setManualDueDate(undefined);
    setBookingStep('details');
    setReceiptDialogOpen(false);
    setReceiptDialogData([]);
  };

  // Transfer bed handlers
  const openTransferDialog = async (bookingId: string) => {
    setTransferBookingId(bookingId);
    setTransferTargetBedId('');
    if (selectedBed) {
      const available = beds.filter(b => b.id !== selectedBed.id && b.dateStatus === 'available' && b.hostelId === selectedBed.hostelId);
      setAvailableBedsForTransfer(available);
    }
    setTransferDialogOpen(true);
  };

  const handleTransferBed = async () => {
    if (!transferBookingId || !transferTargetBedId) return;
    const targetBed = availableBedsForTransfer.find(b => b.id === transferTargetBedId);
    if (!targetBed || !selectedBed) return;
    setTransferring(true);
    const { error } = await supabase
      .from('hostel_bookings')
      .update({ bed_id: transferTargetBedId, room_id: targetBed.room_id })
      .eq('id', transferBookingId);
    if (!error) {
      // Bed availability is now handled by database trigger
      toast({ title: 'Bed transferred successfully' });
      setTransferDialogOpen(false);
      setSheetOpen(false);
      fetchBeds();
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setTransferring(false);
  };

  // Inline due collection
  const handleInlineDueCollect = async (bookingId: string) => {
    if (!dueCollectAmount || !selectedBed) return;
    const amt = parseFloat(dueCollectAmount);
    if (amt <= 0) { toast({ title: 'Enter valid amount', variant: 'destructive' }); return; }
    setCollectingDue(true);
    const collectedByName = user?.name || user?.email || 'Admin';
    // Create receipt
    const { error: receiptError } = await supabase.from('hostel_receipts').insert({
      hostel_id: selectedBed.hostelId,
      booking_id: bookingId,
      user_id: selectedBed.currentBooking?.userId || '',
      amount: amt,
      payment_method: dueCollectMethod,
      transaction_id: dueCollectTxnId,
      receipt_type: 'due_collection',
      collected_by: user?.id,
      collected_by_name: collectedByName,
    });
    if (!receiptError) {
      // Update booking remaining_amount
      const booking = selectedBed.allBookings.find(b => b.bookingId === bookingId);
      if (booking) {
        const newRemaining = Math.max(0, booking.remainingAmount - amt);
        const newAdvance = booking.advanceAmount + amt;
        await supabase.from('hostel_bookings').update({
          remaining_amount: newRemaining,
          advance_amount: newAdvance,
          payment_status: newRemaining <= 0 ? 'completed' : 'partial',
        }).eq('id', bookingId);
      }
      toast({ title: 'Payment collected' });
      setExpandedDueBookingId('');
      fetchBeds();
    } else {
      toast({ title: 'Error', description: receiptError.message, variant: 'destructive' });
    }
    setCollectingDue(false);
  };

  // Price edit
  const handleSavePrice = async (bedId: string) => {
    if (!editPrice) return;
    setUpdating(true);
    const { error } = await supabase
      .from('hostel_beds')
      .update({ price_override: parseFloat(editPrice) })
      .eq('id', bedId);
    if (!error) {
      toast({ title: 'Price updated' });
      setEditingBedId(null);
      fetchBeds();
    } else {
      toast({ title: 'Error', description: 'Failed to update price', variant: 'destructive' });
    }
    setUpdating(false);
  };

  // Block/Unblock
  const openBlockDialog = (bed: HostelBed, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBlockBed(bed);
    setBlockReason('');
    setBlockDialogOpen(true);
  };

  const handleConfirmBlock = async () => {
    if (!blockBed) return;
    if (!blockReason.trim()) {
      toast({ title: 'Please enter a reason', variant: 'destructive' });
      return;
    }
    setUpdating(true);
    const isBlocking = !blockBed.is_blocked;
    const { error } = await supabase
      .from('hostel_beds')
      .update({
        is_blocked: isBlocking,
        is_available: !isBlocking,
        block_reason: isBlocking ? blockReason : null,
      })
      .eq('id', blockBed.id);
    if (!error) {
      toast({ title: isBlocking ? 'Bed blocked' : 'Bed unblocked' });
      setBlockDialogOpen(false);
      fetchBeds();
    }
    setUpdating(false);
  };

  // Release bed handler
  const handleReleaseBed = async () => {
    if (!actionBookingId) return;
    setActionLoading(true);
    const { error } = await supabase
      .from('hostel_bookings')
      .update({ status: 'terminated', end_date: format(new Date(), 'yyyy-MM-dd') })
      .eq('id', actionBookingId);
    if (!error) {
      // Cancel pending dues
      await supabase
        .from('hostel_dues')
        .update({ status: 'cancelled' })
        .eq('booking_id', actionBookingId)
        .eq('status', 'pending');
      toast({ title: 'Bed released successfully' });
      setReleaseDialogOpen(false);
      setSheetOpen(false);
      fetchBeds();
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setActionLoading(false);
  };

  // Cancel booking handler
  const handleCancelHostelBooking = async () => {
    if (!actionBookingId) return;
    setActionLoading(true);
    const { error } = await supabase
      .from('hostel_bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', actionBookingId);
    if (!error) {
      await supabase
        .from('hostel_dues')
        .update({ status: 'cancelled' })
        .eq('booking_id', actionBookingId)
        .eq('status', 'pending');
      toast({ title: 'Booking cancelled successfully' });
      setCancelDialogOpen(false);
      setSheetOpen(false);
      fetchBeds();
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setActionLoading(false);
  };

  useEffect(() => {
    if (studentQuery.length < 2) { setStudentResults([]); return; }
    const timer = setTimeout(async () => {
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      let partnerId: string | undefined;
      if (!isAdmin && user?.id) {
        try {
          const { ownerId } = await getEffectiveOwnerId();
          partnerId = ownerId;
        } catch {
          partnerId = user.id;
        }
      }

      // Two-tier search: linked first, then global
      const searchTerm = `%${studentQuery}%`;
      const results: StudentProfile[] = [];
      const foundIds = new Set<string>();

      if (partnerId) {
        const { data: links } = await supabase
          .from('student_property_links')
          .select('student_user_id')
          .eq('partner_user_id', partnerId);
        const linkedIds = (links || []).map((l: any) => l.student_user_id);
        if (linkedIds.length > 0) {
          const { data: linkedProfiles } = await supabase
            .from('profiles')
            .select('id, name, email, phone, serial_number, profile_picture')
            .in('id', linkedIds)
            .or(`name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm}`)
            .limit(10);
          (linkedProfiles || []).forEach((p: any) => {
            foundIds.add(p.id);
            results.push({ ...p, linked: true } as any);
          });
        }
      }

      if (results.length < 5) {
        const { data: globalData } = await supabase
          .from('profiles')
          .select('id, name, email, phone, serial_number, profile_picture')
          .or(`name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .limit(10);
        (globalData || []).forEach((p: any) => {
          if (!foundIds.has(p.id)) {
            foundIds.add(p.id);
            results.push({ ...p, linked: !partnerId } as any);
          }
        });
      }

      setStudentResults(results.slice(0, 15));
    }, 300);
    return () => clearTimeout(timer);
  }, [studentQuery, user]);

  // Compute end date
  const computedEndDate = useMemo(() => {
    if (selectedDuration.type === 'monthly') return subDays(addMonths(bookingStartDate, selectedDuration.count), 1);
    if (selectedDuration.type === 'weekly') return addDays(bookingStartDate, selectedDuration.count * 7 - 1);
    return addDays(bookingStartDate, Math.max(0, selectedDuration.count - 1));
  }, [selectedDuration, bookingStartDate]);

  // Computed total
  const computedTotal = useMemo(() => {
    const base = parseFloat(bookingPrice) || 0;
    const discount = parseFloat(discountAmount) || 0;
    return Math.max(0, base - discount);
  }, [bookingPrice, discountAmount]);

  // Advance booking computed values
  const advanceComputed = useMemo(() => {
    if (!isAdvanceBooking) return null;
    const total = computedTotal;
    if (total <= 0) return null;
    const hostel = selectedHostelInfo;
    let defaultAdvance: number;
    if (hostel?.advance_use_flat && hostel?.advance_flat_amount) {
      defaultAdvance = Math.min(hostel.advance_flat_amount, total);
    } else if (hostel?.advance_percentage) {
      defaultAdvance = Math.round((hostel.advance_percentage / 100) * total);
    } else {
      defaultAdvance = Math.round(total * 0.5);
    }
    const secDepAmt = collectSecurityDeposit ? (parseFloat(securityDepositAmount) || 0) : 0;
    const grandTotal = total + secDepAmt;
    // Clamp advance to grandTotal (partial payment against total receivable)
    const advanceAmount = manualAdvanceAmount ? Math.min(parseFloat(manualAdvanceAmount) || 0, grandTotal) : defaultAdvance;
    // Due balance = grandTotal - advanceAmount (single partial amount model)
    const remainingDue = grandTotal - advanceAmount;
    const defaultDueDate = new Date(bookingStartDate);
    defaultDueDate.setDate(defaultDueDate.getDate() + 3);
    const dueDate = manualDueDate || defaultDueDate;
    return { advanceAmount, remainingDue, dueDate, proportionalEndDate: dueDate, grandTotal, secDepAmt };
  }, [isAdvanceBooking, selectedHostelInfo, computedTotal, bookingStartDate, manualAdvanceAmount, manualDueDate, collectSecurityDeposit, securityDepositAmount]);

  // Price recalculation when duration changes
  useEffect(() => {
    if (!selectedBed) return;
    const basePrice = selectedBed.price;
    let calculatedPrice = basePrice;
    if (selectedDuration.type === 'daily') {
      calculatedPrice = Math.round((basePrice / 30) * selectedDuration.count);
    } else if (selectedDuration.type === 'weekly') {
      calculatedPrice = Math.round((basePrice / 4) * selectedDuration.count);
    } else {
      calculatedPrice = Math.round(basePrice * selectedDuration.count);
    }
    setBookingPrice(String(calculatedPrice));
  }, [selectedDuration, selectedBed]);

  // Create new student via edge function
  const handleCreateStudent = async () => {
    if (!newStudentName || !newStudentEmail) {
      toast({ title: 'Name and email are required', variant: 'destructive' });
      return;
    }
    setCreatingStudent(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-student', {
        body: { name: newStudentName, email: newStudentEmail, phone: newStudentPhone },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); setCreatingStudent(false); return; }

      const userId = data.userId;
      const student: StudentProfile = {
        id: userId,
        name: newStudentName,
        email: newStudentEmail,
        phone: newStudentPhone,
        serial_number: '',
        profile_picture: null,
      };
      setSelectedStudent(student);
      setStudentQuery(newStudentName);
      setShowNewStudent(false);

      // Auto-link to partner
      try {
        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
        if (!isAdmin) {
          const { ownerId } = await getEffectiveOwnerId();
          await supabase.from('student_property_links').upsert(
            { student_user_id: userId, partner_user_id: ownerId },
            { onConflict: 'student_user_id,partner_user_id' }
          );
        }
      } catch (e) {
        console.error('Auto-link failed:', e);
      }

      toast({ title: data.existing ? 'Existing student selected' : 'Student created & selected' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create student', variant: 'destructive' });
    }
    setCreatingStudent(false);
  };

  // Create booking
  const handleCreateBooking = async () => {
    if (!selectedBed || !selectedStudent) return;
    if ((paymentMethod === 'upi' || paymentMethod === 'bank_transfer') && !transactionId.trim()) {
      toast({ title: 'Transaction ID is required for UPI/Bank Transfer', variant: 'destructive' });
      return;
    }
    setCreatingBooking(true);
    const collectedByName = user?.name || user?.email || 'Admin';
    const total = computedTotal;
    const secDepAmt = collectSecurityDeposit ? (parseFloat(securityDepositAmount) || 0) : 0;
    const grandTotal = total + secDepAmt;
    const advanceAmt = isAdvanceBooking && advanceComputed ? advanceComputed.advanceAmount : grandTotal;
    // remaining due = grandTotal - advanceAmt (single partial amount model)
    const remaining = grandTotal - advanceAmt;
    const hostel = selectedHostelInfo;

    const { data: newBooking, error } = await supabase.from('hostel_bookings').insert({
      hostel_id: selectedBed.hostelId,
      room_id: selectedBed.room_id,
      bed_id: selectedBed.id,
      sharing_option_id: selectedBed.sharing_option_id,
      user_id: selectedStudent.id,
      start_date: format(bookingStartDate, 'yyyy-MM-dd'),
      end_date: format(computedEndDate, 'yyyy-MM-dd'),
      total_price: total,
      advance_amount: advanceAmt,
      remaining_amount: remaining,
      security_deposit: collectSecurityDeposit ? (parseFloat(securityDepositAmount) || 0) : 0,
      booking_duration: selectedDuration.type,
      duration_count: selectedDuration.count,
      payment_status: remaining <= 0 ? 'completed' : 'partial',
      status: 'confirmed',
      payment_method: paymentMethod,
      transaction_id: transactionId,
      collected_by: user?.id,
      collected_by_name: collectedByName,
    }).select('id, serial_number').single();

    if (!error && newBooking) {
      // Bed availability is now handled by database trigger

      // Auto-link student to partner
      try {
        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
        if (!isAdmin) {
          const { ownerId } = await getEffectiveOwnerId();
          await supabase.from('student_property_links').upsert(
            { student_user_id: selectedStudent.id, partner_user_id: ownerId },
            { onConflict: 'student_user_id,partner_user_id' }
          );
        }
      } catch (e) {
        console.error('Auto-link student failed:', e);
      }

      // Receipt = just the amount collected (advanceAmt already includes any portion toward security deposit)
      const receiptAmount = advanceAmt;
      await supabase.from('hostel_receipts').insert({
        hostel_id: selectedBed.hostelId,
        booking_id: newBooking.id,
        user_id: selectedStudent.id,
        amount: receiptAmount,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        receipt_type: 'booking_payment',
        collected_by: user?.id,
        collected_by_name: collectedByName,
      });

      // Create hostel_dues entry if advance booking (partial payment)
      if (remaining > 0 && isAdvanceBooking && advanceComputed) {
        const dueDate = advanceComputed.dueDate;
        await supabase.from('hostel_dues').insert({
          user_id: selectedStudent.id,
          hostel_id: selectedBed.hostelId,
          room_id: selectedBed.room_id,
          bed_id: selectedBed.id,
          booking_id: newBooking.id,
          total_fee: grandTotal,
          advance_paid: advanceAmt,
          due_amount: remaining,
          due_date: format(dueDate, 'yyyy-MM-dd'),
          proportional_end_date: format(computedEndDate, 'yyyy-MM-dd'),
          status: 'pending',
        } as any);
      }

      setLastBookingInfo({
        serialNumber: newBooking.serial_number || 'N/A',
        studentName: selectedStudent.name,
        studentPhone: selectedStudent.phone,
        hostelName: selectedBed.hostelName,
        bedNumber: selectedBed.bed_number,
        roomNumber: selectedBed.roomNumber,
        sharingType: selectedBed.sharingType,
        startDate: format(bookingStartDate, 'yyyy-MM-dd'),
        endDate: format(computedEndDate, 'yyyy-MM-dd'),
        duration: `${selectedDuration.count} ${selectedDuration.type}`,
        bedAmount: parseFloat(bookingPrice) || 0,
        discountAmount: parseFloat(discountAmount) || 0,
        discountReason,
        totalAmount: total,
        securityDeposit: secDepAmt,
        paymentMethod,
        transactionId,
        collectedByName,
        advanceAmount: advanceAmt,
        remainingDue: remaining,
      });
      setBookingSuccess(true);
      setBookingStep('details');
      toast({ title: 'Booking created successfully' });
      fetchBeds();
    } else {
      toast({ title: 'Error', description: error?.message || 'Failed to create booking', variant: 'destructive' });
    }
    setCreatingBooking(false);
  };

  // Status helpers
  const statusColors = (status?: string) => {
    switch (status) {
      case 'available': return 'bg-emerald-100 border-emerald-500 dark:bg-emerald-900 dark:border-emerald-600';
      case 'booked': return 'bg-red-100 border-red-500 dark:bg-red-900 dark:border-red-600';
      case 'expiring_soon': return 'bg-amber-100 border-amber-500 dark:bg-amber-900 dark:border-amber-600';
      case 'future_booked': return 'bg-violet-100 border-violet-500 dark:bg-violet-900 dark:border-violet-600';
      case 'blocked': return 'bg-muted border-muted-foreground/30';
      default: return 'bg-muted border-border';
    }
  };

  const statusLabel = (status?: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'booked': return 'Booked';
      case 'expiring_soon': return 'Expiring';
      case 'future_booked': return 'Future Booked';
      case 'blocked': return 'Blocked';
      default: return '-';
    }
  };

  const statusIcon = (status?: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-3 w-3 text-emerald-600" />;
      case 'booked': return <Users className="h-3 w-3 text-red-600" />;
      case 'expiring_soon': return <AlertTriangle className="h-3 w-3 text-amber-600" />;
      case 'future_booked': return <Clock className="h-3 w-3 text-violet-600" />;
      case 'blocked': return <Ban className="h-3 w-3 text-muted-foreground" />;
      default: return null;
    }
  };

  // Split bookings for sheet
  const currentBookings = useMemo(() => {
    if (!selectedBed) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return selectedBed.allBookings.filter(b => b.startDate <= dateStr && b.endDate >= dateStr);
  }, [selectedBed, selectedDate]);

  const futureBookings = useMemo(() => {
    if (!selectedBed) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return selectedBed.allBookings.filter(b => b.startDate > dateStr);
  }, [selectedBed, selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* ──── Stats Bar ──── */}
      <div className="flex items-center gap-0 border rounded-md bg-card overflow-hidden h-[52px]">
        {[
          { label: 'Total', value: stats.total, icon: <LayoutGrid className="h-3.5 w-3.5 text-primary" /> },
          { label: 'Booked', value: stats.booked, icon: <Users className="h-3.5 w-3.5 text-red-500" /> },
          { label: 'Available', value: stats.available, icon: <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> },
          { label: 'Future', value: stats.futureBooked, icon: <Clock className="h-3.5 w-3.5 text-violet-500" /> },
          { label: 'Expiring', value: stats.expiring, icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> },
          { label: 'Blocked', value: stats.blocked, icon: <Ban className="h-3.5 w-3.5 text-muted-foreground" /> },
          { label: 'Revenue', value: `₹${stats.revenue.toLocaleString()}`, icon: <IndianRupee className="h-3.5 w-3.5 text-primary" /> },
        ].map((s, i) => (
          <div key={s.label} className={cn("flex items-center gap-1.5 px-3 py-1 flex-1 justify-center", i > 0 && "border-l")}>
            {s.icon}
            <div className="text-center leading-tight">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
              <div className="text-sm font-semibold">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ──── Sticky Filter Row ──── */}
      <div className="sticky top-0 z-10 bg-background border rounded-md px-2 py-1.5 flex items-center gap-2 flex-wrap">
        <Select value={selectedHostelId} onValueChange={setSelectedHostelId}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Hostel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs font-medium">All Hostels</SelectItem>
            {hostels.map(h => (
              <SelectItem key={h.id} value={h.id} className="text-xs">{h.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedHostelId !== 'all' && availableFloors.length > 0 && (
          <Select value={selectedFloor} onValueChange={setSelectedFloor}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-medium">All Floors</SelectItem>
              {availableFloors.map(f => (
                <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {selectedHostelId !== 'all' && availableRooms.length > 0 && (
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Room" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-medium">All Rooms</SelectItem>
              {availableRooms.map(r => (
                <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 px-2">
              <CalendarIcon className="h-3 w-3" />
              {format(selectedDate, 'dd MMM yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            <SelectItem value="available" className="text-xs">Available</SelectItem>
            <SelectItem value="booked" className="text-xs">Booked</SelectItem>
            <SelectItem value="future_booked" className="text-xs">Future Booked</SelectItem>
            <SelectItem value="expiring_soon" className="text-xs">Expiring Soon</SelectItem>
            <SelectItem value="blocked" className="text-xs">Blocked</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[120px] max-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input className="h-8 text-xs pl-7" placeholder="Search bed..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <div className="flex items-center border rounded-md overflow-hidden ml-auto">
          <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0 rounded-none" onClick={() => setViewMode('grid')}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0 rounded-none" onClick={() => setViewMode('table')}>
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={fetchBeds} disabled={refreshing}>
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        </Button>
      </div>

      {/* ──── Legend ──── */}
      <div className="flex items-center gap-3 px-1 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Available</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Booked</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-violet-500 inline-block" /> Future Booked</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Expiring</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/40 inline-block" /> Blocked</span>
        <span className="ml-auto">{filteredBeds.length} beds</span>
      </div>

      {/* ──── Grid View ──── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1">
          {filteredBeds.map(bed => (
            <div
              key={bed.id}
              onClick={() => handleBedClick(bed)}
              className={cn(
                "relative border rounded cursor-pointer p-1 flex flex-col items-center justify-center text-center transition-all hover:shadow-md group min-h-[72px]",
                statusColors(bed.dateStatus)
              )}
            >
              <span className="text-xs font-bold leading-none">{bed.roomNumber}-B{bed.bed_number}</span>
              <span className="text-[9px] text-muted-foreground leading-tight truncate w-full">{bed.category || bed.roomCategory}</span>
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] font-medium leading-tight">₹{bed.price}</span>
                <button
                  className="h-3 w-3 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); setEditingBedId(bed.id); setEditPrice(String(bed.price)); }}
                  title="Edit price"
                >
                  <Edit className="h-2.5 w-2.5" />
                </button>
              </div>
              <div className="flex items-center gap-0.5 mt-0.5">
                {statusIcon(bed.dateStatus)}
                <span className="text-[8px]">{statusLabel(bed.dateStatus)}</span>
              </div>
              {/* Hover actions */}
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => openBlockDialog(bed, e)} title={bed.is_blocked ? 'Unblock' : 'Block'}>
                  {bed.is_blocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setEditingBedId(bed.id); setEditPrice(String(bed.price)); }} title="Edit Price">
                  <Edit className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); handleBedClick(bed); }} title="Details">
                  <Info className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ──── Table View ──── */}
      {viewMode === 'table' && (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-[10px] uppercase tracking-wider h-8 px-2">Bed</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider h-8 px-2">Room</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider h-8 px-2">Hostel</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider h-8 px-2">Category</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider h-8 px-2">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider h-8 px-2">Price</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider h-8 px-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBeds.map((bed, i) => (
                <TableRow key={bed.id} className={cn("cursor-pointer text-xs", i % 2 === 1 && "bg-muted/30")} onClick={() => handleBedClick(bed)}>
                  <TableCell className="px-2 py-1 font-medium">B{bed.bed_number}</TableCell>
                  <TableCell className="px-2 py-1">{bed.roomNumber}</TableCell>
                  <TableCell className="px-2 py-1">{bed.hostelName}</TableCell>
                  <TableCell className="px-2 py-1">
                    <Badge variant="outline" className="text-[10px] px-1 py-0">{bed.category || bed.roomCategory}</Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      {statusIcon(bed.dateStatus)}
                      <span className="text-[10px]">{statusLabel(bed.dateStatus)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      <span>₹{bed.price}</span>
                      <button
                        className="h-4 w-4 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); setEditingBedId(bed.id); setEditPrice(String(bed.price)); }}
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => openBlockDialog(bed, e)}>
                        {bed.is_blocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); handleBedClick(bed); }}>
                        <Info className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredBeds.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {hostels.length === 0 ? 'No hostels found.' : 'No beds match your filters.'}
        </div>
      )}

      {/* ──── Price Edit Dialog ──── */}
      {editingBedId && (
        <Dialog open={true} onOpenChange={() => setEditingBedId(null)}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm">Edit Bed Price</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">New Price (₹/month)</Label>
                <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleSavePrice(editingBedId)} disabled={updating}>
                  <Save className="h-3 w-3 mr-1" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingBedId(null)}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ──── Block/Unblock Dialog ──── */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {blockBed?.is_blocked ? 'Unblock' : 'Block'} {blockBed?.roomNumber}-B{blockBed?.bed_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Reason / Remark *</Label>
              <Input className="h-8 text-sm" placeholder="Enter reason..." value={blockReason} onChange={e => setBlockReason(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleConfirmBlock} disabled={updating || !blockReason.trim()}>
                {blockBed?.is_blocked ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                {blockBed?.is_blocked ? 'Unblock' : 'Block'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ──── Right-Side Sheet ──── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[440px] p-4 overflow-y-auto">
          {selectedBed && (
            <>
              {!(bookingSuccess && lastBookingInfo) && (
                <>
                  <SheetHeader className="pb-2">
                    <SheetTitle className="text-sm flex items-center gap-2">
                      Room {selectedBed.roomNumber} - Bed #{selectedBed.bed_number}
                      <Badge variant="outline" className="text-[10px]">{selectedBed.category || selectedBed.roomCategory}</Badge>
                      {selectedBed.sharingType && <Badge variant="secondary" className="text-[10px]">{selectedBed.sharingType}</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">₹{selectedBed.price}/mo</span>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="text-[10px] text-muted-foreground mb-1">
                    Room {selectedBed.roomNumber} · {selectedBed.hostelName} · Floor {selectedBed.floor}
                  </div>
                  <Separator className="my-2" />

                  {/* Status info */}
                  <div className={cn("rounded p-2 mb-3 border text-xs", statusColors(selectedBed.dateStatus))}>
                    <div className="flex items-center gap-1.5">
                      {statusIcon(selectedBed.dateStatus)}
                      <span className="font-medium">{statusLabel(selectedBed.dateStatus)}</span>
                      <span className="text-muted-foreground ml-auto">
                        {(selectedBed.dateStatus === 'booked' || selectedBed.dateStatus === 'expiring_soon') && selectedBed.currentBooking
                          ? `till ${format(new Date(selectedBed.currentBooking.endDate), 'dd MMM yyyy')}`
                          : `for ${format(selectedDate, 'dd MMM yyyy')}`}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* ── BOOKED / EXPIRING: Show student info ── */}
              {(selectedBed.dateStatus === 'booked' || selectedBed.dateStatus === 'expiring_soon') && selectedBed.currentBooking && !showFutureBooking && (
                <div className="space-y-3">
                  <div className="border rounded p-3 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Student</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                      <div><span className="text-muted-foreground">Name:</span> {selectedBed.currentBooking.studentName}</div>
                      <div><span className="text-muted-foreground">Phone:</span> {selectedBed.currentBooking.studentPhone}</div>
                      <div className="col-span-2"><span className="text-muted-foreground">Email:</span> {selectedBed.currentBooking.studentEmail}</div>
                      <div><span className="text-muted-foreground">From:</span> {new Date(selectedBed.currentBooking.startDate).toLocaleDateString()}</div>
                      <div><span className="text-muted-foreground">To:</span> {new Date(selectedBed.currentBooking.endDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm" className="h-8 text-xs gap-1"
                      onClick={() => {
                        const allBookingsArr = [...currentBookings, ...futureBookings];
                        let latestEnd = new Date(selectedBed.currentBooking!.endDate);
                        allBookingsArr.forEach(b => { const bEnd = new Date(b.endDate); if (bEnd > latestEnd) latestEnd = bEnd; });
                        const nextDay = addDays(latestEnd, 1);
                        setBookingStartDate(nextDay);
                        setBookingPrice(String(selectedBed.price));
                        if (selectedBed.currentBooking) {
                          setSelectedStudent({
                            id: selectedBed.currentBooking.userId,
                            name: selectedBed.currentBooking.studentName,
                            email: selectedBed.currentBooking.studentEmail,
                            phone: selectedBed.currentBooking.studentPhone,
                            serial_number: '',
                            profile_picture: selectedBed.currentBooking.profilePicture,
                          });
                          setStudentQuery(selectedBed.currentBooking.studentName);
                        }
                        setIsRenewMode(true);
                        setShowFutureBooking(true);
                      }}
                    >
                      <RotateCcw className="h-3 w-3" /> Renew
                    </Button>
                    <Button
                      size="sm" className="h-8 text-xs gap-1"
                      onClick={() => {
                        const allBookingsArr = [...currentBookings, ...futureBookings];
                        let latestEnd = new Date(selectedBed.currentBooking!.endDate);
                        allBookingsArr.forEach(b => { const bEnd = new Date(b.endDate); if (bEnd > latestEnd) latestEnd = bEnd; });
                        const nextDay = addDays(latestEnd, 1);
                        setBookingStartDate(nextDay);
                        setBookingPrice(String(selectedBed.price));
                        setIsRenewMode(false);
                        setShowFutureBooking(true);
                      }}
                    >
                      <CalendarIcon className="h-3 w-3" /> Book Future
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => openBlockDialog(selectedBed)}>
                      <Lock className="h-3 w-3" /> Block
                    </Button>
                  </div>
                </div>
              )}

              {/* ── BOOKING SUCCESS VIEW ── */}
              {(selectedBed.dateStatus === 'available' || selectedBed.dateStatus === 'future_booked' || showFutureBooking) && bookingSuccess && lastBookingInfo && (
                <div className="space-y-3">
                  <div className="flex flex-col items-center py-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-2">
                      <CheckCircle className="h-6 w-6 text-emerald-600" />
                    </div>
                    <h4 className="text-sm font-semibold">Booking Confirmed!</h4>
                    <p className="text-[11px] text-muted-foreground">{lastBookingInfo.serialNumber}</p>
                  </div>
                  <div className="border rounded p-3 text-[11px] space-y-2 bg-muted/30">
                    <div className="grid grid-cols-2 gap-y-1.5">
                      <div><span className="text-muted-foreground">Student:</span></div><div className="font-medium">{lastBookingInfo.studentName}</div>
                      <div><span className="text-muted-foreground">Phone:</span></div><div>{lastBookingInfo.studentPhone}</div>
                      <div><span className="text-muted-foreground">Hostel:</span></div><div className="font-medium">{lastBookingInfo.hostelName}</div>
                      <div><span className="text-muted-foreground">Bed:</span></div><div>#{lastBookingInfo.bedNumber} (Room {lastBookingInfo.roomNumber})</div>
                      {lastBookingInfo.sharingType && <><div><span className="text-muted-foreground">Sharing:</span></div><div>{lastBookingInfo.sharingType}</div></>}
                      <div><span className="text-muted-foreground">Period:</span></div><div>{lastBookingInfo.duration}</div>
                      <div><span className="text-muted-foreground">Start:</span></div><div>{new Date(lastBookingInfo.startDate).toLocaleDateString('en-IN')}</div>
                      <div><span className="text-muted-foreground">End:</span></div><div>{new Date(lastBookingInfo.endDate).toLocaleDateString('en-IN')}</div>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                      <div className="flex justify-between"><span>Bed Amount</span><span>₹{lastBookingInfo.bedAmount}</span></div>
                      {lastBookingInfo.discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600"><span>Discount{lastBookingInfo.discountReason ? ` (${lastBookingInfo.discountReason})` : ''}</span><span>-₹{lastBookingInfo.discountAmount}</span></div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-semibold text-xs"><span>Total</span><span>₹{lastBookingInfo.totalAmount}</span></div>
                      {lastBookingInfo.securityDeposit > 0 && (
                        <>
                          <div className="flex justify-between"><span>Security Deposit</span><span>₹{lastBookingInfo.securityDeposit}</span></div>
                          <Separator />
                          <div className="flex justify-between font-bold text-xs"><span>Grand Total</span><span>₹{lastBookingInfo.totalAmount + lastBookingInfo.securityDeposit}</span></div>
                        </>
                      )}
                      {lastBookingInfo.remainingDue > 0 && (
                        <>
                          <div className="flex justify-between text-amber-600"><span>Advance Paid</span><span>₹{lastBookingInfo.advanceAmount}</span></div>
                          <div className="flex justify-between text-destructive"><span>Due</span><span>₹{lastBookingInfo.remainingDue}</span></div>
                        </>
                      )}
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-y-1">
                      <div><span className="text-muted-foreground">Payment:</span></div>
                      <div>{paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'upi' ? 'UPI' : 'Bank Transfer'}</div>
                      {lastBookingInfo.transactionId && (
                        <><div><span className="text-muted-foreground">Txn ID:</span></div><div className="break-all">{lastBookingInfo.transactionId}</div></>
                      )}
                      <div><span className="text-muted-foreground">Collected By:</span></div><div>{lastBookingInfo.collectedByName}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={() => { setBookingSuccess(false); setShowFutureBooking(false); setSheetOpen(false); }}>
                      <ArrowLeft className="h-3 w-3" /> Close
                    </Button>
                  </div>
                </div>
              )}

              {/* ── AVAILABLE / FUTURE: Booking form ── */}
              {(selectedBed.dateStatus === 'available' || selectedBed.dateStatus === 'future_booked' || showFutureBooking) && !bookingSuccess && (
                <div className="space-y-3">
                  {showFutureBooking && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-1" onClick={() => { setShowFutureBooking(false); setIsRenewMode(false); }}>
                      <ArrowLeft className="h-3 w-3" /> Back to bed info
                    </Button>
                  )}

                  {isRenewMode && showFutureBooking && selectedBed.currentBooking && (
                    <div className="border rounded p-2 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-[11px] space-y-0.5">
                      <div className="font-medium text-amber-700 dark:text-amber-400">
                        Booked till {new Date(selectedBed.currentBooking.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-muted-foreground">Renewal starts from {format(bookingStartDate, 'dd MMM yyyy')}</div>
                    </div>
                  )}

                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <UserPlus className="h-3 w-3" /> {isRenewMode ? 'Renew Booking' : showFutureBooking ? 'Book Future Dates' : 'Book This Bed'}
                  </h4>

                  {/* Student selection */}
                  {isRenewMode && selectedStudent ? (
                    <div className="border rounded p-2 bg-muted/50 text-[11px]">
                      <div className="font-medium">{selectedStudent.name}</div>
                      <div className="text-muted-foreground">{selectedStudent.phone} · {selectedStudent.email}</div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Search Student</Label>
                        <Input className="h-8 text-xs" placeholder="Name, phone, or email..." value={studentQuery} onChange={e => { setStudentQuery(e.target.value); setSelectedStudent(null); }} />
                        {studentResults.length > 0 && !selectedStudent && (
                          <div className="border rounded mt-1 max-h-[150px] overflow-y-auto">
                            {studentResults.map(s => (
                              <div key={s.id} className="px-2 py-1.5 text-[11px] hover:bg-muted cursor-pointer border-b last:border-0"
                                onClick={async () => {
                                  setSelectedStudent(s);
                                  setStudentQuery(s.name || '');
                                  setStudentResults([]);
                                  // Auto-link unlinked student on selection
                                  if (!(s as any).linked && user?.role !== 'admin' && user?.role !== 'super_admin') {
                                    try {
                                      const { ownerId } = await getEffectiveOwnerId();
                                      await supabase.from('student_property_links').upsert(
                                        { student_user_id: s.id, partner_user_id: ownerId },
                                        { onConflict: 'student_user_id,partner_user_id' }
                                      );
                                    } catch (e) { console.error('Auto-link on select failed:', e); }
                                  }
                                }}>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium">{s.name}</span>
                                  {!(s as any).linked && user?.role !== 'admin' && user?.role !== 'super_admin' && (
                                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 py-0 border-amber-400 text-amber-600">Global</Badge>
                                  )}
                                </div>
                                <div className="text-muted-foreground">{s.phone} · {s.email}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedStudent && (
                          <div className="mt-1 border rounded p-2 bg-muted/50 text-[11px] flex justify-between items-center">
                            <div><span className="font-medium">{selectedStudent.name}</span><span className="text-muted-foreground ml-2">{selectedStudent.phone}</span></div>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setSelectedStudent(null); setStudentQuery(''); }}><X className="h-3 w-3" /></Button>
                          </div>
                        )}
                      </div>
                      {!selectedStudent && (
                        <Collapsible open={showNewStudent} onOpenChange={setShowNewStudent}>
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full h-7 text-[11px] gap-1">
                              <UserPlus className="h-3 w-3" /> Create New Student
                              <ChevronDown className={cn("h-3 w-3 ml-auto transition-transform", showNewStudent && "rotate-180")} />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-2 mt-2">
                            <Input className="h-7 text-xs" placeholder="Name *" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} />
                            <Input className="h-7 text-xs" placeholder="Email *" type="email" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} />
                            <Input className="h-7 text-xs" placeholder="Phone" value={newStudentPhone} onChange={e => setNewStudentPhone(e.target.value)} />
                            <Button size="sm" className="w-full h-7 text-[11px]" onClick={handleCreateStudent} disabled={creatingStudent || !newStudentName || !newStudentEmail}>
                              {creatingStudent ? 'Creating...' : 'Create & Select'}
                            </Button>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </>
                  )}

                  {/* Duration Type */}
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Duration Type</Label>
                    <div className="flex gap-1 mt-1">
                      {(selectedHostelInfo?.allowed_durations || ['daily', 'weekly', 'monthly']).map((dur: string) => (
                        <button key={dur} type="button"
                          className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize",
                            selectedDuration.type === dur ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-accent"
                          )}
                          onClick={() => setSelectedDuration(prev => ({ ...prev, type: dur as any }))}
                        >{dur}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      {selectedDuration.type === 'daily' ? 'Days' : selectedDuration.type === 'weekly' ? 'Weeks' : 'Months'}
                    </Label>
                    <Input className="h-8 text-xs mt-1" type="number" min={1} value={selectedDuration.count}
                      onChange={e => setSelectedDuration(prev => ({ ...prev, count: Math.max(1, parseInt(e.target.value) || 1) }))} />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Start</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs w-full justify-start gap-1">
                            <CalendarIcon className="h-3 w-3" />{format(bookingStartDate, 'dd MMM')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={bookingStartDate} onSelect={d => d && setBookingStartDate(d)} className="p-3 pointer-events-auto"
                            disabled={(date) => {
                              if (showFutureBooking && selectedBed?.currentBooking?.endDate) return date <= new Date(selectedBed.currentBooking.endDate);
                              // Allow past dates (up to 90 days back) for first-time offline bookings
                              const ninetyDaysAgo = new Date();
                              ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                              return date < new Date(ninetyDaysAgo.toDateString());
                            }} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">End</Label>
                      <div className="h-8 border rounded-md flex items-center px-2 text-xs bg-muted/50">{format(computedEndDate, 'dd MMM yyyy')}</div>
                    </div>
                  </div>

                  {/* Booking Summary */}
                  <div className="border rounded p-3 text-[11px] space-y-2 bg-muted/30">
                    <div className="flex justify-between"><span>Bed Amount</span><span>₹{parseFloat(bookingPrice) || 0}</span></div>
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground text-[10px]">Discount</span>
                      <div className="grid grid-cols-2 gap-1">
                        <Input className="h-5 text-[9px] px-1.5 border-muted" type="number" placeholder="₹ Amt" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} />
                        <Input className="h-5 text-[9px] px-1.5 border-muted" placeholder="Reason" value={discountReason} onChange={e => setDiscountReason(e.target.value)} />
                      </div>
                      {parseFloat(discountAmount) > 0 && (
                        <div className="flex justify-between text-[9px] text-emerald-600"><span>{discountReason ? `(${discountReason})` : ''}</span><span>-₹{parseFloat(discountAmount)}</span></div>
                      )}
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-xs"><span>Total</span><span>₹{computedTotal}</span></div>
                  </div>

                  {/* Security Deposit Toggle */}
                  <div className="border rounded p-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Checkbox id="collectSecurityDeposit" checked={collectSecurityDeposit} onCheckedChange={(v) => setCollectSecurityDeposit(v === true)} />
                      <Label htmlFor="collectSecurityDeposit" className="text-xs cursor-pointer flex-1">Collect Security Deposit</Label>
                    </div>
                    {collectSecurityDeposit && (
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Deposit Amount (₹)</Label>
                        <Input className="h-7 text-xs" type="number" value={securityDepositAmount} onChange={e => setSecurityDepositAmount(e.target.value)} />
                      </div>
                    )}
                  </div>

                  {/* Partial Payment Toggle */}
                  {selectedHostelInfo && (
                    <div className="flex items-center gap-2 border rounded p-2 bg-amber-50/50 dark:bg-amber-950/20">
                      <Checkbox id="advanceBookingHostel" checked={isAdvanceBooking} onCheckedChange={(v) => { setIsAdvanceBooking(v === true); if (!v) { setManualAdvanceAmount(''); setManualDueDate(undefined); } }} />
                      <Label htmlFor="advanceBookingHostel" className="text-xs cursor-pointer flex-1">Partial Payment (Collect Less)</Label>
                    </div>
                  )}

                  {isAdvanceBooking && advanceComputed && (
                    <div className="border rounded p-2 text-[11px] space-y-1.5 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Amount to Collect</Label>
                        <Input className="h-7 text-xs" type="number" placeholder={`₹ ${advanceComputed.advanceAmount}`} value={manualAdvanceAmount} max={advanceComputed.grandTotal}
                          onChange={e => { const val = parseFloat(e.target.value); if (e.target.value === '' || isNaN(val)) setManualAdvanceAmount(e.target.value); else if (val > advanceComputed.grandTotal) setManualAdvanceAmount(String(advanceComputed.grandTotal)); else setManualAdvanceAmount(e.target.value); }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Due Date (Reminder)</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full h-7 text-xs justify-start", !manualDueDate && "text-muted-foreground")}>
                              <CalendarIcon className="mr-1.5 h-3 w-3" />
                              {manualDueDate ? format(manualDueDate, 'dd MMM yyyy') : 'Pick due date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={manualDueDate} onSelect={setManualDueDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium"><span>Collecting Now</span><span>₹{advanceComputed.advanceAmount}</span></div>
                      <div className="flex justify-between text-destructive"><span>Due Balance</span><span>₹{advanceComputed.remainingDue}</span></div>
                    </div>
                  )}

                  {/* Step 1: Book Bed */}
                  {bookingStep === 'details' && (
                    <Button className="w-full h-9 text-xs" disabled={!selectedStudent}
                      onClick={() => { if (!selectedStudent) { toast({ title: 'Please select a student first', variant: 'destructive' }); return; } setBookingStep('confirm'); }}>
                      Book Bed
                    </Button>
                  )}

                  {/* Step 2: Confirmation */}
                  {bookingStep === 'confirm' && (
                    <div className="space-y-3 border-t pt-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Booking Confirmation
                      </h4>
                      <div className="border rounded p-3 text-[11px] space-y-1.5 bg-muted/30">
                        <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-medium">{selectedStudent?.name}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{selectedStudent?.phone || '-'}</span></div>
                        <Separator />
                        <div className="flex justify-between"><span className="text-muted-foreground">Bed</span><span>#{selectedBed.bed_number} · Room {selectedBed.roomNumber} · {selectedBed.hostelName}</span></div>
                        {selectedBed.sharingType && <div className="flex justify-between"><span className="text-muted-foreground">Sharing Type</span><span>{selectedBed.sharingType}</span></div>}
                        <div className="flex justify-between"><span className="text-muted-foreground">Period</span><span>{format(bookingStartDate, 'dd MMM')} → {format(computedEndDate, 'dd MMM yyyy')}</span></div>
                        <Separator />
                        <div className="flex justify-between"><span>Bed Amount</span><span>₹{parseFloat(bookingPrice) || 0}</span></div>
                        {parseFloat(discountAmount) > 0 && (
                          <div className="flex justify-between text-emerald-600"><span>Discount{discountReason ? ` (${discountReason})` : ''}</span><span>-₹{parseFloat(discountAmount)}</span></div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-semibold text-xs"><span>Total</span><span>₹{computedTotal}</span></div>
                        {collectSecurityDeposit && (parseFloat(securityDepositAmount) || 0) > 0 && (
                          <div className="flex justify-between"><span>Security Deposit</span><span>₹{parseFloat(securityDepositAmount) || 0}</span></div>
                        )}
                        {collectSecurityDeposit && (parseFloat(securityDepositAmount) || 0) > 0 && (
                          <>
                            <Separator />
                            <div className="flex justify-between font-bold text-xs"><span>Grand Total</span><span>₹{computedTotal + (parseFloat(securityDepositAmount) || 0)}</span></div>
                          </>
                        )}
                        {isAdvanceBooking && advanceComputed && (
                          <>
                            <Separator />
                            <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium"><span>Collecting Now</span><span>₹{advanceComputed.advanceAmount}</span></div>
                            <div className="flex justify-between text-destructive"><span>Due Balance</span><span>₹{advanceComputed.remainingDue}</span></div>
                          </>
                        )}
                      </div>

                      {/* Payment Method */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-muted-foreground">Payment Method</Label>
                        <PaymentMethodSelector
                          value={paymentMethod}
                          onValueChange={setPaymentMethod}
                          partnerId={user?.vendorId || user?.id}
                          idPrefix="hpm"
                          columns={3}
                        />
                      </div>

                      {(paymentMethod === 'upi' || paymentMethod === 'bank_transfer' || paymentMethod.startsWith('custom_')) && (
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">Transaction ID *</Label>
                          <Input className="h-8 text-xs" placeholder="Enter transaction reference ID" value={transactionId} onChange={e => setTransactionId(e.target.value)} />
                        </div>
                      )}

                      {paymentMethod !== 'cash' && (
                        <PaymentProofUpload value={paymentProofUrl} onChange={setPaymentProofUrl} />
                      )}

                      <div className="text-muted-foreground text-[10px] px-1">Collected by: {user?.name || user?.email || 'Admin'}</div>

                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setBookingStep('details')}>
                          <ArrowLeft className="h-3 w-3 mr-1" /> Back
                        </Button>
                        <Button className="flex-1 h-9 text-xs"
                          disabled={creatingBooking || ((paymentMethod === 'upi' || paymentMethod === 'bank_transfer') && !transactionId.trim())}
                          onClick={handleCreateBooking}>
                          {creatingBooking ? 'Creating...' : `Confirm · ₹${isAdvanceBooking && advanceComputed ? advanceComputed.advanceAmount : (computedTotal + (collectSecurityDeposit ? (parseFloat(securityDepositAmount) || 0) : 0))}`}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── BLOCKED ── */}
              {selectedBed.dateStatus === 'blocked' && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">This bed is currently blocked.</p>
                  {selectedBed.block_reason && <p className="text-xs">Reason: {selectedBed.block_reason}</p>}
                  <Button size="sm" variant="outline" onClick={() => openBlockDialog(selectedBed)}>
                    <Unlock className="h-3 w-3 mr-1" /> Unblock Bed
                  </Button>
                </div>
              )}

              {/* ── Current Bookings ── */}
              {currentBookings.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Current Booking ({currentBookings.length})</h4>
                  <div className="space-y-2">
                    {currentBookings.map((b, i) => {
                      const dueRemaining = Math.max(0, b.remainingAmount);
                      return (
                        <div key={i} className="border rounded p-2 text-[11px] space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{b.studentName}</span>
                            {b.paymentStatus === 'completed' ? (
                              <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500 text-white border-emerald-500">Fully Paid</Badge>
                            ) : (
                              <Badge className="text-[9px] px-1.5 py-0 bg-amber-500 text-white border-amber-500">Partial Paid</Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground">{new Date(b.startDate).toLocaleDateString()} → {new Date(b.endDate).toLocaleDateString()}{b.durationCount && b.bookingDuration && ` · ${b.durationCount} ${b.bookingDuration}`}</div>
                          <div className="flex justify-between"><span>₹{b.totalPrice}</span><span className="text-muted-foreground">{b.studentPhone}</span></div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-emerald-600">Paid: ₹{b.advanceAmount}</span>
                            <span className="text-red-500">Due: ₹{b.paymentStatus === 'completed' ? 0 : dueRemaining}</span>
                          </div>
                          {b.collectedByName && <div className="text-muted-foreground">Collected by: {b.collectedByName}</div>}
                          {b.serialNumber && <div className="font-medium text-primary">#{b.serialNumber}</div>}

                          {/* Due collection */}
                          {b.paymentStatus !== 'completed' && dueRemaining > 0 && (
                            <>
                              <Button size="sm" variant="outline" className="w-full h-7 text-[10px] mt-1 bg-red-50 border-red-200 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
                                onClick={() => { if (expandedDueBookingId === b.bookingId) { setExpandedDueBookingId(''); } else { setExpandedDueBookingId(b.bookingId); setDueCollectAmount(String(dueRemaining)); setDueCollectMethod('cash'); setDueCollectTxnId(''); } }}>
                                <Wallet className="h-3 w-3 mr-1" /> Due: ₹{dueRemaining.toLocaleString()}
                              </Button>
                              {expandedDueBookingId === b.bookingId && (
                                <div className="border rounded p-2 space-y-2 bg-muted/30 mt-1">
                                  <div><Label className="text-[10px]">Amount (₹)</Label><Input type="number" className="h-7 text-xs" value={dueCollectAmount} onChange={e => setDueCollectAmount(e.target.value)} /></div>
                                  <div>
                                    <Label className="text-[10px]">Payment Method</Label>
                                    <PaymentMethodSelector
                                      value={dueCollectMethod}
                                      onValueChange={setDueCollectMethod}
                                      partnerId={user?.vendorId || user?.id}
                                      idPrefix={`hdc_${b.bookingId}`}
                                      columns={2}
                                      compact
                                    />
                                  </div>
                                  {(dueCollectMethod === 'upi' || dueCollectMethod === 'bank_transfer' || dueCollectMethod.startsWith('custom_')) && (
                                    <div><Label className="text-[10px]">Transaction ID</Label><Input className="h-7 text-xs" value={dueCollectTxnId} onChange={e => setDueCollectTxnId(e.target.value)} /></div>
                                  )}
                                  {dueCollectMethod !== 'cash' && (
                                    <PaymentProofUpload value={paymentProofUrl} onChange={setPaymentProofUrl} />
                                  )}
                                  <Button size="sm" className="w-full h-7 text-[10px]" onClick={() => handleInlineDueCollect(b.bookingId)} disabled={collectingDue || !dueCollectAmount}>
                                    {collectingDue ? 'Processing...' : `Collect ₹${dueCollectAmount}`}
                                  </Button>
                                </div>
                              )}
                            </>
                          )}

                          {/* Action buttons row */}
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 gap-1"
                              onClick={async () => {
                                setReceiptDialogLoading(true); setReceiptDialogOpen(true);
                                const { data } = await supabase.from('hostel_receipts').select('*').eq('booking_id', b.bookingId).order('created_at', { ascending: true });
                                setReceiptDialogData(data || []);
                                const methods = (data || []).map((r: any) => r.payment_method);
                                const labels = await resolvePaymentMethodLabels(methods);
                                setCustomLabels(prev => ({ ...prev, ...labels }));
                                setReceiptDialogLoading(false);
                              }}>
                              <IndianRupee className="h-2.5 w-2.5" /> Receipts
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 gap-1"
                              onClick={() => openTransferDialog(b.bookingId)}>
                              <ArrowRightLeft className="h-2.5 w-2.5" /> Transfer
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 gap-1"
                              onClick={() => { setDateEditBooking({ ...b, id: b.bookingId }); setDateEditOpen(true); }}>
                              <Pencil className="h-2.5 w-2.5" /> Edit Dates
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 gap-1 text-amber-600"
                              onClick={() => { setActionBookingId(b.bookingId); setReleaseDialogOpen(true); }}>
                              <LogOut className="h-2.5 w-2.5" /> Release
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 gap-1 text-destructive"
                              onClick={() => { setActionBookingId(b.bookingId); setCancelDialogOpen(true); }}>
                              <XCircle className="h-2.5 w-2.5" /> Cancel
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── Future Bookings ── */}
              {futureBookings.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Future Bookings ({futureBookings.length})</h4>
                  <div className="space-y-2">
                    {futureBookings.map((b, i) => (
                      <div key={i} className="border rounded p-2 text-[11px] space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{b.studentName}</span>
                          {b.paymentStatus === 'completed' ? (
                            <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500 text-white border-emerald-500">Fully Paid</Badge>
                          ) : (
                            <Badge className="text-[9px] px-1.5 py-0 bg-amber-500 text-white border-amber-500">Partial</Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground">{new Date(b.startDate).toLocaleDateString()} → {new Date(b.endDate).toLocaleDateString()}</div>
                        <div className="flex justify-between"><span>₹{b.totalPrice}</span><span className="text-muted-foreground">{b.studentPhone}</span></div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-emerald-600">Paid: ₹{b.advanceAmount}</span>
                          <span className="text-red-500">Due: ₹{b.paymentStatus === 'completed' ? 0 : b.remainingAmount}</span>
                        </div>
                        {b.serialNumber && <div className="font-medium text-primary">#{b.serialNumber}</div>}
                        {/* Action buttons row */}
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 gap-1"
                            onClick={async () => {
                              setReceiptDialogLoading(true); setReceiptDialogOpen(true);
                              const { data } = await supabase.from('hostel_receipts').select('*').eq('booking_id', b.bookingId).order('created_at', { ascending: true });
                              setReceiptDialogData(data || []);
                              const methods = (data || []).map((r: any) => r.payment_method);
                              const labels = await resolvePaymentMethodLabels(methods);
                              setCustomLabels(prev => ({ ...prev, ...labels }));
                              setReceiptDialogLoading(false);
                            }}>
                            <IndianRupee className="h-2.5 w-2.5" /> Receipts
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 gap-1"
                            onClick={() => openTransferDialog(b.bookingId)}>
                            <ArrowRightLeft className="h-2.5 w-2.5" /> Transfer
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 gap-1"
                            onClick={() => { setDateEditBooking({ ...b, id: b.bookingId }); setDateEditOpen(true); }}>
                            <Pencil className="h-2.5 w-2.5" /> Edit Dates
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 gap-1 text-amber-600"
                            onClick={() => { setActionBookingId(b.bookingId); setReleaseDialogOpen(true); }}>
                            <LogOut className="h-2.5 w-2.5" /> Release
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 gap-1 text-destructive"
                            onClick={() => { setActionBookingId(b.bookingId); setCancelDialogOpen(true); }}>
                            <XCircle className="h-2.5 w-2.5" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* No bookings */}
              {currentBookings.length === 0 && futureBookings.length === 0 && selectedBed.allBookings.length === 0 && (
                <>
                  <Separator className="my-3" />
                  <p className="text-[11px] text-muted-foreground">No bookings for this bed.</p>
                </>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ──── Transfer Bed Dialog ──── */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Transfer Bed</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Select an available bed to transfer this booking to:</p>
            {availableBedsForTransfer.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No available beds in this hostel.</p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto">
                {availableBedsForTransfer.map(b => (
                  <div key={b.id} onClick={() => setTransferTargetBedId(b.id)}
                    className={cn("border rounded p-2 text-center cursor-pointer transition-colors text-[11px]",
                      transferTargetBedId === b.id ? "border-primary bg-primary/10 ring-1 ring-primary" : "hover:bg-muted")}>
                    <div className="font-bold">B{b.bed_number}</div>
                    <div className="text-[9px] text-muted-foreground">R{b.roomNumber}</div>
                    <div className="text-[9px] text-muted-foreground">₹{b.price}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleTransferBed} disabled={transferring || !transferTargetBedId}>
                {transferring ? 'Transferring...' : 'Confirm Transfer'}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ──── Receipts Dialog ──── */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm">Booking Receipts</DialogTitle></DialogHeader>
          {receiptDialogLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" /></div>
          ) : receiptDialogData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No receipts found.</p>
          ) : (
            <div className="space-y-2">
              {receiptDialogData.map((r: any) => (
                <div key={r.id} className="border rounded p-2 text-[11px] space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">₹{Number(r.amount).toLocaleString()}</span>
                    <Badge variant="outline" className="text-[9px] px-1">{r.receipt_type === 'due_collection' ? 'Due Collection' : 'Booking Payment'}</Badge>
                  </div>
                  {r.serial_number && <div className="text-[10px] font-medium text-primary">{r.serial_number}</div>}
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{getMethodLabel(r.payment_method, customLabels)}</span>
                    <span>{new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  {r.transaction_id && <div className="text-[10px] text-muted-foreground">Txn: {r.transaction_id}</div>}
                  {r.collected_by_name && <div className="text-[10px] text-muted-foreground">By: {r.collected_by_name}</div>}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ──── Release Bed Confirmation ──── */}
      <AlertDialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release Bed</AlertDialogTitle>
            <AlertDialogDescription>
              This will terminate the booking and free the bed immediately. The student will no longer have access. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReleaseBed} disabled={actionLoading} className="bg-amber-600 hover:bg-amber-700">
              {actionLoading ? 'Releasing...' : 'Release Bed'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ──── Cancel Booking Confirmation ──── */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the booking, free the bed, and cancel any pending dues. Transaction history will be preserved. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelHostelBooking} disabled={actionLoading} className="bg-destructive hover:bg-destructive/90">
              {actionLoading ? 'Cancelling...' : 'Cancel Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ──── Date Edit Dialog ──── */}
      {dateEditBooking && (
        <BookingUpdateDatesDialog
          open={dateEditOpen}
          onOpenChange={setDateEditOpen}
          bookingId={dateEditBooking.id || dateEditBooking.bookingId}
          booking={dateEditBooking}
          bookingType="hostel"
          currentEndDate={new Date(dateEditBooking.endDate)}
          onExtensionComplete={() => { fetchBeds(); setSheetOpen(false); }}
        />
      )}
    </div>
  );
};

export default HostelBedMap;
