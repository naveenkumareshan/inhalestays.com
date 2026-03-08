import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, MailIcon, GraduationCap, Shield, AlertTriangle, Pencil, X, Check, LogOut, FileText, Lock, BookMarked, ChevronRight, ChevronDown, Info, MessageSquareWarning, Headphones, Phone, Camera, Loader2, BadgeCheck, Mail } from 'lucide-react';
import { userProfileService } from '@/api/userProfileService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { bookingsService } from '@/api/bookingsService';
import { format } from 'date-fns';

interface ProfileData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  alternate_phone: string;
  address: string;
  bio: string;
  course_studying: string;
  college_studied: string;
  parent_mobile_number: string;
  profile_picture: string;
  profile_edit_count: number;
  gender: string;
  city: string;
  state: string;
  pincode: string;
  date_of_birth: string | null;
  course_preparing_for: string;
}

const defaultProfile: ProfileData = {
  name: '', email: '', phone: '', address: '', bio: '',
  course_studying: '', college_studied: '', parent_mobile_number: '',
  profile_picture: '', profile_edit_count: 0,
  gender: '', city: '', state: '',
  pincode: '', alternate_phone: '', date_of_birth: null,
  course_preparing_for: '',
};


const SECTION_FIELDS: Record<string, (keyof ProfileData)[]> = {
  account: ['name', 'email', 'phone', 'alternate_phone', 'gender'],
  personal: ['date_of_birth', 'address', 'city', 'state', 'pincode'],
  academic: ['course_preparing_for', 'course_studying', 'college_studied', 'parent_mobile_number', 'bio'],
};

const SECTIONS = [
  { key: 'account', label: 'Account Info', icon: User },
  { key: 'personal', label: 'Personal Info', icon: MailIcon },
  { key: 'academic', label: 'Academic Info', icon: GraduationCap },
  { key: 'security', label: 'Security', icon: Shield },
];

