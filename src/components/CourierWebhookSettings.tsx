import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useWebhookSettings } from "@/hooks/useWebhookSettings";
import { Webhook, Save, TestTube } from "lucide-react";
import { toast } from "sonner";

export const CourierWebhookSettings = () => {
  const { webhookSettings, updateWebhookSettings, isUpdating } = useWebhookSettings();
  
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookName, setWebhookName] = useState("");
  const [webhookDescription, setWebhookDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  useEffect(() => {
    if (webhookSettings) {
      setWebhookUrl(webhookSettings.webhook_url || "");
      setWebhookName(webhookSettings.webhook_name || "");
      setWebhookDescription(webhookSettings.webhook_description || "");
      setIsActive(webhookSettings.is_active);
      setAuthUsername(webhookSettings.auth_username || "");
      setAuthPassword(webhookSettings.auth_password || "");
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
      webhook_name: webhookName || "Courier Webhook",
      webhook_description: webhookDescription,
      is_active: isActive,
      auth_username: authUsername,
      auth_password: authPassword
    });
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Please enter a webhook URL first");
      return;
    }

    try {
      new URL(webhookUrl);
    } catch {
      toast.error("Please enter a valid webhook URL");
      return;
    }

    try {
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        message: "Test webhook from courier settings",
        sample_order: {
          recipient_name: "Test Customer",
          recipient_phone: "01234567890",
          recipient_address: "Test Address, Dhaka",
          item_description: "Test Item",
          amount_to_collect: 100
        }
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add basic auth header if credentials provided
      if (authUsername && authPassword) {
        const credentials = btoa(`${authUsername}:${authPassword}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers,
        mode: "no-cors",
        body: JSON.stringify(testData),
      });

      toast.success("Test webhook sent successfully! Check your workflow to confirm it was received.");
    } catch (error) {
      console.error("Error testing webhook:", error);
      toast.error("Failed to send test webhook. Please check the URL and try again.");
    }
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
            <Label htmlFor="webhook_url">Webhook URL *</Label>
            <Input
              id="webhook_url"
              type="url"
              placeholder="https://your-workflow.com/webhook/courier-orders"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              The webhook URL where order data will be sent when "Send to Courier" is clicked
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook_name">Webhook Name</Label>
            <Input
              id="webhook_name"
              placeholder="My Courier Webhook"
              value={webhookName}
              onChange={(e) => setWebhookName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook_description">Description</Label>
            <Textarea
              id="webhook_description"
              placeholder="Description of your courier workflow webhook"
              value={webhookDescription}
              onChange={(e) => setWebhookDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="auth_username">Basic Auth Username</Label>
              <Input
                id="auth_username"
                placeholder="e.g., username"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Username for basic authentication (optional)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="auth_password">Basic Auth Password</Label>
              <Input
                id="auth_password"
                type="password"
                placeholder="e.g., password123"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Password for basic authentication (optional)
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
            
            <Button
              type="button"
              variant="outline"
              onClick={handleTestWebhook}
              disabled={!webhookUrl.trim()}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test Webhook
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