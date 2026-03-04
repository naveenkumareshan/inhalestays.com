
import React, { useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Banknote, Smartphone, Building2, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentMode {
  value: string;
  label: string;
  icon?: React.ReactNode;
  isCustom?: boolean;
}

interface PaymentMethodSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  partnerId?: string;
  idPrefix?: string;
  columns?: number;
  compact?: boolean;
}

const DEFAULT_MODES: PaymentMode[] = [
  { value: 'cash', label: 'Cash', icon: <Banknote className="h-3 w-3" /> },
  { value: 'upi', label: 'UPI', icon: <Smartphone className="h-3 w-3" /> },
  { value: 'bank_transfer', label: 'Bank', icon: <Building2 className="h-3 w-3" /> },
  { value: 'online', label: 'Online', icon: <CreditCard className="h-3 w-3" /> },
];

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  value,
  onValueChange,
  partnerId,
  idPrefix = 'pm',
  columns = 2,
  compact = false,
}) => {
  const [customModes, setCustomModes] = useState<PaymentMode[]>([]);

  useEffect(() => {
    if (!partnerId) return;
    const fetchCustomModes = async () => {
      const { data } = await supabase
        .from('partner_payment_modes')
        .select('id, label, mode_type')
        .eq('partner_user_id', partnerId)
        .eq('is_active', true)
        .order('display_order');
      if (data) {
        setCustomModes(data.map(m => ({
          value: `custom_${m.id}`,
          label: m.label,
          icon: m.mode_type === 'cash' ? <Banknote className="h-3 w-3" /> :
                m.mode_type === 'upi' ? <Smartphone className="h-3 w-3" /> :
                m.mode_type === 'online' ? <CreditCard className="h-3 w-3" /> :
                <Building2 className="h-3 w-3" />,
          isCustom: true,
        })));
      }
    };
    fetchCustomModes();
  }, [partnerId]);

  const allModes = [...DEFAULT_MODES, ...customModes];
  const fontSize = compact ? 'text-[9px]' : 'text-[10px]';
  const radioSize = compact ? 'h-2.5 w-2.5' : 'h-3 w-3';
  const padding = compact ? 'p-1' : 'p-1.5';

  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      className={`grid grid-cols-${columns} gap-1.5`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {allModes.map(mode => (
        <div key={mode.value} className={`flex items-center gap-1.5 border rounded ${padding} cursor-pointer hover:bg-muted/50`}>
          <RadioGroupItem value={mode.value} id={`${idPrefix}_${mode.value}`} className={radioSize} />
          <Label htmlFor={`${idPrefix}_${mode.value}`} className={`${fontSize} cursor-pointer flex items-center gap-1`}>
            {mode.icon} {mode.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
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
