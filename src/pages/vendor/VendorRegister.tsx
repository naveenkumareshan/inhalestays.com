import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Eye, EyeOff, Building2, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { vendorRegistrationService } from '@/api/vendorRegistrationService';

const STEPS = [
  { id: 1, title: 'Personal Information', description: 'Your contact details' },
  { id: 2, title: 'Business Details', description: 'Business information and documents' },
  { id: 3, title: 'Address Information', description: 'Business address details' },
  { id: 4, title: 'Bank Details', description: 'Payment and banking information' }
];

const VendorRegister: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    contactPerson: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessType: 'cabin',
    businessDetails: {
      gstNumber: '',
      panNumber: '',
      aadharNumber: '',
      businessLicense: '',
      description: ''
    },
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      upiId: ''
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateStep = (step: number) => {
    const newErrors: {[key: string]: string} = {};

    switch (step) {
      case 1:
        if (!formData.contactPerson.trim()) {
          newErrors.contactPerson = 'Contact Person is required';
        }
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
        if (!formData.phone.trim()) {
          newErrors.phone = 'Phone number is required';
        } else if (!/^\d{10}$/.test(formData.phone)) {
          newErrors.phone = 'Please enter a valid 10-digit phone number';
        }
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;

      case 2:
        if (!formData.businessName.trim()) {
          newErrors.businessName = 'Business Name is required';
        }
        if (!formData.businessDetails.gstNumber.trim()) {
          newErrors['businessDetails.gstNumber'] = 'GST Number is required';
        }
        if (!formData.businessDetails.panNumber.trim()) {
          newErrors['businessDetails.panNumber'] = 'PAN Number is required';
        }
        if (!formData.businessDetails.aadharNumber.trim()) {
          newErrors['businessDetails.aadharNumber'] = 'Aadhaar Number is required';
        }
        if (!formData.businessDetails.businessLicense.trim()) {
          newErrors['businessDetails.businessLicense'] = 'Business License is required';
        }
        if (!formData.businessDetails.description.trim()) {
          newErrors['businessDetails.description'] = 'Business Description is required';
        }
        break;

      case 3:
        if (!formData.address.street.trim()) {
          newErrors['address.street'] = 'Street Address is required';
        }
        if (!formData.address.city.trim()) {
          newErrors['address.city'] = 'City is required';
        }
        if (!formData.address.state.trim()) {
          newErrors['address.state'] = 'State is required';
        }
        if (!formData.address.pincode.trim()) {
          newErrors['address.pincode'] = 'Pincode is required';
        } else if (!/^\d{6}$/.test(formData.address.pincode)) {
          newErrors['address.pincode'] = 'Please enter a valid 6-digit pincode';
        }
        break;

      case 4:
        if (!formData.bankDetails.accountHolderName.trim()) {
          newErrors['bankDetails.accountHolderName'] = 'Account Holder Name is required';
        }
        if (!formData.bankDetails.accountNumber.trim()) {
          newErrors['bankDetails.accountNumber'] = 'Account Number is required';
        }
        if (!formData.bankDetails.bankName.trim()) {
          newErrors['bankDetails.bankName'] = 'Bank Name is required';
        }
        if (!formData.bankDetails.ifscCode.trim()) {
          newErrors['bankDetails.ifscCode'] = 'IFSC Code is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleStepClick = (step: number) => {
    if (step <= currentStep || completedSteps.includes(step - 1)) {
      setCurrentStep(step);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      return;
    }

    setIsLoading(true);

    try {
      const registrationData = {
        name: formData.contactPerson,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: 'vendor',
        businessName: formData.businessName,
        businessType: formData.businessType,
        businessDetails: formData.businessDetails,
        address: formData.address,
        bankDetails: formData.bankDetails,
        contactPerson: formData.contactPerson
      };

      const response = await vendorRegistrationService.registerVendor(registrationData);
      
      if (response.success) {
        toast({
          title: "Registration Successful!",
          description: "Your Partner application has been submitted for review.",
        });
        navigate('/partner/login');
      } else {
        toast({
          title: "Registration Failed",
          description: response.message || "An error occurred during registration",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Error",
        description: error.message || "An error occurred during registration",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                name="contactPerson"
                type="text"
                placeholder="Enter contact person name"
                value={formData.contactPerson}
                onChange={handleInputChange}
                className={errors.contactPerson ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.contactPerson && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.contactPerson}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.email && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.email}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleInputChange}
                className={errors.phone ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.phone && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.phone}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={errors.password ? 'border-red-500' : ''}
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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.password}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.confirmPassword && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.confirmPassword}
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                name="businessName"
                type="text"
                placeholder="Enter business name"
                value={formData.businessName}
                onChange={handleInputChange}
                className={errors.businessName ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.businessName && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.businessName}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <select
                id="businessType"
                name="businessType"
                value={formData.businessType}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                disabled={isLoading}
              >
                <option value="cabin">Reading Room</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  name="businessDetails.gstNumber"
                  type="text"
                  placeholder="Enter GST number"
                  value={formData.businessDetails.gstNumber}
                  onChange={handleInputChange}
                  className={errors['businessDetails.gstNumber'] ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors['businessDetails.gstNumber'] && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors['businessDetails.gstNumber']}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="panNumber">PAN Number</Label>
                <Input
                  id="panNumber"
                  name="businessDetails.panNumber"
                  type="text"
                  placeholder="Enter PAN number"
                  value={formData.businessDetails.panNumber}
                  onChange={handleInputChange}
                  className={errors['businessDetails.panNumber'] ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors['businessDetails.panNumber'] && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors['businessDetails.panNumber']}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aadharNumber">Aadhaar Number</Label>
              <Input
                id="aadharNumber"
                name="businessDetails.aadharNumber"
                type="text"
                placeholder="Enter Aadhaar number"
                value={formData.businessDetails.aadharNumber}
                onChange={handleInputChange}
                className={errors['businessDetails.aadharNumber'] ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors['businessDetails.aadharNumber'] && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors['businessDetails.aadharNumber']}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessLicense">Business License</Label>
              <Input
                id="businessLicense"
                name="businessDetails.businessLicense"
                type="text"
                placeholder="Enter business license number"
                value={formData.businessDetails.businessLicense}
                onChange={handleInputChange}
                className={errors['businessDetails.businessLicense'] ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors['businessDetails.businessLicense'] && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors['businessDetails.businessLicense']}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Business Description</Label>
              <Input
                id="description"
                name="businessDetails.description"
                placeholder="Enter business description"
                value={formData.businessDetails.description}
                onChange={handleInputChange}
                className={errors['businessDetails.description'] ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors['businessDetails.description'] && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors['businessDetails.description']}
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                name="address.street"
                type="text"
                placeholder="Enter street address"
                value={formData.address.street}
                onChange={handleInputChange}
                className={errors['address.street'] ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors['address.street'] && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors['address.street']}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="address.city"
                  type="text"
                  placeholder="Enter city"
                  value={formData.address.city}
                  onChange={handleInputChange}
                  className={errors['address.city'] ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors['address.city'] && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors['address.city']}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="address.state"
                  type="text"
                  placeholder="Enter state"
                  value={formData.address.state}
                  onChange={handleInputChange}
                  className={errors['address.state'] ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors['address.state'] && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors['address.state']}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  name="address.pincode"
                  type="text"
                  placeholder="Enter pincode"
                  value={formData.address.pincode}
                  onChange={handleInputChange}
                  className={errors['address.pincode'] ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors['address.pincode'] && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors['address.pincode']}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="address.country"
                  type="text"
                  value={formData.address.country}
                  readOnly
                  disabled
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                <Input
                  id="accountHolderName"
                  name="bankDetails.accountHolderName"
                  type="text"
                  placeholder="Enter account holder name"
                  value={formData.bankDetails.accountHolderName}
                  onChange={handleInputChange}
                  className={errors['bankDetails.accountHolderName'] ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors['bankDetails.accountHolderName'] && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors['bankDetails.accountHolderName']}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  name="bankDetails.accountNumber"
                  type="text"
                  placeholder="Enter account number"
                  value={formData.bankDetails.accountNumber}
                  onChange={handleInputChange}
                  className={errors['bankDetails.accountNumber'] ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors['bankDetails.accountNumber'] && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors['bankDetails.accountNumber']}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  name="bankDetails.bankName"
                  type="text"
                  placeholder="Enter bank name"
                  value={formData.bankDetails.bankName}
                  onChange={handleInputChange}
                  className={errors['bankDetails.bankName'] ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors['bankDetails.bankName'] && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors['bankDetails.bankName']}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ifscCode">IFSC Code</Label>
                <Input
                  id="ifscCode"
                  name="bankDetails.ifscCode"
                  type="text"
                  placeholder="Enter IFSC code"
                  value={formData.bankDetails.ifscCode}
                  onChange={handleInputChange}
                  className={errors['bankDetails.ifscCode'] ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors['bankDetails.ifscCode'] && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors['bankDetails.ifscCode']}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID (Optional)</Label>
              <Input
                id="upiId"
                name="bankDetails.upiId"
                type="text"
                placeholder="Enter UPI ID"
                value={formData.bankDetails.upiId}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Partner Application</CardTitle>
          <p className="text-muted-foreground">
            Join our network and expand your business reach
          </p>
        </CardHeader>
        
        <CardContent>
          {/* Step Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center cursor-pointer ${
                    index < STEPS.length - 1 ? 'flex-1' : ''
                  }`}
                  onClick={() => handleStepClick(step.id)}
                >
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                        completedSteps.includes(step.id)
                          ? 'bg-green-500 text-white border-green-500'
                          : currentStep === step.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-gray-100 text-gray-400 border-gray-300'
                      }`}
                    >
                      {completedSteps.includes(step.id) ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="ml-3 hidden sm:block">
                      <div
                        className={`text-sm font-medium ${
                          currentStep === step.id ? 'text-primary' : 'text-gray-500'
                        }`}
                      >
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-400">{step.description}</div>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 bg-gray-200 mx-4 hidden sm:block">
                      <div
                        className={`h-full transition-all duration-300 ${
                          completedSteps.includes(step.id) ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">
                {STEPS[currentStep - 1].title}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {STEPS[currentStep - 1].description}
              </p>
              {renderStepContent()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1 || isLoading}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? 'Submitting...' : 'Submit Application'}
                </Button>
              )}
            </div>
          </form>

          <div className="mt-6 text-center text-sm space-y-2">
            <div>
              Already have an account?{' '}
              <Link to="/partner/login" className="text-primary hover:underline">
                Sign In
              </Link>
            </div>
            <div>
              <Link to="/login" className="text-muted-foreground hover:text-primary">
                Student/Admin Login
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorRegister;