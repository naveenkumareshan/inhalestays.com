import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Link2, Trash2, Plus, Loader2 } from 'lucide-react';

interface Props {
  hostelId: string;
}

export function HostelMessLinkManager({ hostelId }: Props) {
  const [links, setLinks] = useState<any[]>([]);
  const [messList, setMessList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessId, setSelectedMessId] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchLinks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hostel_mess_links' as any)
      .select('*, mess_partners:mess_id(id, name)')
      .eq('hostel_id', hostelId)
      .order('created_at');
    setLinks(data || []);
    setLoading(false);
  };

  const fetchMesses = async () => {
    const { data } = await supabase
      .from('mess_partners' as any)
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setMessList(data || []);
  };

  useEffect(() => {
    if (hostelId) {
      fetchLinks();
      fetchMesses();
    }
  }, [hostelId]);

  const linkedMessIds = links.map((l: any) => l.mess_id);
  const availableMesses = messList.filter(m => !linkedMessIds.includes(m.id));

  const handleAdd = async () => {
    if (!selectedMessId) return;
    setAdding(true);
    const { error } = await supabase
      .from('hostel_mess_links' as any)
      .insert({ hostel_id: hostelId, mess_id: selectedMessId, is_default: links.length === 0 } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Mess linked successfully' });
      setSelectedMessId('');
      fetchLinks();
    }
    setAdding(false);
  };

  const handleToggleDefault = async (linkId: string, checked: boolean) => {
    const { error } = await supabase
      .from('hostel_mess_links' as any)
      .update({ is_default: checked } as any)
      .eq('id', linkId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchLinks();
    }
  };

  const handleRemove = async (linkId: string) => {
    const { error } = await supabase
      .from('hostel_mess_links' as any)
      .delete()
      .eq('id', linkId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Mess unlinked' });
      fetchLinks();
    }
  };

  return (
    <div className="space-y-3 mt-4 pt-4 border-t border-border">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <Label className="text-xs font-semibold">Linked Mess Partners</Label>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Link a mess partner to auto-create meal subscriptions when students book with food included. The default mess will be used for automatic subscriptions.
      </p>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : links.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic py-2">No mess partners linked yet.</p>
      ) : (
        <div className="space-y-2">
          {links.map((link: any) => (
            <div key={link.id} className="flex items-center justify-between bg-muted/30 rounded-md border px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium">{link.mess_partners?.name || 'Unknown'}</span>
                {link.is_default && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Default</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={link.is_default}
                    onCheckedChange={(checked) => handleToggleDefault(link.id, checked)}
                    className="scale-75"
                  />
                  <span className="text-[10px] text-muted-foreground">Default</span>
                </div>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => handleRemove(link.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {availableMesses.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selectedMessId} onValueChange={setSelectedMessId}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Select mess to link..." />
            </SelectTrigger>
            <SelectContent>
              {availableMesses.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 text-xs gap-1" onClick={handleAdd} disabled={!selectedMessId || adding}>
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Link
          </Button>
        </div>
      )}
    </div>
  );
}
