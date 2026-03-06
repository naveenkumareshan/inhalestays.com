import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, FileMinus, FilePlus, Trash2, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ShareButton } from '@/components/ShareButton';
import { getImageUrl } from '@/lib/utils';

interface MessItemProps {
  mess: any;
  onEdit: (mess: any) => void;
  onDelete: (messId: string) => void;
  onManagePackages: (mess: any) => void;
  onToggleActive?: (messId: string, isActive: boolean) => void;
  onToggleBooking?: (messId: string, isBookingActive: boolean) => void;
}

const FOOD_BADGES: Record<string, { label: string; cls: string }> = {
  veg: { label: '🟢 Veg', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  non_veg: { label: '🔴 Non-Veg', cls: 'bg-red-50 text-red-700 border border-red-200' },
  both: { label: '🟡 Both', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
};

export function MessItem({ mess, onEdit, onDelete, onManagePackages, onToggleActive, onToggleBooking }: MessItemProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const badge = FOOD_BADGES[mess.food_type] || FOOD_BADGES.both;
  const mainImage = mess.logo_image || (mess.images && mess.images[0]) || '/placeholder.svg';

  return (
    <Card className="group h-full flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md rounded-xl border border-border/60">
      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Image */}
        <div className="relative overflow-hidden">
          <div className="aspect-video w-full overflow-hidden bg-muted">
            <img
              src={getImageUrl(mainImage)}
              alt={mess.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200" />
          </div>
          <span className={`absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
            {badge.label}
          </span>
          {mess.is_active === false && (
            <span className="absolute top-2 left-2 bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-xs font-medium">
              Inactive
            </span>
          )}
          {!mess.is_approved && (
            <span className="absolute bottom-2 left-2 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-medium">
              Pending Approval
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col gap-2.5">
          {/* Meta row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {mess.serial_number && (
              <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs font-mono">
                #{mess.serial_number}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${!mess.is_booking_active ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
              {!mess.is_booking_active ? "● Booking Off" : "● Booking On"}
            </span>
          </div>

          <h3 className="font-semibold text-sm leading-snug text-foreground">{mess.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{mess.location}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{mess.description}</p>

          {mess.capacity && (
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-xs text-muted-foreground">Capacity: {mess.capacity}</span>
            </div>
          )}

          {/* Actions */}
          <div className="border-t pt-3 mt-0.5 flex flex-wrap gap-1.5 items-center">
            <ShareButton
              title={mess.name}
              text={`Check out ${mess.name} - ${badge.label} mess at ${mess.location}`}
              url={`${window.location.origin}/mess`}
              className="h-7 w-7 rounded-full bg-muted text-muted-foreground hover:bg-accent"
            />
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(mess)}>
              <Edit className="h-3 w-3 mr-1" />Edit
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onManagePackages(mess)}>
              <Package className="h-3 w-3 mr-1" />Packages
            </Button>
            {onToggleActive && (
              <Button
                size="sm"
                variant="outline"
                className={`h-7 px-2 text-xs ${mess.is_active ? "text-red-600 border-red-200 hover:bg-red-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}`}
                onClick={() => onToggleActive(mess.id, !mess.is_active)}
              >
                {mess.is_active ? <><FileMinus className="h-3 w-3 mr-1" />Deactivate</> : <><FilePlus className="h-3 w-3 mr-1" />Activate</>}
              </Button>
            )}
            {onToggleBooking && (
              <Button
                size="sm"
                variant="outline"
                disabled={!mess.is_active}
                className={`h-7 px-2 text-xs ${!mess.is_booking_active ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50" : "text-orange-600 border-orange-200 hover:bg-orange-50"}`}
                onClick={() => onToggleBooking(mess.id, !mess.is_booking_active)}
              >
                {!mess.is_booking_active ? "▶ Enable" : "⏸ Pause"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
