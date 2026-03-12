import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { bookingEmailService } from '@/api/bookingEmailService';

export const BookingEmailTriggers: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailData, setEmailData] = useState({
    userEmail: '',
    userName: '',
    bookingId: '',
    bookingType: 'cabin' as 'cabin' | 'hostel',
    totalPrice: '',
    startDate: '',
    endDate: '',
    location: '',
    cabinName: '',
    roomNumber: '',
    seatNumber: '',
    errorMessage: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setEmailData(prev => ({ ...prev, [field]: value }));
  };

  const triggerBookingConfirmation = async () => {
    if (!emailData.userEmail || !emailData.userName || !emailData.bookingId) {
      toast({
        title: "Missing Fields",
        description: "Please fill in email, name, and booking ID",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await bookingEmailService.sendReceiptEmail({
        to: emailData.userEmail,
        studentName: emailData.userName,
        serialNumber: emailData.bookingId,
        propertyName: emailData.cabinName || emailData.location || '',
        seatOrBedNumber: emailData.seatNumber || emailData.roomNumber,
        startDate: emailData.startDate,
        endDate: emailData.endDate,
        amount: emailData.totalPrice ? parseFloat(emailData.totalPrice) : 0,
        totalAmount: emailData.totalPrice ? parseFloat(emailData.totalPrice) : 0,
        bookingType: emailData.bookingType === 'hostel' ? 'hostel' : 'reading_room',
      });

      if (result.success) {
        toast({
          title: "Email Triggered",
          description: "Booking confirmation email has been queued for sending"
        });
      } else {
        throw new Error(result.error || 'Failed to trigger email');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to trigger booking confirmation email",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerBookingFailed = async () => {
    if (!emailData.userEmail || !emailData.userName || !emailData.bookingId || !emailData.errorMessage) {
      toast({
        title: "Missing Fields",
        description: "Please fill in email, name, booking ID, and error message",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await bookingEmailService.sendReceiptEmail({
        to: emailData.userEmail,
        studentName: emailData.userName,
        serialNumber: emailData.bookingId,
        propertyName: emailData.cabinName || emailData.location || '',
        seatOrBedNumber: emailData.seatNumber || emailData.roomNumber,
        startDate: emailData.startDate,
        endDate: emailData.endDate,
        amount: emailData.totalPrice ? parseFloat(emailData.totalPrice) : 0,
        totalAmount: emailData.totalPrice ? parseFloat(emailData.totalPrice) : 0,
        bookingType: emailData.bookingType === 'hostel' ? 'hostel' : 'reading_room',
      });

      if (result.success) {
        toast({
          title: "Email Triggered",
          description: "Booking failed email has been queued for sending"
        });
      } else {
        throw new Error(result.error || 'Failed to trigger email');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to trigger booking failed email",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerBookingReminder = async () => {
    if (!emailData.userEmail || !emailData.userName || !emailData.bookingId) {
      toast({
        title: "Missing Fields",
        description: "Please fill in email, name, and booking ID",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await bookingEmailService.sendReceiptEmail({
        to: emailData.userEmail,
        studentName: emailData.userName,
        serialNumber: emailData.bookingId,
        propertyName: emailData.cabinName || emailData.location || '',
        seatOrBedNumber: emailData.seatNumber || emailData.roomNumber,
        startDate: emailData.startDate,
        endDate: emailData.endDate,
        amount: emailData.totalPrice ? parseFloat(emailData.totalPrice) : 0,
        totalAmount: emailData.totalPrice ? parseFloat(emailData.totalPrice) : 0,
        bookingType: emailData.bookingType === 'hostel' ? 'hostel' : 'reading_room',
      });

      if (result.success) {
        toast({
          title: "Email Triggered",
          description: "Booking reminder email has been queued for sending"
        });
      } else {
        throw new Error(result.error || 'Failed to trigger email');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to trigger booking reminder email",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Booking Email Triggers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="userEmail">User Email *</Label>
            <Input
              id="userEmail"
              type="email"
              value={emailData.userEmail}
              onChange={(e) => handleInputChange('userEmail', e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div>
            <Label htmlFor="userName">User Name *</Label>
            <Input
              id="userName"
              value={emailData.userName}
              onChange={(e) => handleInputChange('userName', e.target.value)}
              placeholder="John Doe"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bookingId">Booking ID *</Label>
            <Input
              id="bookingId"
              value={emailData.bookingId}
              onChange={(e) => handleInputChange('bookingId', e.target.value)}
              placeholder="BOOKING-12345"
            />
          </div>
          <div>
            <Label htmlFor="bookingType">Booking Type</Label>
            <Select value={emailData.bookingType} onValueChange={(value) => handleInputChange('bookingType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cabin">Cabin</SelectItem>
                <SelectItem value="hostel">Hostel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="totalPrice">Total Price</Label>
            <Input
              id="totalPrice"
              type="number"
              value={emailData.totalPrice}
              onChange={(e) => handleInputChange('totalPrice', e.target.value)}
              placeholder="1500"
            />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={emailData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Downtown Branch"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={emailData.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={emailData.endDate}
              onChange={(e) => handleInputChange('endDate', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="cabinName">Cabin Name</Label>
            <Input
              id="cabinName"
              value={emailData.cabinName}
              onChange={(e) => handleInputChange('cabinName', e.target.value)}
              placeholder="Quiet Nook"
            />
          </div>
          <div>
            <Label htmlFor="roomNumber">Room Number</Label>
            <Input
              id="roomNumber"
              value={emailData.roomNumber}
              onChange={(e) => handleInputChange('roomNumber', e.target.value)}
              placeholder="101"
            />
          </div>
          <div>
            <Label htmlFor="seatNumber">Seat Number</Label>
            <Input
              id="seatNumber"
              value={emailData.seatNumber}
              onChange={(e) => handleInputChange('seatNumber', e.target.value)}
              placeholder="A1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="errorMessage">Error Message (for failed emails)</Label>
          <Textarea
            id="errorMessage"
            value={emailData.errorMessage}
            onChange={(e) => handleInputChange('errorMessage', e.target.value)}
            placeholder="Payment processing failed due to insufficient funds"
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={triggerBookingConfirmation} 
            disabled={isLoading}
            className="flex-1"
          >
            Trigger Confirmation Email
          </Button>
          <Button 
            onClick={triggerBookingFailed} 
            disabled={isLoading}
            variant="destructive"
            className="flex-1"
          >
            Trigger Failed Email
          </Button>
          <Button 
            onClick={triggerBookingReminder} 
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            Trigger Reminder Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};