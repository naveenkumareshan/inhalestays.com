
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getPublicAppUrl } from '@/utils/appUrl';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';

interface CreateStudentFormProps {
  onStudentCreated?: () => void;
}

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'vendor', label: 'Partner' },
  { value: 'admin', label: 'Admin' },
  { value: 'vendor_employee', label: 'Employee' },
];

const BUSINESS_TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'company', label: 'Company' },
  { value: 'partnership', label: 'Partnership' },
];

const CreateStudentForm: React.FC<CreateStudentFormProps> = ({ onStudentCreated }) => {
  const { user } = useAuth();
  
  const filteredRoleOptions = useMemo(() => {
    if (user?.role === 'vendor') {
      return ROLE_OPTIONS.filter(r => r.value === 'student');
    }
    return ROLE_OPTIONS;
  }, [user?.role]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    gender: '',
    role: 'student',
    businessName: '',
    businessType: 'individual',
    city: '',
    state: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentialsDialog, setCredentialsDialog] = useState<{ email: string; password: string; role: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const needsPassword = formData.role !== 'student';
  const showGender = formData.role === 'student';
  const showPartnerFields = formData.role === 'vendor';

  const extractErrorMessage = async (error: any): Promise<string> => {
    if (error instanceof FunctionsHttpError) {
      try {
        const errorData = await error.context.json();
        return errorData?.error || error.message;
      } catch {
        return error.message;
      }
    }
    return error?.message || "Failed to create user. This email may already be registered.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.name || !formData.email || !formData.phone) {
        toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
        return;
      }

      if (needsPassword && (!formData.password || formData.password.length < 6)) {
        toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
        return;
      }

      if (formData.role === 'student') {
        const { data, error } = await supabase.functions.invoke('create-student', {
          body: { name: formData.name, email: formData.email, phone: formData.phone },
        });
        if (error) {
          const msg = await extractErrorMessage(error);
          throw new Error(msg);
        }
        if (data?.error) throw new Error(data.error);

        toast({ title: "Student Created", description: `Student ${formData.name} has been created.` });
      } else {
        const body: any = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role,
        };

        if (showPartnerFields) {
          body.businessName = formData.businessName;
          body.businessType = formData.businessType;
          body.city = formData.city;
          body.state = formData.state;
        }

        const { data, error } = await supabase.functions.invoke('admin-create-user', { body });
        if (error) {
          const msg = await extractErrorMessage(error);
          throw new Error(msg);
        }
        if (data?.error) throw new Error(data.error);

        const roleLabel = ROLE_OPTIONS.find(r => r.value === formData.role)?.label || formData.role;
        toast({ title: `${roleLabel} Created`, description: `${formData.name} has been created successfully.` });

        setCredentialsDialog({
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });
      }

      setFormData({ name: '', email: '', phone: '', password: '', gender: '', role: formData.role, businessName: '', businessType: 'individual', city: '', state: '' });
      onStudentCreated?.();
    } catch (error: any) {
      toast({
        title: "Creation Failed",
        description: error?.message || "Failed to create user.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLoginUrl = (role: string) => {
    if (role === 'vendor' || role === 'vendor_employee') return '/partner/login';
    if (role === 'admin') return '/admin/login';
    return '/student/login';
  };

  const handleCopyCredentials = () => {
    if (!credentialsDialog) return;
    const loginUrl = `${getPublicAppUrl()}${getLoginUrl(credentialsDialog.role)}`;
    const text = `Login URL: ${loginUrl}\nEmail: ${credentialsDialog.email}\nPassword: ${credentialsDialog.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Login credentials copied to clipboard." });
  };

  const roleLabel = ROLE_OPTIONS.find(r => r.value === formData.role)?.label || 'User';

  return (
    <>
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UserPlus className="h-4 w-4" />
            Create New User
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Role *</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v, password: '', gender: '', businessName: '', businessType: 'individual', city: '', state: '' })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filteredRoleOptions.map(r => (
                    <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input name="name" placeholder="John Doe" value={formData.name} onChange={handleChange} required className="h-8 text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input name="email" type="email" placeholder="john@example.com" value={formData.email} onChange={handleChange} required className="h-8 text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Phone *</Label>
              <Input name="phone" placeholder="9876543210" value={formData.phone} onChange={handleChange} required className="h-8 text-xs" />
            </div>

            {needsPassword && (
              <div className="space-y-1">
                <Label className="text-xs">Password *</Label>
                <Input name="password" type="password" placeholder="Min 6 characters" value={formData.password} onChange={handleChange} required className="h-8 text-xs" />
              </div>
            )}

            {showGender && (
              <div className="space-y-1">
                <Label className="text-xs">Gender</Label>
                <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male" className="text-xs">Male</SelectItem>
                    <SelectItem value="female" className="text-xs">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {showPartnerFields && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Business Name</Label>
                  <Input name="businessName" placeholder="Business name (optional)" value={formData.businessName} onChange={handleChange} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Business Type</Label>
                  <Select value={formData.businessType} onValueChange={(v) => setFormData({ ...formData, businessType: v })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPE_OPTIONS.map(bt => (
                        <SelectItem key={bt.value} value={bt.value} className="text-xs">{bt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">City</Label>
                    <Input name="city" placeholder="City" value={formData.city} onChange={handleChange} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">State</Label>
                    <Input name="state" placeholder="State" value={formData.state} onChange={handleChange} className="h-8 text-xs" />
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className="w-full h-8 text-xs" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : `Create ${roleLabel}`}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Credentials Dialog */}
      <Dialog open={!!credentialsDialog} onOpenChange={() => { setCredentialsDialog(null); setCopied(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">User Created Successfully</DialogTitle>
          </DialogHeader>
          {credentialsDialog && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Share these login credentials with the user:</p>
              <div className="border rounded-lg p-3 bg-muted/50 space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Login URL:</span>
                  <p className="font-mono text-[11px] break-all">{getPublicAppUrl()}{getLoginUrl(credentialsDialog.role)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{credentialsDialog.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Password:</span>
                  <p className="font-medium font-mono">{credentialsDialog.password}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5" onClick={handleCopyCredentials}>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied!" : "Copy Login Info"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateStudentForm;
