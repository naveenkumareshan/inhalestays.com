
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Eye } from 'lucide-react';
import { generateBrandedQrPng } from '@/utils/brandedQrGenerator';

interface Property {
  id: string;
  name: string;
  type: string;
}

const QrCodesTab = () => {
  const { user } = useAuth();
  const [viewing, setViewing] = useState<Property | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['ops-qr-properties', user?.id],
    queryFn: async () => {
      const { ownerId } = await getEffectiveOwnerId();
      const items: Property[] = [];
      const { data: cabins } = await supabase.from('cabins').select('id, name').eq('created_by', ownerId).eq('is_active', true);
      (cabins || []).forEach(c => items.push({ id: c.id, name: c.name, type: 'reading_room' }));
      const { data: hostels } = await supabase.from('hostels').select('id, name').eq('created_by', ownerId).eq('is_active', true);
      (hostels || []).forEach(h => items.push({ id: h.id, name: h.name, type: 'hostel' }));
      const { data: messes } = await supabase.from('mess_partners' as any).select('id, name').eq('user_id', ownerId).eq('is_active', true);
      (messes || []).forEach((m: any) => items.push({ id: m.id, name: m.name, type: 'mess' }));
      if (user?.role === 'vendor_employee') {
        const { data: emp } = await supabase.from('vendor_employees').select('allowed_properties').eq('employee_user_id', user.id).eq('status', 'active').maybeSingle();
        const allowed = emp?.allowed_properties as string[] | null;
        if (allowed && allowed.length > 0) return items.filter(i => allowed.includes(i.id));
      }
      return items;
    },
    enabled: !!user?.id,
  });

  const typeLabel = (t: string) => t === 'reading_room' ? 'RR' : t === 'hostel' ? 'H' : 'M';

  const handleView = async (prop: Property) => {
    const url = await generateBrandedQrPng(prop.id, prop.type, prop.name);
    setQrDataUrl(url);
    setViewing(prop);
  };

  const handleDownload = () => {
    if (!viewing || !qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${viewing.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  if (isLoading) return <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>;
  if (properties.length === 0) return <div className="text-center py-8 text-sm text-muted-foreground">No properties found.</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {properties.map(prop => (
          <div key={prop.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{prop.name}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{typeLabel(prop.type)}</Badge>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleView(prop)}>
              <Eye className="h-3 w-3" /> View QR
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{viewing?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-56 h-56" />}
            <Button size="sm" className="gap-1.5" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QrCodesTab;
