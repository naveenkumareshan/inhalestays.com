
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Utensils } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

interface FoodMenuModalProps {
  hostelId: string;
  menuImage?: string;
  trigger: React.ReactNode;
}

interface MenuItem {
  id: string;
  meal_type: string;
  item_name: string;
  display_order: number;
  day_of_week: string;
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DAY_LABELS: Record<string, string> = {
  sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
};

function getTodayDay(): string {
  return DAYS[new Date().getDay()];
}

export function FoodMenuModal({ hostelId, menuImage, trigger }: FoodMenuModalProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMenu = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hostel_food_menu')
      .select('*')
      .eq('hostel_id', hostelId)
      .eq('is_active', true)
      .order('display_order');
    setItems((data as any[]) || []);
    setLoading(false);
  };

  // Group items: day -> meal_type -> item names
  const grouped: Record<string, Record<string, string[]>> = {};
  DAYS.forEach(day => { grouped[day] = { breakfast: [], lunch: [], dinner: [] }; });
  items.forEach(item => {
    if (grouped[item.day_of_week]?.[item.meal_type]) {
      grouped[item.day_of_week][item.meal_type].push(item.item_name);
    }
  });

  const today = getTodayDay();

  return (
    <Dialog onOpenChange={(open) => { if (open) fetchMenu(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="h-4 w-4" /> Weekly Food Menu
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {menuImage && (
              <div className="rounded-lg overflow-hidden border">
                <img src={menuImage} alt="Food Menu" className="w-full object-contain" />
              </div>
            )}

            {items.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold w-24">Day</TableHead>
                      <TableHead className="text-xs font-semibold">🌅 Breakfast</TableHead>
                      <TableHead className="text-xs font-semibold">☀️ Lunch</TableHead>
                      <TableHead className="text-xs font-semibold">🌙 Dinner</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DAYS.map(day => (
                      <TableRow
                        key={day}
                        className={day === today ? 'bg-primary/5 font-medium' : ''}
                      >
                        <TableCell className="text-xs font-medium py-2">
                          {DAY_LABELS[day]}
                          {day === today && (
                            <span className="ml-1 text-[10px] text-primary">(Today)</span>
                          )}
                        </TableCell>
                        {(['breakfast', 'lunch', 'dinner'] as const).map(meal => (
                          <TableCell key={meal} className="text-xs py-2 text-muted-foreground">
                            {grouped[day][meal].length > 0
                              ? grouped[day][meal].join(', ')
                              : '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : !menuImage ? (
              <p className="text-center text-sm text-muted-foreground py-4">No menu items available yet.</p>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
