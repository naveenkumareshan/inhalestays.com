import { supabase } from '@/integrations/supabase/client';

export const whatsappLeadService = {
  /** Toggle WhatsApp chat for a specific property */
  setPropertyWhatsappEnabled: async (propertyType: 'cabin' | 'hostel' | 'mess', propertyId: string, enabled: boolean) => {
    const table = propertyType === 'cabin' ? 'cabins' : propertyType === 'hostel' ? 'hostels' : 'mess_partners';
    const { error } = await supabase
      .from(table)
      .update({ whatsapp_chat_enabled: enabled } as any)
      .eq('id', propertyId);
    return !error;
  },

  /** Get partner's WhatsApp config */
  getPartnerWhatsapp: async (partnerUserId: string) => {
    const { data } = await supabase
      .from('partners')
      .select('whatsapp_number, whatsapp_enabled')
      .eq('user_id', partnerUserId)
      .maybeSingle();
    return data as { whatsapp_number: string | null; whatsapp_enabled: boolean } | null;
  },

  /** Update partner WhatsApp settings */
  updatePartnerWhatsapp: async (partnerUserId: string, whatsappNumber: string, whatsappEnabled: boolean) => {
    const { error } = await supabase
      .from('partners')
      .update({ whatsapp_number: whatsappNumber, whatsapp_enabled: whatsappEnabled } as any)
      .eq('user_id', partnerUserId);
    return !error;
  },

  /** Track a WhatsApp click */
  trackClick: async (partnerUserId: string, propertyType: string, propertyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('whatsapp_clicks' as any).insert({
      partner_user_id: partnerUserId,
      property_type: propertyType,
      property_id: propertyId,
      user_id: user?.id || null,
    } as any);
  },

  /** Get click count for a partner */
  getClickCount: async (partnerUserId: string): Promise<number> => {
    const { count } = await supabase
      .from('whatsapp_clicks' as any)
      .select('*', { count: 'exact', head: true })
      .eq('partner_user_id', partnerUserId);
    return count || 0;
  },

  /** Get all clicks (admin) with optional partner filter */
  getAllClicks: async (partnerUserId?: string) => {
    let query = supabase.from('whatsapp_clicks' as any).select('*').order('created_at', { ascending: false }).limit(500);
    if (partnerUserId) query = query.eq('partner_user_id', partnerUserId);
    const { data } = await query;
    return data || [];
  },
};
