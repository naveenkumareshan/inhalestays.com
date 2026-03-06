
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { cabinsService } from '@/api/cabinsService';
import { reviewsService } from '@/api/reviewsService';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal, X, MapPin } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationSelector } from '@/components/forms/LocationSelector';
import { Label } from '@/components/ui/label';
import { useSponsoredListings } from '@/hooks/useSponsoredListings';

const CabinSearchResults = lazy(() =>
  import("@/components/search/CabinSearchResults").then((m) => ({ default: m.CabinSearchResults }))
);

interface SearchFilters {
  query: string;
  stateId: string;
  cityId: string;
  areaId: string;
  radius: string;
  priceRange: { min: number; max: number };
  amenities: string[];
  category: string;
  sortBy: 'distance' | 'price' | 'rating' | 'name';
  userLocation?: { lat: number; lng: number };
}

interface CabinResult {
  _id: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  amenities: string[];
  imageUrl: string;
  imageSrc: string;
  category: 'standard' | 'premium' | 'luxury';
  location: {
    coordinates: { latitude: number; longitude: number };
    fullAddress: string;
    city: { _id: string; name: string };
    state: { _id: string; name: string };
    area?: { _id: string; name: string };
  };
  averageRating?: number;
  distance?: number;
}

const defaultFilters: SearchFilters = {
  query: '',
  stateId: '',
  cityId: '',
  areaId: '',
  radius: '5',
  priceRange: { min: 0, max: 10000 },
  amenities: [],
  category: '',
  sortBy: 'distance',
};

