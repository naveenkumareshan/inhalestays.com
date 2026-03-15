
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Mail, Shield, UserPlus, Key, Link2, RefreshCw, Code } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  type: 'auth';
  file: string;
}

const AUTH_TEMPLATES: TemplateInfo[] = [
  {
    id: 'signup',
    name: 'Signup Confirmation',
    description: 'Sent when a new user signs up to verify their email address.',
    icon: UserPlus,
    type: 'auth',
    file: 'signup.tsx',
  },
  {
    id: 'recovery',
    name: 'Password Reset',
    description: 'Sent when a user requests to reset their password.',
    icon: Key,
    type: 'auth',
    file: 'recovery.tsx',
  },
  {
    id: 'magiclink',
    name: 'Magic Link / OTP',
    description: 'Sent for passwordless login with a one-time verification code.',
    icon: Link2,
    type: 'auth',
    file: 'magic-link.tsx',
  },
  {
    id: 'invite',
    name: 'Invitation',
    description: 'Sent when a user is invited to join the platform.',
    icon: Mail,
    type: 'auth',
    file: 'invite.tsx',
  },
  {
    id: 'email_change',
    name: 'Email Change',
    description: 'Sent when a user requests to change their email address.',
    icon: RefreshCw,
    type: 'auth',
    file: 'email-change.tsx',
  },
  {
    id: 'reauthentication',
    name: 'Reauthentication',
    description: 'Sent for identity verification with a one-time code.',
    icon: Shield,
    type: 'auth',
    file: 'reauthentication.tsx',
  },
];

const EmailTemplatesManagement = () => {
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  const handlePreview = async (templateId: string) => {
    setPreviewLoading(templateId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/auth-email-hook/preview`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ type: templateId }),
      });

      if (!res.ok) {
        throw new Error(`Preview failed (${res.status})`);
      }

      const html = await res.text();
      setPreviewHtml(html);
      setPreviewOpen(true);
    } catch (err: any) {
      toast({
        title: 'Preview Error',
        description: err.message || 'Could not load template preview',
        variant: 'destructive',
      });
    } finally {
      setPreviewLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Email Templates</h2>
        <p className="text-sm text-muted-foreground">
          Authentication email templates managed as code
        </p>
      </div>

      {/* Info banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Code className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Templates are managed as code</p>
            <p className="text-muted-foreground mt-1">
              These templates are React Email components located in the backend functions.
              Changes are made through code edits and redeployed automatically.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {AUTH_TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Auth
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {template.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {template.file}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handlePreview(template.id)}
                    disabled={previewLoading === template.id}
                  >
                    {previewLoading === template.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Eye className="h-3 w-3 mr-1" />
                    )}
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto rounded-md border bg-white">
            <iframe
              srcDoc={previewHtml}
              className="w-full min-h-[400px] border-0"
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplatesManagement;
