import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen, Hotel, Wifi, Shield, Clock, Coffee,
  Star, Users, ChevronRight, Leaf, CheckCircle,
  ClipboardList, Shirt, BookMarked, UtensilsCrossed,
} from 'lucide-react';

const WHY_FEATURES = [
  { icon: BookOpen, title: 'Premium Spaces', desc: 'Quiet, well-equipped rooms for focused study.', color: 'bg-primary/10 text-primary' },
  { icon: Shield, title: 'Safe & Secure', desc: '24/7 CCTV and secure access control.', color: 'bg-secondary/10 text-secondary' },
  { icon: Clock, title: 'Open 24/7', desc: 'Study at any hour — always accessible.', color: 'bg-accent/30 text-primary' },
  { icon: Wifi, title: 'High-Speed WiFi', desc: 'Blazing fast internet at every desk.', color: 'bg-primary/10 text-primary' },
  { icon: Coffee, title: 'Amenities', desc: 'Ergonomic seating & charging points.', color: 'bg-secondary/10 text-secondary' },
];

const WhyCarousel: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const next = useCallback(() => setIdx((i) => (i + 1) % WHY_FEATURES.length), []);

  useEffect(() => {
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next]);

  const f = WHY_FEATURES[idx];
  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl">
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${f.color}`}>
              <f.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[13px] text-foreground">{f.title}</p>
              <p className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed">{f.desc}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5">
        {WHY_FEATURES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`}
          />
        ))}
      </div>
    </div>
  );
};
import inhalestaysLogo from '@/assets/inhalestays-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { bookingsService } from '@/api/bookingsService';
import { differenceInDays, format } from 'date-fns';
import { HomeBanner } from '@/components/home/HomeBanner';