const CabinSearch = () => {
  const [searchResults, setSearchResults] = useState<CabinResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [lastSearchFilters, setLastSearchFilters] = useState<SearchFilters | null>(null);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(defaultFilters);
  const [activeFilters, setActiveFilters] = useState<SearchFilters>(defaultFilters);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-search when debounced query changes
  useEffect(() => {
    const filters = { ...activeFilters, query: debouncedQuery };
    handleSearch(filters);
  }, [debouncedQuery]);

  const { mergeListings, trackImpression, trackClick } = useSponsoredListings({
    propertyType: 'reading_room',
    cityId: activeFilters.cityId || undefined,
    areaId: activeFilters.areaId || undefined,
  });

  // Merge sponsored into search results
  const displayResults = mergeListings(searchResults);

  const activeFilterCount = [
    activeFilters.stateId,
    activeFilters.cityId,
    activeFilters.areaId,
    activeFilters.category && activeFilters.category !== 'all',
    activeFilters.sortBy !== 'distance',
    activeFilters.priceRange.min > 0,
    activeFilters.priceRange.max < 10000,
  ].filter(Boolean).length;

  const handleSearch = async (filters: SearchFilters, page: number = 1, append: boolean = false) => {
    try {
      if (!append) { setLoading(true); setCurrentPage(1); }
      else { setLoadingMore(true); }

      const searchParams: any = {
        search: filters.query,
        category: filters.category && filters.category !== 'all' ? filters.category : undefined,
        minPrice: filters.priceRange.min > 0 ? filters.priceRange.min : undefined,
        maxPrice: filters.priceRange.max < 10000 ? filters.priceRange.max : undefined,
        amenities: filters.amenities.length > 0 ? filters.amenities.join(',') : undefined,
        sortBy: filters.sortBy,
        state: filters.stateId || undefined,
        city: filters.cityId || undefined,
        area: filters.areaId || undefined,
        radius: filters.radius || undefined,
        page,
        limit,
      };

      const response = await cabinsService.getAllCabins(searchParams);
      if (response.success) {
        const newResults = response.data || [];
        // Enrich with rating stats
        const cabinIds = newResults.map((c: any) => c.id || c._id).filter(Boolean);
        if (cabinIds.length > 0) {
          try {
            const stats = await reviewsService.getCabinRatingStatsBatch(cabinIds);
            newResults.forEach((c: any) => {
              const id = c.id || c._id;
              if (id && stats[id]) {
                c.averageRating = stats[id].average_rating;
                c.reviewCount = stats[id].review_count;
              }
            });
          } catch (e) { console.error('Failed to fetch rating stats', e); }
        }
        if (append) setSearchResults(prev => [...prev, ...newResults]);
        else setSearchResults(newResults);
        setTotalPages(response.totalPages || 1);
        setHasMore((response.totalPages || 1) > page);
        setCurrentPage(page);
        setLastSearchFilters(filters);
        if (newResults.length === 0 && !append) {
          toast({ title: "No Results", description: "No reading rooms found matching your search." });
        }
      } else { throw new Error('Failed to search cabins'); }
    } catch (error) {
      console.error('Search error:', error);
      toast({ title: "Search Error", description: "Failed to search. Please try again.", variant: "destructive" });
    } finally { setLoading(false); setLoadingMore(false); }
  };

  const handleLoadMore = () => {
    if (lastSearchFilters && hasMore && !loadingMore) {
      handleSearch(lastSearchFilters, currentPage + 1, true);
    }
  };

  const handleQuickSearch = () => {
    const filters = { ...activeFilters, query: searchQuery };
    setActiveFilters(filters);
    handleSearch(filters);
  };

  const handleApplyFilters = () => {
    const filters = { ...draftFilters, query: searchQuery };
    setActiveFilters(filters);
    setFiltersOpen(false);
    handleSearch(filters);
  };

  const handleResetFilters = () => {
    setDraftFilters(defaultFilters);
  };

  // Initial load handled by debouncedQuery useEffect above

  return (
    <div className="min-h-screen bg-background">
      {/* Compact search header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-3 py-2.5">
        <div className="max-w-lg mx-auto">
          <h1 className="text-[17px] font-semibold mb-2">Reading Rooms</h1>
          <div className="flex gap-2">
            {/* Search bar */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
              <Input
                placeholder="Search rooms, areas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickSearch()}
                className="pl-8 h-9 text-[13px] rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); handleSearch({ ...activeFilters, query: '' }); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Filter pill */}
            <button
              onClick={() => { setDraftFilters(activeFilters); setFiltersOpen(true); }}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-xl border text-[12px] font-medium transition-colors flex-shrink-0 ${
                activeFilterCount > 0
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-white/20 text-[10px] font-bold px-1 rounded-full">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {/* Active filter chips */}
          {(activeFilters.category && activeFilters.category !== 'all' || activeFilters.cityId) && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {activeFilters.category && activeFilters.category !== 'all' && (
                <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer" onClick={() => {
                  const f = { ...activeFilters, category: '' };
                  setActiveFilters(f); handleSearch(f);
                }}>
                  {activeFilters.category} <X className="h-2.5 w-2.5" />
                </Badge>
              )}
              {activeFilters.cityId && (
                <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer" onClick={() => {
                  const f = { ...activeFilters, cityId: '', areaId: '' };
                  setActiveFilters(f); handleSearch(f);
                }}>
                  <MapPin className="h-2.5 w-2.5" /> Location <X className="h-2.5 w-2.5" />
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="px-3 py-3 max-w-lg mx-auto">
        <Suspense fallback={<div className="p-4 text-[13px] text-muted-foreground">Loading results...</div>}>
          <CabinSearchResults
            cabins={displayResults}
            loading={loading}
            limit={limit}
            hasMore={hasMore}
            currentPage={currentPage}
            totalPages={totalPages}
            onLoadMore={handleLoadMore}
            loadingMore={loadingMore}
            onTrackImpression={trackImpression}
            onTrackClick={trackClick}
          />
        </Suspense>
      </div>

      {/* Filter Drawer Sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader className="pb-3 border-b">
            <SheetTitle className="text-[16px]">Filter Rooms</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 py-4">
            {/* Location */}
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold">Location</Label>
              <LocationSelector
                selectedCountry={'684063018f9d4f4736616a42'}
                selectedState={draftFilters.stateId}
                selectedCity={draftFilters.cityId}
                selectedArea={draftFilters.areaId}
                onStateChange={(stateId) => setDraftFilters(prev => ({ ...prev, stateId, cityId: '', areaId: '' }))}
                onCityChange={(cityId) => setDraftFilters(prev => ({ ...prev, cityId, areaId: '' }))}
                onAreaChange={(areaId) => setDraftFilters(prev => ({ ...prev, areaId }))}
                showCountry={false}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold">Category</Label>
              <div className="flex gap-2 flex-wrap">
                {['all', 'standard', 'premium', 'luxury'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setDraftFilters(prev => ({ ...prev, category: cat }))}
                    className={`px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-colors capitalize ${
                      draftFilters.category === cat || (!draftFilters.category && cat === 'all')
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold">Price Range (₹/month)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder="Min"
                  value={draftFilters.priceRange.min || ''}
                  onChange={(e) => setDraftFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, min: parseInt(e.target.value) || 0 } }))}
                  className="h-9 text-[13px]"
                />
                <span className="text-[12px] text-muted-foreground flex-shrink-0">to</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={draftFilters.priceRange.max === 10000 ? '' : draftFilters.priceRange.max}
                  onChange={(e) => setDraftFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, max: parseInt(e.target.value) || 10000 } }))}
                  className="h-9 text-[13px]"
                />
              </div>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold">Sort By</Label>
              <Select
                value={draftFilters.sortBy}
                onValueChange={(value) => setDraftFilters(prev => ({ ...prev, sortBy: value as any }))}
              >
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">Distance</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Radius */}
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold">Search Radius</Label>
              <div className="flex gap-2 flex-wrap">
                {['5', '10', '15', '20'].map(r => (
                  <button
                    key={r}
                    onClick={() => setDraftFilters(prev => ({ ...prev, radius: r }))}
                    className={`px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-colors ${
                      draftFilters.radius === r
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>
          </div>

          <SheetFooter className="flex-row gap-2 border-t pt-3">
            <Button variant="outline" onClick={handleResetFilters} className="flex-1 h-10 text-[13px] rounded-xl">
              Reset
            </Button>
            <Button onClick={handleApplyFilters} className="flex-1 h-10 text-[13px] rounded-xl">
              Apply Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CabinSearch;
