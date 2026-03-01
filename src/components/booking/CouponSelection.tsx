
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { TicketPercent, X, Check, AlertCircle } from 'lucide-react';
import { couponService } from '@/api/couponService';
import { toast } from '@/hooks/use-toast';

interface CouponSelectionProps {
  bookingType: string;
  bookingAmount: number;
  cabinId?: string;
  onCouponApply: (couponData: any) => void;
  onCouponRemove: () => void;
  appliedCoupon?: any;
}

export const CouponSelection: React.FC<CouponSelectionProps> = ({
  bookingType,
  bookingAmount,
  cabinId,
  onCouponApply,
  onCouponRemove,
  appliedCoupon
}) => {
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [manualCouponCode, setManualCouponCode] = useState('');
  const [selectedCouponId, setSelectedCouponId] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    fetchAvailableCoupons();
  }, [bookingType]);

  const fetchAvailableCoupons = async () => {
    try {
      setLoading(true);
      const response = await couponService.getAvailableCoupons(bookingType);
      
      if (response.success) {
        setAvailableCoupons(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching available coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateAndApplyCoupon = async (couponCode: string) => {
    try {
      setValidatingCoupon(true);
      
      const response = await couponService.validateCoupon(
        couponCode,
        bookingType,
        bookingAmount,
        cabinId
      );

      if (response.success) {
        onCouponApply(response.data);
        toast({
          title: "Coupon Applied",
          description: `You saved ₹${response.data.discountAmount}!`,
        });
      } else {
        toast({
          title: "Invalid Coupon",
          description: response.error || "This coupon cannot be applied",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to validate coupon",
        variant: "destructive"
      });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleSelectCoupon = async (couponId: string) => {
    const selectedCoupon = availableCoupons.find(c => c.id === couponId);
    if (selectedCoupon) {
      await validateAndApplyCoupon(selectedCoupon.code);
      setSelectedCouponId(couponId);
    }
  };

  const handleManualCouponApply = async () => {
    if (!manualCouponCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a coupon code",
        variant: "destructive"
      });
      return;
    }
    
    await validateAndApplyCoupon(manualCouponCode.trim().toUpperCase());
  };

  const handleRemoveCoupon = () => {
    onCouponRemove();
    setSelectedCouponId('');
    setManualCouponCode('');
    toast({
      title: "Coupon Removed",
      description: "Coupon has been removed from your booking",
    });
  };

  const calculateDiscount = (coupon: any) => {
    if (!coupon) return 0;
    
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (bookingAmount * coupon.value) / 100;
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      discount = coupon.value;
    }
    
    return Math.min(discount, bookingAmount);
  };

  if (appliedCoupon) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-green-800 flex items-center gap-2">
            <Check className="h-5 w-5" />
            Coupon Applied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-green-800">{appliedCoupon.coupon.code}</p>
              <p className="text-sm text-green-600">{appliedCoupon.coupon.name}</p>
              <p className="text-sm text-green-600">
                You saved ₹{appliedCoupon.discountAmount}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveCoupon}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TicketPercent className="h-5 w-5" />
          Apply Coupon
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Available Coupons */}
        {availableCoupons.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Available Coupons</Label>
            <Select value={selectedCouponId} onValueChange={handleSelectCoupon}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a coupon" />
              </SelectTrigger>
              <SelectContent>
                {availableCoupons.map((coupon) => (
                  <SelectItem key={coupon.id} value={coupon.id}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <span className="font-medium">{coupon.code}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {coupon.name}
                        </span>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {coupon.type === 'percentage' 
                          ? `${coupon.value}% off` 
                          : `₹${coupon.value} off`
                        }
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {availableCoupons.length > 0 && <Separator />}

        {/* Manual Coupon Entry */}
        <div>
          <Label htmlFor="couponCode" className="text-sm font-medium">
            Have a coupon code?
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="couponCode"
              placeholder="Enter coupon code"
              value={manualCouponCode}
              onChange={(e) => setManualCouponCode(e.target.value.toUpperCase())}
              className="flex-1"
            />
            <Button
              onClick={handleManualCouponApply}
              disabled={validatingCoupon || !manualCouponCode.trim()}
              size="sm"
            >
              {validatingCoupon ? "Validating..." : "Apply"}
            </Button>
          </div>
        </div>

        {/* Coupon Info */}
        {availableCoupons.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have {availableCoupons.length} coupon{availableCoupons.length !== 1 ? 's' : ''} available for this booking.
            </AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading available coupons...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};