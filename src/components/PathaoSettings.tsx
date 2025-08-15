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
    api_base_url: 'https://api-hermes.pathao.com',
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
    }
  }, [pathaoSettings]);

  const handleSubmit = () => {
    updatePathaoSettings(form);
  };

  const maskToken = (token: string) => {
    if (!token || token.length <= 8) return token;
    return token.substring(0, 4) + '*'.repeat(token.length - 8) + token.substring(token.length - 4);
  };

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
          <h3 className="text-sm font-medium text-foreground">API Credentials</h3>
          <div className="grid gap-4 sm:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="apiBaseUrl">Pathao API Base URL</Label>
              <Input 
                id="apiBaseUrl" 
                value={form.api_base_url}
                onChange={(e) => setForm(prev => ({ ...prev, api_base_url: e.target.value }))}
                placeholder="https://api-hermes.pathao.com" 
              />
              <p className="text-xs text-muted-foreground">
                The base URL for Pathao's API endpoints
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <div className="flex gap-2">
                <Input 
                  id="accessToken" 
                  type={showToken ? "text" : "password"}
                  value={showToken ? form.access_token : (form.access_token ? maskToken(form.access_token) : '')}
                  onChange={(e) => setForm(prev => ({ ...prev, access_token: e.target.value }))}
                  placeholder="Enter your Pathao access token" 
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowToken(!showToken)}
                  className="px-3"
                >
                  {showToken ? "Hide" : "Show"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your API access token from Pathao merchant dashboard
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeId">Store ID</Label>
              <Input 
                id="storeId" 
                type="number"
                value={form.store_id}
                onChange={(e) => setForm(prev => ({ ...prev, store_id: parseInt(e.target.value) || 0 }))}
                placeholder="Enter your merchant store ID" 
              />
              <p className="text-xs text-muted-foreground">
                Your merchant store ID from Pathao dashboard
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Default Settings Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Default Order Settings</h3>
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
                  <SelectItem value="48">Normal Delivery (48)</SelectItem>
                  <SelectItem value="12">On-Demand Delivery (12)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default delivery type for new orders
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
                  <SelectItem value="1">Document (1)</SelectItem>
                  <SelectItem value="2">Parcel (2)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default item type for new orders
              </p>
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