
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';

interface SeatManagementLinkProps {
  cabinId: string | number;
  serialNumber?: string | null;
  isAdmin?: boolean;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
}

export function SeatManagementLink({ 
  cabinId, 
  serialNumber,
  isAdmin = false,
  variant = 'default',
  size = 'default'
}: SeatManagementLinkProps) {
  const identifier = serialNumber || cabinId;
  const path = isAdmin ? `/admin/rooms/${identifier}/seats` : `/seat-management/${identifier}/seats`;
  
  return (
    <Button 
      variant={variant} 
      size={size} 
      asChild
      className="flex items-center gap-1"
    >
      <Link to={path}>
        <Building2 className="h-4 w-4" />
        <span>Manage Seats</span>
      </Link>
    </Button>
  );
}
