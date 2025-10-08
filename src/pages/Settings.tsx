import React, { useState, useEffect } from "react";
import { Building, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { ProfileTab } from "@/components/ProfileTab";
import { NotificationsTab } from "@/components/NotificationsTab";
import { SecurityTab } from "@/components/SecurityTab";
import { AppearanceTab } from "@/components/AppearanceTab";
import { ImagePicker } from "@/components/ImagePicker";

const Settings = () => {
  const { businessSettings, updateBusinessSettings, isUpdating } = useBusinessSettings();
  
  const [businessForm, setBusinessForm] = useState({
    business_name: '',
    phone: '',
    whatsapp: '',
    email: '',
    facebook: '',
    address: '',
    invoice_prefix: 'INV',
    invoice_footer_message: '',
    brand_color: '#2c7be5',
    primary_email: '',
    secondary_email: '',
    address_line1: '',
    address_line2: '',
    business_hours: '',
    low_stock_alert_quantity: 10,
    logo_url: ''
  });

  useEffect(() => {
    if (businessSettings) {
      const nextForm = {
        business_name: businessSettings.business_name || '',
        phone: businessSettings.phone || '',
        whatsapp: businessSettings.whatsapp || '',
        email: businessSettings.email || '',
        facebook: businessSettings.facebook || '',
        address: businessSettings.address || '',
        invoice_prefix: businessSettings.invoice_prefix || 'INV',
        invoice_footer_message: businessSettings.invoice_footer_message || '',
        brand_color: businessSettings.brand_color || '#2c7be5',
        primary_email: businessSettings.primary_email || '',
        secondary_email: businessSettings.secondary_email || '',
        address_line1: businessSettings.address_line1 || '',
        address_line2: businessSettings.address_line2 || '',
        business_hours: businessSettings.business_hours || '',
        low_stock_alert_quantity: businessSettings.low_stock_alert_quantity || 10,
        logo_url: businessSettings.logo_url || ''
      };
      setBusinessForm(prev => {
        return JSON.stringify(prev) === JSON.stringify(nextForm) ? prev : nextForm;
      });
    }
  }, [businessSettings]);

  const handleBusinessSubmit = () => {
    updateBusinessSettings(businessForm);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto p-1 gap-1">
          <TabsTrigger value="business" className="text-xs sm:text-sm px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Business</TabsTrigger>
          <TabsTrigger value="profile" className="text-xs sm:text-sm px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Profile</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Notifications</TabsTrigger>
          <TabsTrigger value="security" className="text-xs sm:text-sm px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Security</TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs sm:text-sm px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input 
                    id="businessName" 
                    value={businessForm.business_name}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, business_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo_url">Business Logo</Label>
                  <ImagePicker
                    value={businessForm.logo_url}
                    onChange={(url) => setBusinessForm(prev => ({ ...prev, logo_url: url }))}
                    onRemove={() => setBusinessForm(prev => ({ ...prev, logo_url: '' }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    value={businessForm.phone}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input 
                    id="whatsapp" 
                    value={businessForm.whatsapp}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryEmail">Primary Email</Label>
                  <Input 
                    id="primaryEmail" 
                    type="email"
                    value={businessForm.primary_email}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, primary_email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryEmail">Secondary Email</Label>
                  <Input 
                    id="secondaryEmail" 
                    type="email"
                    value={businessForm.secondary_email}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, secondary_email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input 
                    id="facebook" 
                    value={businessForm.facebook}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, facebook: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                  <Input 
                    id="invoicePrefix" 
                    value={businessForm.invoice_prefix}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, invoice_prefix: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessHours">Business Hours</Label>
                  <Input 
                    id="businessHours" 
                    value={businessForm.business_hours}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, business_hours: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowStockAlert">Low Stock Alert Quantity</Label>
                  <Input 
                    id="lowStockAlert" 
                    type="number"
                    min="1"
                    value={businessForm.low_stock_alert_quantity}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, low_stock_alert_quantity: parseInt(e.target.value) || 10 }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Items with stock at or below this quantity will be flagged as low stock
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandColor">Brand Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="brandColor" 
                      type="color"
                      value={businessForm.brand_color}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, brand_color: e.target.value }))}
                      className="w-20 h-10 p-1"
                    />
                    <Input 
                      value={businessForm.brand_color}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, brand_color: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Address Line 1</Label>
                  <Input 
                    id="addressLine1" 
                    value={businessForm.address_line1}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, address_line1: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input 
                    id="addressLine2" 
                    value={businessForm.address_line2}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, address_line2: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Full Address (Legacy)</Label>
                <Textarea 
                  id="address" 
                  value={businessForm.address}
                  onChange={(e) => setBusinessForm(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerMessage">Invoice Footer Message</Label>
                <Textarea 
                  id="footerMessage" 
                  value={businessForm.invoice_footer_message}
                  onChange={(e) => setBusinessForm(prev => ({ ...prev, invoice_footer_message: e.target.value }))}
                />
              </div>
              <Button onClick={handleBusinessSubmit} disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Business Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <React.Suspense fallback={
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          }>
            <ProfileTab />
          </React.Suspense>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <AppearanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;