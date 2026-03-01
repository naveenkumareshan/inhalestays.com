
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SponsoredListing {
  id: string;
  property_type: string;
  property_id: string;
  tier: string;
  target_city_id: string;
  target_area_ids: string[];
  priority_rank: number;
  status: string;
}

interface UseSponsoredListingsOptions {
  propertyType: 'hostel' | 'reading_room';
  cityId?: string;
  areaId?: string;
}

export function useSponsoredListings({ propertyType, cityId, areaId }: UseSponsoredListingsOptions) {
  const [sponsoredListings, setSponsoredListings] = useState<SponsoredListing[]>([]);
  const [loading, setLoading] = useState(false);
  const trackedImpressions = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!cityId) { setSponsoredListings([]); return; }
    fetchSponsored();
  }, [cityId, areaId, propertyType]);

  const fetchSponsored = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sponsored_listings')
      .select('*')
      .eq('property_type', propertyType)
      .eq('status', 'active')
      .eq('target_city_id', cityId!)
      .lte('start_date', new Date().toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('priority_rank', { ascending: false });

    if (!error && data) {
      setSponsoredListings(data as SponsoredListing[]);
    }
    setLoading(false);
  };

  const trackImpression = useCallback(async (listingId: string) => {
    if (trackedImpressions.current.has(listingId)) return;
    trackedImpressions.current.add(listingId);
    await supabase.from('sponsored_listing_events').insert({
      sponsored_listing_id: listingId,
      event_type: 'impression',
    });
  }, []);

  const trackClick = useCallback(async (listingId: string) => {
    await supabase.from('sponsored_listing_events').insert({
      sponsored_listing_id: listingId,
      event_type: 'click',
    });
  }, []);

  // Merge sponsored listings into organic listings
  const mergeListings = useCallback(<T extends { id?: string; _id?: string }>(
    organicListings: T[]
  ): (T & { sponsoredTier?: string; sponsoredListingId?: string })[] => {
    if (sponsoredListings.length === 0) return organicListings;

    // Separate by tier
    const featured = sponsoredListings.filter(s => s.tier === 'featured');
    const inline = sponsoredListings.filter(s => s.tier === 'inline_sponsored');
    const boosted = sponsoredListings.filter(s => s.tier === 'boost_ranking');

    // Area-level featured (max 2), then city-level featured (max 3)
    const areaFeatured = areaId
      ? featured.filter(s => s.target_area_ids?.includes(areaId)).slice(0, 2)
      : [];
    const cityFeatured = featured
      .filter(s => !areaFeatured.find(a => a.id === s.id))
      .slice(0, 3 - areaFeatured.length);
    const allFeatured = [...areaFeatured, ...cityFeatured].slice(0, 3);

    // Build featured entries from organic list if property matches
    const featuredEntries: (T & { sponsoredTier?: string; sponsoredListingId?: string })[] = [];
    for (const sl of allFeatured) {
      const match = organicListings.find(o => (o.id || o._id) === sl.property_id);
      if (match) {
        featuredEntries.push({ ...match, sponsoredTier: 'featured', sponsoredListingId: sl.id });
      }
    }

    // Boost rankings — just tag them
    const boostedIds = new Set(boosted.map(b => b.property_id));

    // Build organic list (exclude featured duplicates)
    const featuredPropertyIds = new Set(allFeatured.map(f => f.property_id));
    const remaining = organicListings
      .filter(o => !featuredPropertyIds.has(o.id || o._id || ''))
      .map(o => {
        const oid = o.id || o._id || '';
        if (boostedIds.has(oid)) {
          const sl = boosted.find(b => b.property_id === oid);
          return { ...o, sponsoredTier: 'boost_ranking' as string, sponsoredListingId: sl?.id };
        }
        return o as T & { sponsoredTier?: string; sponsoredListingId?: string };
      });

    // Insert inline sponsored every 6 organic items
    const inlineEntries: (T & { sponsoredTier?: string; sponsoredListingId?: string })[] = [];
    for (const sl of inline.slice(0, 5)) {
      const match = organicListings.find(o => (o.id || o._id) === sl.property_id);
      if (match && !featuredPropertyIds.has(sl.property_id)) {
        inlineEntries.push({ ...match, sponsoredTier: 'inline_sponsored', sponsoredListingId: sl.id });
      }
    }

    // Max 5 sponsored total
    const totalSponsored = featuredEntries.length + inlineEntries.length;
    const maxInline = Math.max(0, 5 - featuredEntries.length);
    const finalInline = inlineEntries.slice(0, maxInline);

    // Merge: featured first, then interleave inline every 6
    const result: (T & { sponsoredTier?: string; sponsoredListingId?: string })[] = [...featuredEntries];
    const inlinePropertyIds = new Set(finalInline.map(i => i.id || i._id || ''));
    const filteredRemaining = remaining.filter(r => !inlinePropertyIds.has(r.id || r._id || ''));

    let inlineIdx = 0;
    for (let i = 0; i < filteredRemaining.length; i++) {
      result.push(filteredRemaining[i]);
      if ((i + 1) % 6 === 0 && inlineIdx < finalInline.length) {
        result.push(finalInline[inlineIdx++]);
      }
    }
    // Append remaining inline
    while (inlineIdx < finalInline.length) {
      result.push(finalInline[inlineIdx++]);
    }

    return result;
  }, [sponsoredListings, areaId]);

  return { sponsoredListings, loading, mergeListings, trackImpression, trackClick };
}
