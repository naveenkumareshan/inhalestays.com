
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, FileMinus, FilePlus, Trash2, Users, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { WhatsAppPropertyDialog } from './WhatsAppPropertyDialog';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock, AlertTriangle } from 'lucide-react';

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
  partnerId?: string;
}

export function CabinItem({ cabin, onEdit, onDelete, onToggleActive, onToggleBooking, onManageSeats, partnerId }: CabinItemProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const { hasSubscription, daysRemaining, isExpired, currentPlan } = useSubscriptionAccess(cabin._id || cabin.id, 'reading_room', partnerId);

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
    if (!isExpired && daysRemaining > 0) {
      return (
        <Badge variant="outline" className="gap-1 text-[10px] border-amber-500 text-amber-600">
          <Clock className="h-2.5 w-2.5" />
          Trial ({daysRemaining}d)
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-[10px] border-muted-foreground/50 text-muted-foreground">
        <AlertTriangle className="h-2.5 w-2.5" />
        No Plan
      </Badge>
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
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200" />
          </div>
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
        <div className="p-4 flex-1 flex flex-col gap-2.5">
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
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${!cabin.isBookingActive ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
              {!cabin.isBookingActive ? "● Booking Off" : "● Booking On"}
            </span>
          </div>

          <h3 className="font-semibold text-sm leading-snug text-foreground">{cabin.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{cabin.description}</p>

          {/* Pricing & capacity */}
          <div className="flex justify-between items-center pt-0.5">
            <span className="font-bold text-base text-foreground">₹{cabin.price}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{cabin.capacity} seats</span>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t pt-3 mt-0.5 flex flex-wrap gap-1.5">
            {isAdmin && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(cabin)}>
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" className="h-7 px-2 text-xs" onClick={() => onManageSeats(cabin._id)}>
                <Users className="h-3 w-3 mr-1" />
                Seats
              </Button>
            )}
            {isAdmin && onToggleActive && (
              <Button
                size="sm"
                variant="outline"
                className={`h-7 px-2 text-xs ${cabin.isActive ? "text-red-600 border-red-200 hover:bg-red-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}`}
                onClick={() => onToggleActive(cabin._id, !cabin.isActive)}
              >
                {cabin.isActive ? <><FileMinus className="h-3 w-3 mr-1" />Deactivate</> : <><FilePlus className="h-3 w-3 mr-1" />Activate</>}
              </Button>
            )}
            {onToggleBooking && (
              <Button
                size="sm"
                variant="outline"
                disabled={!cabin.isActive}
                className={`h-7 px-2 text-xs ${!cabin.isBookingActive ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50" : "text-orange-600 border-orange-200 hover:bg-orange-50"}`}
                onClick={() => onToggleBooking(cabin._id, !cabin.isBookingActive)}
              >
                {!cabin.isBookingActive ? "▶ Enable" : "⏸ Pause"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => setWaDialogOpen(true)}
              title="WhatsApp Chat Settings"
            >
              <MessageCircle className="h-3 w-3" style={{ color: '#25D366' }} />
            </Button>
          </div>

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
  );
}
