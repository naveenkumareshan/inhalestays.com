
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User } from 'lucide-react';

const StudentRegister = () => {
  const navigate = useNavigate();
  const { registerUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleGenderChange = (gender: string) => {
    setFormData({
      ...formData,
      gender
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Register the user
      const success = await registerUser(formData.name, formData.phone, formData.email, formData.password, formData.gender, 'student');
      
      if (success) {
        // Save additional details
        localStorage.setItem('userGender', formData.gender);
        
        toast({
          title: "Registration Successful",
          description: "Your account has been created successfully! You can now log in.",
        });
        navigate('/student/login');
      } else {
        toast({
          title: "Registration Failed",
          description: "This email may already be registered. Please try with a different email.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Error",
        description: "An error occurred during registration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-accent/30">      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-serif">Student Registration</CardTitle>
              <CardDescription>
                Create your Inhale Stays student account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    placeholder="John Doe" 
                    value={formData.name} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    placeholder="you@example.com" 
                    value={formData.email} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    placeholder="9876543210" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <div className="flex items-center justify-center space-x-6 py-2">
                    <button 
                      type="button"
                      className={`flex flex-col items-center space-y-1 ${
                        formData.gender === 'male' ? 'text-blue-600' : 'text-muted-foreground'
                      }`}
                      onClick={() => handleGenderChange('male')}
                    >
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                        formData.gender === 'male' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-muted'
                      }`}>
                        <User className="h-6 w-6 text-blue-500" />
                      </div>
                      <span className="text-sm font-medium">Male</span>
                    </button>
                    
                    <button 
                      type="button"
                      className={`flex flex-col items-center space-y-1 ${
                        formData.gender === 'female' ? 'text-pink-600' : 'text-muted-foreground'
                      }`}
                      onClick={() => handleGenderChange('female')}
                    >
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                        formData.gender === 'female' ? 'bg-pink-100 border-2 border-pink-500' : 'bg-muted'
                      }`}>
                        <User className="h-6 w-6 text-pink-500" />
                      </div>
                      <span className="text-sm font-medium">Female</span>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    name="password" 
                    type="password" 
                    value={formData.password} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    name="confirmPassword" 
                    type="password" 
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-cabin-dark"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Registering..." : "Register"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <p>
                Already have an account?{' '}
                <Link to="/student/login" className="text-cabin-wood hover:underline">
                  Login
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentRegister;
