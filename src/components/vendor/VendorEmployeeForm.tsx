import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { vendorEmployeeService, VendorEmployeeData } from '@/api/vendorEmployeeService';
import { supabase } from '@/integrations/supabase/client';

interface VendorEmployeeFormProps {
  employee?: VendorEmployeeData;
  onSubmit: () => void;
  onCancel: () => void;
}

interface PermissionModule {
  label: string;
  viewKey: string;
  editKey: string;
}

interface ActionPermission {
  label: string;
  key: string;
}

interface PermissionGroup {
  group: string;
  modules?: PermissionModule[];
  actions?: ActionPermission[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: 'General',
    modules: [
      { label: 'Dashboard', viewKey: 'view_dashboard', editKey: 'manage_dashboard' },
      { label: 'Operations', viewKey: 'view_operations', editKey: 'manage_operations' },
    ]
  },
  {
    group: 'Reading Rooms',
    modules: [
      { label: 'Seat Map', viewKey: 'seats_available_map', editKey: 'seats_available_edit' },
      { label: 'Due Management', viewKey: 'view_due_management', editKey: 'manage_due_management' },
      { label: 'Bookings', viewKey: 'view_bookings', editKey: 'manage_bookings' },
      { label: 'Receipts', viewKey: 'view_receipts', editKey: 'manage_receipts' },
      { label: 'Key Deposits', viewKey: 'view_key_deposits', editKey: 'manage_key_deposits' },
      { label: 'Manage Rooms', viewKey: 'view_reading_rooms', editKey: 'manage_reading_rooms' },
    ]
  },
  {
    group: 'Reading Room Actions',
    actions: [
      { label: 'Create Booking', key: 'can_create_booking' },
      { label: 'Renew Booking', key: 'can_renew_booking' },
      { label: 'Book Future', key: 'can_book_future' },
      { label: 'Cancel Booking', key: 'can_cancel_booking' },
      { label: 'Release Booking', key: 'can_release_booking' },
      { label: 'Transfer Booking', key: 'can_transfer_booking' },
      { label: 'Edit Booking Dates', key: 'can_edit_booking_dates' },
      { label: 'Block/Unblock Seat', key: 'can_block_seat' },
      { label: 'Edit Seat Price', key: 'can_edit_price' },
    ]
  },
  {
    group: 'Hostels',
    modules: [
      { label: 'Bed Map', viewKey: 'view_bed_map', editKey: 'manage_bed_map' },
      { label: 'Hostel Due Management', viewKey: 'view_hostel_due_management', editKey: 'manage_hostel_due_management' },
      { label: 'Hostel Bookings', viewKey: 'view_hostel_bookings', editKey: 'manage_hostel_bookings' },
      { label: 'Hostel Receipts', viewKey: 'view_hostel_receipts', editKey: 'manage_hostel_receipts' },
      { label: 'Hostel Deposits', viewKey: 'view_hostel_deposits', editKey: 'manage_hostel_deposits' },
    ]
  },
  {
    group: 'Hostel Actions',
    actions: [
      { label: 'Create Hostel Booking', key: 'can_hostel_create_booking' },
      { label: 'Cancel Hostel Booking', key: 'can_hostel_cancel_booking' },
      { label: 'Release Hostel Booking', key: 'can_hostel_release_booking' },
      { label: 'Transfer Hostel Booking', key: 'can_hostel_transfer_booking' },
    ]
  },
  {
    group: 'Properties & Reviews',
    modules: [
      { label: 'Manage Properties', viewKey: 'view_manage_properties', editKey: 'manage_manage_properties' },
      { label: 'Reviews', viewKey: 'view_reviews', editKey: 'manage_reviews' },
    ]
  },
  {
    group: 'Users & Coupons',
    modules: [
      { label: 'Users / Students', viewKey: 'view_students', editKey: 'manage_students' },
      { label: 'Coupons', viewKey: 'view_coupons', editKey: 'manage_coupons' },
    ]
  },
  {
    group: 'Management',
    modules: [
      { label: 'Employees', viewKey: 'view_employees', editKey: 'manage_employees' },
      { label: 'Reports', viewKey: 'view_reports', editKey: 'manage_reports' },
      { label: 'Payouts', viewKey: 'view_payouts', editKey: 'manage_payouts' },
      { label: 'Complaints', viewKey: 'view_complaints', editKey: 'manage_complaints' },
    ]
  },
];

