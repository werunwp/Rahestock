import { User, Bell, Shield, Palette, Database, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useState, useEffect } from "react";

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
    invoice_footer_message: 'ধন্যবাদ আপনার সাথে ব্যবসা করার জন্য'
  });

  const [systemForm, setSystemForm] = useState({
    currency_symbol: '৳',
    currency_code: 'BDT',
    timezone: 'Asia/Dhaka',
    date_format: 'dd/MM/yyyy',
    time_format: '12h'
  });

  useEffect(() => {
    if (businessSettings) {
      setBusinessForm({
        business_name: businessSettings.business_name || '',
        phone: businessSettings.phone || '',
        whatsapp: businessSettings.whatsapp || '',
        email: businessSettings.email || '',
        facebook: businessSettings.facebook || '',
        address: businessSettings.address || '',
        invoice_prefix: businessSettings.invoice_prefix || 'INV',
        invoice_footer_message: businessSettings.invoice_footer_message || 'ধন্যবাদ আপনার সাথে ব্যবসা করার জন্য'
      });
    }
  }, [businessSettings]);

  useEffect(() => {
    if (systemSettings) {
      setSystemForm({
        currency_symbol: systemSettings.currency_symbol || '৳',
        currency_code: systemSettings.currency_code || 'BDT',
        timezone: systemSettings.timezone || 'Asia/Dhaka',
        date_format: systemSettings.date_format || 'dd/MM/yyyy',
        time_format: systemSettings.time_format || '12h'
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
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
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
              <div className="grid gap-4 md:grid-cols-2">
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
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={businessForm.email}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address" 
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea 
                  id="address" 
                  value={businessForm.address}
                  onChange={(e) => setBusinessForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter business address" 
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" placeholder="Enter your full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Enter your email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="Enter your phone number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" placeholder="Your role" disabled />
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for important updates
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Low Stock Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when products are running low
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sales Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive daily sales summary reports
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact View</Label>
                  <p className="text-sm text-muted-foreground">
                    Use a more compact layout for tables and lists
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currencySymbol">Currency Symbol</Label>
                  <Input 
                    id="currencySymbol" 
                    value={systemForm.currency_symbol}
                    onChange={(e) => setSystemForm(prev => ({ ...prev, currency_symbol: e.target.value }))}
                    placeholder="৳" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currencyCode">Currency Code</Label>
                  <Select value={systemForm.currency_code} onValueChange={(value) => setSystemForm(prev => ({ ...prev, currency_code: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BDT">BDT - Bangladeshi Taka</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                      <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                      <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                      <SelectItem value="SEK">SEK - Swedish Krona</SelectItem>
                      <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                      <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
                      <SelectItem value="PLN">PLN - Polish Złoty</SelectItem>
                      <SelectItem value="CZK">CZK - Czech Koruna</SelectItem>
                      <SelectItem value="HUF">HUF - Hungarian Forint</SelectItem>
                      <SelectItem value="RUB">RUB - Russian Ruble</SelectItem>
                      <SelectItem value="TRY">TRY - Turkish Lira</SelectItem>
                      <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                      <SelectItem value="BRL">BRL - Brazilian Real</SelectItem>
                      <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                      <SelectItem value="ARS">ARS - Argentine Peso</SelectItem>
                      <SelectItem value="CLP">CLP - Chilean Peso</SelectItem>
                      <SelectItem value="COP">COP - Colombian Peso</SelectItem>
                      <SelectItem value="PEN">PEN - Peruvian Sol</SelectItem>
                      <SelectItem value="KRW">KRW - South Korean Won</SelectItem>
                      <SelectItem value="THB">THB - Thai Baht</SelectItem>
                      <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                      <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                      <SelectItem value="PHP">PHP - Philippine Peso</SelectItem>
                      <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                      <SelectItem value="VND">VND - Vietnamese Dong</SelectItem>
                      <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                      <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                      <SelectItem value="NPR">NPR - Nepalese Rupee</SelectItem>
                      <SelectItem value="AFN">AFN - Afghan Afghani</SelectItem>
                      <SelectItem value="MMK">MMK - Myanmar Kyat</SelectItem>
                      <SelectItem value="KHR">KHR - Cambodian Riel</SelectItem>
                      <SelectItem value="LAK">LAK - Lao Kip</SelectItem>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;