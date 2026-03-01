
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { hostelService } from '@/api/hostelService';
import { MapPin, Hotel, Star, Utensils } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';

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
  const navigate = useNavigate();
  const { toast } = useToast();

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
    return genderFilter === 'all' || hostel.gender === genderFilter;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-3 pt-3 pb-2 max-w-lg lg:max-w-5xl mx-auto">
          <h1 className="text-[16px] font-semibold mb-2 lg:text-xl">Hostels</h1>

          {/* Gender filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {genderFilters.map((g) => (
              <button
                key={g.id}
                onClick={() => setGenderFilter(g.id)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-xl border text-[11px] font-medium transition-colors h-8 ${
                  genderFilter === g.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:bg-muted'
                }`}
              >
                {g.id === 'all' && <Hotel className="h-3 w-3" />}
                {g.label}
              </button>
            ))}
          </div>
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
        ) : filteredHostels.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[14px] font-medium text-foreground mb-1">No hostels found</p>
            <p className="text-[12px] text-muted-foreground">
              {genderFilter !== 'all' ? 'Try adjusting your filter' : 'No hostels available'}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[11px] text-muted-foreground mb-2.5">{filteredHostels.length} hostels found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredHostels.map((hostel) => (
              <div
                key={hostel.id}
                onClick={() => navigate(`/hostels/${hostel.serial_number || hostel.id}`)}
                className="flex gap-3 p-3 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted">
                  {hostel.logo_image ? (
                    <img src={hostel.logo_image} alt={hostel.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Hotel className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  {hostel.gender && (
                    <span className="absolute top-1 left-1 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md">
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
                    <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-lg flex-shrink-0">View Rooms</span>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