export const VendorEmployeeForm: React.FC<VendorEmployeeFormProps> = ({
  employee,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    password: '',
    role: employee?.role || 'staff',
    permissions: employee?.permissions || [] as string[],
    salary: employee?.salary || 0,
    status: employee?.status || 'active',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isEditing = !!employee;

  const handlePermissionChange = (permissionId: string) => {
    const updated = formData.permissions.includes(permissionId)
      ? formData.permissions.filter(p => p !== permissionId)
      : [...formData.permissions, permissionId];
    setFormData(prev => ({ ...prev, permissions: updated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (!isEditing && !formData.password) {
      toast({ title: "Error", description: "Password is required for new employees", variant: "destructive" });
      return;
    }
    if (!isEditing && formData.password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        const res = await vendorEmployeeService.updateEmployee(employee.id, formData);
        if (res.success) {
          toast({ title: "Success", description: "Employee updated successfully" });
          onSubmit();
        } else {
          throw new Error(res.error);
        }
      } else {
        // Step 1: Create auth user via edge function
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          'partner-create-employee',
          {
            body: {
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              password: formData.password,
            },
          }
        );

        if (fnError) throw new Error(fnError.message || 'Failed to create employee account');
        if (fnData?.error) throw new Error(fnData.error);

        const employeeUserId = fnData?.userId;
        if (!employeeUserId) throw new Error('No user ID returned from account creation');

        // Step 2: Insert into vendor_employees with the auth user link
        const res = await vendorEmployeeService.createEmployee({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          permissions: formData.permissions,
          salary: formData.salary,
          employee_user_id: employeeUserId,
        });

        if (res.success) {
          toast({ title: "Success", description: "Employee added successfully. They can now log in with the provided credentials." });
          onSubmit();
        } else {
          throw new Error(res.error);
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to save employee", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  let rowIndex = 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm">{isEditing ? 'Edit Employee' : 'Add New Employee'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Full Name *</Label>
              <Input className="h-8 text-xs" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required />
            </div>
            <div>
              <Label className="text-xs">Email *</Label>
              <Input className="h-8 text-xs" type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} required disabled={isEditing} />
            </div>
            <div>
              <Label className="text-xs">Phone *</Label>
              <Input className="h-8 text-xs" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} required />
            </div>
            {!isEditing && (
              <div>
                <Label className="text-xs">Password *</Label>
                <Input className="h-8 text-xs" type="password" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} required minLength={6} placeholder="Min 6 characters" />
              </div>
            )}
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData(prev => ({ ...prev, role: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff" className="text-xs">Staff</SelectItem>
                  <SelectItem value="manager" className="text-xs">Manager</SelectItem>
                  <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Monthly Salary (₹)</Label>
              <Input className="h-8 text-xs" type="number" min="0" value={formData.salary} onChange={(e) => setFormData(prev => ({ ...prev, salary: parseInt(e.target.value) || 0 }))} />
            </div>
            {isEditing && (
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-xs">Active</SelectItem>
                    <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-medium">Sidebar Permissions</Label>
            <p className="text-[10px] text-muted-foreground mb-2">Select View and/or Edit access for each module</p>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="text-left py-1.5 px-3 font-medium text-[10px] uppercase tracking-wider">Module</th>
                    <th className="text-center py-1.5 px-3 font-medium text-[10px] uppercase tracking-wider w-20">View</th>
                    <th className="text-center py-1.5 px-3 font-medium text-[10px] uppercase tracking-wider w-20">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_GROUPS.map((group) => (
                    <React.Fragment key={group.group}>
                      <tr className="bg-muted/60">
                        <td colSpan={3} className="py-1 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {group.group}
                        </td>
                      </tr>
                      {/* Module-level view/edit permissions */}
                      {group.modules?.map((mod) => {
                        const idx = rowIndex++;
                        return (
                          <tr key={mod.label} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                            <td className="py-1.5 px-3 text-[11px] font-medium">{mod.label}</td>
                            <td className="py-1.5 px-3 text-center">
                              <Checkbox
                                id={mod.viewKey}
                                checked={formData.permissions.includes(mod.viewKey)}
                                onCheckedChange={() => handlePermissionChange(mod.viewKey)}
                              />
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              <Checkbox
                                id={mod.editKey}
                                checked={formData.permissions.includes(mod.editKey)}
                                onCheckedChange={() => handlePermissionChange(mod.editKey)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                      {/* Action-level single toggle permissions */}
                      {group.actions?.map((action) => {
                        const idx = rowIndex++;
                        return (
                          <tr key={action.key} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                            <td className="py-1.5 px-3 text-[11px] font-medium" colSpan={2}>{action.label}</td>
                            <td className="py-1.5 px-3 text-center">
                              <Checkbox
                                id={action.key}
                                checked={formData.permissions.includes(action.key)}
                                onCheckedChange={() => handlePermissionChange(action.key)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
            <Button type="submit" size="sm" className="h-7 text-xs" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update Employee" : "Add Employee"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
