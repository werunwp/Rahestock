import React, { useState, useEffect } from "react";
import { Database, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { currencyOptions, getCurrencySymbol } from "@/lib/currencySymbols";
// Removed useState, useEffect from here since they're imported with React above
import { ProfileTab } from "@/components/ProfileTab";
import { NotificationsTab } from "@/components/NotificationsTab";
import { SecurityTab } from "@/components/SecurityTab";
import { AppearanceTab } from "@/components/AppearanceTab";
import { DataBackupControls } from "@/components/DataBackupControls";
import { WooCommerceImport } from "@/components/WooCommerceImport";
import { AppResetControls } from "@/components/AppResetControls";
import { CustomCodeSettings } from "@/components/CustomCodeSettings";
import { CourierWebhookSettings } from "@/components/CourierWebhookSettings";

const Settings = () => {
  const { businessSettings, updateBusinessSettings, isUpdating } = useBusinessSettings();
  const { systemSettings, updateSystemSettings, isUpdating: isSystemUpdating } = useSystemSettings();
  
  const [businessForm, setBusinessForm] = useState({
    business_name: '',
    phone: '',
    whatsapp: '',
    email: '',
    facebook: '',
    address: '',
    invoice_prefix: 'INV',
    invoice_footer_message: 'ধন্যবাদ আপনার সাথে ব্যবসা করার জন্য',
    brand_color: '#2c7be5',
    primary_email: '',
    secondary_email: '',
    address_line1: '',
    address_line2: '',
    business_hours: ''
  });

  const [systemForm, setSystemForm] = useState({
    currency_code: 'BDT',
    timezone: 'Asia/Dhaka',
    date_format: 'dd/MM/yyyy',
    time_format: '12h'
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
        invoice_footer_message: businessSettings.invoice_footer_message || 'ধন্যবাদ আপনার সাথে ব্যবসা করার জন্য',
        brand_color: businessSettings.brand_color || '#2c7be5',
        primary_email: businessSettings.primary_email || '',
        secondary_email: businessSettings.secondary_email || '',
        address_line1: businessSettings.address_line1 || '',
        address_line2: businessSettings.address_line2 || '',
        business_hours: businessSettings.business_hours || ''
      };
      setBusinessForm(prev => {
        return JSON.stringify(prev) === JSON.stringify(nextForm) ? prev : nextForm;
      });
    }
  }, [businessSettings]);

  useEffect(() => {
    if (systemSettings) {
      const nextForm = {
        currency_code: systemSettings.currency_code || 'BDT',
        timezone: systemSettings.timezone || 'Asia/Dhaka',
        date_format: systemSettings.date_format || 'dd/MM/yyyy',
        time_format: systemSettings.time_format || '12h'
      };
      setSystemForm(prev => {
        return JSON.stringify(prev) === JSON.stringify(nextForm) ? prev : nextForm;
      });
    }
  }, [systemSettings]);

  const handleBusinessSubmit = () => {
    updateBusinessSettings(businessForm);
  };

  const handleSystemSubmit = () => {
    updateSystemSettings(systemForm);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto p-1 gap-1">
          <TabsTrigger value="business" className="text-xs sm:text-sm px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Business</TabsTrigger>
          <TabsTrigger value="profile" className="text-xs sm:text-sm px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Profile</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Notifications</TabsTrigger>
          <TabsTrigger value="security" className="text-xs sm:text-sm px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Security</TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs sm:text-sm px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Appearance</TabsTrigger>
          <TabsTrigger value="system" className="text-xs sm:text-sm px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">System</TabsTrigger>
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
                    placeholder="Enter your business name" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    value={businessForm.phone}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input 
                    id="whatsapp" 
                    value={businessForm.whatsapp}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="Enter WhatsApp number" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryEmail">Primary Email</Label>
                  <Input 
                    id="primaryEmail" 
                    type="email"
                    value={businessForm.primary_email}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, primary_email: e.target.value }))}
                    placeholder="Enter primary email address" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryEmail">Secondary Email</Label>
                  <Input 
                    id="secondaryEmail" 
                    type="email"
                    value={businessForm.secondary_email}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, secondary_email: e.target.value }))}
                    placeholder="Enter secondary email address" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input 
                    id="facebook" 
                    value={businessForm.facebook}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, facebook: e.target.value }))}
                    placeholder="Enter Facebook page" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                  <Input 
                    id="invoicePrefix" 
                    value={businessForm.invoice_prefix}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, invoice_prefix: e.target.value }))}
                    placeholder="INV" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessHours">Business Hours</Label>
                  <Input 
                    id="businessHours" 
                    value={businessForm.business_hours}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, business_hours: e.target.value }))}
                    placeholder="Mon-Fri 9AM-6PM" 
                  />
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
                      placeholder="#2c7be5"
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
                    placeholder="Street address" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input 
                    id="addressLine2" 
                    value={businessForm.address_line2}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, address_line2: e.target.value }))}
                    placeholder="City, State, ZIP" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Full Address (Legacy)</Label>
                <Textarea 
                  id="address" 
                  value={businessForm.address}
                  onChange={(e) => setBusinessForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Complete business address" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerMessage">Invoice Footer Message</Label>
                <Textarea 
                  id="footerMessage" 
                  value={businessForm.invoice_footer_message}
                  onChange={(e) => setBusinessForm(prev => ({ ...prev, invoice_footer_message: e.target.value }))}
                  placeholder="Thank you message for invoices" 
                />
              </div>
              <Button onClick={handleBusinessSubmit} disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Business Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <ProfileTab />
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

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currencyCode">Currency <span className="text-muted-foreground">({getCurrencySymbol(systemForm.currency_code)})</span></Label>
                  <Select value={systemForm.currency_code} onValueChange={(value) => setSystemForm(prev => ({ ...prev, currency_code: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name} ({getCurrencySymbol(currency.code)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={systemForm.timezone} onValueChange={(value) => setSystemForm(prev => ({ ...prev, timezone: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Dhaka">Asia/Dhaka (UTC+6)</SelectItem>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</SelectItem>
                      <SelectItem value="Asia/Karachi">Asia/Karachi (UTC+5)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (UTC+4)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                      <SelectItem value="Europe/Paris">Europe/Paris (UTC+1)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                      <SelectItem value="America/Chicago">America/Chicago (UTC-6)</SelectItem>
                      <SelectItem value="America/Denver">America/Denver (UTC-7)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los_Angeles (UTC-8)</SelectItem>
                      <SelectItem value="Australia/Sydney">Australia/Sydney (UTC+11)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                      <SelectItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select value={systemForm.date_format} onValueChange={(value) => setSystemForm(prev => ({ ...prev, date_format: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                      <SelectItem value="dd-MM-yyyy">DD-MM-YYYY</SelectItem>
                      <SelectItem value="dd.MM.yyyy">DD.MM.YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeFormat">Time Format</Label>
                  <Select value={systemForm.time_format} onValueChange={(value) => setSystemForm(prev => ({ ...prev, time_format: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                      <SelectItem value="24h">24 Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-backup</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically backup your data daily
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Button onClick={handleSystemSubmit} disabled={isSystemUpdating}>
                {isSystemUpdating ? 'Saving...' : 'Save System Settings'}
              </Button>
            </CardContent>
          </Card>
          
          <CourierWebhookSettings />
          
          <CustomCodeSettings />
          
          <DataBackupControls />
          
          <WooCommerceImport />
          
          <AppResetControls />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;