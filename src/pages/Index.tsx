import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Package, Users, DollarSign, AlertTriangle, Clock } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { SimpleDateRangeFilter } from "@/components/SimpleDateRangeFilter";
import { useProfile } from "@/hooks/useProfile";
import { formatDistanceToNow } from "date-fns";
import { getTimeBasedGreeting } from "@/lib/time";
import { useCurrency } from "@/hooks/useCurrency";
import { DismissibleAlert } from "@/components/DismissibleAlert";

const Index = () => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  
  const { dashboardStats, isLoading } = useDashboard(startDate, endDate);
  const { profile } = useProfile();
  const { formatAmount } = useCurrency();

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  };

  const handleDateRangeChange = (start?: Date, end?: Date) => {
    setStartDate(start);
    setEndDate(end);
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-muted-foreground">
            {getTimeBasedGreeting()}, {isLoading ? <Skeleton className="inline-block h-4 w-16" /> : (profile?.full_name || "User")}
          </div>
        </div>
        <div className="w-full md:w-auto">
          <SimpleDateRangeFilter onDateRangeChange={handleDateRangeChange} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatAmount(dashboardStats?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {startDate && endDate ? "For selected period" : "All time"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-24" /> : (dashboardStats?.unitsSold.toLocaleString() || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {startDate && endDate ? "For selected period" : "All time"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-24" /> : (dashboardStats?.totalProducts || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              In inventory
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-24" /> : (dashboardStats?.activeCustomers || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {startDate && endDate ? "For selected period" : "Total customers"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>
              Products running low on inventory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : dashboardStats?.lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No low stock alerts</p>
            ) : (
              dashboardStats?.lowStockProducts
                .filter(product => !dismissedAlerts.includes(`low-stock-${product.id}`))
                .map((product) => (
                  <DismissibleAlert
                    key={product.id}
                    id={`low-stock-${product.id}`}
                    title={product.name}
                    message={`${product.sku ? `SKU: ${product.sku} - ` : ""}Only ${product.stock_quantity} items left in stock`}
                    type={product.stock_quantity <= 5 ? "error" : "warning"}
                    onDismiss={handleDismissAlert}
                    variant="inline"
                  />
                ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Pending Payments
            </CardTitle>
            <CardDescription>
              Invoices with outstanding dues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : dashboardStats?.pendingPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending payments</p>
            ) : (
              dashboardStats?.pendingPayments
                .filter(payment => !dismissedAlerts.includes(`pending-payment-${payment.id}`))
                .map((payment) => (
                  <DismissibleAlert
                    key={payment.id}
                    id={`pending-payment-${payment.id}`}
                    title={payment.customer_name}
                    message={`Invoice ${payment.invoice_number} - ${formatAmount(payment.amount_due)} due ${formatDistanceToNow(new Date(payment.created_at))} ago`}
                    type="warning"
                    onDismiss={handleDismissAlert}
                    variant="inline"
                  />
                ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with common tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Use the sidebar to navigate to different sections of your inventory system.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <Badge variant="outline">Add Products</Badge>
              <Badge variant="outline">Record Sale</Badge>
              <Badge variant="outline">Update Inventory</Badge>
              <Badge variant="outline">View Reports</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
