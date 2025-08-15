import React, { useState, useEffect } from "react";
import { Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { usePathaoSettings } from "@/hooks/usePathaoSettings";

export const PathaoSettings = () => {
  const { pathaoSettings, updatePathaoSettings, isUpdating } = usePathaoSettings();
  
  const [form, setForm] = useState({
    api_base_url: '',
    client_id: '',
    client_secret: '',
    username: '',
    password: '',
    store_id: 0,
    default_delivery_type: 48,
    default_item_type: 2
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);

  useEffect(() => {
    if (pathaoSettings) {
      const nextForm = {
        api_base_url: pathaoSettings.api_base_url || 'https://courier-api-sandbox.pathao.com',
        client_id: pathaoSettings.client_id || '',
        client_secret: pathaoSettings.client_secret || '',
        username: pathaoSettings.username || '',
        password: pathaoSettings.password || '',
        store_id: pathaoSettings.store_id || 0,
        default_delivery_type: pathaoSettings.default_delivery_type || 48,
        default_item_type: pathaoSettings.default_item_type || 2
      };
      setForm(prev => {
        return JSON.stringify(prev) === JSON.stringify(nextForm) ? prev : nextForm;
      });
      
      // Hide sensitive fields if they exist
      if (pathaoSettings.password) {
        setShowPassword(false);
      }
      if (pathaoSettings.client_secret) {
        setShowClientSecret(false);
      }
    }
  }, [pathaoSettings]);

  const handleSubmit = () => {
    updatePathaoSettings(form);
  };

  const deliveryTypeOptions = [
    { value: 48, label: "Normal Delivery" },
    { value: 12, label: "On-Demand Delivery" }
  ];

  const itemTypeOptions = [
    { value: 1, label: "Document" },
    { value: 2, label: "Parcel" }
  ];

  const displayPassword = form.password && !showPassword ? 
    '*'.repeat(Math.min(form.password.length, 20)) : 
    form.password;

  const displayClientSecret = form.client_secret && !showClientSecret ? 
    '*'.repeat(Math.min(form.client_secret.length, 20)) : 
    form.client_secret;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Pathao Courier Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
          {/* API Credentials Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">API Credentials</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apiBaseUrl">Pathao API Base URL</Label>
                  <Select 
                    value={form.api_base_url} 
                    onValueChange={(value) => setForm(prev => ({ ...prev, api_base_url: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select environment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="https://courier-api-sandbox.pathao.com">Sandbox/Test Environment</SelectItem>
                      <SelectItem value="https://api-hermes.pathao.com">Production Environment</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose Sandbox for testing or Production for live orders
                  </p>
                </div>
              
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input 
                    id="clientId" 
                    value={form.client_id}
                    onChange={(e) => setForm(prev => ({ ...prev, client_id: e.target.value }))}
                    placeholder="Enter your Pathao client ID"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Pathao merchant client ID from API credentials
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="clientSecret" 
                      type={showClientSecret ? "text" : "password"}
                      value={displayClientSecret}
                      onChange={(e) => setForm(prev => ({ ...prev, client_secret: e.target.value }))}
                      placeholder="Enter your Pathao client secret"
                      className="flex-1"
                    />
                    {form.client_secret && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowClientSecret(!showClientSecret)}
                      >
                        {showClientSecret ? "Hide" : "Show"}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your secure client secret from Pathao merchant dashboard
                  </p>
                </div>
              
                <div className="space-y-2">
                  <Label htmlFor="username">Username/Email</Label>
                  <Input 
                    id="username" 
                    type="email"
                    value={form.username}
                    onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter your Pathao login email"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Pathao merchant account email
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"}
                      value={displayPassword}
                      onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter your Pathao login password"
                      className="flex-1"
                    />
                    {form.password && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your Pathao merchant account password
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Store Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Store Information</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storeId">Store ID</Label>
                  <Input 
                    id="storeId" 
                    type="number"
                    value={form.store_id || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, store_id: parseInt(e.target.value) || 0 }))}
                    placeholder="Enter your merchant store ID" 
                  />
                  <p className="text-xs text-muted-foreground">
                    Your merchant store ID from Pathao merchant dashboard (get this from API or create a store first)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

        {/* Default Settings Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Default Order Settings</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deliveryType">Default Delivery Type</Label>
                <Select 
                  value={form.default_delivery_type.toString()} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, default_delivery_type: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery type" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Default delivery speed for new orders
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="itemType">Default Item Type</Label>
                <Select 
                  value={form.default_item_type.toString()} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, default_item_type: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item type" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Default item category for new orders
                </p>
              </div>
            </div>
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={isUpdating}>
          {isUpdating ? 'Saving...' : 'Save Pathao Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};