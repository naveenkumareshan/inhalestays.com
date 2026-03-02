
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Utensils } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
  sunday: 'Sun', monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat',
};

const mealTypeLabels: Record<string, string> = {
  breakfast: '🌅 Breakfast',
  lunch: '☀️ Lunch',
  dinner: '🌙 Dinner',
};

function getTodayDay(): string {
  return DAYS[new Date().getDay()];
}

export function FoodMenuModal({ hostelId, menuImage, trigger }: FoodMenuModalProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(getTodayDay());

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

  const dayItems = items.filter(i => i.day_of_week === selectedDay);
  const grouped = dayItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.meal_type]) acc[item.meal_type] = [];
    acc[item.meal_type].push(item);
    return acc;
  }, {});

  return (
    <Dialog onOpenChange={(open) => { if (open) fetchMenu(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="h-4 w-4" /> Food Menu
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

            <Tabs value={selectedDay} onValueChange={setSelectedDay}>
              <TabsList className="w-full flex overflow-x-auto">
                {DAYS.map(day => (
                  <TabsTrigger key={day} value={day} className="flex-1 text-xs px-1.5">
                    {DAY_LABELS[day]}
                  </TabsTrigger>
                ))}
              </TabsList>

              {DAYS.map(day => (
                <TabsContent key={day} value={day}>
                  <div className="space-y-3 pt-1">
                    {['breakfast', 'lunch', 'dinner'].map(mealType => {
                      const mealItems = day === selectedDay ? grouped[mealType] : undefined;
                      if (!mealItems?.length) return null;
                      return (
                        <div key={mealType}>
                          <h3 className="text-sm font-semibold mb-1.5">{mealTypeLabels[mealType]}</h3>
                          <div className="flex flex-wrap gap-1.5">
                            {mealItems.map(item => (
                              <Badge key={item.id} variant="secondary" className="text-xs">
                                {item.item_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {dayItems.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4">No menu items for this day.</p>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {items.length === 0 && !menuImage && (
              <p className="text-center text-sm text-muted-foreground py-4">No menu items available yet.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
