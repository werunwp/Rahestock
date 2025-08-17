import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Eye, TrendingUp, TrendingDown, DollarSign, RefreshCw, Truck } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SaleDialog } from "@/components/SaleDialog";
import { EditSaleDialog } from "@/components/EditSaleDialog";
import { SaleDetailsDialog } from "@/components/SaleDetailsDialog";
import { CourierOrderDialog } from "@/components/CourierOrderDialog";
import { SimpleDateRangeFilter } from "@/components/SimpleDateRangeFilter";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import { useStatusAutoRefresh } from "@/hooks/useStatusAutoRefresh";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  created_at: string;
  amount_paid: number;
  amount_due: number;
}

export default function Sales() {
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCourierDialog, setShowCourierDialog] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [detailsSaleId, setDetailsSaleId] = useState<string | null>(null);
  const [courierSaleId, setCourierSaleId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isRefreshingStatuses, setIsRefreshingStatuses] = useState(false);
  
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  
  // Enable auto-refresh for courier statuses
  useStatusAutoRefresh();

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

  const handleStatusRefresh = async (saleId: string, consignmentId: string, showToast = true) => {
    try {
      // Use Supabase edge function for status check with auth headers
      const { data, error } = await supabase.functions.invoke('courier-status-check', {
        body: { 
          action: 'check_status',
          consignment_id: consignmentId 
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        // Extract status from webhook response
        let newStatus = 'pending';
        if (data.webhook_response && Array.isArray(data.webhook_response) && data.webhook_response.length > 0) {
          const statusResponse = data.webhook_response[0];
          if (statusResponse.data && statusResponse.data.order_status) {
            newStatus = statusResponse.data.order_status.toLowerCase();
          }
        }
        
        // Map courier status to payment status for business logic
        let paymentStatusUpdate = {};
        if (newStatus === 'delivered') {
          paymentStatusUpdate = { payment_status: 'paid' };
        } else if (newStatus === 'returned' || newStatus === 'lost') {
          paymentStatusUpdate = { payment_status: 'cancelled' };
        }
        
        // Update the sale in database
        const { error: updateError } = await supabase
          .from('sales')
          .update({ 
            courier_status: newStatus,
            order_status: newStatus, // Keep for backward compatibility
            last_status_check: new Date().toISOString(),
            ...paymentStatusUpdate
          })
          .eq('id', saleId);
        
        if (!updateError) {
          if (showToast) toast.success(`Status updated to: ${newStatus.replace('_', ' ').toUpperCase()}`);
          // Refresh the sales data
          queryClient.invalidateQueries({ queryKey: ["sales"] });
          return true;
        } else {
          console.error('Failed to update sale status:', updateError);
          if (showToast) toast.error('Failed to update status in database');
          return false;
        }
      } else {
        console.error('Failed to check status for:', consignmentId);
        if (showToast) toast.error('Failed to get status from courier service');
        return false;
      }
    } catch (error) {
      if (showToast) toast.error("Failed to refresh order status");
      console.error("Error refreshing status:", error);
      return false;
    }
  };

  const handleBulkStatusRefresh = async () => {
    setIsRefreshingStatuses(true);
    
    const salesWithConsignmentId = filteredSales.filter(sale => sale.consignment_id);
    
    if (salesWithConsignmentId.length === 0) {
      toast.info("No orders with tracking IDs found");
      setIsRefreshingStatuses(false);
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    for (const sale of salesWithConsignmentId) {
      const success = await handleStatusRefresh(sale.id, sale.consignment_id!, false);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
      
      // Add a small delay between requests to avoid overwhelming the webhook
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRefreshingStatuses(false);
    
    if (successCount > 0) {
      toast.success(`Updated ${successCount} order statuses successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`);
    } else if (failureCount > 0) {
      toast.error(`Failed to update ${failureCount} order statuses`);
    }
  };

  const filteredSales = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return sales;

    return sales.filter((sale) => {
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
  }, [sales, dateRange]);

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

  const handleCourierOrder = (saleId: string) => {
    setCourierSaleId(saleId);
    setShowCourierDialog(true);
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
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">
            Track your sales transactions and invoices
          </p>
        </div>
        <div className="flex gap-2">
          <SimpleDateRangeFilter onDateRangeChange={(from, to) => setDateRange({ from, to })} />
          <Button onClick={() => setShowSaleDialog(true)} className="w-fit">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="flex items-center gap-2">
                    Courier Status
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBulkStatusRefresh}
                      disabled={isRefreshingStatuses}
                      className="h-6 w-6 p-0"
                      title="Refresh all order statuses"
                    >
                      <RefreshCw className={cn("h-3 w-3", isRefreshingStatuses && "animate-spin")} />
                    </Button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
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
                      <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                      <TableCell>{sale.customer_name}</TableCell>
                      <TableCell>{format(new Date(sale.created_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{formatCurrencyAmount(sale.grand_total || 0)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          sale.courier_status === 'delivered' ? 'default' : 
                          sale.courier_status === 'in_transit' || sale.courier_status === 'out_for_delivery' ? 'secondary' : 
                          sale.courier_status === 'not_sent' ? 'outline' :
                          'secondary'
                        }>
                          {sale.courier_status === 'not_sent' ? 'Not Sent' : 
                           sale.courier_status === 'in_transit' ? 'In Transit' :
                           sale.courier_status === 'out_for_delivery' ? 'Out for Delivery' :
                           sale.courier_status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
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
                          {sale.consignment_id ? (
                           <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusRefresh(sale.id, sale.consignment_id!, true)}
                              disabled={isRefreshingStatuses}
                              title="Refresh order status"
                            >
                              <RefreshCw className={cn("h-4 w-4", isRefreshingStatuses && "animate-spin")} />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCourierOrder(sale.id)}
                              title="Send to courier"
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
      <CourierOrderDialog 
        open={showCourierDialog} 
        onOpenChange={setShowCourierDialog}
        saleId={courierSaleId}
      />
    </div>
  );
}