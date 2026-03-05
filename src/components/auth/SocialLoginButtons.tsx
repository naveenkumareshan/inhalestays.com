
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';

interface SocialLoginButtonsProps {
  onLoginSuccess?: (data: any) => void;
  onLoginError?: (error: any) => void;
}

export function SocialLoginButtons({ onLoginSuccess, onLoginError }: SocialLoginButtonsProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<'google' | 'apple' | null>(null);

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setIsLoading(provider);
    try {
      const isCapacitor = !!(window as any).Capacitor;

      if (isCapacitor) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: 'https://inhalestays-com.lovable.app/student-login',
          },
        });

        if (error) {
          toast({
            title: "Login Failed",
            description: `Failed to login with ${provider === 'google' ? 'Google' : 'Apple'}. Please try again.`,
            variant: "destructive"
          });
          onLoginError?.(error);
        }
        return;
      }

      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });

      if (result.redirected) return;

      if (result.error) {
        toast({
          title: "Login Failed",
          description: `Failed to login with ${provider === 'google' ? 'Google' : 'Apple'}. Please try again.`,
          variant: "destructive"
        });
        onLoginError?.(result.error);
        return;
      }

      onLoginSuccess?.({ success: true });
    } catch (error) {
      console.error(`${provider} login error:`, error);
      toast({
        title: "Login Failed",
        description: `Failed to login with ${provider === 'google' ? 'Google' : 'Apple'}. Please try again.`,
        variant: "destructive"
      });
      onLoginError?.(error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={() => handleOAuthLogin('google')}
        variant="outline"
        type="button"
        className="w-full flex items-center justify-center gap-2"
        disabled={!!isLoading}
      >
        <FcGoogle className="h-4 w-4" />
        <span>{isLoading === 'google' ? 'Connecting...' : 'Continue with Google'}</span>
      </Button>
      <Button
        onClick={() => handleOAuthLogin('apple')}
        variant="outline"
        type="button"
        className="w-full flex items-center justify-center gap-2"
        disabled={!!isLoading}
      >
        <FaApple className="h-5 w-5" />
        <span>{isLoading === 'apple' ? 'Connecting...' : 'Continue with Apple'}</span>
      </Button>
    </div>
  );
}
