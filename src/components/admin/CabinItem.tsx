
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, FileMinus, FilePlus, Users, MessageCircle, CreditCard, Eye, EyeOff, Globe, GlobeLock, QrCode, Eye as EyeView } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppPropertyDialog } from './WhatsAppPropertyDialog';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { PropertySubscribeDialog } from './PropertySubscribeDialog';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CabinData {
  _id: string;
  id: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  amenities: string[];
  imageUrl: string;
  category: 'standard' | 'premium' | 'luxury';
  isActive?: boolean;
  isBookingActive?: boolean;
  isPartnerVisible?: boolean;
  vendorId: any;
  cabinCode?: string;
}

interface CabinItemProps {
  cabin: CabinData;
  onEdit: (cabin: CabinData) => void;
  onDelete: (cabinId: string) => void;
  onManageSeats: (cabinId: string) => void;
  onToggleActive?: (cabinId: string, isActive: boolean) => void;
  onToggleBooking?: (cabinId: string, isActive: boolean) => void;
  onTogglePartnerVisible?: (cabinId: string, isVisible: boolean) => void;
  partnerId?: string;
  onDownloadQr?: (cabinId: string, cabinName: string) => void;
}

export function CabinItem({ cabin, onEdit, onDelete, onToggleActive, onToggleBooking, onTogglePartnerVisible, onManageSeats, partnerId, onDownloadQr }: CabinItemProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [waClickCount, setWaClickCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const propertyId = cabin._id || cabin.id;
  const { hasSubscription, daysRemaining, isExpired, isInTrial, trialDaysRemaining, currentPlan } = useSubscriptionAccess(propertyId, 'reading_room', partnerId);

  useEffect(() => {
    const fetchCounts = async () => {
      const [waResult, viewResult] = await Promise.all([
        supabase.from('whatsapp_clicks' as any).select('*', { count: 'exact', head: true }).eq('property_id', propertyId),
        supabase.from('property_views' as any).select('*', { count: 'exact', head: true }).eq('property_id', propertyId),
      ]);
      setWaClickCount(waResult.count || 0);
      setViewCount(viewResult.count || 0);
    };
    fetchCounts();
  }, [propertyId]);

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

  const getCategoryBadgeStyle = (category: string) => {
    switch (category) {
      case 'standard': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'premium': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'luxury': return 'bg-amber-50 text-amber-700 border border-amber-200';
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
                src={cabin.imageUrl || '/placeholder.svg'}
                alt={cabin.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200" />
            </div>
            {viewCount > 0 && (
              <span className="absolute top-2 left-12 bg-background/90 text-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-border/60">
                <EyeView className="h-2.5 w-2.5" />{viewCount}
              </span>
            )}
            <span className={`absolute top-2 right-2 capitalize text-xs font-medium px-2 py-0.5 rounded-full ${getCategoryBadgeStyle(cabin.category)}`}>
              {cabin.category}
            </span>
            {cabin.isActive === false && (
              <span className="absolute top-2 left-2 bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-xs font-medium">
                Inactive
              </span>
            )}
          </div>

          {/* Content */}
          <div className="p-3 flex-1 flex flex-col gap-2">
            {/* Meta row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {renderSubscriptionBadge()}
              {user?.role === 'admin' && cabin.vendorId && (
                <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">
                  {cabin.vendorId.businessName}
                </span>
              )}
              {cabin.cabinCode && (
                <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs font-mono">
                  #{cabin.cabinCode}
                </span>
              )}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${!cabin.isBookingActive ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                {!cabin.isBookingActive ? "● Online Off" : "● Online On"}
              </span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${cabin.isPartnerVisible === false ? "bg-muted text-muted-foreground border border-border" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                {cabin.isPartnerVisible === false ? "● Emp Hidden" : "● Emp Visible"}
              </span>
            </div>

            <h3 className="font-semibold text-sm leading-snug text-foreground">{cabin.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{cabin.description}</p>

            {/* Pricing & capacity */}
            <div className="flex justify-between items-center">
              <span className="font-bold text-base text-foreground">₹{cabin.price}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{cabin.capacity} seats</span>
              </div>
            </div>

            {/* Actions */}
            <TooltipProvider delayDuration={300}>
              <div className="border-t pt-2 mt-0.5 space-y-1.5">
                {/* Row 1: Primary actions + QR */}
                <div className="flex items-center gap-1.5">
                  {isAdmin && (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(cabin)}>
                      <Edit className="h-3 w-3 mr-1" />Edit
                    </Button>
                  )}
                  {isAdmin && (
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={() => onManageSeats(cabin._id)}>
                      <Users className="h-3 w-3 mr-1" />Seats
                    </Button>
                  )}
                  {onDownloadQr && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 ml-auto"
                          onClick={() => onDownloadQr(cabin._id, cabin.name)}
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
                    {isAdmin && onToggleActive && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className={`h-7 w-7 ${cabin.isActive ? "text-red-600 border-red-200 hover:bg-red-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}`}
                            onClick={() => onToggleActive(cabin._id, !cabin.isActive)}
                          >
                            {cabin.isActive ? <FileMinus className="h-3.5 w-3.5" /> : <FilePlus className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{cabin.isActive ? 'Deactivate' : 'Activate'}</TooltipContent>
                      </Tooltip>
                    )}
                    {onToggleBooking && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            disabled={!cabin.isActive}
                            className={`h-7 w-7 ${!cabin.isBookingActive ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50" : "text-orange-600 border-orange-200 hover:bg-orange-50"}`}
                            onClick={() => onToggleBooking(cabin._id, !cabin.isBookingActive)}
                          >
                            {!cabin.isBookingActive ? <Globe className="h-3.5 w-3.5" /> : <GlobeLock className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{!cabin.isBookingActive ? 'Turn Online On' : 'Turn Online Off'}</TooltipContent>
                      </Tooltip>
                    )}
                    {onTogglePartnerVisible && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            disabled={!cabin.isActive}
                            className={`h-7 w-7 ${cabin.isPartnerVisible === false ? "text-blue-600 border-blue-200 hover:bg-blue-50" : "text-muted-foreground border-border hover:bg-muted"}`}
                            onClick={() => onTogglePartnerVisible(cabin._id, !(cabin.isPartnerVisible !== false))}
                          >
                            {cabin.isPartnerVisible === false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{cabin.isPartnerVisible === false ? 'Show to Employees' : 'Hide from Employees'}</TooltipContent>
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
              propertyId={cabin._id}
              propertyType="cabin"
              propertyName={cabin.name}
              initialNumber={(cabin as any).whatsappNumber || ''}
              initialEnabled={!!(cabin as any).whatsappChatEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {!isAdmin && (
        <PropertySubscribeDialog
          open={subDialogOpen}
          onOpenChange={setSubDialogOpen}
          propertyId={propertyId}
          propertyName={cabin.name}
          propertyType="reading_room"
          partnerId={partnerId}
        />
      )}
    </>
  );
}
