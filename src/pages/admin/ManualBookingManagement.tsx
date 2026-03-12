import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDays, addMonths, subDays } from 'date-fns';
import { adminManualBookingService } from '../../api/adminManualBookingService';
import { adminUsersService } from '../../api/adminUsersService';
import { seatsService } from '../../api/seatsService';
import { vendorSeatsService } from '../../api/vendorSeatsService';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateBasedSeatMap } from '@/components/seats/DateBasedSeatMap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminCabinsService } from '@/api/adminCabinsService';
import { cabinSlotService, CabinSlot } from '@/api/cabinSlotService';
import { Badge } from '@/components/ui/badge';
import { Clock, UserPlus, Search, Loader2 } from 'lucide-react';
import { formatTime } from '@/utils/timingUtils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { PaymentProofUpload } from '@/components/payment/PaymentProofUpload';
import { bookingEmailService } from '@/api/bookingEmailService';

// Define bookingType type to fix TypeScript errors
type BookingType = 'cabin' | 'hostel';

// Interface for Cabin data
interface Cabin {
  id: string;
  _id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  amenities: string[];
  imageUrl?: string;
  floors?: { id: string; number: number }[];
  slots_enabled?: boolean;
}

export interface Seat {
  _id: string;
  id: string;
  number: number;
  cabinId: string;
  price: number;
  position: {
    x: number;
    y: number;
  };
  isAvailable: boolean;
  unavailableUntil?: string;
}

const monthsLIst = [
    { type: '1 Month', count: 1},
    { type: '2 months', count: 2 },
    { type: '3 Months', count: 3 },
    { type: '6 Months', count: 6 },
  ];

