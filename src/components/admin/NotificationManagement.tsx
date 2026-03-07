
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Bell, 
  Send, 
  Users, 
  Mail, 
  Calendar as CalendarIcon,
  Gift,
  Target,
  History,
  BarChart3
} from 'lucide-react';
import { notificationService, NotificationData, NotificationHistory } from '@/api/notificationService';
import { emailTemplatesService } from '@/api/emailTemplatesService';
import { vendorService } from '@/api/vendorService';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const NotificationManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('send');
  const [formData, setFormData] = useState<NotificationData>({
    title: '',
    body: '',
    type: 'offer',
    targetType: 'all',
    includeEmail: false
  });
  const [vendors, setVendors] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([]);
  const [stats, setStats] = useState({
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    activeTokens: 0
  });
  const [loading, setLoading] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledDateOpen, setScheduledDateOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vendorsRes, templatesRes, historyRes, statsRes] = await Promise.all([
        vendorService.getAllVendors(),
        emailTemplatesService.getEmailTemplates('offer'),
        notificationService.getNotificationHistory(),
        notificationService.getNotificationStats()
      ]);

      if (vendorsRes.success) setVendors(vendorsRes.data);
      if (templatesRes.success) setEmailTemplates(templatesRes.data);
      if (historyRes.success) setNotificationHistory(historyRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSendNotification = async () => {
    if (!formData.title || !formData.body) {
      toast({
        title: "Error",
        description: "Title and message are required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        scheduledFor: scheduledDate?.toISOString(),
        offerData: formData.type === 'offer' ? {
          discount: parseFloat((document.getElementById('discount') as HTMLInputElement)?.value || '0'),
          validUntil: (document.getElementById('validUntil') as HTMLInputElement)?.value || '',
          offerCode: (document.getElementById('offerCode') as HTMLInputElement)?.value || '',
          description: (document.getElementById('offerDescription') as HTMLTextAreaElement)?.value || ''
        } : undefined
      };

      const response = formData.vendorId 
        ? await notificationService.sendVendorOffer(formData.vendorId, data)
        : await notificationService.sendNotification(data);

      if (response.success) {
        toast({
          title: "Success",
          description: `Notification ${scheduledDate ? 'scheduled' : 'sent'} successfully`
        });
        
        // Reset form
        setFormData({
          title: '',
          body: '',
          type: 'offer',
          targetType: 'all',
          includeEmail: false
        });
        setScheduledDate(undefined);
        
        // Refresh data
        fetchData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    try {
      const response = await notificationService.testNotification(
        'test_token',
        formData.title || 'Test Notification',
        formData.body || 'This is a test notification'
      );
      
      if (response.success) {
        toast({
          title: "Test Sent",
          description: "Test notification sent successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test notification",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
                <h3 className="text-2xl font-bold">{stats.totalSent}</h3>
              </div>
              <Send className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                <h3 className="text-2xl font-bold">{stats.totalDelivered}</h3>
              </div>
              <Target className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Opened</p>
                <h3 className="text-2xl font-bold">{stats.totalOpened}</h3>
              </div>
              <BarChart3 className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <h3 className="text-2xl font-bold">{stats.activeTokens}</h3>
              </div>
              <Users className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="send">
            <Send className="h-4 w-4 mr-2" />
            Send Notification
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle>Send Push Notification & Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Notification Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Special Offer Available!"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Notification Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offer">
                        <Gift className="h-4 w-4 mr-2 inline" />
                        Offer/Promotion
                      </SelectItem>
                      <SelectItem value="booking">Booking Update</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="vendor_promotion">Vendor Promotion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  value={formData.body}
                  onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Get 20% off on your next booking! Limited time offer."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetType">Target Audience</Label>
                  <Select
                    value={formData.targetType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, targetType: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="vendor_specific">Vendor Specific</SelectItem>
                      <SelectItem value="role_specific">Role Specific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.targetType === 'vendor_specific' && (
                  <div className="space-y-2">
                    <Label htmlFor="vendor">Select Vendor</Label>
                    <Select
                      value={formData.vendorId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, vendorId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((vendor: any) => (
                          <SelectItem key={vendor._id} value={vendor._id}>
                            {vendor.businessName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {formData.type === 'offer' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Offer Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="discount">Discount (%)</Label>
                        <Input
                          id="discount"
                          type="number"
                          placeholder="20"
                          min="0"
                          max="100"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="validUntil">Valid Until</Label>
                        <Input
                          id="validUntil"
                          type="date"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="offerCode">Offer Code (Optional)</Label>
                      <Input
                        id="offerCode"
                        placeholder="SAVE20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="offerDescription">Offer Description</Label>
                      <Textarea
                        id="offerDescription"
                        placeholder="Book any reading room and get 20% off on your stay"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeEmail"
                    checked={formData.includeEmail}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeEmail: checked }))}
                  />
                  <Label htmlFor="includeEmail">Also send as email</Label>
                </div>

                {formData.includeEmail && (
                  <div className="space-y-2">
                    <Label htmlFor="emailTemplate">Email Template</Label>
                    <Select
                      value={formData.emailTemplateId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, emailTemplateId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose email template" />
                      </SelectTrigger>
                      <SelectContent>
                        {emailTemplates.map((template: any) => (
                          <SelectItem key={template._id} value={template._id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Schedule for later (Optional)</Label>
                  <Popover open={scheduledDateOpen} onOpenChange={setScheduledDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, 'PPP') : 'Send immediately'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={(d) => { setScheduledDate(d); setScheduledDateOpen(false); }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSendNotification}
                  disabled={loading}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? 'Sending...' : scheduledDate ? 'Schedule Notification' : 'Send Notification'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleTestNotification}
                  disabled={loading}
                >
                  Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Notification History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Delivered</TableHead>
                      <TableHead>Opened</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notificationHistory.map((notification) => (
                      <TableRow key={notification._id}>
                        <TableCell className="font-medium">{notification.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {notification.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{notification.targetType}</TableCell>
                        <TableCell>{notification.sentCount}</TableCell>
                        <TableCell>{notification.deliveredCount}</TableCell>
                        <TableCell>{notification.openedCount}</TableCell>
                        <TableCell>
                          <Badge variant={notification.status === 'sent' ? 'default' : notification.status === 'failed' ? 'destructive' : 'secondary'}>
                            {notification.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(notification.sentAt), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationManagement;