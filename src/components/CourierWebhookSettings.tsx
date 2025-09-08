import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useWebhookSettings } from "@/hooks/useWebhookSettings";
import { Webhook, Save } from "lucide-react";
import { toast } from "sonner";

export const CourierWebhookSettings = () => {
  const { webhookSettings, updateWebhookSettings, isUpdating } = useWebhookSettings();
  
  const [webhookUrl, setWebhookUrl] = useState("");
  const [statusCheckWebhookUrl, setStatusCheckWebhookUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  useEffect(() => {
    if (webhookSettings) {
      setWebhookUrl(webhookSettings.webhook_url || "");
      setStatusCheckWebhookUrl(webhookSettings.status_check_webhook_url || "");
      setIsActive(webhookSettings.is_active);
      setAuthUsername(webhookSettings.auth_username || "");
      setAuthPassword(webhookSettings.auth_password || "");
    } else {
      // Only set defaults when there are no saved settings
      setWebhookUrl("");
      setStatusCheckWebhookUrl("");
      setIsActive(true);
      setAuthUsername("");
      setAuthPassword("");
    }
  }, [webhookSettings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!webhookUrl.trim()) {
      toast.error("Please enter a webhook URL");
      return;
    }

    try {
      new URL(webhookUrl);
    } catch {
      toast.error("Please enter a valid webhook URL");
      return;
    }

    updateWebhookSettings({
      webhook_url: webhookUrl,
      webhook_name: "",
      webhook_description: "",
      status_check_webhook_url: statusCheckWebhookUrl,
      is_active: isActive,
      auth_username: authUsername,
      auth_password: authPassword
    });
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Courier Webhook Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure your webhook URL to send order data to your preferred courier automation workflow (e.g., n8n, Zapier, etc.)
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook_url">n8n Webhook URL</Label>
            <Input
              id="webhook_url"
              placeholder="Enter your webhook URL"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              n8n webhook URL that handles both order creation and status checking
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status_check_webhook_url">Status Check Webhook URL *</Label>
            <Input
              id="status_check_webhook_url"
              type="url"
              placeholder="Enter your status check API URL"
              value={statusCheckWebhookUrl}
              onChange={(e) => setStatusCheckWebhookUrl(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              The Pathao API endpoint for checking order status. Use {"{consignment_id}"} as placeholder for the actual consignment ID.
            </p>
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="auth_username">n8n Webhook Username</Label>
              <Input
                id="auth_username"
                type="text"
                placeholder="Enter username for basic auth"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Username for n8n webhook basic authentication
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth_password">n8n Webhook Password</Label>
              <Input
                id="auth_password"
                type="password"
                placeholder="Enter password for basic auth"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Password for n8n webhook basic authentication
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Enable webhook</Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isUpdating}>
              <Save className="h-4 w-4 mr-2" />
              {isUpdating ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Sample Webhook Payload</h4>
          <pre className="text-xs text-muted-foreground overflow-x-auto">
{`{
  "sale_id": "uuid",
  "invoice_number": "INV000001",
  "recipient_name": "Customer Name",
  "recipient_phone": "01234567890",
  "recipient_address": "Customer Address",
  "item_description": "Product descriptions",
  "amount_to_collect": 570.00,
  "total_items": 2,
  "order_date": "2025-01-17T10:30:00Z",
  "items": [
    {
      "name": "Product Name",
      "quantity": 1,
      "rate": 570.00
    }
  ]
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};