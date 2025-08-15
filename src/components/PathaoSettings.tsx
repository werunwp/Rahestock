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
    access_token: '',
    store_id: 0,
    default_delivery_type: 48,
    default_item_type: 2
  });

  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (pathaoSettings) {
      const nextForm = {
        api_base_url: pathaoSettings.api_base_url || 'https://api-hermes.pathao.com',
        access_token: pathaoSettings.access_token || '',
        store_id: pathaoSettings.store_id || 0,
        default_delivery_type: pathaoSettings.default_delivery_type || 48,
        default_item_type: pathaoSettings.default_item_type || 2
      };
      setForm(prev => {
        return JSON.stringify(prev) === JSON.stringify(nextForm) ? prev : nextForm;
      });
      
      // Hide token if it exists (show masked version)
      if (pathaoSettings.access_token) {
        setShowToken(false);
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

  const displayToken = form.access_token && !showToken ? 
    '*'.repeat(Math.min(form.access_token.length, 20)) : 
    form.access_token;

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
                <Input 
                  id="apiBaseUrl" 
                  value={form.api_base_url}
                  onChange={(e) => setForm(prev => ({ ...prev, api_base_url: e.target.value }))}
                  placeholder="https://api-hermes.pathao.com" 
                />
                <p className="text-xs text-muted-foreground">
                  The base URL for Pathao API requests
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token</Label>
                <div className="flex gap-2">
                  <Input 
                    id="accessToken" 
                    type={showToken ? "text" : "password"}
                    value={displayToken}
                    onChange={(e) => setForm(prev => ({ ...prev, access_token: e.target.value }))}
                    placeholder="Enter your Pathao access token"
                    className="flex-1"
                  />
                  {form.access_token && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? "Hide" : "Show"}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Your secure API access token from Pathao merchant dashboard
                </p>
              </div>
              
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
                  Your merchant store ID from Pathao merchant dashboard
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