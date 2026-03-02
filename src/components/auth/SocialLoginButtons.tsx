
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
import { useToast } from '@/hooks/use-toast';
import { lovable } from '@/integrations/lovable/index';

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
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + '/student/login',
      });

      if (result.redirected) return; // Page is navigating to Google

      if (result.error) {
        const error = result.error;
        toast({
          title: "Login Failed",
          description: "Failed to login with Google. Please try again.",
          variant: "destructive"
        });
        onLoginError?.(error);
        return;
      }

      // OAuth succeeded -- session was set by lovable module
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
