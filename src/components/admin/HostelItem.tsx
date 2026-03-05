
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, FileMinus, FilePlus, Trash2, Bed, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ShareButton } from '@/components/ShareButton';
import { generateHostelShareText } from '@/utils/shareUtils';

interface HostelItemProps {
  hostel: any;
  onEdit: (hostel: any) => void;
  onDelete: (hostelId: string) => void;
  onManageBeds: (hostelId: string) => void;
  onManagePackages: (hostel: any) => void;
  onToggleActive?: (hostelId: string, isActive: boolean) => void;
  onToggleBooking?: (hostelId: string, isBookingActive: boolean) => void;
}

export function HostelItem({ hostel, onEdit, onDelete, onManageBeds, onManagePackages, onToggleActive, onToggleBooking }: HostelItemProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const getGenderBadgeStyle = (gender: string) => {
    switch (gender) {
      case 'Male': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Female': return 'bg-pink-50 text-pink-700 border border-pink-200';
      case 'Co-ed': return 'bg-purple-50 text-purple-700 border border-purple-200';
      default: return 'bg-muted text-muted-foreground border border-border';
    }
  };

  return (
    <Card className="group h-full flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md rounded-xl border border-border/60">
      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Image */}
        <div className="relative overflow-hidden">
          <div className="aspect-video w-full overflow-hidden bg-muted">
            <img
              src={hostel.logo_image || hostel.images?.[0] || '/placeholder.svg'}
              alt={hostel.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200" />
          </div>
          <span className={`absolute top-2 right-2 capitalize text-xs font-medium px-2 py-0.5 rounded-full ${getGenderBadgeStyle(hostel.gender)}`}>
            {hostel.gender}
          </span>
          {hostel.is_active === false && (
            <span className="absolute top-2 left-2 bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-xs font-medium">
              Inactive
            </span>
          )}
          {!hostel.is_approved && (
            <span className="absolute bottom-2 left-2 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-medium">
              Pending Approval
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col gap-2.5">
          {/* Meta row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {hostel.serial_number && (
              <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs font-mono">
                #{hostel.serial_number}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${!hostel.is_booking_active ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
              {!hostel.is_booking_active ? "● Booking Off" : "● Booking On"}
            </span>
          </div>

          <h3 className="font-semibold text-sm leading-snug text-foreground">{hostel.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {hostel.locality || hostel.location || `${hostel.cities?.name || ''}, ${hostel.states?.name || ''}`}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{hostel.description}</p>

          {/* Stay type, price & deposit */}
          <div className="flex justify-between items-center pt-0.5">
            <span className="text-xs text-muted-foreground">{hostel.stay_type}</span>
            <div className="flex items-center gap-2">
              {hostel.starting_price > 0 && (
                <span className="font-bold text-sm text-foreground">₹{hostel.starting_price}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
              )}
              {hostel.security_deposit > 0 && (
                <span className="text-xs text-muted-foreground">₹{hostel.security_deposit} deposit</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t pt-3 mt-0.5 flex flex-wrap gap-1.5 items-center">
            {(() => {
              const shareData = generateHostelShareText({
                id: hostel.id,
                name: hostel.name,
                gender: hostel.gender,
                stay_type: hostel.stay_type,
                food_enabled: hostel.food_enabled,
                food_policy_type: hostel.food_policy_type,
                location: hostel.locality || hostel.location,
                serial_number: hostel.serial_number,
              }, undefined, user?.id);
              return (
                <ShareButton
                  title={shareData.title}
                  text={shareData.text}
                  url={shareData.url}
                  className="h-7 w-7 rounded-full bg-muted text-muted-foreground hover:bg-accent"
                />
              );
            })()}
            {isAdmin && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(hostel)}>
                <Edit className="h-3 w-3 mr-1" />Edit
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" className="h-7 px-2 text-xs" onClick={() => navigate(`/admin/hostels/${hostel.serial_number || hostel.id}/beds`)}>
                <Bed className="h-3 w-3 mr-1" />Beds
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onManagePackages(hostel)}>
                <Package className="h-3 w-3 mr-1" />Packages
              </Button>
            )}
            {isAdmin && onToggleActive && (
              <Button
                size="sm"
                variant="outline"
                className={`h-7 px-2 text-xs ${hostel.is_active ? "text-red-600 border-red-200 hover:bg-red-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}`}
                onClick={() => onToggleActive(hostel.id, !hostel.is_active)}
              >
                {hostel.is_active ? <><FileMinus className="h-3 w-3 mr-1" />Deactivate</> : <><FilePlus className="h-3 w-3 mr-1" />Activate</>}
              </Button>
            )}
            {onToggleBooking && (
              <Button
                size="sm"
                variant="outline"
                disabled={!hostel.is_active}
                className={`h-7 px-2 text-xs ${!hostel.is_booking_active ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50" : "text-orange-600 border-orange-200 hover:bg-orange-50"}`}
                onClick={() => onToggleBooking(hostel.id, !hostel.is_booking_active)}
              >
                {!hostel.is_booking_active ? "▶ Enable" : "⏸ Pause"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
