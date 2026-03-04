import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, MessageSquareWarning } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { bookingsService } from '@/api/bookingsService';
import { hostelBookingService } from '@/api/hostelBookingService';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORIES = ['cleanliness', 'noise', 'facilities', 'staff', 'other'];

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

  const [formData, setFormData] = useState({
    booking_id: '',
    category: 'other',
    subject: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [complaintsRes, cabinBookingsRes, hostelBookingsRes] = await Promise.all([
      supabase.from('complaints').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      bookingsService.getCurrentBookings(),
      hostelBookingService.getUserBookings(),
    ]);

    const cabinBookings = (cabinBookingsRes.success ? cabinBookingsRes.data : []).map((b: any) => ({
      ...b,
      _type: 'cabin',
      _label: `${(b.cabins as any)?.name || 'Room'} — Seat #${b.seat_number || '—'}`,
    }));

    const hostelBookings = (hostelBookingsRes || []).map((hb: any) => ({
      ...hb,
      _type: 'hostel',
      _label: `${(hb.hostels as any)?.name || 'Hostel'} — Bed #${(hb.hostel_beds as any)?.bed_number || '—'}`,
    }));

    setComplaints((complaintsRes.data as any[]) || []);
    setBookings([...cabinBookings, ...hostelBookings]);
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
      if (selectedBooking._type === 'hostel') {
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
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-[13px] capitalize">{c}</SelectItem>)}
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

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquareWarning className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">No complaints yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {complaints.map((c: any) => (
              <Card key={c.id} className="rounded-2xl">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {c.serial_number && <p className="text-[10px] font-mono text-muted-foreground">{c.serial_number}</p>}
                      <p className="text-[13px] font-semibold text-foreground">{c.subject}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadge[c.status] || ''}`}>
                      {c.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{c.category}</Badge>
                    <span>{format(new Date(c.created_at), 'd MMM yyyy')}</span>
                  </div>
                  {c.response && (
                    <div className="bg-muted/50 rounded-xl p-2 mt-1">
                      <p className="text-[10px] font-medium text-primary mb-0.5">Response:</p>
                      <p className="text-[11px] text-foreground">{c.response}</p>
                    </div>
                  )}
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
