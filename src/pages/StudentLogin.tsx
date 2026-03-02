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
import { Separator } from "@/components/ui/separator";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const StudentLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, authChecked } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/student/dashboard");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Get previous location from state or query params if available
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const from = searchParams.get("from");
    if (from) {
      setRedirectPath(from);
    } else if (location.state && location.state.from) {
      setRedirectPath(location.state.from);
    }
  }, [location]);

  // Handle OAuth redirect return -- check if session exists on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate(redirectPath, { replace: true });
      }
    });
  }, []);

  // Redirect authenticated users (handles Google OAuth return)
  useEffect(() => {
    if (authChecked && user) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, authChecked, redirectPath, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent any default form behavior that might cause page reload
    e.stopPropagation();

    if (isSubmitting) return; // Prevent multiple submissions

    setIsSubmitting(true);

    try {
      // Validate inputs
      if (!formData.email.trim() || !formData.password.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter both email and password.",
          variant: "destructive",
        });
        return;
      }

      // Call the login function from AuthContext that uses our API
      const result = await login(formData.email.trim(), formData.password);

      if (result.success) {
        toast({
          title: "Login Successful",
          description: "Welcome to the dashboard!",
        });
        // Navigation handled by auth state change; user object will be set
        // Role-based redirect happens after user is populated in context
        navigate(redirectPath);
      } else {
        // Handle login failure without page reload
        const errorMessage =
          result.error || "Invalid email or password. Please try again.";
        console.log("Login failed:", errorMessage);

        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      // Handle unexpected errors without page reload
      console.error("Unexpected login error:", error);

      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "An unexpected error occurred. Please try again.";

      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLoginSuccess = (data: any) => {
    navigate(redirectPath);
  };

  return (
    <div className="min-h-screen bg-accent/30">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-serif">
                Student Login
              </CardTitle>
              <CardDescription>
                Sign in to your Inhale Stays student account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Mobile or Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="text"
                    placeholder="Mobile or Email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      className={errors.password ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <div className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {errors.password}
                    </div>
                  )}
                  <div className="text-right">
                    <Link
                      to="/student/forgot-password"
                      className="text-sm text-cabin-wood hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Logging in..." : "Login"}
                </Button>
              </form>

              <div className="my-6 flex items-center">
                <div className="flex-grow border-t border-muted"></div>
                <span className="mx-3 text-sm text-muted-foreground">
                  Or continue with
                </span>
                <div className="flex-grow border-t border-muted"></div>
              </div>

              <SocialLoginButtons onLoginSuccess={handleSocialLoginSuccess} />
            </CardContent>
            <CardFooter className="flex flex-col items-center gap-2">
              <div className="flex gap-4">
                <p>
                  Don't have an account?{" "}
                  <Link
                    to="/student/register"
                    className="text-cabin-wood hover:underline"
                  >
                    Register
                  </Link>
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Need help?{" "}
                <Link to="#" className="text-cabin-wood hover:underline">
                  Contact support
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
