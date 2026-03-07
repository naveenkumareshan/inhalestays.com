
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface PartnerEmployeePermissions {
  view_dashboard: boolean;
  manage_dashboard: boolean;
  view_operations: boolean;
  manage_operations: boolean;
  // Reading Rooms
  seats_available_map: boolean;
  seats_available_edit: boolean;
  view_due_management: boolean;
  manage_due_management: boolean;
  view_bookings: boolean;
  manage_bookings: boolean;
  view_receipts: boolean;
  manage_receipts: boolean;
  view_key_deposits: boolean;
  manage_key_deposits: boolean;
  view_reading_rooms: boolean;
  manage_reading_rooms: boolean;
  view_reviews: boolean;
  manage_reviews: boolean;
  // Hostels
  view_bed_map: boolean;
  manage_bed_map: boolean;
  view_hostel_due_management: boolean;
  manage_hostel_due_management: boolean;
  view_hostel_bookings: boolean;
  manage_hostel_bookings: boolean;
  view_hostel_receipts: boolean;
  manage_hostel_receipts: boolean;
  view_hostel_deposits: boolean;
  manage_hostel_deposits: boolean;
  // Manage Properties & Reviews
  view_manage_properties: boolean;
  manage_manage_properties: boolean;
  // Users
  view_students: boolean;
  manage_students: boolean;
  view_coupons: boolean;
  manage_coupons: boolean;
  // Management
  view_employees: boolean;
  manage_employees: boolean;
  view_reports: boolean;
  manage_reports: boolean;
  view_payouts: boolean;
  manage_payouts: boolean;
  view_complaints: boolean;
  manage_complaints: boolean;
  // Legacy compat
  view_customers: boolean;
  manage_customers: boolean;
  // Granular Reading Room Actions
  can_create_booking: boolean;
  can_renew_booking: boolean;
  can_book_future: boolean;
  can_cancel_booking: boolean;
  can_release_booking: boolean;
  can_transfer_booking: boolean;
  can_edit_booking_dates: boolean;
  can_block_seat: boolean;
  can_edit_price: boolean;
  // Granular Hostel Actions
  can_hostel_create_booking: boolean;
  can_hostel_cancel_booking: boolean;
  can_hostel_release_booking: boolean;
  can_hostel_transfer_booking: boolean;
}

const ALL_PERMISSION_KEYS: (keyof PartnerEmployeePermissions)[] = [
  'view_dashboard', 'manage_dashboard',
  'view_operations', 'manage_operations',
  'seats_available_map', 'seats_available_edit',
  'view_due_management', 'manage_due_management',
  'view_bookings', 'manage_bookings',
  'view_receipts', 'manage_receipts',
  'view_key_deposits', 'manage_key_deposits',
  'view_reading_rooms', 'manage_reading_rooms',
  'view_reviews', 'manage_reviews',
  'view_bed_map', 'manage_bed_map',
  'view_hostel_due_management', 'manage_hostel_due_management',
  'view_hostel_bookings', 'manage_hostel_bookings',
  'view_hostel_receipts', 'manage_hostel_receipts',
  'view_hostel_deposits', 'manage_hostel_deposits',
  'view_manage_properties', 'manage_manage_properties',
  'view_students', 'manage_students',
  'view_coupons', 'manage_coupons',
  'view_employees', 'manage_employees',
  'view_reports', 'manage_reports',
  'view_payouts', 'manage_payouts',
  'view_complaints', 'manage_complaints',
  'view_customers', 'manage_customers',
  // Granular actions
  'can_create_booking', 'can_renew_booking', 'can_book_future',
  'can_cancel_booking', 'can_release_booking', 'can_transfer_booking',
  'can_edit_booking_dates', 'can_block_seat', 'can_edit_price',
  'can_hostel_create_booking', 'can_hostel_cancel_booking',
  'can_hostel_release_booking', 'can_hostel_transfer_booking',
];

function buildAllTrue(): PartnerEmployeePermissions {
  const perms: any = {};
  ALL_PERMISSION_KEYS.forEach(k => perms[k] = true);
  return perms;
}

function buildAllFalse(): PartnerEmployeePermissions {
  const perms: any = {};
  ALL_PERMISSION_KEYS.forEach(k => perms[k] = false);
  return perms;
}

export const usePartnerEmployeePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<PartnerEmployeePermissions>(buildAllFalse());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (user?.role === 'vendor_employee') {
        try {
          const perms = buildAllFalse();
          const userPerms = user?.permissions || [];
          ALL_PERMISSION_KEYS.forEach(key => {
            if (userPerms.includes(key)) {
              (perms as any)[key] = true;
            }
          });
          setPermissions(perms);
        } catch (error) {
          console.error('Error fetching permissions:', error);
        }
      } else if (user?.role === 'vendor') {
        setPermissions(buildAllTrue());
      }
      
      setLoading(false);
    };

    fetchPermissions();
  }, [user]);

  const hasPermission = (permission: keyof PartnerEmployeePermissions): boolean => {
    return permissions[permission] || false;
  };

  const hasAnyPermission = (permissionList: (keyof PartnerEmployeePermissions)[]): boolean => {
    return permissionList.some(permission => hasPermission(permission));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    loading
  };
};

/** @deprecated Use usePartnerEmployeePermissions instead */
export const useVendorEmployeePermissions = usePartnerEmployeePermissions;

/** @deprecated Use PartnerEmployeePermissions instead */
export type VendorEmployeePermissions = PartnerEmployeePermissions;
