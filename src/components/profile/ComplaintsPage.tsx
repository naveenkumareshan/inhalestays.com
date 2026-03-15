import React, { useState, useEffect } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, MessageSquareWarning, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { bookingsService } from '@/api/bookingsService';
import { hostelBookingService } from '@/api/hostelBookingService';
import { getMyMessSubscriptions } from '@/api/messService';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import TicketChat from '@/components/shared/TicketChat';
import { getElapsedDisplay, getElapsedBadgeClass } from '@/utils/complaintTimerUtils';

const CATEGORIES = ['cleanliness', 'noise', 'facilities', 'staff', 'food_quality', 'other'];

const statusBadge: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-muted text-muted-foreground',
};

const ComplaintsPage = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [partnerWhatsapp, setPartnerWhatsapp] = useState('');
  const [viewTab, setViewTab] = useState<'pending' | 'resolved'>('pending');
  const [, setTick] = useState(0);

  const [formData, setFormData] = useState({
    booking_id: '',
    category: 'other',
    subject: '',
    description: '',
  });

  // Live timer refresh every 60s
  useEffect(() => {
    if (viewTab !== 'pending') return;
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [viewTab]);

  useEffect(() => { loadData(); }, []);

  const isWithin7Days = (dateStr: string) => {
    const d = new Date(dateStr);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return d >= sevenDaysAgo;
  };

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const [complaintsRes, cabinBookingsRes, hostelBookingsRes, messSubsRes, laundryOrdersRes] = await Promise.all([
      supabase.from('complaints').select('*, cabins:cabin_id(name), hostels:hostel_id(name), mess_partners:mess_id(name)').eq('user_id', user.id).order('created_at', { ascending: false }),
      bookingsService.getCurrentBookings(),
      hostelBookingService.getUserBookings(),
      getMyMessSubscriptions(user.id).catch(() => []),
      supabase.from('laundry_orders').select('*, laundry_partners:partner_id(id, business_name)').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    const now = new Date();

    // Cabin bookings: active or expired within 7 days
    const cabinBookings = (cabinBookingsRes.success ? cabinBookingsRes.data : [])
      .filter((b: any) => {
        if (!b.end_date) return true;
        const endDate = new Date(b.end_date);
        return endDate >= now || isWithin7Days(b.end_date);
      })
      .map((b: any) => ({
        ...b, _type: 'cabin',
        _label: `${(b.cabins as any)?.name || 'Room'} — ${(b.seats as any)?.floor ? `Floor ${(b.seats as any).floor} · ` : ''}Seat #${b.seat_number || '—'}`,
      }));

    // Hostel bookings: active or expired within 7 days
    const hostelBookings = (hostelBookingsRes || [])
      .filter((hb: any) => {
        if (!hb.end_date) return true;
        const endDate = new Date(hb.end_date);
        return endDate >= now || isWithin7Days(hb.end_date);
      })
      .map((hb: any) => ({
        ...hb, _type: 'hostel',
        _label: `${(hb.hostels as any)?.name || 'Hostel'} — Bed #${(hb.hostel_beds as any)?.bed_number || '—'}`,
      }));

    // Mess subscriptions: active or expired within 7 days
    const messBookings = (messSubsRes || [])
      .filter((s: any) => {
        if (s.status === 'active') return true;
        if (s.end_date && isWithin7Days(s.end_date)) return true;
        return false;
      })
      .map((s: any) => ({
        ...s, _type: 'mess',
        _label: `🍽️ ${s.mess_partners?.name || 'Mess'} — ${s.mess_packages?.name || 'Subscription'}`,
      }));

    // Laundry orders: active or within 7 days
    const laundryBookings = (laundryOrdersRes.data || [])
      .filter((o: any) => {
        if (['pending', 'confirmed', 'picked_up', 'processing', 'ready'].includes(o.status)) return true;
        if (o.updated_at && isWithin7Days(o.updated_at)) return true;
        return false;
      })
      .map((o: any) => ({
        ...o, _type: 'laundry',
        _label: `👕 ${o.laundry_partners?.business_name || 'Laundry'} — Order ${o.serial_number || ''}`,
        _laundry_partner_id: o.laundry_partners?.id || o.partner_id,
      }));

    setComplaints((complaintsRes.data as any[]) || []);
    setBookings([...cabinBookings, ...hostelBookings, ...messBookings, ...laundryBookings]);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast({ title: 'Error', description: 'Subject and description are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const selectedBooking = bookings.find((b: any) => b.id === formData.booking_id);
    const insertData: any = {
      user_id: user.id,
      subject: formData.subject.trim(),
      description: formData.description.trim(),
      category: formData.category,
      status: 'open',
      priority: 'medium',
    };
    if (formData.booking_id && selectedBooking) {
      insertData.booking_id = formData.booking_id;
      if (selectedBooking._type === 'laundry') {
        insertData.laundry_id = selectedBooking._laundry_partner_id;
        insertData.module = 'laundry';
      } else if (selectedBooking._type === 'mess') {
        insertData.mess_id = selectedBooking.mess_id || selectedBooking.mess_partners?.id;
        insertData.module = 'mess';
      } else if (selectedBooking._type === 'hostel') {
        insertData.hostel_id = selectedBooking.hostel_id;
        insertData.module = 'hostel';
      } else {
        insertData.cabin_id = selectedBooking.cabin_id || null;
        insertData.module = 'reading_room';
      }
    }

    const { error } = await supabase.from('complaints').insert(insertData);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to submit complaint', variant: 'destructive' });
    } else {
      toast({ title: 'Submitted', description: 'Your complaint has been submitted' });
      setFormData({ booking_id: '', category: 'other', subject: '', description: '' });
      setShowForm(false);
      loadData();
    }
  };

  // Fetch partner WhatsApp when complaint is selected
  useEffect(() => {
    if (!selectedComplaint) { setPartnerWhatsapp(''); return; }
    const fetchPartnerWhatsapp = async () => {
      let ownerId: string | null = null;
      if (selectedComplaint.cabin_id) {
        const { data } = await supabase.from('cabins').select('created_by').eq('id', selectedComplaint.cabin_id).single();
        ownerId = data?.created_by || null;
      } else if (selectedComplaint.hostel_id) {
        const { data } = await supabase.from('hostels').select('created_by').eq('id', selectedComplaint.hostel_id).single();
        ownerId = data?.created_by || null;
      } else if (selectedComplaint.mess_id) {
        const { data } = await supabase.from('mess_partners').select('user_id').eq('id', selectedComplaint.mess_id).single();
        ownerId = data?.user_id || null;
      } else if (selectedComplaint.laundry_id) {
        const { data } = await supabase.from('laundry_partners').select('user_id').eq('id', selectedComplaint.laundry_id).single();
        ownerId = data?.user_id || null;
      }
      if (ownerId) {
        const { data: partner } = await supabase.from('partners').select('whatsapp_number').eq('user_id', ownerId).single();
        setPartnerWhatsapp(partner?.whatsapp_number || '');
      }
    };
    fetchPartnerWhatsapp();
  }, [selectedComplaint]);

  const isPending = (c: any) => c.status === 'open' || c.status === 'in_progress';

  const filteredComplaints = complaints.filter(c =>
    viewTab === 'pending' ? isPending(c) : !isPending(c)
  );

  const pendingCount = complaints.filter(isPending).length;
  const resolvedCount = complaints.filter(c => !isPending(c)).length;

  // Chat view for selected complaint
  if (selectedComplaint) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-card border-b px-3 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setSelectedComplaint(null)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate">{selectedComplaint.subject}</p>
            {(selectedComplaint.cabins?.name || selectedComplaint.hostels?.name || selectedComplaint.mess_partners?.name) && (
              <p className="text-[11px] text-muted-foreground truncate">
                {selectedComplaint.cabins?.name || selectedComplaint.hostels?.name || selectedComplaint.mess_partners?.name}
              </p>
            )}
            <div className="flex items-center gap-2">
              {selectedComplaint.serial_number && <span className="text-[10px] font-mono text-muted-foreground">{selectedComplaint.serial_number}</span>}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge[selectedComplaint.status] || ''}`}>
                {selectedComplaint.status?.replace('_', ' ')}
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getElapsedBadgeClass(selectedComplaint.status)}`}>
                <Clock className="h-2.5 w-2.5" />
                {getElapsedDisplay(selectedComplaint.created_at, selectedComplaint.resolved_at)}
              </span>
            </div>
          </div>
          {partnerWhatsapp && (
            <button
              onClick={() => {
                const text = encodeURIComponent(`Hi, I have a complaint: ${selectedComplaint.subject}${selectedComplaint.serial_number ? ` (${selectedComplaint.serial_number})` : ''}`);
                window.open(`https://wa.me/${partnerWhatsapp.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
              }}
              className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105"
              style={{ backgroundColor: '#25D366' }}
              aria-label="Chat with Property on WhatsApp"
            >
              <FaWhatsapp className="h-4 w-4 text-white" />
            </button>
          )}
        </div>
        <div className="flex-1">
          <TicketChat
            ticketId={selectedComplaint.id}
            ticketType="complaint"
            ticketDescription={selectedComplaint.description}
            ticketCreatedAt={selectedComplaint.created_at}
            ticketStatus={selectedComplaint.status}
            senderRole="student"
            currentUserId={currentUserId}
            creatorName="You"
            whatsappNumber={partnerWhatsapp}
            whatsappLabel="Chat with Property Owner"
            ticketSubject={selectedComplaint.subject}
            ticketSerialNumber={selectedComplaint.serial_number}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-3 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-[15px] font-semibold">Complaints</h1>
        <Button size="sm" className="ml-auto h-8 text-[12px] rounded-xl gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5" /> New
        </Button>
      </div>

      <div className="max-w-lg mx-auto px-3 py-4 space-y-4">
        {showForm && (
          <Card className="rounded-2xl">
            <CardContent className="p-4 space-y-3">
              <p className="text-[13px] font-semibold">Submit a Complaint</p>
              <div>
                <Label className="text-[12px]">Related Booking (optional)</Label>
                <Select value={formData.booking_id} onValueChange={(v) => setFormData(p => ({ ...p, booking_id: v }))}>
                  <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select booking" /></SelectTrigger>
                  <SelectContent>
                    {bookings.map((b: any) => (
                      <SelectItem key={b.id} value={b.id} className="text-[13px]">
                        {b._label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px]">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-[13px] capitalize">{c.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px]">Subject</Label>
                <Input value={formData.subject} onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))} className="h-9 text-[13px]" placeholder="Brief summary" maxLength={100} />
              </div>
              <div>
                <Label className="text-[12px]">Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} className="text-[13px]" rows={4} placeholder="Describe your issue…" maxLength={1000} />
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full h-10 rounded-xl text-[13px]">
                {submitting ? 'Submitting…' : 'Submit Complaint'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pending / Resolved toggle */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={viewTab === 'pending' ? 'default' : 'outline'}
            className="h-8 text-[12px] rounded-xl gap-1"
            onClick={() => setViewTab('pending')}
          >
            Pending <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">{pendingCount}</Badge>
          </Button>
          <Button
            size="sm"
            variant={viewTab === 'resolved' ? 'default' : 'outline'}
            className="h-8 text-[12px] rounded-xl gap-1"
            onClick={() => setViewTab('resolved')}
          >
            Resolved <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">{resolvedCount}</Badge>
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : filteredComplaints.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquareWarning className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">No {viewTab} complaints</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredComplaints.map((c: any) => (
              <Card key={c.id} className="rounded-2xl cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedComplaint(c)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      {c.serial_number && <p className="text-[10px] font-mono text-muted-foreground">{c.serial_number}</p>}
                      <p className="text-[13px] font-semibold text-foreground">{c.subject}</p>
                      {(c.cabins?.name || c.hostels?.name || c.mess_partners?.name) && (
                        <p className="text-[11px] text-muted-foreground">{c.cabins?.name || c.hostels?.name || c.mess_partners?.name}</p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{c.category}</Badge>
                        <span>{format(new Date(c.created_at), 'd MMM yyyy')}</span>
                        <span className={`font-medium px-2 py-0.5 rounded-full ${statusBadge[c.status] || ''}`}>
                          {c.status?.replace('_', ' ')}
                        </span>
                        <span className={`font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getElapsedBadgeClass(c.status)}`}>
                          <Clock className="h-2.5 w-2.5" />
                          {getElapsedDisplay(c.created_at, c.resolved_at)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintsPage;
