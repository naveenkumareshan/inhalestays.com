import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { laundryCloudService } from '@/api/laundryCloudService';
import { toast } from '@/hooks/use-toast';
import { Shirt, MapPin, Search, Truck, Clock } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function Laundry() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      const data = await laundryCloudService.getActivePartners();
      setPartners(data || []);
    } catch {
      toast({ title: 'Failed to load laundry services', variant: 'destructive' });
    }
    setLoading(false);
  };

  const areas = ['all', ...Array.from(new Set(partners.map(p => p.service_area).filter(Boolean)))];

  const filtered = partners.filter(p => {
    const matchesArea = areaFilter === 'all' || p.service_area === areaFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || p.business_name?.toLowerCase().includes(q) || p.service_area?.toLowerCase().includes(q);
    return matchesArea && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-3 pt-3 pb-2 max-w-lg lg:max-w-5xl mx-auto">
          <h1 className="text-[16px] font-semibold mb-2 lg:text-xl">Laundry Services</h1>

          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search laundry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-xl border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {areas.map((area) => (
              <button
                key={area}
                onClick={() => setAreaFilter(area)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-xl border text-[11px] font-medium transition-colors h-8 ${
                  areaFilter === area
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:bg-muted'
                }`}
              >
                {area === 'all' && <Shirt className="h-3 w-3" />}
                {area === 'all' ? 'All' : area}
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
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Shirt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-[14px] font-medium text-foreground mb-1">No laundry services found</p>
              <p className="text-[12px] text-muted-foreground">Try a different search or area.</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-muted-foreground mb-2.5">{filtered.length} service{filtered.length !== 1 ? 's' : ''} found</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {filtered.map((p: any) => {
                  const mainImage = (p.images && p.images[0]) || null;
                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/laundry/${p.serial_number || p.id}`)}
                      className="flex gap-3 p-3 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                    >
                      {/* Thumbnail */}
                      <div className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                        {mainImage ? (
                          <img src={mainImage} alt={p.business_name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Shirt className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h3 className="text-[13px] font-semibold text-foreground leading-tight truncate">{p.business_name}</h3>
                          {p.service_area && (
                            <div className="flex items-center gap-0.5 mt-0.5">
                              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-[11px] text-muted-foreground truncate">{p.service_area}</span>
                            </div>
                          )}
                          {p.description && (
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            {p.delivery_time_hours && (
                              <span className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <Truck className="h-2.5 w-2.5" /> {p.delivery_time_hours}h
                              </span>
                            )}
                            {p.operating_hours && (
                              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" /> {(p.operating_hours as any)?.start}-{(p.operating_hours as any)?.end}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-lg flex-shrink-0">View</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}
