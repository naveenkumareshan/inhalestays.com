
import { supabase } from '@/integrations/supabase/client';

export interface CouponData {
  id?: string;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  max_discount_amount?: number;
  min_order_amount: number;
  applicable_for: string[];
  scope?: 'global' | 'vendor' | 'user_referral';
  applies_to?: 'fees_only' | 'locker_only' | 'both';
  partner_id?: string;
  is_referral_coupon?: boolean;
  referral_type?: 'user_generated' | 'welcome_bonus' | 'friend_referral';
  generated_by?: string;
  usage_limit?: number | null;
  usage_count?: number;
  user_usage_limit: number;
  used_by?: any[];
  start_date: string;
  end_date: string;
  is_active: boolean;
  first_time_user_only: boolean;
  specific_users?: string[];
  exclude_users?: string[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CouponValidationResponse {
  coupon: {
    id: string;
    code: string;
    name: string;
    type: string;
    value: number;
    scope?: string;
    is_referral_coupon?: boolean;
    applies_to?: string;
  };
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  savings: number;
}

export const couponService = {
  // Admin methods
  getCoupons: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    scope?: string;
    applicableFor?: string;
    isActive?: boolean;
    createdBy?: string;
  }) => {
    try {
      let query = supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (params?.search) {
        query = query.or(`code.ilike.%${params.search}%,name.ilike.%${params.search}%`);
      }
      if (params?.type && params.type !== 'all') {
        query = query.eq('type', params.type);
      }
      if (params?.scope && params.scope !== 'all') {
        query = query.eq('scope', params.scope);
      }
      if (params?.isActive !== undefined) {
        query = query.eq('is_active', params.isActive);
      }
      if (params?.createdBy) {
        query = query.eq('created_by', params.createdBy);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Error fetching coupons:', error);
      return { success: false, message: error.message };
    }
  },

  getCoupon: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching coupon:', error);
      return { success: false, message: error.message };
    }
  },

  createCoupon: async (couponData: Partial<CouponData>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const insertData = {
        code: couponData.code?.toUpperCase(),
        name: couponData.name,
        description: couponData.description || '',
        type: couponData.type,
        value: couponData.value,
        max_discount_amount: couponData.max_discount_amount || 0,
        min_order_amount: couponData.min_order_amount || 0,
        applicable_for: couponData.applicable_for || ['all'],
        scope: couponData.scope || 'global',
        applies_to: couponData.applies_to || 'fees_only',
        partner_id: couponData.partner_id || null,
        is_referral_coupon: couponData.is_referral_coupon || false,
        referral_type: couponData.referral_type || null,
        usage_limit: couponData.usage_limit || null,
        user_usage_limit: couponData.user_usage_limit || 1,
        start_date: couponData.start_date,
        end_date: couponData.end_date,
        is_active: couponData.is_active ?? true,
        first_time_user_only: couponData.first_time_user_only || false,
        specific_users: couponData.specific_users || [],
        exclude_users: couponData.exclude_users || [],
        created_by: userData.user?.id || null,
      };

      const { data, error } = await supabase
        .from('coupons')
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Coupon created successfully' };
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      return { success: false, message: error.message };
    }
  },

  updateCoupon: async (id: string, couponData: Partial<CouponData>) => {
    try {
      const updateData: any = {};
      if (couponData.name !== undefined) updateData.name = couponData.name;
      if (couponData.description !== undefined) updateData.description = couponData.description;
      if (couponData.type !== undefined) updateData.type = couponData.type;
      if (couponData.value !== undefined) updateData.value = couponData.value;
      if (couponData.max_discount_amount !== undefined) updateData.max_discount_amount = couponData.max_discount_amount;
      if (couponData.min_order_amount !== undefined) updateData.min_order_amount = couponData.min_order_amount;
      if (couponData.applicable_for !== undefined) updateData.applicable_for = couponData.applicable_for;
      if (couponData.scope !== undefined) updateData.scope = couponData.scope;
      if (couponData.partner_id !== undefined) updateData.partner_id = couponData.partner_id || null;
      if (couponData.is_referral_coupon !== undefined) updateData.is_referral_coupon = couponData.is_referral_coupon;
      if (couponData.referral_type !== undefined) updateData.referral_type = couponData.referral_type;
      if (couponData.applies_to !== undefined) updateData.applies_to = couponData.applies_to;
      if (couponData.usage_limit !== undefined) updateData.usage_limit = couponData.usage_limit || null;
      if (couponData.user_usage_limit !== undefined) updateData.user_usage_limit = couponData.user_usage_limit;
      if (couponData.start_date !== undefined) updateData.start_date = couponData.start_date;
      if (couponData.end_date !== undefined) updateData.end_date = couponData.end_date;
      if (couponData.is_active !== undefined) updateData.is_active = couponData.is_active;
      if (couponData.first_time_user_only !== undefined) updateData.first_time_user_only = couponData.first_time_user_only;
      if (couponData.specific_users !== undefined) updateData.specific_users = couponData.specific_users;
      if (couponData.exclude_users !== undefined) updateData.exclude_users = couponData.exclude_users;

      const { data, error } = await supabase
        .from('coupons')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Coupon updated successfully' };
    } catch (error: any) {
      console.error('Error updating coupon:', error);
      return { success: false, message: error.message };
    }
  },

  deleteCoupon: async (id: string) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Coupon deleted successfully' };
    } catch (error: any) {
      console.error('Error deleting coupon:', error);
      return { success: false, message: error.message };
    }
  },

  // User methods
  getAvailableCoupons: async (bookingType?: string) => {
    try {
      let query = supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString());

      if (bookingType) {
        query = query.or(`applicable_for.cs.{${bookingType}},applicable_for.cs.{all}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Error fetching available coupons:', error);
      return { success: false, message: error.message };
    }
  },

  validateCoupon: async (code: string, bookingType: string, amount: number, cabinId?: string): Promise<{ success: boolean; data?: CouponValidationResponse; message?: string; error?: any }> => {
    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !coupon) {
        return { success: false, message: 'Invalid or expired coupon code', error: 'Invalid or expired coupon code' };
      }

      const now = new Date();
      if (now < new Date(coupon.start_date) || now > new Date(coupon.end_date)) {
        return { success: false, message: 'Coupon has expired', error: 'Coupon has expired' };
      }

      if (amount < (coupon.min_order_amount || 0)) {
        return { success: false, message: `Minimum order amount is ₹${coupon.min_order_amount}`, error: `Minimum order amount is ₹${coupon.min_order_amount}` };
      }

      const applicableFor = coupon.applicable_for || ['all'];
      if (!applicableFor.includes('all') && !applicableFor.includes(bookingType)) {
        return { success: false, message: 'Coupon not applicable for this booking type', error: 'Coupon not applicable for this booking type' };
      }

      if (coupon.usage_limit && (coupon.usage_count || 0) >= coupon.usage_limit) {
        return { success: false, message: 'Coupon usage limit reached', error: 'Coupon usage limit reached' };
      }

      let discountAmount = 0;
      if (coupon.type === 'percentage') {
        discountAmount = (amount * coupon.value) / 100;
        if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
          discountAmount = coupon.max_discount_amount;
        }
      } else {
        discountAmount = coupon.value;
      }
      discountAmount = Math.min(discountAmount, amount);
      discountAmount = Math.round(discountAmount * 100) / 100;

      return {
        success: true,
        data: {
          coupon: {
            id: coupon.id,
            code: coupon.code,
            name: coupon.name,
            type: coupon.type,
            value: coupon.value,
            scope: coupon.scope,
            is_referral_coupon: coupon.is_referral_coupon,
            applies_to: (coupon as any).applies_to || 'fees_only',
          },
          originalAmount: amount,
          discountAmount,
          finalAmount: amount - discountAmount,
          savings: discountAmount,
        },
        message: 'Coupon applied successfully',
      };
    } catch (error: any) {
      console.error('Error validating coupon:', error);
      return { success: false, message: error.message, error: error.message };
    }
  },

  applyCoupon: async (code: string, bookingId: string, bookingType: string, amount: number) => {
    try {
      const { data: coupon, error: fetchError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (fetchError || !coupon) {
        return { success: false, message: 'Coupon not found' };
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const usedBy = (coupon.used_by as any[]) || [];
      usedBy.push({
        userId,
        usageCount: 1,
        usedAt: new Date().toISOString(),
        bookingId,
      });

      const { error: updateError } = await supabase
        .from('coupons')
        .update({
          usage_count: (coupon.usage_count || 0) + 1,
          used_by: usedBy,
        } as any)
        .eq('id', coupon.id);

      if (updateError) throw updateError;

      return { success: true, message: 'Coupon applied successfully' };
    } catch (error: any) {
      console.error('Error applying coupon:', error);
      return { success: false, message: error.message };
    }
  },

  generateReferralCoupon: async (type: 'user_generated' | 'welcome_bonus' | 'friend_referral' = 'user_generated') => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return { success: false, message: 'Not authenticated' };

      const code = `REF${userId.substring(0, 6).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from('coupons')
        .insert({
          code,
          name: `Referral - ${type}`,
          type: 'percentage',
          value: 10,
          applicable_for: ['all'],
          scope: 'user_referral',
          is_referral_coupon: true,
          referral_type: type,
          generated_by: userId,
          usage_limit: 1,
          user_usage_limit: 1,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          created_by: userId,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Referral coupon generated' };
    } catch (error: any) {
      console.error('Error generating referral coupon:', error);
      return { success: false, message: error.message };
    }
  },
};
