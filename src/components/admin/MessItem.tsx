import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, FileMinus, FilePlus, Package, Eye, EyeOff, Globe, GlobeLock, Eye as EyeView, QrCode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ShareButton } from '@/components/ShareButton';
import { getImageUrl } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MessItemProps {
  mess: any;
  onEdit: (mess: any) => void;
  onDelete: (messId: string) => void;
  onManagePackages: (mess: any) => void;
  onToggleActive?: (messId: string, isActive: boolean) => void;
  onToggleBooking?: (messId: string, isBookingActive: boolean) => void;
  onTogglePartnerVisible?: (messId: string, isVisible: boolean) => void;
  onToggleStudentVisible?: (messId: string, isVisible: boolean) => void;
  onDownloadQr?: (mess: any) => void;
  linkedHostels?: { hostel_id: string; hostel_name: string; is_default: boolean }[];
}

const FOOD_BADGES: Record<string, { label: string; cls: string }> = {
  veg: { label: '🟢 Veg', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  non_veg: { label: '🔴 Non-Veg', cls: 'bg-red-50 text-red-700 border border-red-200' },
  both: { label: '🟡 Both', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
};

export function MessItem({ mess, onEdit, onDelete, onManagePackages, onToggleActive, onToggleBooking, onTogglePartnerVisible, onToggleStudentVisible, onDownloadQr, linkedHostels }: MessItemProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const badge = FOOD_BADGES[mess.food_type] || FOOD_BADGES.both;
  const mainImage = mess.logo_image || (mess.images && mess.images[0]) || '/placeholder.svg';
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    const fetchViewCount = async () => {
      const { count } = await supabase
        .from('property_views' as any)
        .select('*', { count: 'exact', head: true })
        .eq('property_id', mess.id);
      setViewCount(count || 0);
    };
    fetchViewCount();
  }, [mess.id]);

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
          {viewCount > 0 && (
            <span className="absolute top-2 left-12 bg-background/90 text-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-border/60">
              <EyeView className="h-2.5 w-2.5" />{viewCount}
            </span>
          )}
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
        <div className="p-3 flex-1 flex flex-col gap-2">
          {/* Meta row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {mess.serial_number && (
              <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs font-mono">
                #{mess.serial_number}
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${!mess.is_booking_active ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
              {!mess.is_booking_active ? "● Online Off" : "● Online On"}
            </span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${mess.is_partner_visible === false ? "bg-muted text-muted-foreground border border-border" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
              {mess.is_partner_visible === false ? "● Emp Hidden" : "● Emp Visible"}
            </span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${mess.is_student_visible === false ? "bg-orange-50 text-orange-700 border border-orange-200" : "bg-teal-50 text-teal-700 border border-teal-200"}`}>
              {mess.is_student_visible === false ? "● Student Hidden" : "● Student Visible"}
            </span>
            {linkedHostels && linkedHostels.length > 0 && linkedHostels.map(lh => (
              <span key={lh.hostel_id} className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                🏨 {lh.hostel_name}{lh.is_default ? ' ★' : ''}
              </span>
            ))}
          </div>

          <h3 className="font-semibold text-sm leading-snug text-foreground">{mess.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{mess.location}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{mess.description}</p>

          {mess.capacity && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Capacity: {mess.capacity}</span>
            </div>
          )}

          {/* Actions */}
          <TooltipProvider delayDuration={300}>
            <div className="border-t pt-2 mt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <ShareButton
                  title={mess.name}
                  text={`Check out ${mess.name} - ${badge.label} mess at ${mess.location}`}
                  url={`${window.location.origin}/mess`}
                  className="h-7 w-7 rounded-full bg-muted text-muted-foreground hover:bg-accent"
                />
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(mess)}>
                  <Edit className="h-3 w-3 mr-1" />Edit
                </Button>
                {onDownloadQr && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onDownloadQr(mess)}>
                        <QrCode className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download QR</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onManagePackages(mess)}>
                      <Package className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Packages</TooltipContent>
                </Tooltip>
                {onToggleActive && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className={`h-7 w-7 ${mess.is_active ? "text-red-600 border-red-200 hover:bg-red-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}`}
                        onClick={() => onToggleActive(mess.id, !mess.is_active)}
                      >
                        {mess.is_active ? <FileMinus className="h-3.5 w-3.5" /> : <FilePlus className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{mess.is_active ? 'Deactivate' : 'Activate'}</TooltipContent>
                  </Tooltip>
                )}
                {onToggleBooking && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={!mess.is_active}
                        className={`h-7 w-7 ${!mess.is_booking_active ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50" : "text-orange-600 border-orange-200 hover:bg-orange-50"}`}
                        onClick={() => onToggleBooking(mess.id, !mess.is_booking_active)}
                      >
                        {!mess.is_booking_active ? <Globe className="h-3.5 w-3.5" /> : <GlobeLock className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{!mess.is_booking_active ? 'Turn Online On' : 'Turn Online Off'}</TooltipContent>
                  </Tooltip>
                )}
                {onTogglePartnerVisible && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={!mess.is_active}
                        className={`h-7 w-7 ${mess.is_partner_visible === false ? "text-blue-600 border-blue-200 hover:bg-blue-50" : "text-muted-foreground border-border hover:bg-muted"}`}
                        onClick={() => onTogglePartnerVisible(mess.id, !(mess.is_partner_visible !== false))}
                      >
                        {mess.is_partner_visible === false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{mess.is_partner_visible === false ? 'Show to Employees' : 'Hide from Employees'}</TooltipContent>
                  </Tooltip>
                )}
                {onToggleStudentVisible && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={!mess.is_active}
                        className={`h-7 w-7 ${mess.is_student_visible === false ? "text-teal-600 border-teal-200 hover:bg-teal-50" : "text-orange-600 border-orange-200 hover:bg-orange-50"}`}
                        onClick={() => onToggleStudentVisible(mess.id, !(mess.is_student_visible !== false))}
                      >
                        {mess.is_student_visible === false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{mess.is_student_visible === false ? 'Show to Students' : 'Hide from Students'}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
