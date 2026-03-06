
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CabinsGrid } from '../components/cabins/CabinsGrid';
import { cabinsService } from '../api/cabinsService';
import { reviewsService } from '../api/reviewsService';
import { toast } from '@/hooks/use-toast';
import { Cabin as FrontendCabin } from '../data/cabinsData';
import ErrorBoundary from '../components/ErrorBoundary';
import { Loader2, BookOpen, Search, X } from 'lucide-react';

// Define backend Cabin type (Supabase schema)
interface BackendCabin {
  id: string;
  name: string;
  description: string;
  price: number;
  capacity?: number;
  amenities?: string[];
  image_url?: string;
  category: 'standard' | 'premium' | 'luxury';
  is_active: boolean;
  opening_time?: string;
  closing_time?: string;
  working_days?: string[];
  is_24_hours?: boolean;
  slots_enabled?: boolean;
  serial_number?: string;
  city?: string;
  area?: string;
}

const categories = [
  { id: 'all', label: 'All Rooms' },
  { id: 'standard', label: 'Standard' },
  { id: 'premium', label: 'Premium' },
  { id: 'luxury', label: 'Luxury' },
] as const;

const Cabins = () => {
  const [filter, setFilter] = useState<'all' | 'standard' | 'premium' | 'luxury'>('all');
  const [cabins, setCabins] = useState<FrontendCabin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);
  
  useEffect(() => {
    const fetchCabins = async () => {
      try {
        setLoading(true);
        setError(null);
        const filters: any = {};
        if (filter !== 'all') filters.category = filter;
        if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
        const response = await cabinsService.getAllCabins(filters);
        
        if (response.success) {
          const transformedCabins = Array.isArray(response.data) ? response.data
            .filter((cabin: BackendCabin) => cabin.is_active !== false)
            .map((cabin: BackendCabin, index: number): FrontendCabin => ({
              id: String(index + 1),
              _id: cabin.id,
              name: cabin.name,
              description: cabin.description || '',
              price: cabin.price,
              capacity: cabin.capacity || 1,
              amenities: cabin.amenities || [],
              imageSrc: cabin.image_url || 'https://images.unsplash.com/photo-1513694203232-719a280e022f',
              imageUrl: cabin.image_url || 'https://images.unsplash.com/photo-1513694203232-719a280e022f',
              category: cabin.category || 'standard',
              isActive: cabin.is_active !== false,
              openingTime: cabin.opening_time || undefined,
              closingTime: cabin.closing_time || undefined,
              workingDays: cabin.working_days || undefined,
              serial_number: cabin.serial_number || undefined,
              city: cabin.city || undefined,
              area: cabin.area || undefined,
            } as any)) : [];
          
          const cabinIds = transformedCabins.map(c => c._id).filter(Boolean) as string[];
          if (cabinIds.length > 0) {
            try {
              const ratingStats = await reviewsService.getCabinRatingStatsBatch(cabinIds);
              transformedCabins.forEach(c => {
                const stats = ratingStats[c._id as string];
                if (stats) {
                  (c as any).averageRating = stats.average_rating;
                  (c as any).reviewCount = stats.review_count;
                }
              });
            } catch (e) {
              console.error('Error fetching rating stats:', e);
            }
          }

          setCabins(transformedCabins);
        } else {
          setError('Failed to load rooms');
          toast({ title: "Error", description: "Failed to load cabins. Please try again.", variant: "destructive" });
        }
      } catch (error) {
        console.error('Error fetching cabins:', error);
        setError('Failed to load rooms');
        toast({ title: "Error", description: "Failed to load cabins. Please try again.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCabins();
  }, [filter, debouncedSearch]);
    
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-3 pt-3 pb-2 max-w-lg lg:max-w-5xl mx-auto">
          <h1 className="text-[16px] font-semibold mb-2 lg:text-xl">Study Rooms</h1>

          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-8 rounded-xl border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Category filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id as any)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-xl border text-[11px] font-medium transition-colors h-8 ${
                  filter === cat.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:bg-muted'
                }`}
              >
                {cat.id === 'all' && <BookOpen className="h-3 w-3" />}
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="px-3 py-3 max-w-lg lg:max-w-5xl mx-auto">
        <ErrorBoundary>
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
              <p className="text-[14px] font-medium text-foreground mb-1">No Rooms Available</p>
              <p className="text-[12px] text-muted-foreground">Check back later for new listings.</p>
            </div>
          ) : (
            <CabinsGrid cabins={cabins} />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Cabins;
