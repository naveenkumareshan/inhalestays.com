import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DEFAULT_NAV_ITEMS, type NavItem } from '@/hooks/usePartnerNavPreferences';
import { ICON_MAP } from './partnerIconMap';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentItems: NavItem[];
  availableOptions: NavItem[];
  onSave: (items: NavItem[]) => Promise<void>;
  isSaving: boolean;
}

const PartnerNavCustomizer: React.FC<Props> = ({ open, onOpenChange, currentItems, availableOptions, onSave, isSaving }) => {
  const [selected, setSelected] = useState<NavItem[]>(currentItems);

  const handleToggle = (item: NavItem) => {
    const idx = selected.findIndex(s => s.key === item.key);
    if (idx >= 0) {
      setSelected(selected.filter(s => s.key !== item.key));
    } else if (selected.length < 4) {
      setSelected([...selected, item]);
    }
  };

  const handleSave = async () => {
    if (selected.length !== 4) return;
    await onSave(selected);
    onOpenChange(false);
  };

  const handleReset = () => setSelected(DEFAULT_NAV_ITEMS);

  // Sync when opened
  React.useEffect(() => {
    if (open) setSelected(currentItems);
  }, [open, currentItems]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="text-base font-semibold">Customize Navigation</SheetTitle>
          <p className="text-xs text-muted-foreground">Select exactly 4 items for your bottom nav bar</p>
        </SheetHeader>
        <ScrollArea className="h-[calc(85vh-160px)]">
          <div className="px-4 py-3 grid grid-cols-3 gap-2">
            {availableOptions.map((item) => {
              const selIdx = selected.findIndex(s => s.key === item.key);
              const isSelected = selIdx >= 0;
              const IconComp = ICON_MAP[item.icon];
              return (
                <button
                  key={item.key}
                  onClick={() => handleToggle(item)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-colors relative',
                    isSelected
                      ? 'bg-primary/10 text-primary ring-2 ring-primary/30'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted/70',
                    !isSelected && selected.length >= 4 && 'opacity-40 cursor-not-allowed'
                  )}
                  disabled={!isSelected && selected.length >= 4}
                >
                  {isSelected && (
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                      {selIdx + 1}
                    </span>
                  )}
                  {IconComp && <IconComp className="h-5 w-5" strokeWidth={isSelected ? 2.2 : 1.6} />}
                  <span className={cn('text-[10px] leading-tight', isSelected ? 'font-semibold' : 'font-medium')}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
        <div className="flex gap-2 px-4 py-3 border-t">
          <Button variant="outline" size="sm" onClick={handleReset} className="flex-1">
            Reset Default
          </Button>
          <Button size="sm" onClick={handleSave} disabled={selected.length !== 4 || isSaving} className="flex-1">
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PartnerNavCustomizer;