const ManualBookingManagement: React.FC = () => {
  // State variables for bookings
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Student search & create
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [studentSearching, setStudentSearching] = useState(false);
  const [showStudentResults, setShowStudentResults] = useState(false);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [selectedStudentEmail, setSelectedStudentEmail] = useState('');
  const [showNewStudent, setShowNewStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [creatingStudent, setCreatingStudent] = useState(false);
  const studentSearchRef = useRef<HTMLDivElement>(null);

  // State for booking flow
  const [step, setStep] = useState<'select-user' | 'select-cabin' | 'select-dates' | 'select-slot' | 'select-seat' | 'booking-details'>('select-user');
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [selectedCabin, setSelectedCabin] = useState<Cabin | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  // Slot state
  const [cabinSlotsEnabled, setCabinSlotsEnabled] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<CabinSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<CabinSlot | null>(null);

  // State for booking form
  const [bookingType, setBookingType] = useState<BookingType>('cabin');
  const [cabinId, setCabinId] = useState<string>('');
  const [hostelId, setHostelId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [seatId, setSeatId] = useState<string>('');
  const [transaction_id, setTransactionId] = useState<string>('');
  const [receipt_no, setReceiptNo] = useState<string>('');
  const [bedId, setBedId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [keyDeposite, setKeyDeposite] = useState<number>(500); // Key Deposit
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [notes, setNotes] = useState<string>('');
  const [months, setMonths] = useState<number>(1);
  const [durationCount, setDurationCount] = useState<number>(1);
  const [bookingDuration, setBookingDuration] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

   const navigate = useNavigate();

  // Load users (legacy - kept for compatibility)
  const fetchUsers = async (searchTerm) => {
    setLoading(true);
    try {
      const response = await adminUsersService.getUsers({search:searchTerm});
      if (response.data) {
        setUsers(response.data);
      }
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Student search with debounce
  useEffect(() => {
    if (studentQuery.length < 2) {
      setStudentResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setStudentSearching(true);
      const res = await vendorSeatsService.searchStudents(studentQuery);
      if (res.success && res.data) {
        setStudentResults(res.data);
        setShowStudentResults(true);
      }
      setStudentSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [studentQuery]);

  const handleStudentSelect = (student: any) => {
    setSelectedUser(student.id);
    setSelectedStudentName(`${student.name} (${student.email})`);
    setSelectedStudentEmail(student.email);
    setStudentQuery(student.name);
    setShowStudentResults(false);
    setStep('select-cabin');
  };

  const handleCreateNewStudent = async () => {
    if (!newStudentName || !newStudentEmail) {
      toast({ title: 'Name and email are required', variant: 'destructive' });
      return;
    }
    setCreatingStudent(true);
    const res = await vendorSeatsService.createStudent(newStudentName, newStudentEmail, newStudentPhone);
    if (res.success && res.userId) {
      setSelectedUser(res.userId);
      setSelectedStudentName(`${newStudentName} (${newStudentEmail})`);
      setSelectedStudentEmail(newStudentEmail);
      setStudentQuery(newStudentName);
      setShowNewStudent(false);
      setNewStudentName('');
      setNewStudentEmail('');
      setNewStudentPhone('');
      toast({ title: res.existing ? 'Existing student selected' : 'Student created & selected' });
      setStep('select-cabin');
    } else {
      toast({ title: 'Error', description: res.error || 'Failed to create student', variant: 'destructive' });
    }
    setCreatingStudent(false);
  };

useEffect(() => {
    fetchUsers(searchTerm);
  }, [searchTerm]);
  
  // Load bookings for selected user
  useEffect(() => {
    const fetchBookings = async () => {
      if (selectedUser) {
        setLoading(true);
        try {
          const response = await adminUsersService.getBookingsByUserId({ userId: selectedUser });
          if (response.data) {
            setBookings(response.data);
          }
        } catch (err) {
          setError('Failed to load bookings');
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchBookings();
  }, [selectedUser]);

  useEffect(()=>{
    setFinalPrice(keyDeposite + totalPrice)
  },[keyDeposite, totalPrice])

  // Load cabins when step changes to select-cabin
  useEffect(() => {
    if (step === 'select-cabin') {
      fetchCabins();
    }
  }, [step]);

  // Load seats when cabin is selected
  useEffect(() => {
    const cId = selectedCabin?.id || selectedCabin?._id;
    if (selectedCabin && cId) {
      fetchSeats(cId);
    }
  }, [selectedCabin]);

  // Fetch cabins
  const fetchCabins = async () => {
    setLoading(true);
    try {
      const response = await adminCabinsService.getAllCabins();
      if (response.success && response.data) {
        setCabins(response.data as any);
      } else {
        setError('Failed to load cabins');
      }
    } catch (err) {
      setError('Failed to load cabins');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch seats for a cabin
  const fetchSeats = async (cabinId: string) => {
    setLoading(true);
    try {
      const response = await seatsService.getSeatsByCabin(cabinId, 1);
      if (response.success && response.data) {
        setSeats(response.data);
      } else {
        setError('Failed to load seats');
      }
    } catch (err) {
      setError('Failed to load seats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handlers for form inputs
  const handleUserChange = (userId: string) => {
    setSelectedUser(userId);
    if (userId) {
      setStep('select-cabin');
    }
  };

  const getCabinId = (cabin: Cabin) => cabin.id || cabin._id || '';

  const handleCabinSelect = async (cabin: Cabin) => {
    setSelectedCabin(cabin);
    const cId = getCabinId(cabin);
    setCabinId(cId);
    
    // Check for slots
    const slotsEnabled = cabin.slots_enabled === true;
    setCabinSlotsEnabled(slotsEnabled);
    setSelectedSlot(null);
    setAvailableSlots([]);
    
    if (slotsEnabled) {
      const res = await cabinSlotService.getSlotsByCabin(cId);
      if (res.success) {
        // Create virtual "Full Day" slot
        const fullDaySlot: CabinSlot = {
          id: 'full_day',
          cabin_id: cId,
          name: 'Full Day',
          start_time: (cabin as any)?.opening_time || '06:00',
          end_time: (cabin as any)?.closing_time || '22:00',
          price: cabin.price || 0,
          is_active: true,
          created_at: '',
        };
        const allSlots = [fullDaySlot, ...res.data];
        setAvailableSlots(allSlots);
        // Auto-select Full Day as default
        setSelectedSlot(fullDaySlot);
      }
    }
    
    setStep('select-dates');
    setTotalPrice(cabin.price);
    setFinalPrice(cabin.price);
  };

  const handleSeatSelect = (seat: Seat) => {
    setSelectedSeat(seat);
    const sId = seat.id || seat._id;
    setSeatId(sId);
    
    // Update total price: use slot price if slot selected, else seat price
    const basePrice = (cabinSlotsEnabled && selectedSlot) ? selectedSlot.price : (seat.price || selectedCabin?.price || 0);
    setTotalPrice(basePrice * months);
    
    if (!seat.isAvailable) {
      toast({
        title: "Seat Unavailable",
        description: `Seat ${seat.number} is currently occupied${seat.unavailableUntil ? ` until ${new Date(seat.unavailableUntil).toLocaleDateString()}` : ''}. Admin can still create booking if needed.`,
        variant: "destructive"
      });
    }
    
    setStep('booking-details');

    if (startDate) {
      const startDateObj = new Date(startDate);
      let endDateObj: Date;
      if (bookingDuration === 'daily') {
        endDateObj = addDays(startDateObj, Math.max(0, months - 1));
      } else if (bookingDuration === 'weekly') {
        endDateObj = addDays(startDateObj, months * 7 - 1);
      } else {
        endDateObj = subDays(addMonths(startDateObj, months), 1);
      }
      setEndDate(endDateObj.toISOString().split('T')[0]);
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    const startDateObj = new Date(e.target.value);
    let endDateObj: Date;
    if (bookingDuration === 'daily') {
      endDateObj = addDays(startDateObj, Math.max(0, months - 1));
    } else if (bookingDuration === 'weekly') {
      endDateObj = addDays(startDateObj, months * 7 - 1);
    } else {
      endDateObj = subDays(addMonths(startDateObj, months), 1);
    }
    setEndDate(endDateObj.toISOString().split('T')[0]);
  };

  const handleMonthsChange = (months) => {
    const monthsValue = Number(months);
    setMonths(monthsValue);
    
    if (startDate) {
      const startDateObj = new Date(startDate);
      let endDateObj: Date;
      if (bookingDuration === 'daily') {
        endDateObj = addDays(startDateObj, Math.max(0, monthsValue - 1));
      } else if (bookingDuration === 'weekly') {
        endDateObj = addDays(startDateObj, monthsValue * 7 - 1);
      } else {
        endDateObj = subDays(addMonths(startDateObj, monthsValue), 1);
      }
      setEndDate(endDateObj.toISOString().split('T')[0]);
    }
    
    if (selectedSeat) {
      const basePrice = (cabinSlotsEnabled && selectedSlot) ? selectedSlot.price : (selectedSeat.price || selectedCabin?.price || 0);
      setTotalPrice(basePrice * monthsValue);
    }
  };


  const handleBookingDurationChange = (value: string) => {
    setBookingDuration(value as 'daily' | 'weekly' | 'monthly');
  };

  const handleTotalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalPrice(Number(e.target.value));
    setFinalPrice(keyDeposite + Number(e.target.value))
  };
  const handleKeyDepositeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyDeposite(Number(e.target.value));
    setFinalPrice(totalPrice + Number(e.target.value))
  };
  const handlePaymentStatusChange = (value: string) => {
    setPaymentStatus(value as 'pending' | 'completed' | 'failed');
  };

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const handleBackToUserSelection = () => {
    setStep('select-user');
    setSelectedCabin(null);
    setSelectedSeat(null);
    setSelectedSlot(null);
    setCabinSlotsEnabled(false);
  };

  const handleBackToCabinSelection = () => {
    setStep('select-cabin');
    setSelectedSeat(null);
    setSelectedSlot(null);
  };

  const handleBackToDateSelection = () => {
    setStep('select-dates');
    setSelectedSeat(null);
  };

  const handleBackToSlotSelection = () => {
    setStep('select-slot');
    setSelectedSeat(null);
  };

  const handleBackToSeatSelection = () => {
    setStep('select-seat');
  };

  const handleDateSelectionComplete = () => {
    const slotsApplicable = (selectedCabin as any)?.slots_applicable_durations || ['daily','weekly','monthly'];
    if (cabinSlotsEnabled && availableSlots.length > 0 && slotsApplicable.includes(bookingDuration)) {
      setStep('select-slot');
    } else {
      setStep('select-seat');
    }
  };

  const handleSlotSelect = (slot: CabinSlot) => {
    setSelectedSlot(slot);
    // Full Day uses seat/cabin base price; specific slots use slot price
    const price = slot.id === 'full_day' ? (selectedCabin?.price || 0) : slot.price;
    setTotalPrice(price * months);
    setStep('select-seat');
  };

  // Submit handlers
  const handleCreateBooking = async () => {
    setLoading(true);
    setError(null);

    if (!selectedUser || !selectedCabin || !selectedSeat) {
      setError('Please select a user, cabin, and seat before creating a booking');
      setLoading(false);
      return;
    }

    
    if (!startDate || !endDate) {
      setError('Please select Start and End Dates before creating a booking');
      setLoading(false);
      return;
    }

    const bookingData = {
      userId: selectedUser,
      cabinId: getCabinId(selectedCabin),
      seatId: selectedSeat.id || selectedSeat._id,
      startDate,
      endDate,
      totalPrice:finalPrice,
      key_deposite:keyDeposite,
      transaction_id,
      receipt_no,
      paymentStatus,
      paymentMethod,
      paymentProofUrl,
      notes,
      months,
      durationCount,
      bookingDuration,
      ...(selectedSlot && selectedSlot.id !== 'full_day' ? { slot_id: selectedSlot.id } : {}),
    };

    try {
      const response = await adminManualBookingService.createManualCabinBooking(bookingData);

      if (response?.success) {
        // Fire-and-forget email notification
        const studentName = selectedStudentName.split(' (')[0];
        bookingEmailService.triggerBookingConfirmation({
          userEmail: selectedStudentEmail,
          userName: studentName,
          bookingId: response.booking_id || response.bookingId || '',
          bookingType: 'cabin',
          totalPrice: finalPrice,
          startDate,
          endDate,
          location: selectedCabin?.name || '',
          cabinName: selectedCabin?.name || '',
          seatNumber: selectedSeat?.number?.toString() || '',
        }).catch(err => console.error('Booking confirmation email failed:', err));

        toast({
          title: 'Booking Created',
          description: 'Booking created successfully.',
        });
        navigate('/admin/bookings');
        resetForm();
        setStep('select-user');
      } else {
        setError(response?.error || 'Failed to create booking');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedUser('');
    setSelectedStudentEmail('');
    setSelectedCabin(null);
    setSelectedSeat(null);
    setSelectedSlot(null);
    setCabinSlotsEnabled(false);
    setAvailableSlots([]);
    setCabinId('');
    setSeatId('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setTotalPrice(0);
    setPaymentStatus('completed');
    setPaymentMethod('cash');
    setNotes('');
    setMonths(1);
    setDurationCount(1);
    setBookingDuration('monthly');
  };

  // Rendering the user selection view
  const renderUserSelection = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Select Student</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative" ref={studentSearchRef}>
          <Label className="text-sm mb-1 block">Search by Name, Phone or Email</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Type to search students..."
              value={studentQuery}
              onChange={(e) => {
                setStudentQuery(e.target.value);
                setShowStudentResults(true);
                if (!e.target.value) {
                  setSelectedUser('');
                  setSelectedStudentName('');
                }
              }}
              className="pl-9"
            />
            {studentSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {/* Search Results Dropdown */}
          {showStudentResults && studentResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {studentResults.map((student) => (
                <button
                  key={student.id}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-0 transition-colors"
                  onClick={() => handleStudentSelect(student)}
                >
                  <p className="text-sm font-medium">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.email} {student.phone ? `• ${student.phone}` : ''}</p>
                </button>
              ))}
            </div>
          )}

          {showStudentResults && studentQuery.length >= 2 && !studentSearching && studentResults.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg p-3">
              <p className="text-sm text-muted-foreground">No students found. Create a new one below.</p>
            </div>
          )}
        </div>

        {selectedStudentName && (
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
            <Badge variant="outline" className="text-xs">Selected</Badge>
            <span className="text-sm font-medium">{selectedStudentName}</span>
          </div>
        )}

        {/* Create New Student */}
        <Collapsible open={showNewStudent} onOpenChange={setShowNewStudent}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <UserPlus className="h-4 w-4" />
              {showNewStudent ? 'Hide' : 'Create New Student'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3 border rounded-md p-3">
            <div>
              <Label className="text-sm">Name *</Label>
              <Input value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="Student name" />
            </div>
            <div>
              <Label className="text-sm">Email *</Label>
              <Input type="email" value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} placeholder="student@email.com" />
            </div>
            <div>
              <Label className="text-sm">Phone</Label>
              <Input value={newStudentPhone} onChange={(e) => setNewStudentPhone(e.target.value)} placeholder="Phone number" />
            </div>
            <Button size="sm" onClick={handleCreateNewStudent} disabled={creatingStudent} className="w-full">
              {creatingStudent ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating...</> : 'Create & Select Student'}
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );

  // Rendering the cabin selection view
  const renderCabinSelection = () => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Select a Reading Room</h2>
        <Button variant="outline" size="sm" onClick={handleBackToUserSelection}>← Back</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <p>Loading cabins...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cabins.map((cabin) => {
            const cId = getCabinId(cabin);
            return (
              <Card 
                key={cId} 
                className={`cursor-pointer transition-all ${getCabinId(selectedCabin!) === cId ? 'border-primary' : 'hover:shadow-md'}`}
                onClick={() => handleCabinSelect(cabin)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{cabin.name}</CardTitle>
                    {cabin.slots_enabled && <Badge variant="secondary" className="text-[10px]">Slots</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{cabin.description?.substring(0, 100)}...</p>
                  <p className="font-medium mt-2">₹{cabin.price} / month</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {cabin.amenities?.slice(0, 3).map((amenity, index) => (
                      <span key={index} className="text-xs bg-muted px-2 py-1 rounded">{amenity}</span>
                    ))}
                    {cabin.amenities?.length > 3 && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">+{cabin.amenities.length - 3} more</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {cabins.length === 0 && !loading && (
        <p className="text-center py-12">No cabins found.</p>
      )}
    </div>
  );

  // Rendering the date selection view
  const renderDateSelection = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Select Dates for {selectedCabin?.name}</h2>
        <Button variant="outline" onClick={handleBackToCabinSelection}>Back to Cabin Selection</Button>
      </div>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Select Booking Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input type="date" id="startDate" value={startDate} onChange={handleStartDateChange}/>
            </div>
            
            <div>
              <Label htmlFor="months">Duration (Months)</Label>
              <Select 
                value={months+''}
                onValueChange={handleMonthsChange}
                >
                <SelectTrigger>
                  <SelectValue placeholder="Select a duration" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {monthsLIst.map(month => (
                    <SelectItem key={month.type} value={month.count+''}>
                      {month.type}
                    </SelectItem>
                  ))}
                </SelectContent>
                </Select>
            </div>
            
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input type="date" id="endDate" value={endDate} disabled />
            </div>
            
            <div>
              <Label htmlFor="bookingDuration">Booking Duration Type</Label>
              <Select value={bookingDuration} onValueChange={handleBookingDurationChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            onClick={handleDateSelectionComplete} 
            className="mt-4"
            disabled={!startDate || !endDate}
          >
            {cabinSlotsEnabled ? 'Continue to Slot Selection' : 'Continue to Seat Selection'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // Rendering the slot selection view
  const renderSlotSelection = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Select a Time Slot for {selectedCabin?.name}</h2>
        <Button variant="outline" onClick={handleBackToDateSelection}>Back to Date Selection</Button>
      </div>

      {availableSlots.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No active slots available for this reading room.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableSlots.map((slot) => (
            <Card
              key={slot.id}
              className={`cursor-pointer transition-all ${selectedSlot?.id === slot.id ? 'border-primary ring-2 ring-primary/20' : 'hover:shadow-md'}`}
              onClick={() => handleSlotSelect(slot)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{slot.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                </p>
                <p className="font-semibold mt-2 text-primary">₹{slot.price}/month</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Rendering the seat selection view with date-based availability
  const renderSeatSelection = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Select a Seat in {selectedCabin?.name}</h2>
        <Button variant="outline" onClick={cabinSlotsEnabled ? handleBackToSlotSelection : handleBackToDateSelection}>
          {cabinSlotsEnabled ? 'Back to Slot Selection' : 'Back to Date Selection'}
        </Button>
      </div>

      {/* Selected Slot Info */}
      {selectedSlot && (
        <Card className="mb-4">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">Slot:</span> {selectedSlot.name} ({formatTime(selectedSlot.start_time)} – {formatTime(selectedSlot.end_time)}) • ₹{selectedSlot.price}/mo
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Seat Details */}
      {selectedSeat && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Selected Seat Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Seat Number:</span> {selectedSeat.number}
              </div>
              <div>
                <span className="font-medium">Price:</span> ₹{selectedSeat.price}/month
              </div>
              <div>
                <span className="font-medium">Status:</span> 
                <span className={`ml-1 ${selectedSeat.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedSeat.isAvailable ? 'Available' : 'Occupied'}
                </span>
              </div>
              {selectedSeat.unavailableUntil && (
                <div className="md:col-span-3">
                  <span className="font-medium">Unavailable Until:</span> 
                  <span className="ml-1 text-red-600">
                    {new Date(selectedSeat.unavailableUntil).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {selectedCabin && (
        <DateBasedSeatMap
          cabinId={getCabinId(selectedCabin)}
          floorsList={selectedCabin.floors}
          startDate={new Date(startDate)}
          endDate={new Date(endDate)}
          onSeatSelect={handleSeatSelect}
          selectedSeat={selectedSeat}
          exportcsv={false}
          slotId={selectedSlot?.id}
        />
      )}
    </div>
  );

  // Rendering the booking details form
  const renderBookingDetailsForm = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Booking Details</h2>
        <Button variant="outline" onClick={handleBackToSeatSelection}>Back to Seat Selection</Button>
      </div>
      
      <Card>
        <CardContent className="p-6 space-y-4">
          {/* Slot info banner */}
          {selectedSlot && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span><strong>Slot:</strong> {selectedSlot.name} ({formatTime(selectedSlot.start_time)} – {formatTime(selectedSlot.end_time)}) • ₹{selectedSlot.price}/mo</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input type="date" id="startDate" value={startDate} onChange={handleStartDateChange} disabled/>
            </div>
            
            <div>
              <Label htmlFor="months">Duration (Months)</Label>
              <Select 
                value={months+''}
                onValueChange={handleMonthsChange}
                disabled
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a duration" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {monthsLIst.map(month => (
                    <SelectItem key={month.type} value={month.count+''}>
                      {month.type}
                    </SelectItem>
                  ))}
                </SelectContent>
                </Select>
            </div>
            
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input type="date" id="endDate" value={endDate} disabled />
            </div>
            
            <div>
              <Label htmlFor="bookingDuration">Booking Duration Type</Label>
              <Select value={bookingDuration} onValueChange={handleBookingDurationChange} disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="keyDeposite">Key Deposit</Label>
              <Input type="number" id="keyDeposite" value={keyDeposite} onChange={handleKeyDepositeChange} />
            </div>
             <div>
              <Label htmlFor="totalPrice">Total Price</Label>
              <Input type="number" id="totalPrice" value={totalPrice} onChange={handleTotalPriceChange} />
            </div>
            <div>
              <Label htmlFor="finalPrice">Final Price</Label>
              <Input type="number" id="finalPrice" value={finalPrice} readOnly />
            </div>

            <div>
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <Select value={paymentStatus} onValueChange={handlePaymentStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
                     <div>
              <Label htmlFor="transaction_id">Transaction Id</Label>
              <Input type="text" id="transaction_id" value={transaction_id}  onChange={(e) => setTransactionId(e.target.value)}
/>
            </div>
            {paymentMethod !== 'cash' && (
              <PaymentProofUpload value={paymentProofUrl} onChange={setPaymentProofUrl} />
            )}
             <div>
              <Label htmlFor="receipt_no">Receipt No</Label>
              <Input type="text" id="receipt_no" value={receipt_no} onChange={(e) => setReceiptNo(e.target.value)}
  />
            </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea 
              id="notes" 
              value={notes} 
              onChange={handleNotesChange}
              className="w-full p-2 border rounded mt-1 h-24"
            ></textarea>
          </div>
          
          <Button 
            onClick={handleCreateBooking}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating...' : 'Create Booking'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
  const viewBookings = (bookingid) => {
     window.open(`/admin/bookings/${bookingid}/cabin`, '_blank');
  };
 const renderBookingManagement = () => (
    <div className="mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">User Bookings</h2>
      {bookings.length > 0 ? (
        <div className="mt-2 overflow-auto rounded-xl border border-border/60 shadow-sm">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Booking ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">End Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookings.map((booking, idx) => (
                <tr key={booking._id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-4 py-3 text-xs whitespace-nowrap font-mono">{booking._id}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{booking.cabinId ? 'Reading Room' : 'Hostel'}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{new Date(booking.startDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{new Date(booking.endDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">₹{booking.totalPrice}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{booking.paymentStatus}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => viewBookings(booking._id)}>View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No bookings found for the selected user</p>
      )}
    </div>
  );

  // Build step list dynamically
  const allSteps = cabinSlotsEnabled
    ? ['select-user','select-cabin','select-dates','select-slot','select-seat','booking-details'] as const
    : ['select-user','select-cabin','select-dates','select-seat','booking-details'] as const;
  
  const stepLabels = cabinSlotsEnabled
    ? ['Select User','Select Room','Select Dates','Select Slot','Select Seat','Booking Details']
    : ['Select User','Select Room','Select Dates','Select Seat','Booking Details'];

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Manual Booking</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Create bookings on behalf of students.</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {allSteps.map((s, idx) => {
          const currentIdx = (allSteps as readonly string[]).indexOf(step);
          return (
            <React.Fragment key={s}>
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-colors ${idx <= currentIdx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {idx + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${idx === currentIdx ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{stepLabels[idx]}</span>
              {idx < allSteps.length - 1 && <div className={`flex-1 h-px ${idx < currentIdx ? 'bg-primary' : 'bg-border'}`} />}
            </React.Fragment>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Tabs defaultValue="create" className="mt-0">
        <TabsContent value="create" className="space-y-4 mt-0">
          {renderBookingManagement()}
          {step === 'select-user' && renderUserSelection()}
          {step === 'select-cabin' && renderCabinSelection()}
          {step === 'select-dates' && renderDateSelection()}
          {step === 'select-slot' && renderSlotSelection()}
          {step === 'select-seat' && renderSeatSelection()}
          {step === 'booking-details' && renderBookingDetailsForm()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManualBookingManagement;
