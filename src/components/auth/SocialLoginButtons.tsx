
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
import { useToast } from '@/hooks/use-toast';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';

interface SocialLoginButtonsProps {
  onLoginSuccess?: (data: any) => void;
  onLoginError?: (error: any) => void;
}

export function SocialLoginButtons({ onLoginSuccess, onLoginError }: SocialLoginButtonsProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const isCapacitor = !!(window as any).Capacitor;

      if (isCapacitor) {
        // Capacitor: bypass Lovable wrapper (needs server routes unavailable in native builds)
        // Opens system browser for Google login, redirects to published URL
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'https://inhalestays-com.lovable.app/student-login',
          },
        });

        if (error) {
          toast({
            title: "Login Failed",
            description: "Failed to login with Google. Please try again.",
            variant: "destructive"
          });
          onLoginError?.(error);
        }
        // Browser will navigate away; session picked up by onAuthStateChange on return
        return;
      }

      // Web: use Lovable managed OAuth wrapper
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.redirected) return;

      if (result.error) {
        toast({
          title: "Login Failed",
          description: "Failed to login with Google. Please try again.",
          variant: "destructive"
        });
        onLoginError?.(result.error);
        return;
      }

      onLoginSuccess?.({ success: true });
    } catch (error) {
      console.error('Google login error:', error);
      toast({
        title: "Login Failed",
        description: "Failed to login with Google. Please try again.",
        variant: "destructive"
      });
      onLoginError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleGoogleLogin}
        variant="outline"
        type="button"
        className="w-full flex items-center justify-center gap-2"
        disabled={isLoading}
      >
        <FcGoogle className="h-4 w-4" />
        <span>{isLoading ? 'Connecting...' : 'Continue with Google'}</span>
      </Button>
    </div>
  );
}
