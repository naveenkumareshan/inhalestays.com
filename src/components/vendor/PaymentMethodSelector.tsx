
import React, { useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Banknote, Smartphone, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentMode {
  value: string;
  label: string;
  icon?: React.ReactNode;
  mode_type: string;
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
  const [modes, setModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!partnerId) return;
    setLoading(true);
    const fetchModes = async () => {
      const { data } = await supabase
        .from('partner_payment_modes')
        .select('id, label, mode_type')
        .eq('partner_user_id', partnerId)
        .eq('is_active', true)
        .neq('mode_type', 'online')
        .order('display_order');
      if (data) {
        setModes(data.map(m => ({
          value: `custom_${m.id}`,
          label: m.label,
          icon: TYPE_ICONS[m.mode_type] || <Building2 className="h-3 w-3" />,
          mode_type: m.mode_type,
        })));
      }
      setLoading(false);
    };
    fetchModes();
  }, [partnerId]);

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
                <Label htmlFor={`${idPrefix}_${mode.value}`} className={`${fontSize} cursor-pointer flex items-center gap-1`}>
                  {mode.icon} {mode.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ))}
    </div>
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
