import { supabase } from '@/integrations/supabase/client';

export interface VendorEmployeeData {
  id: string;
  partner_user_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  permissions: string[];
  status: string;
  salary: number;
  employee_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorEmployeeCreateData {
  name: string;
  email: string;
  phone: string;
  role?: string;
  permissions?: string[];
  salary?: number;
  employee_user_id?: string;
}

export interface VendorEmployeeUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  permissions?: string[];
  status?: string;
  salary?: number;
}

export const vendorEmployeeService = {
  getEmployees: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, data: [], error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('vendor_employees')
        .select('*')
        .eq('partner_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error: any) {
      return { success: false, data: [], error: error.message };
    }
  },

  createEmployee: async (employeeData: VendorEmployeeCreateData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const insertData: any = {
        partner_user_id: user.id,
        name: employeeData.name,
        email: employeeData.email,
        phone: employeeData.phone,
        role: employeeData.role || 'staff',
        permissions: employeeData.permissions || [],
        salary: employeeData.salary || 0,
      };
      if (employeeData.employee_user_id) {
        insertData.employee_user_id = employeeData.employee_user_id;
      }

      const { data, error } = await supabase
        .from('vendor_employees')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  updateEmployee: async (id: string, updateData: VendorEmployeeUpdateData) => {
    try {
      const payload: any = {};
      if (updateData.name !== undefined) payload.name = updateData.name;
      if (updateData.email !== undefined) payload.email = updateData.email;
      if (updateData.phone !== undefined) payload.phone = updateData.phone;
      if (updateData.role !== undefined) payload.role = updateData.role;
      if (updateData.permissions !== undefined) payload.permissions = updateData.permissions;
      if (updateData.status !== undefined) payload.status = updateData.status;
      if (updateData.salary !== undefined) payload.salary = updateData.salary;

      const { data, error } = await supabase
        .from('vendor_employees')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  deleteEmployee: async (id: string) => {
    try {
      const { error } = await supabase
        .from('vendor_employees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};
