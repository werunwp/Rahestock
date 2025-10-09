import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Eye, TrendingUp, TrendingDown, DollarSign, RefreshCw, Trash2, Search } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSales } from "@/hooks/useSales";
import { SaleDialog } from "@/components/SaleDialog";
import { EditSaleDialog } from "@/components/EditSaleDialog";
import { SaleDetailsDialog } from "@/components/SaleDetailsDialog";
import { SimpleDateRangeFilter } from "@/components/SimpleDateRangeFilter";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import { useStatusAutoRefresh } from "@/hooks/useStatusAutoRefresh";
import { useWebhookSettings } from "@/hooks/useWebhookSettings";
import { useCourierStatusRealtime } from "@/hooks/useCourierStatusRealtime";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { ManualCourierStatusSelector } from "@/components/ManualCourierStatusSelector";

// Function to restore inventory when an order is cancelled
const restoreInventoryForCancelledOrder = async (saleId: string) => {
  try {
    // Get sale items
    const { data: saleItems, error: itemsError } = await supabase
      .from('sales_items')
      .select('*')
      .eq('sale_id', saleId);

    if (itemsError) {
      console.error('Error fetching sale items:', itemsError);
      return;
    }

    if (!saleItems || saleItems.length === 0) {
      console.log('No sale items found for cancelled order');
      return;
    }

    console.log('Restoring inventory for cancelled order items:', saleItems);

    // Restore inventory for each item
    for (const item of saleItems) {
      if (item.variant_id) {
        // Restore variant inventory
        const { data: currentVariant, error: getVariantError } = await supabase
          .from('product_variants')
          .select('stock_quantity')
          .eq('id', item.variant_id)
          .single();

        if (getVariantError) {
          console.error('Error getting variant current stock:', getVariantError);
          continue;
        }

        const { error: variantError } = await supabase
          .from('product_variants')
          .update({ 
            stock_quantity: (currentVariant.stock_quantity || 0) + item.quantity
          })
          .eq('id', item.variant_id);

        if (variantError) {
          console.error('Error restoring variant inventory:', variantError);
        } else {
          console.log(`Restored ${item.quantity} units to variant ${item.variant_id}`);
        }

        // Log inventory change
        await supabase
          .from('inventory_logs')
          .insert({
            product_id: item.product_id,
            variant_id: item.variant_id,
            type: 'restore_cancellation',
            quantity: item.quantity,
            reason: `Restored due to order cancellation (Sale ID: ${saleId})`
          });
      } else {
        // Restore product inventory
        const { data: currentProduct, error: getProductError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (getProductError) {
          console.error('Error getting product current stock:', getProductError);
          continue;
        }

        const { error: productError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: (currentProduct.stock_quantity || 0) + item.quantity
          })
          .eq('id', item.product_id);

        if (productError) {
          console.error('Error restoring product inventory:', productError);
        } else {
          console.log(`Restored ${item.quantity} units to product ${item.product_id}`);
        }

        // Log inventory change
        await supabase
          .from('inventory_logs')
          .insert({
            product_id: item.product_id,
            type: 'restore_cancellation',
            quantity: item.quantity,
            reason: `Restored due to order cancellation (Sale ID: ${saleId})`
          });
      }
    }

    console.log('Inventory restoration completed for cancelled order');
  } catch (error) {
    console.error('Error restoring inventory for cancelled order:', error);
  }
};

interface Sale {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  grand_total: number;
  payment_status: string;
  order_status?: string;
  courier_status?: string;
  consignment_id?: string;
  last_status_check?: string;
  estimated_delivery?: string;
  created_at: string;
  amount_paid: number;
  amount_due: number;
}

