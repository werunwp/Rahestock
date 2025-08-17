import { useState } from "react";
import { Plus, Receipt, Search, Filter, Eye, Edit, Truck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useSales } from "@/hooks/useSales";
import { useDashboard } from "@/hooks/useDashboard";
import { SaleDialog } from "@/components/SaleDialog";
import { EditSaleDialog } from "@/components/EditSaleDialog";
import { SaleDetailsDialog } from "@/components/SaleDetailsDialog";
import { SimpleDateRangeFilter } from "@/components/SimpleDateRangeFilter";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CourierOrderDialog } from "@/components/CourierOrderDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const Sales = () => {
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPathaoDialog, setShowPathaoDialog] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [viewingSaleId, setViewingSaleId] = useState<string | null>(null);
  const [pathaoSaleId, setPathaoSaleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "partial" | "paid" | "cancelled">("all");
  const [isRefreshingStatuses, setIsRefreshingStatuses] = useState(false);
  
  const { sales, isLoading } = useSales();
  const { dashboardStats } = useDashboard(dateRange.from, dateRange.to);
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();

  const filteredSales = sales
    .filter(sale =>
      sale.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(sale => (statusFilter === "all" ? true : sale.payment_status === statusFilter));

  const handleEditSale = (saleId: string) => {
    setEditingSaleId(saleId);
    setShowEditDialog(true);
  };

  const handleViewSale = (saleId: string) => {
    setViewingSaleId(saleId);
    setShowDetailsDialog(true);
  };

  const handlePathaoOrder = (saleId: string) => {
    setPathaoSaleId(saleId);
    setShowPathaoDialog(true);
  };

  const handleCloseEditDialog = (open: boolean) => {
    setShowEditDialog(open);
    if (!open) {
      setEditingSaleId(null);
    }
  };

  const handleCloseDetailsDialog = (open: boolean) => {
    setShowDetailsDialog(open);
    if (!open) {
      setViewingSaleId(null);
    }
  };

  const handleClosePathaoDialog = (open: boolean) => {
    setShowPathaoDialog(open);
    if (!open) {
      setPathaoSaleId(null);
    }
  };

  const handleRefreshOrderStatuses = async () => {
    setIsRefreshingStatuses(true);
    
    // Get all sales with consignment_ids that are visible in the current filter
    const salesWithConsignmentIds = filteredSales.filter(sale => sale.consignment_id);
    
    if (salesWithConsignmentIds.length === 0) {
      toast.warning("No orders found with tracking IDs to refresh");
      setIsRefreshingStatuses(false);
      return;
    }

    try {
      // Check if webhook settings exist
      const { data: webhookSettings } = await supabase
        .from('courier_webhook_settings')
        .select('webhook_url')
        .eq('is_active', true)
        .maybeSingle();

      if (!webhookSettings?.webhook_url) {
        toast.error("No status check webhook URL configured");
        setIsRefreshingStatuses(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Process each order sequentially to avoid overwhelming the webhook
      for (const sale of salesWithConsignmentIds) {
        try {
          const statusCheckUrl = `${webhookSettings.webhook_url}?consignment_id=${sale.consignment_id}`;
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
              .eq('id', sale.id);
            
            if (!updateError) {
              successCount++;
            } else {
              errorCount++;
              console.error('Failed to update sale status:', updateError);
            }
          } else {
            errorCount++;
            console.error('Failed to check status for:', sale.consignment_id);
          }
        } catch (error) {
          errorCount++;
          console.error('Error checking status for:', sale.consignment_id, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Updated ${successCount} order status(es)`);
        // Refresh the sales data
        queryClient.invalidateQueries({ queryKey: ["sales"] });
      }
      
      if (errorCount > 0) {
        toast.warning(`Failed to update ${errorCount} order status(es)`);
      }
    } catch (error) {
      toast.error("Failed to refresh order statuses");
      console.error("Error refreshing statuses:", error);
    } finally {
      setIsRefreshingStatuses(false);
    }
  };
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
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatAmount(dashboardStats?.totalRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Revenue in selected period
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatAmount(dashboardStats?.pendingPayments?.reduce((sum, p) => sum + p.amount_due, 0) || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboardStats?.pendingPayments?.length || 0} invoices pending
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardStats?.unitsSold || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Products sold
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search sales..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ToggleGroup type="single" value={statusFilter} onValueChange={(val) => setStatusFilter((val as any) || "all")}>
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="pending">Pending</ToggleGroupItem>
          <ToggleGroupItem value="partial">Partial</ToggleGroupItem>
          <ToggleGroupItem value="paid">Paid</ToggleGroupItem>
          <ToggleGroupItem value="cancelled">Cancelled</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
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
                    Order Status
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshOrderStatuses}
                      disabled={isRefreshingStatuses}
                      className="h-6 w-6 p-0"
                      title="Refresh order statuses"
                    >
                      <RefreshCw className={`h-3 w-3 ${isRefreshingStatuses ? 'animate-spin' : ''}`} />
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
                      <TableCell>{formatAmount(sale.grand_total || 0)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge 
                            variant={
                              sale.order_status === "delivered" ? "default" : 
                              sale.order_status === "in_transit" ? "secondary" : 
                              sale.order_status === "cancelled" ? "destructive" :
                              "outline"
                            }
                          >
                            {sale.order_status || 'pending'}
                          </Badge>
                          {sale.consignment_id && (
                            <div className="text-xs text-muted-foreground">
                              ID: {sale.consignment_id}
                            </div>
                          )}
                        </div>
                      </TableCell>
                       <TableCell>
                         <div className="flex gap-1">
                           <Button 
                             variant="ghost" 
                             size="sm"
                             onClick={() => handleViewSale(sale.id)}
                           >
                             <Eye className="h-4 w-4" />
                           </Button>
                           <Button 
                             variant="ghost" 
                             size="sm"
                             onClick={() => handleEditSale(sale.id)}
                           >
                             <Edit className="h-4 w-4" />
                           </Button>
                           {sale.payment_status === "paid" && (
                             <Button 
                               variant="ghost" 
                               size="sm"
                               onClick={() => handlePathaoOrder(sale.id)}
                               title="Send to Pathao Courier"
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
        onOpenChange={handleCloseDetailsDialog}
        saleId={viewingSaleId}
      />
      <CourierOrderDialog 
        open={showPathaoDialog} 
        onOpenChange={handleClosePathaoDialog}
        saleId={pathaoSaleId}
      />
    </div>
  );
};

export default Sales;