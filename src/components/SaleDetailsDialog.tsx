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

interface InventoryLog {
  id: string;
  type: string;
  quantity: number;
  reason: string;
  created_at: string;
  product_name?: string;
}

export const SaleDetailsDialog = ({ open, onOpenChange, saleId }: SaleDetailsDialogProps) => {
  const [saleData, setSaleData] = useState<SaleWithItems | null>(null);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const { getSaleWithItems } = useSales();
  const { formatAmount } = useCurrency();

  useEffect(() => {
    if (!open || !saleId) {
      setSaleData(null);
      setInventoryLogs([]);
      return;
    }

    const loadSaleData = async () => {
      try {
        setIsLoading(true);
        
        // Load sale with items
        const sale = await getSaleWithItems(saleId);
        setSaleData(sale);

        // Load related inventory logs
        const { data: logs, error: logsError } = await supabase
          .from("inventory_logs")
          .select(`
            id,
            type,
            quantity,
            reason,
            created_at,
            products(name)
          `)
          .like("reason", `%${sale.invoice_number}%`)
          .order("created_at", { ascending: false });

        if (logsError) throw logsError;

        const formattedLogs = logs.map(log => ({
          ...log,
          product_name: (log as any).products?.name || "Unknown Product"
        }));

        setInventoryLogs(formattedLogs);
      } catch (error) {
        toast.error("Failed to load sale details");
        console.error("Error loading sale data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSaleData();
  }, [open, saleId]); // Removed getSaleWithItems from dependencies

  const handleRefreshStatus = async () => {
    if (!saleData?.consignment_id) {
      toast.error("No tracking ID available for this order");
      return;
    }

    setIsRefreshingStatus(true);
    
    try {
      // Check if webhook settings exist
      const { data: webhookSettings } = await supabase
        .from('courier_webhook_settings')
        .select('webhook_url')
        .eq('is_active', true)
        .maybeSingle();

      if (!webhookSettings?.webhook_url) {
        toast.error("No status check webhook URL configured");
        return;
      }

      const statusCheckUrl = `${webhookSettings.webhook_url}?consignment_id=${saleData.consignment_id}`;
      const response = await fetch(statusCheckUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const newStatus = result.status || result.order_status || 'pending';
        
        // Update the sale in database
        const { error: updateError } = await supabase
          .from('sales')
          .update({ 
            order_status: newStatus,
            last_status_check: new Date().toISOString()
          })
          .eq('id', saleData.id);
        
        if (!updateError) {
          // Update local state
          setSaleData(prev => prev ? {
            ...prev,
            order_status: newStatus,
            last_status_check: new Date().toISOString()
          } : null);
          toast.success("Order status updated successfully");
        } else {
          toast.error("Failed to update order status");
        }
      } else {
        toast.error("Failed to check order status");
      }
    } catch (error) {
      toast.error("Error checking order status");
      console.error("Error checking status:", error);
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">Loading sale details...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!saleData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">No sale data found</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Sale Details - {saleData.invoice_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sale Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sale Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Invoice Number</p>
                  <p className="text-base">{saleData.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                  <Badge 
                    variant={
                      saleData.payment_status === "paid" ? "default" : 
                      saleData.payment_status === "partial" ? "secondary" : 
                      "destructive"
                    }
                  >
                    {saleData.payment_status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order Status</p>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        saleData.order_status === "delivered" ? "default" : 
                        saleData.order_status === "in_transit" ? "secondary" : 
                        saleData.order_status === "cancelled" ? "destructive" :
                        "outline"
                      }
                    >
                      {saleData.order_status || 'pending'}
                    </Badge>
                    {saleData.consignment_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefreshStatus}
                        disabled={isRefreshingStatus}
                        className="h-6 w-6 p-0"
                        title="Refresh order status"
                      >
                        <RefreshCw className={`h-3 w-3 ${isRefreshingStatus ? 'animate-spin' : ''}`} />
                      </Button>
                    )}
                  </div>
                </div>
                {saleData.consignment_id && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tracking ID</p>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-mono">{saleData.consignment_id}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://tracking.pathao.com/?tracking_id=${saleData.consignment_id}`, '_blank')}
                        className="h-6 w-6 p-0"
                        title="Track on Pathao"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {saleData.last_status_check && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Status Check</p>
                    <p className="text-base">{format(new Date(saleData.last_status_check), "MMM dd, yyyy 'at' hh:mm a")}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-base">{format(new Date(saleData.created_at), "MMM dd, yyyy 'at' hh:mm a")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                  <p className="text-base">{format(new Date(saleData.updated_at), "MMM dd, yyyy 'at' hh:mm a")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-base">{saleData.customer_name}</p>
                </div>
                {saleData.customer_phone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="text-base">{saleData.customer_phone}</p>
                  </div>
                )}
                {saleData.customer_whatsapp && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
                    <p className="text-base">{saleData.customer_whatsapp}</p>
                  </div>
                )}
                {saleData.customer_address && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p className="text-base">{saleData.customer_address}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Products</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Variation</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleData.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>
                        {item.variant_attributes ? (
                          <div className="text-sm">
                            {Object.entries(item.variant_attributes)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Standard</span>
                        )}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatAmount(item.rate)}</TableCell>
                      <TableCell>{formatAmount(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatAmount(saleData.subtotal)}</span>
                </div>
                {saleData.discount_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount ({saleData.discount_percent}%):</span>
                    <span>-{formatAmount(saleData.discount_amount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Grand Total:</span>
                  <span>{formatAmount(saleData.grand_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span>{formatAmount(saleData.amount_paid)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Due:</span>
                  <span className={saleData.amount_due > 0 ? "text-destructive" : "text-green-600"}>
                    {formatAmount(saleData.amount_due)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="capitalize">{saleData.payment_method.replace('_', ' ')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Changes */}
          {inventoryLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inventory Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{format(new Date(log.created_at), "MMM dd, yyyy hh:mm a")}</TableCell>
                        <TableCell>{log.product_name}</TableCell>
                        <TableCell>
                          <Badge variant={log.type === "sale" ? "destructive" : "default"}>
                            {log.type}
                          </Badge>
                        </TableCell>
                        <TableCell className={log.quantity < 0 ? "text-destructive" : "text-green-600"}>
                          {log.quantity > 0 ? "+" : ""}{log.quantity}
                        </TableCell>
                        <TableCell>{log.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};