export default function Sales() {
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [detailsSaleId, setDetailsSaleId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isRefreshingStatuses, setIsRefreshingStatuses] = useState(false);
  const [refreshingIndividual, setRefreshingIndividual] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const { deleteSale } = useSales();
  const { isAdmin } = useUserRole();
  
  // Enable auto-refresh for courier statuses
  useStatusAutoRefresh();
  
  // Enable real-time updates for courier statuses
  useCourierStatusRealtime();

  const { data: sales = [], isLoading, error, refetch } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Sale[];
    },
  });

  // Listen for sales data updates to refresh without page reload
  useEffect(() => {
    const handleSalesUpdate = () => {
      refetch();
    };
    
    window.addEventListener('salesDataUpdated', handleSalesUpdate);
    return () => window.removeEventListener('salesDataUpdated', handleSalesUpdate);
  }, [refetch]);

  const { webhookSettings } = useWebhookSettings();

  const handleManualStatusUpdate = (saleId: string, newStatus: string) => {
    // Trigger a page refresh to update the UI
    refetch();
  };

  const handleStatusRefresh = async (saleId: string, consignmentId: string, showToast = true) => {
    setRefreshingIndividual(saleId);
    try {
      if (!webhookSettings) {
        throw new Error('Webhook settings not loaded');
      }

      // Webhook settings loaded

      if (!webhookSettings.status_check_webhook_url) {
        console.error('Webhook settings found but missing status_check_webhook_url:', webhookSettings);
        throw new Error('No status check webhook URL configured');
      }

      // Webhook settings details logged (development only)
      if (process.env.NODE_ENV === 'development') {
        console.log('Webhook settings details:', {
        status_check_webhook_url: webhookSettings.status_check_webhook_url,
        auth_username: webhookSettings.auth_username,
        auth_password: webhookSettings.auth_password ? '***' : 'undefined',
        auth_password_length: webhookSettings.auth_password ? webhookSettings.auth_password.length : 0
      });
      }

      // Revert to direct webhook status check (previous working behavior for admin)
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (webhookSettings.auth_username && webhookSettings.auth_password &&
          webhookSettings.auth_username.trim() !== '' && webhookSettings.auth_password.trim() !== '') {
        const credentials = btoa(`${webhookSettings.auth_username}:${webhookSettings.auth_password}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }
      const url = new URL(webhookSettings.status_check_webhook_url);
      url.searchParams.append('consignment_id', consignmentId);
      const response = await fetch(url.toString(), { method: 'GET', headers });
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }
      const result = await response.json();
      console.log('Status check response:', result);
      
      // Handle the specific response format from your webhook
      let newStatus = 'pending';
      
      if (Array.isArray(result) && result.length > 0) {
        // Format: [{ "type": "success", "code": 200, "data": { "order_status": "..." } }]
        const firstResponse = result[0];
        if (firstResponse.type === 'success' && firstResponse.data) {
          newStatus = firstResponse.data.order_status || 'pending';
        }
      } else if (result.data && result.data.order_status) {
        // Fallback format: { "data": { "order_status": "..." } }
        newStatus = result.data.order_status;
      } else if (result.order_status) {
        // Direct format: { "order_status": "..." }
        newStatus = result.order_status;
      } else if (result.status) {
        // Legacy format: { "status": "..." }
        newStatus = result.status;
      } else if (result.courier_status) {
        // Legacy format: { "courier_status": "..." }
        newStatus = result.courier_status;
      }
      
      console.log('Extracted courier status:', newStatus);
      
      // Normalize status for consistent display
      const normalizedStatus = newStatus.toLowerCase().replace(/[^a-z0-9]/g, '_');
      let displayStatus = newStatus;
      
      if (normalizedStatus.includes('pickup_cancelled') || normalizedStatus.includes('pickup_cancel') || normalizedStatus.includes('cancelled')) {
        displayStatus = 'cancelled';
      } else if (normalizedStatus.includes('in_transit') || normalizedStatus.includes('picked_up')) {
        displayStatus = 'in_transit';
      } else if (normalizedStatus.includes('out_for_delivery')) {
        displayStatus = 'out_for_delivery';
      } else if (normalizedStatus.includes('delivered') || normalizedStatus.includes('completed')) {
        displayStatus = 'delivered';
      } else if (normalizedStatus.includes('returned')) {
        displayStatus = 'returned';
      }
      
      console.log('Status normalization:', { original: newStatus, normalized: normalizedStatus, display: displayStatus });
        
      // Map courier status to payment status for business logic
      let paymentStatusUpdate = {};
      if (normalizedStatus.includes('delivered') || normalizedStatus.includes('completed')) {
        paymentStatusUpdate = { payment_status: 'paid' };
        console.log('Setting payment status to: paid');
      } else if (normalizedStatus.includes('returned') || normalizedStatus.includes('cancelled') || 
                 normalizedStatus.includes('pickup_cancelled') || normalizedStatus.includes('pickup_cancel') || normalizedStatus.includes('lost')) {
        paymentStatusUpdate = { payment_status: 'cancelled' };
        console.log('Setting payment status to: cancelled');
      } else {
        console.log('No payment status update needed for status:', normalizedStatus);
      }
      
      console.log('Payment status update object:', paymentStatusUpdate);
        
      // Update the sale in database
      console.log('Updating sale in database with:', {
        courier_status: displayStatus,
        order_status: displayStatus,
        last_status_check: new Date().toISOString(),
        paymentStatusUpdate
      });
      
      const { error: updateError } = await supabase
        .from('sales')
        .update({ 
          courier_status: displayStatus,
          order_status: displayStatus, // Keep for backward compatibility
          last_status_check: new Date().toISOString(),
          ...paymentStatusUpdate
        })
        .eq('id', saleId);

      // If order is cancelled, restore inventory
      if (displayStatus === 'cancelled') {
        console.log('Order cancelled, restoring inventory...');
        await restoreInventoryForCancelledOrder(saleId);
      }
        
        if (!updateError) {
          console.log('Sale updated successfully in database');
          if (showToast) toast.success(`Status updated to: ${displayStatus.toUpperCase()}`);
          // Refresh the sales data
          queryClient.invalidateQueries({ queryKey: ["sales"] });
          return true;
        } else {
          console.error('Failed to update sale status:', updateError);
          if (showToast) toast.error('Failed to update status in database');
          return false;
        }
      
      
    } catch (error: any) {
      const msg = error?.message || 'Failed to refresh order status';
      if (showToast) toast.error(msg);
      console.error("Error refreshing status:", error);
      return false;
    } finally {
      setRefreshingIndividual(null);
    }
  };


  const filteredSales = useMemo(() => {
    let filtered = sales;

    // Apply date filter
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter((sale) => {
        const saleDate = new Date(sale.created_at);
        
        if (dateRange.from && dateRange.to) {
          return isWithinInterval(saleDate, { start: dateRange.from, end: dateRange.to });
        } else if (dateRange.from) {
          return saleDate >= dateRange.from;
        } else if (dateRange.to) {
          return saleDate <= dateRange.to;
        }
        
        return true;
      });
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((sale) => {
        return (
          sale.invoice_number.toLowerCase().includes(searchLower) ||
          sale.customer_name.toLowerCase().includes(searchLower) ||
          (sale.customer_phone && sale.customer_phone.toLowerCase().includes(searchLower)) ||
          (sale.customer_whatsapp && sale.customer_whatsapp.toLowerCase().includes(searchLower)) ||
          sale.payment_status.toLowerCase().includes(searchLower) ||
          (sale.courier_status && sale.courier_status.toLowerCase().includes(searchLower)) ||
          (sale.consignment_id && sale.consignment_id.toLowerCase().includes(searchLower))
        );
      });
    }

    return filtered;
  }, [sales, dateRange, searchTerm]);

  const currentMonthSales = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return isWithinInterval(saleDate, { start: monthStart, end: monthEnd });
    });
  }, [sales]);

  const stats = useMemo(() => {
    const validSales = filteredSales.filter(sale => sale.payment_status !== 'cancelled');
    const totalRevenue = validSales.reduce((sum, sale) => sum + (sale.grand_total || 0), 0);
    const totalPaid = validSales.reduce((sum, sale) => sum + (sale.amount_paid || 0), 0);
    const totalDue = validSales.reduce((sum, sale) => sum + (sale.amount_due || 0), 0);
    
    return {
      totalRevenue,
      totalPaid,
      totalDue,
      totalSales: validSales.length
    };
  }, [filteredSales]);

  const handleEditSale = (saleId: string) => {
    setEditingSaleId(saleId);
    setShowEditDialog(true);
  };

  const handleViewDetails = (saleId: string) => {
    setDetailsSaleId(saleId);
    setShowDetailsDialog(true);
  };


  const handleDeleteSale = (saleId: string) => {
    if (confirm("Are you sure you want to delete this sale? This action cannot be undone.")) {
      deleteSale.mutate(saleId);
    }
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setEditingSaleId(null);
  };

  const formatCurrencyAmount = (amount: number) => {
    return formatAmount(amount);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error loading sales data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <SimpleDateRangeFilter onDateRangeChange={(from, to) => setDateRange({ from, to })} />
          <Button onClick={() => setShowSaleDialog(true)} className="w-full sm:w-fit">
            <Plus className="mr-2 h-4 w-4" />
            New Sale
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium">Total Revenue</p>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrencyAmount(stats.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  From {stats.totalSales} sales
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium">Amount Paid</p>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrencyAmount(stats.totalPaid)}</div>
                <p className="text-xs text-muted-foreground">
                  Received payments
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium">Amount Due</p>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrencyAmount(stats.totalDue)}</div>
                <p className="text-xs text-muted-foreground">
                  Outstanding payments
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Search Field */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search sales by invoice, customer, phone, status..." 
            className="pl-9" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Invoice</TableHead>
                    <TableHead className="whitespace-nowrap">Customer</TableHead>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap">Amount</TableHead>
                    <TableHead className="whitespace-nowrap">Courier Status</TableHead>
                    <TableHead className="whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No sales found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium whitespace-nowrap">{sale.invoice_number}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={sale.customer_name}>{sale.customer_name}</TableCell>
                      <TableCell className="whitespace-nowrap">{format(new Date(sale.created_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatCurrencyAmount(sale.grand_total || 0)}</TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <ManualCourierStatusSelector
                            saleId={sale.id}
                            currentStatus={sale.courier_status}
                            onStatusUpdate={(newStatus) => handleManualStatusUpdate(sale.id, newStatus)}
                            variant="inline"
                            size="sm"
                          />
                          {sale.last_status_check && (
                            <div className="text-xs text-muted-foreground">
                              Last updated: {format(new Date(sale.last_status_check), "MMM dd, HH:mm")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSale(sale.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(sale.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                           {sale.consignment_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusRefresh(sale.id, sale.consignment_id!, true)}
                              disabled={isRefreshingStatuses || refreshingIndividual === sale.id}
                              title="Refresh order status"
                            >
                              <RefreshCw className={cn("h-4 w-4", (isRefreshingStatuses || refreshingIndividual === sale.id) && "animate-spin")} />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSale(sale.id)}
                              disabled={deleteSale.isPending}
                              title="Delete sale"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SaleDialog open={showSaleDialog} onOpenChange={setShowSaleDialog} />
      <EditSaleDialog 
        open={showEditDialog} 
        onOpenChange={handleCloseEditDialog}
        saleId={editingSaleId}
      />
      <SaleDetailsDialog 
        open={showDetailsDialog} 
        onOpenChange={setShowDetailsDialog}
        saleId={detailsSaleId}
      />
    </div>
  );
}