export const ProfileManagement = () => {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [isLoading, setIsLoading] = useState(false);

  const [openSheet, setOpenSheet] = useState<string | null>(null);
  const [sectionDraft, setSectionDraft] = useState<Partial<ProfileData>>({});

  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
      return;
    }
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    setIsUploadingPicture(true);
    try {
      const result = await userProfileService.uploadProfilePicture(file);
      if (result.success && result.data?.url) {
        setProfile(prev => ({ ...prev, profile_picture: result.data!.url }));
        toast({ title: 'Success', description: 'Profile picture updated!' });
      } else {
        toast({ title: 'Error', description: 'Failed to upload picture', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to upload picture', variant: 'destructive' });
    } finally {
      setIsUploadingPicture(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    loadProfile();
    loadBookings();
    checkEmailVerification();
  }, []);

  const checkEmailVerification = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmailVerified(!!user.email_confirmed_at);
    }
  };

  const handleSendVerification = async () => {
    if (!profile.email) return;
    setIsSendingVerification(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: profile.email });
      if (error) throw error;
      toast({ title: 'Verification Sent', description: 'Check your email for the verification link.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to send verification email', variant: 'destructive' });
    } finally {
      setIsSendingVerification(false);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await userProfileService.getUserProfile();
      if (response.success && response.data) {
        const data = response.data as any;
        const mapped: ProfileData = {
          id: data.id, name: data.name || '', email: data.email || '',
          phone: data.phone || '', alternate_phone: data.alternate_phone || '',
          address: data.address || '', bio: data.bio || '',
          course_studying: data.course_studying || '', college_studied: data.college_studied || '',
          parent_mobile_number: data.parent_mobile_number || '', profile_picture: data.profile_picture || '',
          profile_edit_count: data.profile_edit_count || 0, gender: data.gender || '',
          city: data.city || '', state: data.state || '', pincode: data.pincode || '',
          date_of_birth: data.date_of_birth || null, course_preparing_for: data.course_preparing_for || '',
        };
        setProfile(mapped);
      }
    } catch {
      console.error('Failed to load profile data');
    }
  };

  const loadBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch both reading room and hostel bookings in parallel
      const [readingRes, hostelRes] = await Promise.all([
        bookingsService.getUserBookings(),
        supabase
          .from('hostel_bookings')
          .select('*, hostels(name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(2),
      ]);

      const readingBookings = (readingRes.success && Array.isArray(readingRes.data))
        ? readingRes.data.map((b: any) => ({ ...b, type: 'reading_room' as const }))
        : [];

      const hostelBookings = (hostelRes.data || []).map((b: any) => ({
        ...b,
        type: 'hostel' as const,
        payment_status: b.payment_status || b.status,
      }));

      // Merge, sort by created_at desc, take 2
      const merged = [...readingBookings, ...hostelBookings]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2);

      // Fetch dues for reading room bookings
      const rrIds = merged.filter((b: any) => b.type === 'reading_room').map((b: any) => b.id);
      const hIds = merged.filter((b: any) => b.type === 'hostel').map((b: any) => b.id);

      const [duesRes, hostelDuesRes] = await Promise.all([
        rrIds.length > 0
          ? supabase.from('dues').select('booking_id, due_amount, paid_amount').in('booking_id', rrIds)
          : Promise.resolve({ data: [] }),
        hIds.length > 0
          ? supabase.from('hostel_dues').select('booking_id, due_amount, paid_amount').in('booking_id', hIds)
          : Promise.resolve({ data: [] }),
      ]);

      const dueMap: Record<string, number> = {};
      for (const d of [...(duesRes.data || []), ...(hostelDuesRes.data || [])]) {
        if ((d as any).booking_id) {
          dueMap[(d as any).booking_id] = (dueMap[(d as any).booking_id] || 0) + ((d as any).due_amount - (d as any).paid_amount);
        }
      }
      merged.forEach((b: any) => { b.dueAmount = dueMap[b.id] || 0; });

      setBookings(merged);
    } finally {
      setLoadingBookings(false);
    }
  };

  const openSectionSheet = (section: string) => {
    if (section !== 'security') {
      const fields = SECTION_FIELDS[section] || [];
      const draft: Partial<ProfileData> = {};
      fields.forEach((f) => { (draft as any)[f] = (profile as any)[f]; });
      setSectionDraft(draft);
    }
    setOpenSheet(section);
  };

  const saveSection = async (section: string) => {
    setIsLoading(true);
    try {
      const merged = { ...profile, ...sectionDraft };
      const response = await userProfileService.updateProfile(merged);
      if (response.success) {
        toast({ title: 'Saved', description: 'Section updated successfully' });
        setProfile(merged);
        setOpenSheet(null);
        setSectionDraft({});
      } else {
        toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Success', description: 'Password updated successfully' });
      setNewPassword('');
      setConfirmPassword('');
      setOpenSheet(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update password', variant: 'destructive' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const field = (id: keyof ProfileData, label: string, type = 'text', placeholder = '') => {
    const value = id in sectionDraft ? (sectionDraft as any)[id] : (profile[id] as string) || '';
    return (
      <div key={id}>
        <Label htmlFor={id} className="text-[12px] mb-1 block">{label}</Label>
        <Input
          id={id} type={type} value={value}
          onChange={(e) => setSectionDraft(prev => ({ ...prev, [id]: e.target.value }))}
          placeholder={placeholder} className="h-9 text-[13px]"
        />
      </div>
    );
  };

  const initials = profile.name?.charAt(0)?.toUpperCase() || '?';

  const renderSheetContent = (section: string) => {
    if (section === 'account') {
      return (
        <div className="space-y-4">
          {profile.profile_edit_count >= 1 && (
            <Alert>
              <AlertTriangle className="h-3.5 w-3.5" />
              <AlertDescription className="text-[12px]">
                {2 - profile.profile_edit_count} edit{2 - profile.profile_edit_count !== 1 ? 's' : ''} remaining.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Gender</Label>
            <div className="flex gap-3">
              {['male', 'female'].map(g => {
                const val = 'gender' in sectionDraft ? sectionDraft.gender : profile.gender;
                return (
                  <button key={g} type="button"
                    onClick={() => setSectionDraft(prev => ({ ...prev, gender: g }))}
                    className={`flex flex-col items-center gap-1 ${val === g ? (g === 'male' ? 'text-blue-600' : 'text-pink-600') : 'text-muted-foreground'}`}>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${val === g ? g === 'male' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-pink-100 border-2 border-pink-500' : 'bg-muted'}`}>
                      <User className={`h-5 w-5 ${g === 'male' ? 'text-blue-500' : 'text-pink-500'}`} />
                    </div>
                    <span className="text-[11px] font-medium capitalize">{g}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {field('name', 'Full Name')}
            {field('email', 'Email', 'email')}
            {field('phone', 'Phone')}
            {field('alternate_phone', 'Alternate Phone')}
          </div>
          <Button onClick={() => saveSection('account')} disabled={isLoading} className="w-full h-10 rounded-xl text-[13px]">
            {isLoading ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      );
    }
    if (section === 'personal') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {field('date_of_birth', 'Date of Birth', 'date')}
            {field('address', 'Address')}
            {field('city', 'City')}
            {field('state', 'State')}
            {field('pincode', 'Pincode')}
          </div>
          <Button onClick={() => saveSection('personal')} disabled={isLoading} className="w-full h-10 rounded-xl text-[13px]">
            {isLoading ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      );
    }
    if (section === 'academic') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {field('course_preparing_for', 'Preparing For', 'text', 'e.g., NEET, JEE')}
            {field('course_studying', 'Course Studying', 'text', 'e.g., B.Tech')}
            {field('college_studied', 'College / University', 'text', 'Name of your college')}
            {field('parent_mobile_number', 'Parent / Guardian Mobile', 'text', 'Emergency contact')}
            <div>
              <Label htmlFor="bio" className="text-[12px] mb-1 block">Bio</Label>
              <Textarea id="bio"
                value={'bio' in sectionDraft ? sectionDraft.bio || '' : profile.bio}
                onChange={(e) => setSectionDraft(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself…" rows={3} className="text-[13px]" />
            </div>
          </div>
          <Button onClick={() => saveSection('academic')} disabled={isLoading} className="w-full h-10 rounded-xl text-[13px]">
            {isLoading ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      );
    }
    if (section === 'security') {
      return (
        <div className="space-y-4">
          <p className="text-[12px] text-muted-foreground">Change your account password.</p>
          <div className="space-y-2">
            <div>
              <Label className="text-[12px] mb-1 block">New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="text-[12px] mb-1 block">Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="h-9 text-[13px]" />
            </div>
            <Button onClick={handleChangePassword} disabled={isChangingPassword || !newPassword} className="h-10 text-[13px] rounded-xl w-full">
              {isChangingPassword ? 'Updating…' : 'Update Password'}
            </Button>
          </div>
        </div>
      );
    }
    return null;
  };

  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div className="max-w-lg mx-auto space-y-3 px-3 py-3">
      {/* Header card with avatar + collapsible nav rows */}
      <div className="bg-card rounded-2xl border overflow-hidden">
        {/* Avatar section with name, email, phone, edit */}
        <div className="flex items-center gap-4 p-4">
          <div className="relative flex-shrink-0">
            <Avatar className="h-16 w-16">
              {isUploadingPicture ? (
                <AvatarFallback className="bg-muted">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </AvatarFallback>
              ) : (
                <>
                  <AvatarImage src={profile.profile_picture} alt={profile.name} />
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground">{initials}</AvatarFallback>
                </>
              )}
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleProfilePictureUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPicture}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
            >
              <Camera className="h-3 w-3" />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-foreground">{profile.name || 'Your Name'}</p>
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              {profile.email}
              {emailVerified === true && (
                <span className="inline-flex items-center gap-0.5 text-green-600">
                  <BadgeCheck className="h-3 w-3" />
                </span>
              )}
              {emailVerified === false && (
                <button
                  onClick={handleSendVerification}
                  disabled={isSendingVerification}
                  className="inline-flex items-center gap-0.5 text-amber-600 hover:text-amber-700 text-[10px] font-medium ml-1"
                >
                  <Mail className="h-3 w-3" />
                  {isSendingVerification ? 'Sending…' : 'Verify'}
                </button>
              )}
            </p>
            {profile.phone && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3" /> {profile.phone}
              </p>
            )}
            {profile.profile_edit_count >= 2 && (
              <p className="text-[10px] text-destructive mt-0.5">Profile edit limit reached</p>
            )}
          </div>
        </div>

        {/* Collapsible More Info toggle + section rows */}
        <Collapsible open={infoOpen} onOpenChange={setInfoOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-4 py-2.5 border-t hover:bg-muted/50 transition-colors">
              <span className="text-[12px] font-medium text-muted-foreground">More Info</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${infoOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="divide-y">
              {SECTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => openSectionSheet(key)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[13px] font-medium text-foreground flex-1">{label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* My Bookings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
            <BookMarked className="h-3.5 w-3.5 text-primary" /> My Bookings
          </p>
          <Link to="/student/bookings" className="text-[12px] text-primary flex items-center gap-0.5 font-medium">
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {loadingBookings ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        ) : bookings.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-2 border-muted bg-transparent">
            <CardContent className="py-5 text-center">
              <p className="text-[12px] text-muted-foreground">No bookings yet.</p>
              <Link to="/cabins" className="text-[12px] text-primary font-medium mt-1 block">
                Browse reading rooms →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {bookings.map((b: any) => (
              <Link key={b.id} to={b.type === 'hostel' ? `/student/hostel-bookings/${b.serial_number || b.id}` : `/student/bookings/${b.serial_number || b.id}`}>
                <Card className="rounded-2xl border-0 shadow-sm bg-card hover:shadow-md transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <BookMarked className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {b.type === 'hostel'
                          ? `${(b.hostels as any)?.name || 'Hostel'} — Bed #${b.bed_number || '—'}`
                          : `${(b.cabins as any)?.name || 'Reading Room'} — ${(b.seats as any)?.floor ? `Floor ${(b.seats as any).floor} · ` : ''}Seat #${b.seat_number || '—'}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {b.start_date ? format(new Date(b.start_date), 'd MMM') : '—'} → {b.end_date ? format(new Date(b.end_date), 'd MMM yyyy') : '—'}
                      </p>
                    </div>
                    {(b.dueAmount ?? 0) > 0 ? (
                      <Badge variant="outline" className="border-red-500 text-red-600 text-[10px] px-1.5 py-0.5 flex-shrink-0">
                        Due: ₹{b.dueAmount?.toLocaleString()}
                      </Badge>
                    ) : b.payment_status === 'completed' ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0.5 flex-shrink-0">
                        Fully Paid
                      </Badge>
                    ) : b.payment_status === 'advance_paid' ? (
                      <Badge variant="outline" className="border-amber-500 text-amber-600 text-[10px] px-1.5 py-0.5 flex-shrink-0">
                        Advance Paid
                      </Badge>
                    ) : b.payment_status === 'pending' ? (
                      <Badge variant="outline" className="border-amber-500 text-amber-500 text-[10px] px-1.5 py-0.5 flex-shrink-0">
                        Pending
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-destructive text-destructive text-[10px] px-1.5 py-0.5 flex-shrink-0">
                        {b.payment_status}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="space-y-2">
        <p className="text-[13px] font-semibold text-foreground">Quick Links</p>
        <div className="grid grid-cols-2 gap-2">
          <Link to="/student/complaints">
            <Card className="rounded-2xl border hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquareWarning className="h-4 w-4 text-orange-600" />
                </div>
                <span className="text-[12px] font-medium text-foreground">Complaints</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/student/support">
            <Card className="rounded-2xl border hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Headphones className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-[12px] font-medium text-foreground">Support</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Legal links */}
      <div className="flex items-center justify-center gap-4 pt-1">
        <Link to="/about" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors">
          <Info className="h-3 w-3" /> About
        </Link>
        <span className="text-muted-foreground text-[11px]">·</span>
        <Link to="/privacy-policy" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors">
          <Lock className="h-3 w-3" /> Privacy
        </Link>
        <span className="text-muted-foreground text-[11px]">·</span>
        <Link to="/terms" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors">
          <FileText className="h-3 w-3" /> Terms
        </Link>
      </div>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full rounded-2xl h-11 text-[13px] text-destructive border-destructive/30 hover:bg-destructive/5 gap-2"
        onClick={logout}
      >
        <LogOut className="h-4 w-4" /> Logout
      </Button>

      {/* Section Sheets */}
      {SECTIONS.map(({ key, label }) => (
        <Sheet key={key} open={openSheet === key} onOpenChange={(open) => !open && setOpenSheet(null)}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-[15px]">{label}</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {openSheet === key && renderSheetContent(key)}
            </div>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  );
};
