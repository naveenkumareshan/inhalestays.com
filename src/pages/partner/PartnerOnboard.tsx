import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  BookOpen, Building2, Shirt, BarChart3, Users, CreditCard, Star,
  CheckCircle2, ArrowRight, Phone, Mail, Lock, User, Eye, EyeOff,
  Armchair, BedDouble, Calendar, Shield, MapPin, ClipboardList,
  Utensils, Package, Truck, MessageSquare, AlertCircle, Loader2
} from 'lucide-react';

const PROPERTY_TYPES = [
  { id: 'reading_room', label: 'Reading Room', icon: BookOpen, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { id: 'hostel', label: 'Hostel', icon: Building2, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  { id: 'laundry', label: 'Laundry', icon: Shirt, color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
];

const FEATURES: Record<string, { icon: React.ElementType; title: string; desc: string }[]> = {
  reading_room: [
    { icon: Armchair, title: 'Seat Map Management', desc: 'Visual drag-and-drop seat layout designer for each floor' },
    { icon: Calendar, title: 'Automated Booking', desc: 'Students book & pay online — daily, weekly or monthly plans' },
    { icon: CreditCard, title: 'Due & Payment Management', desc: 'Track dues, collect payments, auto-generate receipts' },
    { icon: ClipboardList, title: 'Slot-Based Pricing', desc: 'Multiple time slots with independent pricing per room' },
    { icon: Shield, title: 'Deposit Management', desc: 'Configurable locker deposits with refund tracking' },
    { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Occupancy rates, revenue charts, expiring bookings at a glance' },
    { icon: Users, title: 'Student Management', desc: 'Create students, import via Excel, track attendance & check-ins' },
  ],
  hostel: [
    { icon: BedDouble, title: 'Bed/Room/Floor Management', desc: 'Multi-floor hostel structure with visual bed map designer' },
    { icon: Package, title: 'Sharing Types', desc: 'Single, double, triple sharing with per-type pricing' },
    { icon: Utensils, title: 'Food Management', desc: 'Weekly food menus, food opt-in pricing, policy configuration' },
    { icon: Calendar, title: 'Stay Packages', desc: 'Lock-in periods, notice periods, deposit months — fully configurable' },
    { icon: ClipboardList, title: 'Booking Calendar', desc: 'View all hostel bookings on a visual calendar dashboard' },
    { icon: Building2, title: 'Multi-Property Support', desc: 'Manage multiple hostels from a single partner dashboard' },
  ],
  laundry: [
    { icon: Package, title: 'Order Management', desc: 'Receive, track and fulfill laundry orders from students' },
    { icon: Truck, title: 'Pickup & Delivery', desc: 'Schedule pickups and deliveries with status tracking' },
    { icon: Users, title: 'Agent Dashboard', desc: 'Dedicated dashboard for laundry agents to manage orders' },
    { icon: MessageSquare, title: 'Complaint Handling', desc: 'Built-in complaint system with resolution tracking' },
  ],
};

const COMMON_FEATURES = [
  { icon: BarChart3, title: 'Partner Dashboard', desc: 'Revenue, bookings, occupancy — everything at a glance' },
  { icon: Users, title: 'Employee Management', desc: 'Add staff with granular permission controls' },
  { icon: CreditCard, title: 'Settlement Tracking', desc: 'Transparent commission & payout settlements' },
  { icon: Star, title: 'Reviews Management', desc: 'Collect & respond to student reviews' },
  { icon: Shield, title: 'Subscription Plans', desc: 'Choose plans that fit your business size' },
  { icon: MapPin, title: 'Location Listing', desc: 'Get discovered by students searching in your area' },
];

const STEPS = [
  { num: 1, title: 'Register', desc: 'Quick signup with basic details' },
  { num: 2, title: 'Verification', desc: 'Our team contacts you' },
  { num: 3, title: 'Setup', desc: 'Configure your property' },
  { num: 4, title: 'Go Live', desc: 'Start receiving bookings' },
];

const FAQ_ITEMS = [
  { q: 'What commission does InhaleStays charge?', a: 'Our commission rates vary by property type and subscription plan. Basic plans have a standard commission, while premium plans offer reduced rates. Contact our team for exact figures.' },
  { q: 'How do payments work?', a: 'Students pay online via Razorpay. We settle your earnings after deducting the agreed commission. Settlements are processed regularly and you can track everything from your dashboard.' },
  { q: 'How long does the approval process take?', a: 'Typically 1-3 business days. Our team will contact you for verification, and once approved, you can start setting up your property on the platform.' },
  { q: 'What documents do I need?', a: 'For initial registration, just your name, phone and email. After approval, you can add business documents like GST, PAN, and bank details from your dashboard at your own pace.' },
  { q: 'Can I manage multiple properties?', a: 'Absolutely! You can add multiple reading rooms, hostels, and laundry services under one partner account. Our Diamond plan offers unlimited properties.' },
  { q: 'Is there a free trial?', a: 'We offer flexible subscription plans. Contact our team to discuss a plan that works for your business size and needs.' },
  { q: 'What support do you provide?', a: 'We provide full onboarding support, training on the platform, and ongoing technical support via our dedicated partner support channel.' },
];

const PartnerOnboard: React.FC = () => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['reading_room']);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const registerRef = useRef<HTMLDivElement>(null);

  const toggleType = (id: string) => {
    setSelectedTypes(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(t => t !== id) : prev) : [...prev, id]
    );
  };

  const scrollToRegister = () => {
    registerRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Invalid email';
    if (!formData.phone.trim()) e.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(formData.phone)) e.phone = 'Enter a valid 10-digit number';
    if (!formData.password) e.password = 'Password is required';
    else if (formData.password.length < 6) e.password = 'Minimum 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('partner-register', {
        body: {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          password: formData.password,
          propertyTypes: selectedTypes,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Registration Successful! 🎉",
        description: "Our team will contact you shortly. You can now login to your partner dashboard.",
      });
      navigate('/partner/login');
    } catch (err: any) {
      toast({
        title: "Registration Failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const visibleFeatures = selectedTypes.flatMap(t => FEATURES[t] || []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 text-xs">Partner Program</Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Grow Your Business with <span className="text-primary">InhaleStays</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-8">
            List your reading rooms, hostels or laundry services on India's growing student accommodation platform. 
            Get discovered by thousands of students and automate your operations.
          </p>

          <p className="text-sm font-medium mb-3">I'm interested in listing:</p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {PROPERTY_TYPES.map(pt => {
              const selected = selectedTypes.includes(pt.id);
              const Icon = pt.icon;
              return (
                <button
                  key={pt.id}
                  onClick={() => toggleType(pt.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {pt.label}
                  {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>

          <Button size="lg" onClick={scrollToRegister} className="gap-2">
            Register as Partner <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 px-4 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">Powerful Features for Your Business</h2>
          <p className="text-muted-foreground text-center mb-10 text-sm">Everything you need to manage and grow your property</p>

          {visibleFeatures.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                {visibleFeatures.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <Card key={i} className="border hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{f.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          <h3 className="text-lg font-semibold text-center mb-4">Available for All Partners</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COMMON_FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Card key={i} className="border bg-card/50">
                  <CardContent className="p-4 flex gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-4.5 w-4.5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{f.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STEPS.map(s => (
              <div key={s.num} className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-3">
                  {s.num}
                </div>
                <h3 className="font-semibold text-sm">{s.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-4 bg-muted/20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQ_ITEMS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="text-sm font-medium text-left py-3 hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground pb-3">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Registration Form */}
      <section ref={registerRef} className="py-14 px-4" id="register">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">Start Your Journey</h2>
          <p className="text-muted-foreground text-center text-sm mb-8">
            Register in seconds. Our team will guide you through the rest.
          </p>

          <Card className="border-2">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Your name"
                      className={`pl-9 ${errors.name ? 'border-destructive' : ''}`}
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.name && <p className="text-[10px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="10-digit mobile number"
                      className={`pl-9 ${errors.phone ? 'border-destructive' : ''}`}
                      value={formData.phone}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.phone && <p className="text-[10px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.phone}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      className={`pl-9 ${errors.email ? 'border-destructive' : ''}`}
                      value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && <p className="text-[10px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      className={`pl-9 pr-9 ${errors.password ? 'border-destructive' : ''}`}
                      value={formData.password}
                      onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                      disabled={isLoading}
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[10px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.password}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Interested Property Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {PROPERTY_TYPES.map(pt => {
                      const selected = selectedTypes.includes(pt.id);
                      const Icon = pt.icon;
                      return (
                        <button
                          key={pt.id}
                          type="button"
                          onClick={() => toggleType(pt.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            selected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {pt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering...</> : <>Register as Partner <ArrowRight className="h-4 w-4" /></>}
                </Button>

                <p className="text-[10px] text-muted-foreground text-center">
                  Already have an account?{' '}
                  <a href="/partner/login" className="text-primary font-medium hover:underline">Login here</a>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-10 px-4 bg-primary/5 text-center">
        <p className="text-sm text-muted-foreground">
          Have questions? Call us at <a href="tel:+919876543210" className="text-primary font-medium">+91 98765 43210</a> or email{' '}
          <a href="mailto:partners@inhalestays.com" className="text-primary font-medium">partners@inhalestays.com</a>
        </p>
      </section>
    </div>
  );
};

export default PartnerOnboard;
