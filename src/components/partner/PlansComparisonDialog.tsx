import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

const PLAN_ICONS: Record<string, string> = { silver: '🥈', gold: '🥇', platinum: '💎', diamond: '👑' };

interface PlansComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PlansComparisonDialog: React.FC<PlansComparisonDialogProps> = ({ open, onOpenChange }) => {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['subscription-plans-all-compare'],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      return data || [];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Available Plans</DialogTitle>
          <DialogDescription className="text-xs">Compare our subscription plans and choose the best fit for your business.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {plans.map((plan: any) => {
              const hasDiscount = plan.discount_active && plan.discount_percentage > 0;
              const discountedPrice = hasDiscount
                ? plan.price_yearly - (plan.price_yearly * plan.discount_percentage / 100)
                : plan.price_yearly;
              const features: string[] = Array.isArray(plan.features) ? plan.features : [];

              return (
                <Card key={plan.id} className={`${plan.is_universal ? 'border-primary/40 bg-gradient-to-br from-primary/5 to-accent/5' : ''}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{PLAN_ICONS[plan.slug] || '📋'}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm">{plan.name}</p>
                          {plan.is_universal && (
                            <Badge variant="default" className="text-[8px] px-1.5 py-0">Universal</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">₹{plan.price_monthly_display}/mo (billed yearly)</p>
                      </div>
                      {hasDiscount && (
                        <Badge variant="destructive" className="text-[9px] shrink-0">
                          {plan.discount_label || `${plan.discount_percentage}% OFF`}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {hasDiscount ? (
                        <>
                          <p className="text-xs line-through text-muted-foreground">₹{plan.price_yearly}</p>
                          <p className="text-xs font-bold text-primary">₹{Math.round(discountedPrice)}/year</p>
                        </>
                      ) : (
                        <p className="text-xs font-medium">₹{plan.price_yearly}/year</p>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Hostel: {plan.hostel_bed_limit === 0 ? 'Unlimited' : `Up to ${plan.hostel_bed_limit} beds`}</p>
                      <p>Reading Room: {plan.reading_room_seat_limit === 0 ? 'Unlimited' : `Up to ${plan.reading_room_seat_limit} seats`}</p>
                      {plan.capacity_upgrade_enabled && (
                        <p className="text-primary/80">+ Capacity upgrades available (₹{plan.capacity_upgrade_price}/mo per slab)</p>
                      )}
                    </div>

                    {features.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {features.slice(0, 5).map((f: string) => (
                          <Badge key={f} variant="secondary" className="text-[9px]">{f.replace(/_/g, ' ')}</Badge>
                        ))}
                        {features.length > 5 && (
                          <Badge variant="secondary" className="text-[9px]">+{features.length - 5} more</Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PlansComparisonDialog;
