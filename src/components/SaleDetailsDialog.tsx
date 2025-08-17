import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useSales } from "@/hooks/useSales";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaleDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
}

interface SaleWithItems {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  customer_whatsapp?: string;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  grand_total: number;
  amount_paid: number;
  amount_due: number;
  payment_method: string;
  payment_status: string;
  order_status?: string;
  courier_status?: string;
  consignment_id?: string;
  last_status_check?: string;
  created_at: string;
  updated_at: string;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    rate: number;
    total: number;
    variant_id: string | null;
    variant_attributes?: Record<string, string>;
  }>;
}

export const SaleDetailsDialog = ({ open, onOpenChange, saleId }: SaleDetailsDialogProps) => {
  const { getSaleWithItems } = useSales();
  const [sale, setSale] = useState<SaleWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const { formatAmount } = useCurrency();

  const fetchSaleDetails = async () => {
    if (!saleId) return;
    
    setIsLoading(true);
    try {
      const saleData = await getSaleWithItems(saleId);
      setSale(saleData);
      
      // If sale has consignment_id, refresh status automatically
      if (saleData.consignment_id) {
        handleStatusRefresh(saleData.consignment_id);
      }
    } catch (error) {
      console.error("Error fetching sale details:", error);
      toast.error("Failed to load sale details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusRefresh = async (consignmentId: string) => {
    setIsRefreshingStatus(true);
    
    try {
      // Get webhook settings for status check
      const { data: webhookSettings } = await supabase
        .from('courier_webhook_settings')
        .select('webhook_url')
        .eq('is_active', true)
        .maybeSingle();

      if (!webhookSettings?.webhook_url) {
        toast.error("No status check webhook URL configured");
        return;
      }

      const statusCheckUrl = `${webhookSettings.webhook_url}?consignment_id=${consignmentId}`;
      const response = await fetch(statusCheckUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const newCourierStatus = result.status || result.order_status || 'pending';
        
        // Update the sale in database and local state
        const { error: updateError } = await supabase
          .from('sales')
          .update({ 
            courier_status: newCourierStatus,
            order_status: newCourierStatus,
            last_status_check: new Date().toISOString()
          })
          .eq('id', saleId);
        
        if (!updateError && sale) {
          setSale({
            ...sale,
            courier_status: newCourierStatus,
            order_status: newCourierStatus,
            last_status_check: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error("Error refreshing status:", error);
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  useEffect(() => {
    if (open && saleId) {
      fetchSaleDetails();
    }
  }, [open, saleId]);

  if (!sale) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            {isLoading ? (
              <p>Loading sale details...</p>
            ) : (
              <p>No sale data found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Sale Details - {sale.invoice_number}
            <Badge variant={
              sale.payment_status === "paid" ? "default" : 
              sale.payment_status === "cancelled" ? "destructive" : 
              "secondary"
            }>
              {sale.payment_status.charAt(0).toUpperCase() + sale.payment_status.slice(1)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">Name</p>
                <p className="text-sm text-muted-foreground">{sale.customer_name}</p>
              </div>
              {sale.customer_phone && (
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{sale.customer_phone}</p>
                </div>
              )}
              {sale.customer_whatsapp && (
                <div>
                  <p className="text-sm font-medium">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">{sale.customer_whatsapp}</p>
                </div>
              )}
              {sale.customer_address && (
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">{sale.customer_address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sale Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sale Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">Payment Method</p>
                <p className="text-sm text-muted-foreground">{sale.payment_method}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Created At</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(sale.created_at), "MMM dd, yyyy 'at' hh:mm a")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Last Updated</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(sale.updated_at), "MMM dd, yyyy 'at' hh:mm a")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Courier Status Card */}
          {sale.consignment_id && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Courier Information
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusRefresh(sale.consignment_id!)}
                    disabled={isRefreshingStatus}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className={cn("h-3 w-3", isRefreshingStatus && "animate-spin")} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Tracking ID</p>
                  <a
                    href={`https://tracking.pathao.com/?tracking_id=${sale.consignment_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-mono text-sm flex items-center gap-1"
                  >
                    {sale.consignment_id}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Delivery Status</p>
                  <Badge variant={
                    sale.courier_status === 'delivered' ? 'default' : 
                    sale.courier_status === 'in_transit' || sale.courier_status === 'out_for_delivery' ? 'secondary' : 
                    sale.courier_status === 'returned' || sale.courier_status === 'lost' ? 'destructive' :
                    'outline'
                  }>
                    {sale.courier_status === 'in_transit' ? 'In Transit' :
                     sale.courier_status === 'out_for_delivery' ? 'Out for Delivery' :
                     sale.courier_status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                  </Badge>
                </div>

                {sale.last_status_check && (
                  <div>
                    <p className="text-sm font-medium">Last Status Check</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(sale.last_status_check), 'PPp')}
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Click the tracking ID to view real-time status on Pathao's website
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        {item.variant_attributes && (
                          <p className="text-sm text-muted-foreground">
                            {Object.entries(item.variant_attributes)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ')}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatAmount(item.rate)}</TableCell>
                    <TableCell className="text-right">{formatAmount(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatAmount(sale.subtotal)}</span>
            </div>
            {sale.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({sale.discount_percent}%)</span>
                <span>-{formatAmount(sale.discount_amount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Grand Total</span>
              <span>{formatAmount(sale.grand_total)}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid</span>
              <span className="text-green-600">{formatAmount(sale.amount_paid)}</span>
            </div>
            {sale.amount_due > 0 && (
              <div className="flex justify-between">
                <span>Amount Due</span>
                <span className="text-red-600">{formatAmount(sale.amount_due)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};