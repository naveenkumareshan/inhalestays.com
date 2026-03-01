
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { MapPin, Calendar, BarChart2, Eye, MousePointer, ShoppingCart } from 'lucide-react';

interface Promotion {
  id: string;
  property_type: string;
  property_id: string;
  tier: string;
  target_city_id: string;
  target_area_ids: string[];
  start_date: string;
  end_date: string;
  priority_rank: number;
  status: string;
  property_name: string;
  city_name: string;
  area_names: string[];
  impressions: number;
  clicks: number;
  bookings: number;
}

const tierBadgeStyle: Record<string, string> = {
  featured: 'bg-amber-100 text-amber-800',
  inline_sponsored: 'bg-blue-100 text-blue-800',
  boost_ranking: 'bg-purple-100 text-purple-800',
};

export default function MyPromotions() {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPromotions();
  }, [user]);

  const fetchPromotions = async () => {
    if (!user?.id) return;
    setLoading(true);

    // Get partner record
    const { data: partnerData } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!partnerData) { setLoading(false); return; }

    const { data: listingsData } = await supabase
      .from('sponsored_listings')
      .select('*')
      .eq('partner_id', partnerData.id)
      .order('created_at', { ascending: false });

    if (!listingsData) { setLoading(false); return; }

    const enriched = await Promise.all(listingsData.map(async (l: any) => {
      let property_name = '';
      if (l.property_type === 'hostel') {
        const { data } = await supabase.from('hostels').select('name').eq('id', l.property_id).single();
        property_name = data?.name || 'Unknown';
      } else {
        const { data } = await supabase.from('cabins').select('name').eq('id', l.property_id).single();
        property_name = data?.name || 'Unknown';
      }

      const { data: cityData } = await supabase.from('cities').select('name').eq('id', l.target_city_id).single();

      let area_names: string[] = [];
      if (l.target_area_ids?.length > 0) {
        const { data: areasData } = await supabase.from('areas').select('name').in('id', l.target_area_ids);
        area_names = areasData?.map(a => a.name) || [];
      }

      const { data: events } = await supabase
        .from('sponsored_listing_events')
        .select('event_type')
        .eq('sponsored_listing_id', l.id);

      return {
        ...l,
        property_name,
        city_name: cityData?.name || '',
        area_names,
        impressions: events?.filter(e => e.event_type === 'impression').length || 0,
        clicks: events?.filter(e => e.event_type === 'click').length || 0,
        bookings: events?.filter(e => e.event_type === 'booking').length || 0,
      };
    }));

    setPromotions(enriched);
    setLoading(false);
  };

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading promotions...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold">My Promotions</h1>
      {promotions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No active promotions. Contact admin to set up sponsored ads.
        </div>
      ) : (
        <div className="grid gap-3">
          {promotions.map(p => {
            const remaining = differenceInDays(new Date(p.end_date), new Date());
            const ctr = p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(1) : '0.0';
            return (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{p.property_name}</h3>
                    <span className="text-[11px] text-muted-foreground capitalize">{p.property_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${tierBadgeStyle[p.tier] || ''}`}>
                      {p.tier.replace('_', ' ')}
                    </span>
                    <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="text-[10px] capitalize">
                      {p.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.city_name}{p.area_names.length > 0 && ` · ${p.area_names.join(', ')}`}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(p.start_date), 'dd MMM')} – {format(new Date(p.end_date), 'dd MMM yyyy')}
                  </span>
                  {remaining > 0 && p.status === 'active' && (
                    <span className="text-primary font-medium">{remaining} days left</span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground"><Eye className="h-3 w-3" /></div>
                    <div className="text-sm font-semibold">{p.impressions}</div>
                    <div className="text-[10px] text-muted-foreground">Views</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground"><MousePointer className="h-3 w-3" /></div>
                    <div className="text-sm font-semibold">{p.clicks}</div>
                    <div className="text-[10px] text-muted-foreground">Clicks</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground"><BarChart2 className="h-3 w-3" /></div>
                    <div className="text-sm font-semibold">{ctr}%</div>
                    <div className="text-[10px] text-muted-foreground">CTR</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground"><ShoppingCart className="h-3 w-3" /></div>
                    <div className="text-sm font-semibold">{p.bookings}</div>
                    <div className="text-[10px] text-muted-foreground">Bookings</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
