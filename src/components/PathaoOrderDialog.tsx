import React, { useState } from "react";
import { Truck, MapPin, Package, User, Phone, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSales } from "@/hooks/useSales";
import { usePathaoSettings } from "@/hooks/usePathaoSettings";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PathaoOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
}

interface PathaoOrderData {
  store_id: number;
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city?: number;
  recipient_zone?: number;
  recipient_area?: number;
  item_type: number;
  special_instruction: string;
  item_quantity: number;
  item_weight: number;
  item_description: string;
  amount_to_collect: number;
  delivery_type: number;
}

export const PathaoOrderDialog = ({ open, onOpenChange, saleId }: PathaoOrderDialogProps) => {
  const { getSaleWithItems } = useSales();
  const { pathaoSettings } = usePathaoSettings();
  const { formatAmount } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [orderData, setOrderData] = useState<PathaoOrderData>({
    store_id: pathaoSettings.store_id || 0,
    merchant_order_id: '',
    recipient_name: '',
    recipient_phone: '',
    recipient_address: '',
    recipient_city: undefined,
    recipient_zone: undefined,
    recipient_area: undefined,
    item_type: pathaoSettings.default_item_type || 2,
    special_instruction: '',
    item_quantity: 1,
    item_weight: 0.5,
    item_description: '',
    amount_to_collect: 0,
    delivery_type: pathaoSettings.default_delivery_type || 48,
  });

  const [sale, setSale] = useState<any>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);

  React.useEffect(() => {
    if (saleId && open) {
      getSaleWithItems(saleId).then((data) => {
        if (data) {
          setSale(data);
          setSaleItems(data.items || []);
          
          // Pre-fill order data from sale
          setOrderData(prev => ({
            ...prev,
            merchant_order_id: data.invoice_number,
            recipient_name: data.customer_name,
            recipient_phone: data.customer_phone || '',
            recipient_address: data.customer_address || '',
            amount_to_collect: data.grand_total || 0,
            item_quantity: data.items?.length || 1,
            item_description: data.items?.map((item: any) => 
              `${item.product_name}${item.variant_attributes ? 
                ` (${Object.entries(item.variant_attributes).map(([k, v]) => `${k}: ${v}`).join(', ')})` : 
                ''} x${item.quantity}`
            ).join(', ') || 'Order items',
          }));
        }
      });
    }
  }, [saleId, open, getSaleWithItems]);

  const deliveryTypeOptions = [
    { value: 48, label: "Normal Delivery" },
    { value: 12, label: "On-Demand Delivery" }
  ];

  const itemTypeOptions = [
    { value: 1, label: "Document" },
    { value: 2, label: "Parcel" }
  ];

  const handleSubmitOrder = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate required fields
      if (!orderData.recipient_name || !orderData.recipient_phone || !orderData.recipient_address) {
        toast.error("Please fill in all required recipient details");
        return;
      }

      if (!orderData.store_id) {
        toast.error("Please configure your store ID in Pathao settings");
        return;
      }

      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to send orders");
        return;
      }

      // Call edge function to submit to Pathao
      const { data, error } = await supabase.functions.invoke('pathao-order', {
        body: orderData,
      });

      if (error) {
        console.error('Supabase function error:', error);
        toast.error(`Failed to submit order to Pathao: ${error.message}`);
        return;
      }

      if (data?.success) {
        toast.success(`Order submitted to Pathao successfully! Consignment ID: ${data.consignment_id}`);
        onOpenChange(false);
      } else {
        console.error('Pathao API error:', data);
        toast.error(data?.message || 'Failed to submit order to Pathao');
      }
    } catch (error) {
      console.error('Error submitting order to Pathao:', error);
      toast.error('Failed to submit order to Pathao');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sale) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Send Order to Pathao - {sale.invoice_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Order Summary</h3>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Invoice:</span>
                <span className="font-medium">{sale.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-medium">{formatAmount(sale.grand_total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Items:</span>
                <span className="font-medium">{saleItems.length} item(s)</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {saleItems.map((item, idx) => (
                  <div key={idx}>
                    {item.product_name}
                    {item.variant_attributes && (
                      <span className="ml-1">
                        ({Object.entries(item.variant_attributes).map(([k, v]) => `${k}: ${v}`).join(', ')})
                      </span>
                    )}
                    <span className="ml-1">x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Recipient Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Recipient Information
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recipientName">Recipient Name *</Label>
                <Input
                  id="recipientName"
                  value={orderData.recipient_name}
                  onChange={(e) => setOrderData(prev => ({ ...prev, recipient_name: e.target.value }))}
                  placeholder="Customer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipientPhone">Recipient Phone *</Label>
                <Input
                  id="recipientPhone"
                  value={orderData.recipient_phone}
                  onChange={(e) => setOrderData(prev => ({ ...prev, recipient_phone: e.target.value }))}
                  placeholder="Customer phone number (11 digits)"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="recipientAddress">Recipient Address *</Label>
                <Input
                  id="recipientAddress"
                  value={orderData.recipient_address}
                  onChange={(e) => setOrderData(prev => ({ ...prev, recipient_address: e.target.value }))}
                  placeholder="Customer full address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipientCity">City ID</Label>
                <Input
                  id="recipientCity"
                  type="number"
                  value={orderData.recipient_city || ''}
                  onChange={(e) => setOrderData(prev => ({ ...prev, recipient_city: parseInt(e.target.value) || undefined }))}
                  placeholder="City ID (e.g., 1 for Dhaka)"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Use Pathao city ID (defaults to 1 - Dhaka)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipientZone">Zone ID</Label>
                <Input
                  id="recipientZone"
                  type="number"
                  value={orderData.recipient_zone || ''}
                  onChange={(e) => setOrderData(prev => ({ ...prev, recipient_zone: parseInt(e.target.value) || undefined }))}
                  placeholder="Zone ID"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Use Pathao zone ID (defaults to 1)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Package Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Package Information
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="itemType">Item Type</Label>
                <Select 
                  value={orderData.item_type.toString()} 
                  onValueChange={(value) => setOrderData(prev => ({ ...prev, item_type: parseInt(value) }))}
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryType">Delivery Type</Label>
                <Select 
                  value={orderData.delivery_type.toString()} 
                  onValueChange={(value) => setOrderData(prev => ({ ...prev, delivery_type: parseInt(value) }))}
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemWeight">Weight (kg)</Label>
                <Input
                  id="itemWeight"
                  type="number"
                  step="0.1"
                  value={orderData.item_weight}
                  onChange={(e) => setOrderData(prev => ({ ...prev, item_weight: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amountToCollect">Amount to Collect</Label>
                <Input
                  id="amountToCollect"
                  type="number"
                  value={orderData.amount_to_collect}
                  onChange={(e) => setOrderData(prev => ({ ...prev, amount_to_collect: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="itemDescription">Item Description</Label>
                <Input
                  id="itemDescription"
                  value={orderData.item_description}
                  onChange={(e) => setOrderData(prev => ({ ...prev, item_description: e.target.value }))}
                  placeholder="Brief description of items"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="specialInstruction">Special Instructions</Label>
                <Input
                  id="specialInstruction"
                  value={orderData.special_instruction}
                  onChange={(e) => setOrderData(prev => ({ ...prev, special_instruction: e.target.value }))}
                  placeholder="Any special delivery instructions"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitOrder} disabled={isSubmitting}>
              <Truck className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Sending...' : 'Send to Pathao'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};