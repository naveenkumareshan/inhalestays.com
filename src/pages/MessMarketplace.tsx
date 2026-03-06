import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMessPartners } from '@/api/messService';
import { getImageUrl } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { UtensilsCrossed, MapPin, Star, Search } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

const FOOD_LABELS: Record<string, string> = { veg: '🟢 Veg', non_veg: '🔴 Non-Veg', both: '🟡 Both' };
const FOOD_BADGE: Record<string, string> = { veg: 'VEG', non_veg: 'NON', both: 'MIX' };

const categories = [
  { id: 'all', label: 'All' },
  { id: 'veg', label: '🟢 Veg' },
  { id: 'non_veg', label: '🔴 Non-Veg' },
  { id: 'both', label: '🟡 Both' },
] as const;

export default function MessMarketplace() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('all');
  const [messes, setMesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMesses();
  }, []);

  const loadMesses = async () => {
    try {
      const data = await getMessPartners({ approved: true, active: true });
      setMesses(data);
    } catch {
      toast({ title: 'Failed to load mess partners', variant: 'destructive' });
    }
    setLoading(false);
  };

  const filtered = messes.filter(m => {
    const matchesType = filter === 'all' || m.food_type === filter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || m.name?.toLowerCase().includes(q) || m.location?.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-3 pt-3 pb-2 max-w-lg lg:max-w-5xl mx-auto">
          <h1 className="text-[16px] font-semibold mb-2 lg:text-xl">Food / Mess</h1>

          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search mess..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-xl border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-xl border text-[11px] font-medium transition-colors h-8 ${
                  filter === cat.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:bg-muted'
                }`}
              >
                {cat.id === 'all' && <UtensilsCrossed className="h-3 w-3" />}
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
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[14px] font-medium text-foreground mb-1">No mess partners found</p>
              <p className="text-[12px] text-muted-foreground">Try selecting a different category.</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-muted-foreground mb-2.5">{filtered.length} mess{filtered.length !== 1 ? 'es' : ''} found</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {filtered.map((m: any) => {
                  const mainImage = m.logo_image || (m.images && m.images[0]) || '/placeholder.svg';
                  return (
                    <div
                      key={m.id}
                      onClick={() => navigate(`/mess/${m.serial_number || m.id}`)}
                      className="flex gap-3 p-3 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                    >
                      {/* Thumbnail */}
                      <div className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted">
                        <img
                          src={getImageUrl(mainImage)}
                          alt={m.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {m.food_type && (
                          <span className="absolute top-1 left-1 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md uppercase">
                            {FOOD_BADGE[m.food_type] || m.food_type}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h3 className="text-[13px] font-semibold text-foreground leading-tight truncate">{m.name}</h3>
                          {m.location && (
                            <div className="flex items-center gap-0.5 mt-0.5">
                              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-[11px] text-muted-foreground truncate">{m.location}</span>
                            </div>
                          )}
                          {m.description && (
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{m.description}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-md">
                              {FOOD_LABELS[m.food_type] || m.food_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {m.starting_price ? (
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">From ₹{m.starting_price}</span>
                            ) : null}
                            <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-lg flex-shrink-0">View</span>
                          </div>
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
