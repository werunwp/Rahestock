import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Shield, Database, Users, FileText, Settings, AlertCircle, Database as DatabaseIcon } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { currencyOptions, getCurrencySymbol } from "@/lib/currencySymbols";
import { CourierWebhookSettings } from "@/components/CourierWebhookSettings";
import { CustomCodeSettings } from "@/components/CustomCodeSettings";
import { DataBackupControls } from "@/components/DataBackupControls";
import { WooCommerceImport } from "@/components/WooCommerceImport";
import { AppResetControls } from "@/components/AppResetControls";

export function SystemSettings() {
  const { systemSettings, updateSystemSettings, isUpdating: isSystemUpdating } = useSystemSettings();
  
  const [systemForm, setSystemForm] = useState({
    currency_code: 'BDT',
    timezone: 'Asia/Dhaka',
    date_format: 'dd/MM/yyyy',
    time_format: '12h'
  });

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

  const handleSystemSubmit = () => {
    updateSystemSettings(systemForm);
  };

  return (
    <div className="space-y-6">
      {/* System Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Information
          </CardTitle>
          <CardDescription>Current system status and configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Authentication</p>
                  <p className="text-xs text-muted-foreground">Supabase Auth</p>
                </div>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Database className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Database</p>
                  <p className="text-xs text-muted-foreground">PostgreSQL</p>
                </div>
              </div>
              <Badge variant="default">Connected</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">User Signup</p>
                  <p className="text-xs text-muted-foreground">Admin controlled</p>
                </div>
              </div>
              <Badge variant="secondary">Disabled</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Data Backup</p>
                  <p className="text-xs text-muted-foreground">Export/Import</p>
                </div>
              </div>
              <Badge variant="default">Available</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notes Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Security Notes
          </CardTitle>
          <CardDescription>Important security considerations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <p className="text-sm font-medium">Public Signup Disabled</p>
            <p className="text-xs text-muted-foreground mt-1">
              Only administrators can invite new users to maintain security and control access.
            </p>
          </div>
          
          <div className="p-3 rounded-lg border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950">
            <p className="text-sm font-medium">Role-Based Access Control</p>
            <p className="text-xs text-muted-foreground mt-1">
              Users are assigned specific roles (Admin, Manager, Staff, Viewer) with appropriate permissions.
            </p>
          </div>
          
          <div className="p-3 rounded-lg border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950">
            <p className="text-sm font-medium">Row Level Security</p>
            <p className="text-xs text-muted-foreground mt-1">
              Database policies ensure users can only access data they're authorized to view.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseIcon className="h-5 w-5" />
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
      
      {/* Courier Webhook Settings */}
      <CourierWebhookSettings />
      
      {/* Custom Code Settings */}
      <CustomCodeSettings />
      
      {/* Data Backup Controls */}
      <DataBackupControls />
      
      {/* WooCommerce Import */}
      <WooCommerceImport />
      
      {/* App Reset Controls */}
      <AppResetControls />
    </div>
  );
}