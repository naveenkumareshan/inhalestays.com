import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import PartnerMoreMenu from './PartnerMoreMenu';
import { usePartnerNavPreferences } from '@/hooks/usePartnerNavPreferences';
import { ICON_MAP } from './partnerIconMap';

export const PartnerBottomNav: React.FC = () => {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { pinnedItems } = usePartnerNavPreferences();

  const isMoreActive = !pinnedItems.some(t => pathname === t.url || pathname.startsWith(t.url + '/')) && pathname.startsWith('/partner');

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch max-w-lg mx-auto">
          {pinnedItems.map((tab) => {
            const active = pathname === tab.url || pathname.startsWith(tab.url + '/');
            const IconComp = ICON_MAP[tab.icon];
            return (
              <Link
                key={tab.key}
                to={tab.url}
                className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[64px] relative transition-all duration-200 overflow-hidden',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-primary" />
                )}
                <div className={cn(
                  'w-full flex flex-col items-center gap-0.5 px-0.5 py-1 rounded-xl transition-all duration-200 overflow-hidden',
                  active && 'bg-primary/10'
                )}>
                  {IconComp && <IconComp className="w-6 h-6" strokeWidth={active ? 2.5 : 1.75} />}
                  <span className={cn('text-[10px] leading-tight whitespace-nowrap', active ? 'font-semibold' : 'font-medium')}>
                    {tab.label}
                  </span>
                </div>
              </Link>
            );
          })}

          {/* More tab */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[64px] relative transition-all duration-200 overflow-hidden',
              isMoreActive || moreOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {isMoreActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-primary" />
            )}
            <div className={cn(
              'w-full flex flex-col items-center gap-0.5 px-0.5 py-1 rounded-xl transition-all duration-200 overflow-hidden',
              (isMoreActive || moreOpen) && 'bg-primary/10'
            )}>
              <MoreHorizontal className="w-6 h-6" strokeWidth={isMoreActive || moreOpen ? 2.5 : 1.75} />
              <span className={cn('text-[10px] leading-tight whitespace-nowrap', isMoreActive || moreOpen ? 'font-semibold' : 'font-medium')}>
                More
              </span>
            </div>
          </button>
        </div>
      </nav>

      <PartnerMoreMenu open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
};

export default PartnerBottomNav;
