
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { hostelService } from '@/api/hostelService';
import { MapPin, Hotel, Star, Utensils, Search, SlidersHorizontal, X } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSponsoredListings } from '@/hooks/useSponsoredListings';

const genderFilters = [
  { id: 'all', label: 'All' },
  { id: 'Male', label: 'Male' },
  { id: 'Female', label: 'Female' },
  { id: 'Co-ed', label: 'Co-ed' },
] as const;

export default function Hostels() {
  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftGenderFilter, setDraftGenderFilter] = useState('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Determine dominant city from loaded hostels for sponsored targeting
  const dominantCityId = React.useMemo(() => {
    const cityCount: Record<string, number> = {};
    hostels.forEach(h => { if (h.city_id) cityCount[h.city_id] = (cityCount[h.city_id] || 0) + 1; });
    return Object.entries(cityCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  }, [hostels]);

  const { mergeListings, trackImpression, trackClick } = useSponsoredListings({
    propertyType: 'hostel',
    cityId: dominantCityId,
  });

  useEffect(() => {
    fetchHostels();
  }, []);

  const fetchHostels = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hostelService.getAllHostels();
      setHostels(data || []);
    } catch (err: any) {
      setError('No hostels available at the moment.');
      console.error('Error fetching hostels:', err);
    } finally { setLoading(false); }
  };

  const filteredHostels = hostels.filter(hostel => {
    const matchesGender = genderFilter === 'all' || hostel.gender === genderFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      hostel.name?.toLowerCase().includes(query) ||
      hostel.areas?.name?.toLowerCase().includes(query) ||
      hostel.cities?.name?.toLowerCase().includes(query);
    return matchesGender && matchesSearch;
  });

  // Merge sponsored listings into filtered results
  const displayHostels = mergeListings(filteredHostels);

  const activeFiltersCount = genderFilter !== 'all' ? 1 : 0;

  const handleOpenFilters = () => {
    setDraftGenderFilter(genderFilter);
    setFiltersOpen(true);
  };

  const handleApplyFilters = () => {
    setGenderFilter(draftGenderFilter);
    setFiltersOpen(false);
  };

  const handleResetFilters = () => {
    setDraftGenderFilter('all');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-3 pt-3 pb-2 max-w-lg lg:max-w-5xl mx-auto">
          <h1 className="text-[16px] font-semibold mb-2 lg:text-xl">Hostels</h1>

          {/* Search + Filters row */}
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search hostels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-xl border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-8 px-3 text-[11px] font-medium flex-shrink-0"
              onClick={handleOpenFilters}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Active filter chips */}
          {genderFilter !== 'all' && (
            <div className="flex gap-1.5 pb-1">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium bg-secondary/10 text-secondary px-2 py-0.5 rounded-lg cursor-pointer"
                onClick={() => setGenderFilter('all')}
              >
                {genderFilter}
                <X className="h-3 w-3" />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="px-3 py-3 max-w-lg lg:max-w-5xl mx-auto">
        {loading ? (
          <div className="space-y-2.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3 p-3 bg-card rounded-2xl border border-border animate-pulse">
                <div className="w-20 h-20 rounded-xl bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2.5 bg-muted rounded w-1/2" />
                  <div className="h-2.5 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-[14px] font-medium text-foreground mb-1">No Hostels Available</p>
            <p className="text-[12px] text-muted-foreground">Check back later for new listings.</p>
          </div>
        ) : displayHostels.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[14px] font-medium text-foreground mb-1">No hostels found</p>
            <p className="text-[12px] text-muted-foreground">
              {genderFilter !== 'all' ? 'Try adjusting your filter' : 'No hostels available'}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[11px] text-muted-foreground mb-2.5">{displayHostels.length} hostels found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {displayHostels.map((hostel: any, idx: number) => (
              <div
                key={`${hostel.id}-${idx}`}
                onClick={() => {
                  if (hostel.sponsoredListingId) trackClick(hostel.sponsoredListingId);
                  navigate(`/hostels/${hostel.serial_number || hostel.id}`);
                }}
                className={`relative flex gap-3 p-3 bg-card rounded-2xl border hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer ${
                  hostel.sponsoredTier === 'featured' ? 'border-amber-300 bg-amber-50/30' :
                  hostel.sponsoredTier === 'inline_sponsored' ? 'border-blue-300 bg-blue-50/20' :
                  'border-border hover:border-primary/30'
                }`}
                ref={hostel.sponsoredListingId ? (el: HTMLDivElement | null) => {
                  if (el) {
                    const observer = new IntersectionObserver(([entry]) => {
                      if (entry.isIntersecting) { trackImpression(hostel.sponsoredListingId!); observer.disconnect(); }
                    }, { threshold: 0.5 });
                    observer.observe(el);
                  }
                } : undefined}
              >
                {/* Sponsored badge */}
                {hostel.sponsoredTier === 'featured' && (
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-md z-10">Featured</span>
                )}
                {hostel.sponsoredTier === 'inline_sponsored' && (
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-md z-10">Sponsored</span>
                )}
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted">
                  {hostel.logo_image ? (
                    <img src={hostel.logo_image} alt={hostel.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Hotel className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  {hostel.gender && (
                    <span className="absolute top-1 left-1 text-[9px] font-bold bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-md">
                      {hostel.gender === 'Male' ? 'M' : hostel.gender === 'Female' ? 'F' : 'Co'}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[13px] font-semibold text-foreground leading-tight truncate">{hostel.name}</h3>
                    {(hostel.areas?.name || hostel.cities?.name) && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-[11px] text-muted-foreground truncate">
                          {hostel.areas?.name ? hostel.areas.name + ', ' : ''}{hostel.cities?.name || ''}
                        </span>
                      </div>
                    )}
                    {hostel.amenities?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {hostel.amenities.slice(0, 3).map((a: string, i: number) => (
                          <span key={i} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
                            {a.replace(/-/g, ' ')}
                          </span>
                        ))}
                        {hostel.amenities.length > 3 && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">+{hostel.amenities.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {hostel.average_rating > 0 ? (
                        <span className="flex items-center gap-0.5 text-[11px] text-amber-600 font-medium">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {hostel.average_rating.toFixed(1)}
                          {hostel.review_count > 0 && <span className="text-muted-foreground">({hostel.review_count})</span>}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-md font-medium">New</span>
                      )}
                      {(() => {
                        const startingPrice = hostel.starting_price > 0 ? hostel.starting_price : null;
                        if (startingPrice) {
                          return <span className="text-[11px] font-semibold text-foreground">From {formatCurrency(startingPrice)}/mo</span>;
                        }
                        const prices = hostel.hostel_rooms?.flatMap((r: any) => r.hostel_sharing_options?.map((o: any) => o.price_monthly) || []).filter((p: number) => p > 0) || [];
                        const minPrice = prices.length > 0 ? Math.min(...prices) : null;
                        return minPrice ? (
                          <span className="text-[11px] font-semibold text-foreground">{formatCurrency(minPrice)}/mo</span>
                        ) : null;
                      })()}
                      {hostel.food_enabled && (
                        <span className="flex items-center gap-0.5 text-[10px] text-orange-600 font-medium">
                          <Utensils className="h-3 w-3" /> Food
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-secondary bg-secondary/10 px-2 py-0.5 rounded-lg flex-shrink-0">View Rooms</span>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
      {/* Filter drawer */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-[14px]">Filters</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <p className="text-[12px] font-medium text-muted-foreground mb-2">Gender</p>
            <div className="flex flex-wrap gap-2">
              {genderFilters.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setDraftGenderFilter(g.id)}
                 className={`px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-colors ${
                    draftGenderFilter === g.id
                       ? 'bg-secondary text-secondary-foreground border-secondary'
                       : 'bg-card text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <SheetFooter className="flex-row gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1 rounded-xl text-[12px]" onClick={handleResetFilters}>
              Reset
            </Button>
            <Button size="sm" className="flex-1 rounded-xl text-[12px]" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