/* ─── Authenticated home view ───────────────────────────────────────── */
const AuthenticatedHome: React.FC<{ user: any }> = ({ user }) => {
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const navigate = useNavigate();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  useEffect(() => {
    (async () => {
      try {
        const res = await bookingsService.getCurrentBookings();
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setActiveBooking(res.data[0]);
        }
      } finally {
        setLoadingBooking(false);
      }
    })();
  }, []);

  const daysLeft = activeBooking
    ? differenceInDays(new Date(activeBooking.end_date), new Date())
    : 0;

  const quickActions = [
    { icon: BookOpen, label: 'Reading Rooms', to: '/cabins', color: 'bg-primary/10 text-primary' },
    { icon: Hotel, label: 'Hostels', to: '/hostels', color: 'bg-secondary/10 text-secondary' },
    { icon: UtensilsCrossed, label: 'Mess', to: '/mess', color: 'bg-accent/30 text-primary' },
    { icon: Shirt, label: 'Laundry', to: '/laundry', color: 'bg-muted text-muted-foreground' },
  ];

  return (
    <div className="flex flex-col bg-background">
      {/* Greeting header */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-accent/80 text-primary-foreground px-4 pt-5 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <img src={inhalestaysLogo} alt="InhaleStays" className="w-7 h-7 object-contain bg-white rounded-lg p-0.5" />
            <p className="text-primary-foreground/80 text-[12px]">InhaleStays</p>
          </div>
          <h1 className="text-[20px] font-bold leading-tight">
            {greeting}, {user?.name?.split(' ')[0] || 'Student'} 👋
          </h1>
          <p className="text-primary-foreground/70 text-[12px] mt-0.5">{user?.email}</p>
        </div>
      </section>

      <div className="px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {/* Active booking card */}
        <div>
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Current Booking</p>
          {loadingBooking ? (
            <Skeleton className="h-24 w-full rounded-2xl" />
          ) : activeBooking ? (
            <Card className="rounded-2xl border-0 shadow-md bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">
                      {(activeBooking.cabins as any)?.name || 'Study Room'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Seat #{activeBooking.seat_number} · Expires {format(new Date(activeBooking.end_date), 'd MMM')}
                    </p>
                    <p className="text-[11px] font-medium text-primary mt-1">
                      {daysLeft > 0 ? `${daysLeft} days remaining` : 'Expires today'}
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <BookMarked className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 h-8 text-[12px] rounded-xl w-full"
                  onClick={() => navigate('/student/bookings')}
                >
                  View Details <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border-dashed border-2 border-muted bg-transparent">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-foreground">No active booking</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Find a reading room near you</p>
                </div>
                <Link to="/cabins">
                  <Button size="sm" className="h-8 text-[12px] rounded-xl">
                    Book Now <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick actions — 2x2 grid */}
        <div>
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map((a) => (
              <Link key={a.label} to={a.to} className="block">
                <div className="flex items-center gap-3 p-3 bg-card rounded-2xl border active:scale-95 transition-transform">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${a.color}`}>
                    <a.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[12px] font-medium text-foreground leading-tight">{a.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Banner carousel — after quick actions */}
        <HomeBanner />

        {/* Why InhaleStays — auto carousel */}
        <WhyCarousel />
      </div>
    </div>
  );
};

/* ─── Public/guest marketing view ───────────────────────────────────── */
const GuestHome: React.FC = () => {
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="flex flex-col bg-background">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary/90 to-accent/80 text-primary-foreground px-3 pt-4 pb-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/20 rounded-full translate-y-1/2 -translate-x-1/4 blur-xl pointer-events-none" />

        <div className="relative max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <img src={inhalestaysLogo} alt="InhaleStays" className="w-7 h-7 object-contain bg-white rounded-lg p-0.5" />
            <p className="text-primary-foreground/80 text-[13px] font-medium">{greeting} 👋</p>
          </div>

          <h1 className="text-xl font-bold leading-tight mb-1.5">Your Perfect Study Space</h1>
          <p className="text-primary-foreground/75 text-[12px] mb-4 max-w-xs">
            Book reading rooms &amp; hostels designed for focused study and comfort.
          </p>

          <div className="flex gap-2 mb-5">
            {[{ label: '500+', sub: 'Students' }, { label: '50+', sub: 'Rooms' }, { label: '24/7', sub: 'Access' }].map((s) => (
              <div key={s.sub} className="flex-1 bg-white/10 rounded-xl py-2 text-center">
                <p className="font-bold text-[13px] leading-none">{s.label}</p>
                <p className="text-primary-foreground/70 text-[10px] mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Link to="/cabins" className="block">
              <div className="bg-white text-primary rounded-2xl p-3 flex flex-col items-center gap-1.5 shadow-lg active:scale-95 transition-transform">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <span className="font-semibold text-[12px] text-center leading-tight">Book Reading Room</span>
                <ChevronRight className="w-3.5 h-3.5 text-primary/60" />
              </div>
            </Link>
            <Link to="/hostels" className="block">
              <div className="bg-secondary text-secondary-foreground rounded-2xl p-3 flex flex-col items-center gap-1.5 shadow-lg active:scale-95 transition-transform">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Hotel className="w-5 h-5" />
                </div>
                <span className="font-semibold text-[12px] text-center leading-tight">Find a Hostel</span>
                <ChevronRight className="w-3.5 h-3.5 text-secondary-foreground/60" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us — auto carousel */}
      <section className="px-3 py-4 bg-background">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-1.5 mb-3">
            <Leaf className="w-3.5 h-3.5 text-primary" />
            <h2 className="font-semibold text-[15px] text-foreground">Why InhaleStays?</h2>
          </div>
          <WhyCarousel />
        </div>
      </section>

      {/* How It Works */}
      <section className="px-3 py-4 bg-muted/40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-1.5 mb-3">
            <Users className="w-3.5 h-3.5 text-secondary" />
            <h2 className="font-semibold text-[15px] text-foreground">How It Works</h2>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
            {[
              { step: '1', title: 'Choose a Room', desc: 'Browse reading rooms or hostels near you.', from: 'from-primary', to: 'to-primary/60' },
              { step: '2', title: 'Select Your Seat', desc: 'Pick your favourite spot from the layout.', from: 'from-secondary', to: 'to-secondary/60' },
              { step: '3', title: 'Confirm & Enjoy', desc: 'Pay, receive confirmation, and arrive!', from: 'from-accent', to: 'to-accent/60' },
            ].map((s) => (
              <Card key={s.step} className="flex-shrink-0 w-40 border-0 shadow-sm bg-card">
                <CardContent className="p-3 flex flex-col gap-2">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.from} ${s.to} flex items-center justify-center text-primary-foreground font-bold text-[13px] shadow-sm`}>
                    {s.step}
                  </div>
                  <p className="font-semibold text-[12px] text-foreground">{s.title}</p>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-3 py-4 bg-background">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-1.5 mb-3">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <h2 className="font-semibold text-[15px] text-foreground">What Students Say</h2>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
            {[
              { name: 'Arjun Patel', role: 'Engineering Student', initial: 'A', review: 'Perfect quiet environment for studying. Booking is super easy!', color: 'bg-primary' },
              { name: 'Priya Sharma', role: 'CA Aspirant', initial: 'P', review: 'Amazing WiFi speed. Using InhaleStays for 6 months now!', color: 'bg-secondary' },
              { name: 'Rahul Kumar', role: 'Medical Student', initial: 'R', review: 'Clean, comfortable, affordable. 24/7 access is perfect.', color: 'bg-accent' },
            ].map((t) => (
              <Card key={t.name} className="flex-shrink-0 w-56 border-0 shadow-sm bg-card">
                <CardContent className="p-3 flex flex-col gap-1.5">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">"{t.review}"</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`w-7 h-7 ${t.color} rounded-lg flex items-center justify-center text-primary-foreground text-[10px] font-bold`}>{t.initial}</div>
                    <div>
                      <p className="text-[11px] font-semibold text-foreground">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-3 py-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-lg mx-auto text-center space-y-3">
          <CheckCircle className="w-8 h-8 mx-auto text-secondary" />
          <h2 className="font-bold text-base">Ready to get started?</h2>
          <p className="text-primary-foreground/75 text-[12px]">Join hundreds of students who trust InhaleStays for their study space.</p>
          <Link to="/cabins">
            <Button className="bg-white text-primary hover:bg-white/90 rounded-xl px-6 py-3 text-[13px] font-semibold shadow-lg w-full max-w-xs mx-auto">
              Explore Reading Rooms <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

/* ─── Root export ────────────────────────────────────────────────────── */
export default function Index() {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    const role = user?.role;
    if (role === 'vendor' || role === 'vendor_employee') {
      return <Navigate to="/partner/dashboard" replace />;
    }
    if (role === 'admin' || role === 'super_admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (role === 'student') {
      return <AuthenticatedHome user={user} />;
    }
  }

  return <GuestHome />;
}
