import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Headphones, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import TicketChat from '@/components/shared/TicketChat';

const CATEGORIES = ['account', 'payment', 'technical', 'general'];

const statusBadge: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-muted text-muted-foreground',
};

const SupportPage = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState('');

  const [formData, setFormData] = useState({
    category: 'general',
    subject: '',
    description: '',
  });

  useEffect(() => { loadTickets(); }, []);

  const loadTickets = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    const { data } = await supabase.from('support_tickets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setTickets((data as any[]) || []);
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

    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      subject: formData.subject.trim(),
      description: formData.description.trim(),
      category: formData.category,
      status: 'open',
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to submit ticket', variant: 'destructive' });
    } else {
      toast({ title: 'Submitted', description: 'Your support ticket has been created' });
      setFormData({ category: 'general', subject: '', description: '' });
      setShowForm(false);
      loadTickets();
    }
  };

  // Chat view for a selected ticket
  if (selectedTicket) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-card border-b px-3 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setSelectedTicket(null)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate">{selectedTicket.subject}</p>
            <div className="flex items-center gap-2">
              {selectedTicket.serial_number && <span className="text-[10px] font-mono text-muted-foreground">{selectedTicket.serial_number}</span>}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge[selectedTicket.status] || ''}`}>
                {selectedTicket.status?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <TicketChat
            ticketId={selectedTicket.id}
            ticketType="support"
            ticketDescription={selectedTicket.description}
            ticketCreatedAt={selectedTicket.created_at}
            ticketStatus={selectedTicket.status}
            senderRole="student"
            currentUserId={currentUserId}
            creatorName="You"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-3 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-[15px] font-semibold">Customer Support</h1>
        <Button size="sm" className="ml-auto h-8 text-[12px] rounded-xl gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5" /> New Ticket
        </Button>
      </div>

      <div className="max-w-lg mx-auto px-3 py-4 space-y-4">
        {showForm && (
          <Card className="rounded-2xl">
            <CardContent className="p-4 space-y-3">
              <p className="text-[13px] font-semibold">Create Support Ticket</p>
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
                {submitting ? 'Submitting…' : 'Submit Ticket'}
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <Headphones className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">No support tickets yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t: any) => (
              <Card key={t.id} className="rounded-2xl cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTicket(t)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      {t.serial_number && <p className="text-[10px] font-mono text-muted-foreground">{t.serial_number}</p>}
                      <p className="text-[13px] font-semibold text-foreground">{t.subject}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{t.category}</Badge>
                        <span>{format(new Date(t.created_at), 'd MMM yyyy')}</span>
                        <span className={`font-medium px-2 py-0.5 rounded-full ${statusBadge[t.status] || ''}`}>
                          {t.status?.replace('_', ' ')}
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

export default SupportPage;
