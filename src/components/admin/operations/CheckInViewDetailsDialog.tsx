
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Download, FileText } from 'lucide-react';

type Module = 'reading_room' | 'hostel';

interface CheckInViewDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  module: Module;
}

const CheckInViewDetailsDialog: React.FC<CheckInViewDetailsDialogProps> = ({ open, onOpenChange, booking, module }) => {
  const { toast } = useToast();

  if (!booking) return null;

  const docs = Array.isArray(booking.check_in_documents) ? booking.check_in_documents as Array<{ name: string; path: string }> : [];

  const handleDownload = async (doc: { name: string; path: string }) => {
    const { data, error } = await supabase.storage.from('checkin-documents').createSignedUrl(doc.path, 60);
    if (error) {
      toast({ title: 'Download failed', description: error.message, variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-start py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right max-w-[60%]">{value || '—'}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-sm">Booking Details</DialogTitle>
          <DialogDescription className="sr-only">View booking information and documents</DialogDescription>
        </DialogHeader>
        <ScrollArea className="px-4 max-h-[65vh]">
          <div className="space-y-3 pb-4">
            {/* Student Info */}
            <div className="space-y-0.5">
              <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Student</h4>
              <InfoRow label="Name" value={booking.profiles?.name} />
              <InfoRow label="Phone" value={booking.profiles?.phone} />
              <InfoRow label="Email" value={booking.profiles?.email} />
            </div>

            <hr className="border-border" />

            {/* Booking Info */}
            <div className="space-y-0.5">
              <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Booking</h4>
              {module === 'reading_room' ? (
                <InfoRow label="Room / Seat" value={`${booking.cabins?.name || '—'} / ${booking.seats?.floor ? `Floor ${booking.seats.floor} · ` : ''}Seat #${booking.seats?.number || '—'}`} />
              ) : (
                <InfoRow label="Hostel / Bed" value={`${booking.hostels?.name || '—'} / Bed #${booking.hostel_beds?.bed_number || '—'}`} />
              )}
              <InfoRow label="Duration" value={`${booking.booking_duration || '—'} (${booking.duration_count || 1})`} />
              <InfoRow label="Start" value={booking.start_date ? format(parseISO(booking.start_date), 'dd MMM yyyy') : '—'} />
              <InfoRow label="End" value={booking.end_date ? format(parseISO(booking.end_date), 'dd MMM yyyy') : '—'} />
              <InfoRow label="Serial No." value={booking.serial_number} />
            </div>

            <hr className="border-border" />

            {/* Payment Info */}
            <div className="space-y-0.5">
              <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Payment</h4>
              <InfoRow label="Status" value={
                <Badge variant={booking.payment_status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                  {booking.payment_status}
                </Badge>
              } />
              <InfoRow label="Amount" value={`₹${booking.total_price || 0}`} />
              <InfoRow label="Method" value={booking.payment_method} />
              <InfoRow label="Transaction ID" value={booking.transaction_id} />
            </div>

            {/* Check-in Notes */}
            {booking.check_in_notes && (
              <>
                <hr className="border-border" />
                <div className="space-y-0.5">
                  <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Notes</h4>
                  <p className="text-xs text-foreground">{booking.check_in_notes}</p>
                </div>
              </>
            )}

            {/* Documents */}
            {docs.length > 0 && (
              <>
                <hr className="border-border" />
                <div className="space-y-1.5">
                  <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Documents ({docs.length})
                  </h4>
                  {docs.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs truncate">{doc.name}</span>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => handleDownload(doc)}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="px-4 pb-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckInViewDetailsDialog;
