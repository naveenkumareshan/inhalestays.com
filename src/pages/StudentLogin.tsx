import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { AlertCircle, Eye, EyeOff, Mail, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type LoginMode = "password" | "otp";

const StudentLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, authChecked } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/student/dashboard");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loginMode, setLoginMode] = useState<LoginMode>("password");

  // OTP state
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const from = searchParams.get("from");
    if (from) setRedirectPath(from);
    else if (location.state?.from) setRedirectPath(location.state.from);
  }, [location]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate(redirectPath, { replace: true });
    });
  }, []);

  useEffect(() => {
    if (authChecked && user) navigate(redirectPath, { replace: true });
  }, [user, authChecked, redirectPath, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCooldown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (!formData.email.trim() || !formData.password.trim()) {
        toast({ title: "Validation Error", description: "Please enter both email and password.", variant: "destructive" });
        return;
      }
      const result = await login(formData.email.trim(), formData.password);
      if (result.success) {
        toast({ title: "Login Successful", description: "Welcome to the dashboard!" });
        navigate(redirectPath);
      } else {
        toast({ title: "Login Failed", description: result.error || "Invalid email or password. Please try again.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Login Error", description: error?.response?.data?.message || error?.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    if (!otpEmail.trim()) {
      toast({ title: "Enter Email", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setOtpSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: otpEmail.trim() });
      if (error) {
        toast({ title: "OTP Error", description: error.message, variant: "destructive" });
      } else {
        setOtpSent(true);
        setOtpCooldown(60);
        toast({ title: "OTP Sent", description: "Check your email for the 6-digit code." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to send OTP.", variant: "destructive" });
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({ title: "Invalid OTP", description: "Please enter the 6-digit code.", variant: "destructive" });
      return;
    }
    setOtpVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: otpEmail.trim(),
        token: otpCode,
        type: "email",
      });
      if (error) {
        toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
      } else if (data.session) {
        toast({ title: "Login Successful", description: "Welcome to the dashboard!" });
        navigate(redirectPath);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Verification failed.", variant: "destructive" });
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSocialLoginSuccess = () => navigate(redirectPath);

  return (
    <div className="min-h-screen bg-accent/30">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-serif">Student Login</CardTitle>
              <CardDescription>Sign in to your Inhale Stays student account</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-input overflow-hidden mb-6">
                <button
                  type="button"
                  onClick={() => { setLoginMode("password"); setOtpSent(false); setOtpCode(""); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    loginMode === "password"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <KeyRound className="h-4 w-4" /> Password
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMode("otp")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    loginMode === "otp"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Mail className="h-4 w-4" /> Email OTP
                </button>
              </div>

              {loginMode === "password" ? (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="email">Mobile or Email</Label>
                    <Input id="email" name="email" type="text" placeholder="Mobile or Email" value={formData.email} onChange={handleChange} required disabled={isSubmitting} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={formData.password} onChange={handleChange} className={errors.password ? "border-red-500" : ""} disabled={isSubmitting} />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />{errors.password}
                      </div>
                    )}
                    <div className="text-right">
                      <Link to="/student/forgot-password" className="text-sm text-cabin-wood hover:underline">Forgot password?</Link>
                    </div>
                  </div>
                  <Button type="submit" className="w-full hover:bg-primary/90" disabled={isSubmitting}>
                    {isSubmitting ? "Logging in..." : "Login"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp-email">Email Address</Label>
                    <Input
                      id="otp-email"
                      type="email"
                      placeholder="Enter your email"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      disabled={otpSent && otpCooldown > 0}
                    />
                  </div>

                  {!otpSent ? (
                    <Button className="w-full" onClick={handleSendOtp} disabled={otpSending}>
                      {otpSending ? "Sending..." : "Send OTP"}
                    </Button>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Enter 6-digit OTP</Label>
                        <div className="flex justify-center">
                          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-1">
                          Check your email for the verification code
                        </p>
                      </div>
                      <Button className="w-full" onClick={handleVerifyOtp} disabled={otpVerifying || otpCode.length !== 6}>
                        {otpVerifying ? "Verifying..." : "Verify & Login"}
                      </Button>
                      <div className="text-center">
                        <Button
                          variant="link"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={handleSendOtp}
                          disabled={otpCooldown > 0 || otpSending}
                        >
                          {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend OTP"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="my-6 flex items-center">
                <div className="flex-grow border-t border-muted"></div>
                <span className="mx-3 text-sm text-muted-foreground">Or continue with</span>
                <div className="flex-grow border-t border-muted"></div>
              </div>

              <SocialLoginButtons onLoginSuccess={handleSocialLoginSuccess} />
            </CardContent>
            <CardFooter className="flex flex-col items-center gap-2">
              <div className="flex gap-4">
                <p>Don't have an account?{" "}<Link to="/student/register" className="text-cabin-wood hover:underline">Register</Link></p>
              </div>
              <p className="text-sm text-muted-foreground">
                Need help?{" "}<Link to="#" className="text-cabin-wood hover:underline">Contact support</Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
