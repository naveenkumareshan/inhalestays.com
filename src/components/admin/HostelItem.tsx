
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, FileMinus, FilePlus, Bed, Package, MessageCircle, CreditCard, Eye, EyeOff, Globe, GlobeLock, QrCode, Eye as EyeView } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ShareButton } from '@/components/ShareButton';
import { generateHostelShareText } from '@/utils/shareUtils';
import { WhatsAppPropertyDialog } from './WhatsAppPropertyDialog';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { PropertySubscribeDialog } from './PropertySubscribeDialog';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HostelItemProps {
  hostel: any;
  onEdit: (hostel: any) => void;
  onDelete: (hostelId: string) => void;
  onManageBeds: (hostelId: string) => void;
  onManagePackages: (hostel: any) => void;
  onToggleActive?: (hostelId: string, isActive: boolean) => void;
  onToggleBooking?: (hostelId: string, isBookingActive: boolean) => void;
  onTogglePartnerVisible?: (hostelId: string, isVisible: boolean) => void;
  partnerId?: string;
  onDownloadQr?: (hostelId: string, hostelName: string) => void;
}

export function HostelItem({ hostel, onEdit, onDelete, onManageBeds, onManagePackages, onToggleActive, onToggleBooking, onTogglePartnerVisible, partnerId, onDownloadQr }: HostelItemProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [waClickCount, setWaClickCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const { hasSubscription, daysRemaining, isExpired, isInTrial, trialDaysRemaining, currentPlan } = useSubscriptionAccess(hostel.id, 'hostel', partnerId);

  useEffect(() => {
    const fetchCounts = async () => {
      const [waResult, viewResult] = await Promise.all([
        supabase.from('whatsapp_clicks' as any).select('*', { count: 'exact', head: true }).eq('property_id', hostel.id),
        supabase.from('property_views' as any).select('*', { count: 'exact', head: true }).eq('property_id', hostel.id),
      ]);
      setWaClickCount(waResult.count || 0);
      setViewCount(viewResult.count || 0);
    };
    fetchCounts();
  }, [hostel.id]);

  const renderSubscriptionBadge = () => {
    if (isAdmin) return null;
    if (hasSubscription && currentPlan) {
      return (
        <Badge variant="outline" className="gap-1 text-[10px] border-primary/50 text-primary">
          <ShieldCheck className="h-2.5 w-2.5" />
          {currentPlan.name} ({daysRemaining}d)
        </Badge>
      );
    }
    if (isInTrial) {
      return (
        <Badge variant="outline" className="gap-1 text-[10px] border-amber-500 text-amber-600">
          <Clock className="h-2.5 w-2.5" />
          Trial ({trialDaysRemaining}d left)
        </Badge>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="gap-1 text-[10px] border-muted-foreground/50 text-muted-foreground">
          <AlertTriangle className="h-2.5 w-2.5" />
          No Plan
        </Badge>
        <Button size="sm" variant="outline" className="h-5 px-1.5 text-[10px] border-primary/50 text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); setSubDialogOpen(true); }}>
          <CreditCard className="h-2.5 w-2.5 mr-0.5" />Subscribe
        </Button>
      </div>
    );
  };

  const getGenderBadgeStyle = (gender: string) => {
    switch (gender) {
      case 'Male': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Female': return 'bg-pink-50 text-pink-700 border border-pink-200';
      case 'Co-ed': return 'bg-purple-50 text-purple-700 border border-purple-200';
      default: return 'bg-muted text-muted-foreground border border-border';
    }
  };

  return (
    <>
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
            {viewCount > 0 && (
              <span className="absolute top-2 left-12 bg-background/90 text-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-border/60">
                <EyeView className="h-2.5 w-2.5" />{viewCount}
              </span>
            )}
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
          <div className="p-3 flex-1 flex flex-col gap-2">
            {/* Meta row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {renderSubscriptionBadge()}
              {hostel.serial_number && (
                <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs font-mono">
                  #{hostel.serial_number}
                </span>
              )}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${!hostel.is_booking_active ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                {!hostel.is_booking_active ? "● Online Off" : "● Online On"}
              </span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${hostel.is_partner_visible === false ? "bg-muted text-muted-foreground border border-border" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                {hostel.is_partner_visible === false ? "● Emp Hidden" : "● Emp Visible"}
              </span>
            </div>

            <h3 className="font-semibold text-sm leading-snug text-foreground">{hostel.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {hostel.locality || hostel.location || `${hostel.cities?.name || ''}, ${hostel.states?.name || ''}`}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{hostel.description}</p>

            {/* Stay type, price & deposit */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{hostel.stay_type}</span>
              <div className="flex items-center gap-2">
                {hostel.starting_price > 0 && (
                  <span className="font-bold text-sm text-foreground">₹{hostel.starting_price}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
                )}
                {hostel.security_deposit > 0 && (
                  <span className="text-xs text-muted-foreground">₹{hostel.security_deposit} dep</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <TooltipProvider delayDuration={300}>
              <div className="border-t pt-2 mt-0.5 space-y-1.5">
                {/* Row 1: Primary actions + QR */}
                <div className="flex items-center gap-1.5">
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
                  {onDownloadQr && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 ml-auto"
                          onClick={() => onDownloadQr(hostel.id, hostel.name)}
                        >
                          <QrCode className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Download QR Code</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {/* Row 2: Toggles + WhatsApp */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onManagePackages(hostel)}>
                            <Package className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Packages</TooltipContent>
                      </Tooltip>
                    )}
                    {isAdmin && onToggleActive && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className={`h-7 w-7 ${hostel.is_active ? "text-red-600 border-red-200 hover:bg-red-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}`}
                            onClick={() => onToggleActive(hostel.id, !hostel.is_active)}
                          >
                            {hostel.is_active ? <FileMinus className="h-3.5 w-3.5" /> : <FilePlus className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{hostel.is_active ? 'Deactivate' : 'Activate'}</TooltipContent>
                      </Tooltip>
                    )}
                    {onToggleBooking && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            disabled={!hostel.is_active}
                            className={`h-7 w-7 ${!hostel.is_booking_active ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50" : "text-orange-600 border-orange-200 hover:bg-orange-50"}`}
                            onClick={() => onToggleBooking(hostel.id, !hostel.is_booking_active)}
                          >
                            {!hostel.is_booking_active ? <Globe className="h-3.5 w-3.5" /> : <GlobeLock className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{!hostel.is_booking_active ? 'Turn Online On' : 'Turn Online Off'}</TooltipContent>
                      </Tooltip>
                    )}
                    {onTogglePartnerVisible && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            disabled={!hostel.is_active}
                            className={`h-7 w-7 ${hostel.is_partner_visible === false ? "text-blue-600 border-blue-200 hover:bg-blue-50" : "text-muted-foreground border-border hover:bg-muted"}`}
                            onClick={() => onTogglePartnerVisible(hostel.id, !(hostel.is_partner_visible !== false))}
                          >
                            {hostel.is_partner_visible === false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{hostel.is_partner_visible === false ? 'Show to Employees' : 'Hide from Employees'}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative inline-block ml-auto">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => setWaDialogOpen(true)}
                        >
                          <MessageCircle className="h-3.5 w-3.5" style={{ color: '#25D366' }} />
                        </Button>
                        {waClickCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1 border-2 border-background">
                            {waClickCount}
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>WhatsApp Settings</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>

            <WhatsAppPropertyDialog
              open={waDialogOpen}
              onOpenChange={setWaDialogOpen}
              propertyId={hostel.id}
              propertyType="hostel"
              propertyName={hostel.name}
              initialNumber={hostel.whatsapp_number || ''}
              initialEnabled={!!hostel.whatsapp_chat_enabled}
            />
          </div>
        </CardContent>
      </Card>

      {!isAdmin && (
        <PropertySubscribeDialog
          open={subDialogOpen}
          onOpenChange={setSubDialogOpen}
          propertyId={hostel.id}
          propertyName={hostel.name}
          propertyType="hostel"
          partnerId={partnerId}
        />
      )}
    </>
  );
}
