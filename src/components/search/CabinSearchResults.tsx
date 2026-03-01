
import React from 'react';
import { getImageUrl } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CabinResult {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  amenities: string[];
  imageSrc?: string;
  image_url?: string;
  category: 'standard' | 'premium' | 'luxury';
  city?: string;
  area?: string;
  location?: {
    coordinates?: { latitude: number; longitude: number };
    fullAddress?: string;
    city?: { _id: string; name: string };
    state?: { _id: string; name: string };
    area?: { _id: string; name: string };
  };
  averageRating?: number;
  reviewCount?: number;
  distance?: number;
}

interface CabinSearchResultsProps {
  cabins: (CabinResult & { sponsoredTier?: string; sponsoredListingId?: string })[];
  loading?: boolean;
  hasMore?: boolean;
  currentPage?: number;
  totalPages?: number;
  limit?: number;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  onTrackImpression?: (listingId: string) => void;
  onTrackClick?: (listingId: string) => void;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'luxury': return 'bg-amber-500';
    case 'premium': return 'bg-purple-500';
    default: return 'bg-blue-500';
  }
};

export const CabinSearchResults = ({
  cabins,
  loading,
  hasMore = false,
  currentPage = 1,
  totalPages = 1,
  limit = 10,
  onLoadMore,
  loadingMore = false,
  onTrackImpression,
  onTrackClick,
}: CabinSearchResultsProps) => {

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 p-3 bg-card rounded-2xl border border-border animate-pulse">
            <div className="w-24 h-24 rounded-xl bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-2.5 bg-muted rounded w-1/2" />
              <div className="h-2.5 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/4 mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (cabins.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[14px] font-medium text-foreground mb-1">No reading rooms found</p>
        <p className="text-[12px] text-muted-foreground">Try adjusting your filters or location.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground">{cabins.length} rooms found</p>

      <div className="space-y-2.5">
        {cabins.map((cabin, idx) => {
          const cabinId = cabin.id || cabin._id;
          const cabinSlug = (cabin as any).serial_number || cabinId;
          const imgSrc = cabin.imageSrc || cabin.image_url || '/placeholder.svg';
          return (
          <Link
            to={`/book-seat/${cabinSlug}`}
            key={`${cabinId}-${idx}`}
            className="block"
            onClick={() => { if (cabin.sponsoredListingId && onTrackClick) onTrackClick(cabin.sponsoredListingId); }}
          >
            <div
              className={`relative flex gap-3 p-3 bg-card rounded-2xl border hover:shadow-sm transition-all active:scale-[0.99] ${
                cabin.sponsoredTier === 'featured' ? 'border-amber-300 bg-amber-50/30' :
                cabin.sponsoredTier === 'inline_sponsored' ? 'border-blue-300 bg-blue-50/20' :
                'border-border hover:border-primary/30'
              }`}
              ref={cabin.sponsoredListingId ? (el: HTMLDivElement | null) => {
                if (el && onTrackImpression) {
                  const observer = new IntersectionObserver(([entry]) => {
                    if (entry.isIntersecting) { onTrackImpression(cabin.sponsoredListingId!); observer.disconnect(); }
                  }, { threshold: 0.5 });
                  observer.observe(el);
                }
              } : undefined}
            >
              {/* Sponsored badges */}
              {cabin.sponsoredTier === 'featured' && (
                <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-md z-10">Featured</span>
              )}
              {cabin.sponsoredTier === 'inline_sponsored' && (
                <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-md z-10">Sponsored</span>
              )}
              {/* Image */}
              <div className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-muted">
                <img
                  src={getImageUrl(imgSrc) || '/placeholder.svg'}
                  alt={cabin.name}
                  className="w-full h-full object-cover"
                />
                {/* Category badge */}
                <span className={`absolute top-1 left-1 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-md ${getCategoryColor(cabin.category)}`}>
                  {cabin.category.charAt(0).toUpperCase() + cabin.category.slice(1)}
                </span>
                {/* Rating / New badge */}
                {(cabin.reviewCount && cabin.reviewCount > 0) ? (
                  <span className="absolute top-1 right-1 flex items-center gap-0.5 text-[9px] font-bold bg-white/90 text-foreground px-1.5 py-0.5 rounded-md shadow-sm">
                    <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                    {(cabin.averageRating || 0).toFixed(1)}
                    <span className="text-muted-foreground font-normal">({cabin.reviewCount})</span>
                  </span>
                ) : (
                  <span className="absolute top-1 right-1 text-[9px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-md">
                    New
                  </span>
                )}
                {/* Distance badge */}
                {cabin.distance && (
                  <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded-md">
                    {cabin.distance.toFixed(1)}km
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h3 className="text-[13px] font-semibold text-foreground leading-tight truncate">{cabin.name}</h3>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-[11px] text-muted-foreground truncate">
                      {cabin.location?.area ? cabin.location.area.name + ', ' : (cabin.area ? cabin.area + ', ' : '')}{cabin.location?.city?.name || cabin.city || ''}
                    </span>
                  </div>

                  {/* Amenity tags */}
                  {cabin.amenities?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {cabin.amenities.slice(0, 3).map((amenity, idx) => (
                        <span key={idx} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
                          {amenity}
                        </span>
                      ))}
                      {cabin.amenities.length > 3 && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
                          +{cabin.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-primary">₹{cabin.price}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></span>
                  </div>
                  <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">Book</span>
                </div>
              </div>
            </div>
          </Link>
          );
        })}
      </div>

      {/* Load More */}
      {(hasMore || currentPage < totalPages) && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-[11px] text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          {onLoadMore && hasMore && (
            <Button
              onClick={onLoadMore}
              disabled={loadingMore}
              variant="outline"
              size="sm"
              className="rounded-xl text-[13px] min-w-28"
            >
              {loadingMore ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Loading...</>
              ) : 'Load More'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
