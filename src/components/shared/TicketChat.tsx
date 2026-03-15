import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Send, Lock, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { FaWhatsapp } from 'react-icons/fa';

interface TicketChatProps {
  ticketId: string;
  ticketType: 'complaint' | 'support';
  ticketDescription: string;
  ticketCreatedAt: string;
  ticketStatus: string;
  senderRole: 'student' | 'vendor' | 'admin';
  currentUserId: string;
  /** Name to show for the ticket creator's initial description */
  creatorName?: string;
  /** Optional WhatsApp number for direct contact */
  whatsappNumber?: string;
  /** Label for the WhatsApp button */
  whatsappLabel?: string;
  /** Ticket subject for pre-filled WhatsApp message */
  ticketSubject?: string;
  /** Ticket serial number for pre-filled WhatsApp message */
  ticketSerialNumber?: string;
}

const TicketChat: React.FC<TicketChatProps> = ({
  ticketId,
  ticketType,
  ticketDescription,
  ticketCreatedAt,
  ticketStatus,
  senderRole,
  currentUserId,
  creatorName = 'Student',
  whatsappNumber,
  whatsappLabel = 'Chat on WhatsApp',
  ticketSubject,
  ticketSerialNumber,
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLocked = ticketStatus === 'resolved' || ticketStatus === 'closed';

  useEffect(() => {
    loadMessages();
  }, [ticketId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*, profiles:sender_id(name)')
      .eq('ticket_id', ticketId)
      .eq('ticket_type', ticketType)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Failed to load ticket messages:', error);
      toast({ title: 'Error', description: 'Failed to load messages', variant: 'destructive' });
    }
    setMessages((data as any[]) || []);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: ticketId,
      ticket_type: ticketType,
      sender_id: currentUserId,
      sender_role: senderRole,
      message: newMessage.trim(),
    } as any);
    setSending(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } else {
      setNewMessage('');
      loadMessages();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const roleColor = (role: string) => {
    if (role === 'admin') return 'bg-primary/10 text-primary';
    if (role === 'vendor') return 'bg-orange-100 text-orange-700';
    return 'bg-blue-100 text-blue-700';
  };

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hi, I have a ${ticketType} regarding: ${ticketSubject || ticketDescription.slice(0, 60)}${ticketSerialNumber ? `. Ticket ID: ${ticketSerialNumber}` : ''}`
      )}`
    : '';

  return (
    <div className="flex flex-col h-full">
      {whatsappNumber && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 bg-green-50 border-b text-green-700 hover:bg-green-100 transition-colors"
        >
          <FaWhatsapp className="h-4 w-4" />
          <span className="text-[12px] font-medium">{whatsappLabel}</span>
        </a>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[350px] min-h-[200px]">
        {/* Initial description as first message */}
        <div className="flex justify-start">
          <div className="max-w-[80%]">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-medium text-muted-foreground">{creatorName}</span>
              <span className="text-[9px] text-muted-foreground">{format(new Date(ticketCreatedAt), 'd MMM, h:mm a')}</span>
            </div>
            <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2">
              <p className="text-[12px] text-foreground whitespace-pre-wrap">{ticketDescription}</p>
            </div>
          </div>
        </div>

        {loading && messages.length === 0 && (
          <p className="text-center text-[11px] text-muted-foreground py-2">Loading messages…</p>
        )}

        {messages.map((msg: any) => {
          const isOwn = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%]">
                <div className={`flex items-center gap-1.5 mb-0.5 ${isOwn ? 'justify-end' : ''}`}>
                  <span className={`text-[9px] font-medium px-1.5 py-0 rounded-full ${roleColor(msg.sender_role)}`}>
                    {msg.sender_role}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {(msg.profiles as any)?.name || ''} · {format(new Date(msg.created_at), 'h:mm a')}
                  </span>
                </div>
                <div className={`rounded-xl px-3 py-2 ${
                  isOwn 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-muted text-foreground rounded-tl-sm'
                }`}>
                  <p className="text-[12px] whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isLocked ? (
        <div className="flex items-center justify-center gap-1.5 py-3 border-t bg-muted/50">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">This ticket is {ticketStatus}. No further messages.</span>
        </div>
      ) : (
        <div className="flex gap-2 p-3 border-t">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className="h-9 text-[13px]"
            maxLength={1000}
          />
          <Button
            size="sm"
            className="h-9 px-3"
            disabled={!newMessage.trim() || sending}
            onClick={handleSend}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default TicketChat;
