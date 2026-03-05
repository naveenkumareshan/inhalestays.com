import { supabase } from '@/integrations/supabase/client';

const DEFAULT_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  online: 'Online',
};

/**
 * Resolves custom_<uuid> payment method values to human-readable labels
 * by querying the partner_payment_modes table.
 */
export const resolvePaymentMethodLabels = async (
  methods: string[]
): Promise<Record<string, string>> => {
  const customIds = methods
    .filter((m) => m?.startsWith('custom_'))
    .map((m) => m.replace('custom_', ''));
  if (customIds.length === 0) return {};
  const { data } = await supabase
    .from('partner_payment_modes')
    .select('id, label')
    .in('id', customIds);
  const map: Record<string, string> = {};
  data?.forEach((m) => {
    map[`custom_${m.id}`] = m.label;
  });
  return map;
};

/**
 * Returns a display label for a payment method, checking defaults first,
 * then the resolved custom labels map.
 */
export const getMethodLabel = (
  method: string,
  customLabels?: Record<string, string>
): string => {
  if (DEFAULT_LABELS[method]) return DEFAULT_LABELS[method];
  if (customLabels?.[method]) return customLabels[method];
  return method;
};
