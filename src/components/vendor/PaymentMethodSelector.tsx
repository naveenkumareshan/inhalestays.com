import React, { useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Banknote, Smartphone, Building2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentMode {
  value: string;
  label: string;
  icon?: React.ReactNode;
  mode_type: string;
  details_image_url?: string | null;
}

interface PaymentMethodSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  partnerId?: string;
  idPrefix?: string;
  columns?: number;
  compact?: boolean;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-3 w-3" />,
  upi: <Smartphone className="h-3 w-3" />,
  bank_transfer: <Building2 className="h-3 w-3" />,
};

const TYPE_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank',
  upi: 'UPI',
};

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  value,
  onValueChange,
  partnerId,
  idPrefix = 'pm',
  columns = 2,
  compact = false,
}) => {
  const { user } = useAuth();
  const [modes, setModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerId) return;
    setLoading(true);
    const fetchModes = async () => {
      const { data } = await supabase
        .from('partner_payment_modes')
        .select('id, label, mode_type, assigned_employee_id, details_image_url')
        .eq('partner_user_id', partnerId)
        .eq('is_active', true)
        .neq('mode_type', 'online')
        .order('display_order');

      if (data) {
        // Filter cash modes based on current user
        const filtered = await filterCashModes(data);
        setModes(filtered.map(m => ({
          value: `custom_${m.id}`,
          label: m.label,
          icon: TYPE_ICONS[m.mode_type] || <Building2 className="h-3 w-3" />,
          mode_type: m.mode_type,
          details_image_url: m.details_image_url,
        })));
      }
      setLoading(false);
    };

    const filterCashModes = async (allModes: any[]) => {
      if (!user) return allModes;

      // For non-cash modes, keep all. For cash, filter by assignment.
      const nonCash = allModes.filter(m => m.mode_type !== 'cash');
      const cashModes = allModes.filter(m => m.mode_type === 'cash');

      if (cashModes.length === 0) return nonCash;

      if (user.role === 'vendor') {
        // Partner sees only cash modes assigned to them (assigned_employee_id IS NULL)
        const partnerCash = cashModes.filter(m => !m.assigned_employee_id);
        return [...nonCash, ...partnerCash];
      }

      if (user.role === 'vendor_employee') {
        // Find this employee's vendor_employees.id
        const { data: empRecord } = await supabase
          .from('vendor_employees')
          .select('id')
          .eq('employee_user_id', user.id)
          .eq('partner_user_id', partnerId)
          .maybeSingle();

        if (empRecord) {
          const empCash = cashModes.filter(m => m.assigned_employee_id === empRecord.id);
          return [...nonCash, ...empCash];
        }
        // If no employee record found, show no cash modes
        return nonCash;
      }

      // Admin or other roles: show all cash modes
      return allModes;
    };

    fetchModes();
  }, [partnerId, user?.id, user?.role]);

  const fontSize = compact ? 'text-[9px]' : 'text-[10px]';
  const radioSize = compact ? 'h-2.5 w-2.5' : 'h-3 w-3';
  const padding = compact ? 'p-1' : 'p-1.5';

  if (loading) {
    return <p className="text-xs text-muted-foreground py-2">Loading payment modes...</p>;
  }

  if (!partnerId || modes.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No payment modes configured. Add them in Bank Management.</p>;
  }

  // Group by mode_type, order: cash, bank_transfer, upi
  const groupOrder = ['cash', 'bank_transfer', 'upi'];
  const grouped = groupOrder
    .map(type => ({ type, label: TYPE_LABELS[type], icon: TYPE_ICONS[type], items: modes.filter(m => m.mode_type === type) }))
    .filter(g => g.items.length > 0);

  return (
    <>
      <div className="space-y-2">
        {grouped.map(group => (
          <div key={group.type}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
              {group.icon} {group.label}
            </p>
            <RadioGroup
              value={value}
              onValueChange={onValueChange}
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {group.items.map(mode => (
                <div key={mode.value} className={`flex items-center gap-1.5 border rounded ${padding} cursor-pointer hover:bg-muted/50`}>
                  <RadioGroupItem value={mode.value} id={`${idPrefix}_${mode.value}`} className={radioSize} />
                  <Label htmlFor={`${idPrefix}_${mode.value}`} className={`${fontSize} cursor-pointer flex items-center gap-1 flex-1`}>
                    {mode.icon} {mode.label}
                  </Label>
                  {mode.details_image_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={(e) => { e.preventDefault(); setViewImageUrl(mode.details_image_url!); }}
                    >
                      <Eye className="h-3 w-3 text-primary" />
                    </Button>
                  )}
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>

      <Dialog open={!!viewImageUrl} onOpenChange={() => setViewImageUrl(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Payment Details / QR</DialogTitle>
          </DialogHeader>
          {viewImageUrl && <img src={viewImageUrl} alt="Payment QR / Details" className="w-full rounded" />}
        </DialogContent>
      </Dialog>
    </>
  );
};

/** Check if a payment method value requires a transaction ID */
export const requiresTransactionId = (method: string) =>
  method === 'upi' || method === 'bank_transfer' || method.startsWith('custom_');

/** Check if a payment method is not cash (for payment proof display) */
export const isNonCashMethod = (method: string) => method !== 'cash';

/** Get display label for a payment method */
export const getPaymentMethodLabel = (method: string, customModes?: { value: string; label: string }[]) => {
  const defaults: Record<string, string> = {
    cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank Transfer', online: 'Online',
  };
  if (defaults[method]) return defaults[method];
  const custom = customModes?.find(m => m.value === method);
  if (custom) return custom.label;
  return method;
};
