import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { laundryCloudService } from '@/api/laundryCloudService';
import { Loader2, ShoppingBag, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  pickup_scheduled: 'bg-indigo-100 text-indigo-800',
  picked_up: 'bg-violet-100 text-violet-800',
  washing: 'bg-cyan-100 text-cyan-800',
  ready: 'bg-teal-100 text-teal-800',
  out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const StudentLaundryOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState<Record<string, boolean>>({});

  useEffect(() => {
    laundryCloudService.getUserOrders().then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">My Laundry Orders</h1>
        <Button size="sm" asChild><Link to="/laundry">+ New Order</Link></Button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No orders yet</p>
          <Button className="mt-4" asChild><Link to="/laundry">Place Your First Order</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o: any) => {
            const isExpanded = expanded === o.id;
            return (
              <Card key={o.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(isExpanded ? null : o.id)}>
                    <div>
                      <p className="text-sm font-semibold">{o.serial_number || o.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${statusColors[o.status] || 'bg-muted'}`}>
                        {o.status?.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-sm font-medium">₹{o.total_amount}</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t pt-3">
                      {/* Items */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Items</p>
                        {o.laundry_order_items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.item_name} × {item.quantity}</span>
                            <span>₹{item.subtotal}</span>
                          </div>
                        ))}
                      </div>

                      {/* OTP */}
                      {!o.pickup_otp_verified && o.status !== 'cancelled' && o.status !== 'delivered' && (
                        <div className="bg-primary/5 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Pickup OTP</p>
                          <div className="flex items-center justify-center gap-2">
                            <p className="text-2xl font-bold tracking-widest text-primary">
                              {showOtp[o.id] ? o.pickup_otp : '••••'}
                            </p>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setShowOtp(p => ({ ...p, [o.id]: !p[o.id] })); }}>
                              {showOtp[o.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>
                      )}

                      {o.pickup_otp_verified && !o.delivery_otp_verified && o.status !== 'delivered' && (
                        <div className="bg-primary/5 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Delivery OTP</p>
                          <div className="flex items-center justify-center gap-2">
                            <p className="text-2xl font-bold tracking-widest text-primary">
                              {showOtp[`${o.id}_d`] ? o.delivery_otp : '••••'}
                            </p>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setShowOtp(p => ({ ...p, [`${o.id}_d`]: !p[`${o.id}_d`] })); }}>
                              {showOtp[`${o.id}_d`] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Details */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        {o.pickup_date && <p>Pickup: {o.pickup_date} • {o.pickup_time_slot}</p>}
                        {o.delivery_date && <p>Delivery: {o.delivery_date} • {o.delivery_time_slot}</p>}
                        {(o.laundry_partners as any)?.business_name && <p>Partner: {(o.laundry_partners as any).business_name}</p>}
                        <p>Payment: <Badge variant="outline" className="text-[10px]">{o.payment_status}</Badge></p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentLaundryOrders;
