import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWebhookSettings } from "@/hooks/useWebhookSettings";
import { supabase } from "@/integrations/supabase/client";
import { Truck, Package, User, MapPin } from "lucide-react";
import { toast } from "sonner";

interface CourierOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
}

interface CourierOrderData {
  sale_id: string;
  invoice_number: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  item_description: string;
  amount_to_collect: number;
  total_items: number;
  order_date: string;
  special_instruction: string;
  items: Array<{
    name: string;
    quantity: number;
    rate: number;
  }>;
}

export const CourierOrderDialog = ({ open, onOpenChange, saleId }: CourierOrderDialogProps) => {
  const { webhookSettings } = useWebhookSettings();
  const [orderData, setOrderData] = useState<CourierOrderData>({
    sale_id: "",
    invoice_number: "",
    recipient_name: "",
    recipient_phone: "",
    recipient_address: "",
    item_description: "",
    amount_to_collect: 0,
    total_items: 0,
    order_date: "",
    special_instruction: "",
    items: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchSaleData = async () => {
      if (!saleId || !open) return;

      try {
        // Get sale data from the sales list or make direct queries
        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .select('*')
          .eq('id', saleId)
          .single();
          
        const { data: saleItems, error: itemsError } = await supabase
          .from('sales_items')
          .select('*, product_variants!left(attributes)')
          .eq('sale_id', saleId);

        if (saleError || itemsError) {
          throw new Error('Failed to fetch sale data');
        }

        if (sale && saleItems) {
          const itemDescriptions = saleItems.map((item: any) => {
            const variantText = item.product_variants?.attributes 
              ? ` (${Object.entries(item.product_variants.attributes).map(([key, value]) => `${key}: ${value}`).join(', ')})`
              : '';
            return `${item.product_name}${variantText} x${item.quantity}`;
          }).join(', ');

          const items = saleItems.map((item: any) => ({
            name: item.product_name,
            quantity: item.quantity,
            rate: parseFloat(item.rate)
          }));

          setOrderData({
            sale_id: sale.id,
            invoice_number: sale.invoice_number,
            recipient_name: sale.customer_name,
            recipient_phone: sale.customer_phone || "",
            recipient_address: sale.customer_address || "",
            item_description: itemDescriptions,
            amount_to_collect: parseFloat(sale.grand_total.toString()),
            total_items: saleItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
            order_date: sale.created_at,
            special_instruction: "",
            items
          });
        }
      } catch (error) {
        console.error("Error fetching sale data:", error);
        toast.error("Failed to load sale data");
      }
    };

    fetchSaleData();
  }, [saleId, open]);

  const handleSubmitOrder = async () => {
    if (!webhookSettings?.webhook_url) {
      toast.error("No webhook URL configured. Please configure your courier webhook in Settings.");
      return;
    }

    if (!webhookSettings.is_active) {
      toast.error("Courier webhook is disabled. Please enable it in Settings.");
      return;
    }

    if (!orderData.recipient_name || !orderData.recipient_phone || !orderData.recipient_address) {
      toast.error("Please fill in all required recipient information");
      return;
    }

    setIsSubmitting(true);

    try {
      // Sending order to courier webhook via backend
      console.log("Order data:", orderData);

      // Direct webhook call (bypass Edge Function)
      // Webhook URL logged for debugging (development only)
      if (process.env.NODE_ENV === 'development') {
        // Sending order directly to webhook URL
      }
      
      // For n8n webhooks, we typically don't need Basic Authentication
      // Only add auth headers if both username and password are provided AND not empty
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Only add Basic Auth if both credentials are provided and not empty
      if (webhookSettings.auth_username && webhookSettings.auth_password && 
          webhookSettings.auth_username.trim() !== '' && webhookSettings.auth_password.trim() !== '') {
        const credentials = btoa(`${webhookSettings.auth_username}:${webhookSettings.auth_password}`);
        headers['Authorization'] = `Basic ${credentials}`;
        console.log("Added Basic Authentication headers");
      } else {
        console.log("No Basic Authentication - sending without auth headers");
      }

      const webhookResponse = await fetch(webhookSettings.webhook_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData)
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        throw new Error(`Webhook Error (${webhookResponse.status}): ${errorText}`);
      }

      const webhookResult = await webhookResponse.json();
      // Webhook response received

      // Extract consignment_id from webhook response
      let consignmentId = null;
      const webhookName = webhookSettings.webhook_name || 'Courier Service';
      
      // Handle array response structure from webhook
      if (webhookResult && Array.isArray(webhookResult) && webhookResult.length > 0) {
        const firstResponse = webhookResult[0];
        if (firstResponse.data && firstResponse.data.consignment_id) {
          consignmentId = firstResponse.data.consignment_id;
        }
      } else if (webhookResult?.consignment_id) {
        consignmentId = webhookResult.consignment_id;
      } else if (webhookResult?.tracking_id) {
        consignmentId = webhookResult.tracking_id;
      } else if (webhookResult?.order_id) {
        consignmentId = webhookResult.order_id;
      }
      
      console.log('Extracted consignment_id:', consignmentId);
      
      // Update the sale with consignment_id and courier status
      if (consignmentId && orderData.sale_id) {
        const { error: updateError } = await supabase
          .from('sales')
          .update({ 
            consignment_id: consignmentId,
            courier_status: 'pending',
            order_status: 'pending',
            last_status_check: new Date().toISOString()
          })
          .eq('id', orderData.sale_id);
        
        if (updateError) {
          console.error('Failed to update sale with consignment_id:', updateError);
        } else {
          console.log('Successfully updated sale with consignment_id:', consignmentId);
        }
      }
      
      toast.success(`Order successfully sent to ${webhookName}! Tracking ID: ${consignmentId || 'Generated'}`);
      onOpenChange(false);
      
      // Refresh sales data without page reload
      window.dispatchEvent(new CustomEvent('salesDataUpdated'));
    } catch (error) {
      console.error("Error sending order to webhook:", error);
      toast.error(error.message || "Failed to send order to courier workflow. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!webhookSettings?.webhook_url) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Courier Service
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              No courier webhook configured. Please set up your webhook URL in Settings to use this feature.
            </p>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Send Order to Courier {webhookSettings.webhook_name ? `(${webhookSettings.webhook_name})` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Invoice:</span>
                <span className="font-medium">{orderData.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span className="font-medium">{orderData.total_items}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount to Collect:</span>
                <span className="font-medium">৳{orderData.amount_to_collect}</span>
              </div>
              <div className="pt-2">
                <span className="text-sm text-muted-foreground">Items:</span>
                <p className="text-sm mt-1">{orderData.item_description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Recipient Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Recipient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient_name">Recipient Name *</Label>
                <Input
                  id="recipient_name"
                  value={orderData.recipient_name}
                  onChange={(e) => setOrderData(prev => ({ ...prev, recipient_name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient_phone">Phone Number *</Label>
                <Input
                  id="recipient_phone"
                  value={orderData.recipient_phone}
                  onChange={(e) => setOrderData(prev => ({ ...prev, recipient_phone: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient_address">Address *</Label>
                <Textarea
                  id="recipient_address"
                  value={orderData.recipient_address}
                  onChange={(e) => setOrderData(prev => ({ ...prev, recipient_address: e.target.value }))}
                  rows={3}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="special_instruction">Special Instructions</Label>
                <Textarea
                  id="special_instruction"
                  placeholder="Any special delivery instructions..."
                  value={orderData.special_instruction}
                  onChange={(e) => setOrderData(prev => ({ ...prev, special_instruction: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitOrder} 
              disabled={isSubmitting}
              className="flex-1"
            >
              <Truck className="h-4 w-4 mr-2" />
              {isSubmitting ? "Sending..." : "Send to Courier"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};